import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import multer from "multer";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// SSE Active client pool & broadcast helper for real-time notifications
let sseClients: any[] = [];

const broadcastNotification = (notification: any) => {
  console.log(`Broadcasting real-time notification to ${sseClients.length} connected SSE clients...`);
  sseClients.forEach(client => {
    try {
      client.res.write(`data: ${JSON.stringify({ type: "NOTIFICATION", data: notification })}\n\n`);
    } catch (err) {
      console.error("Failed to write to SSE client socket, removing connection:", err);
    }
  });
};

// Initialize Gemini SDK with User-Agent telemetry
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  try {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log("Gemini API initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize Gemini API:", err);
  }
} else {
  console.log("No GEMINI_API_KEY environment variable found. Falling back to local smart analyzer.");
}

// Robust content generation helper with retries and model cascading fallback
async function generateContentWithRetry(params: {
  model: string;
  contents: any;
  config?: any;
}, maxRetries = 2, delayMs = 1000) {
  if (!ai) {
    throw new Error("AI client not initialized");
  }

  // Define fallback models cascade to handle high demand or quota limits gracefully
  const modelChain = [params.model];
  if (params.model === "gemini-3.5-flash") {
    modelChain.push("gemini-3.1-flash-lite");
  } else if (params.model === "gemini-3.1-flash-lite") {
    modelChain.push("gemini-3.5-flash");
  }

  let lastError: any = null;

  for (const model of modelChain) {
    let attempt = 0;
    const currentParams = { ...params, model };
    
    while (attempt <= maxRetries) {
      try {
        console.log(`[Gemini API] Querying model ${model} (attempt ${attempt + 1} of ${maxRetries + 1})...`);
        const result = await ai.models.generateContent(currentParams);
        return result;
      } catch (err: any) {
        lastError = err;
        attempt++;
        const errMsg = String(err && err.message || '');
        const errStatus = String(err && err.status || '');
        
        const isQuotaExceeded = 
          errStatus.includes('429') || 
          errMsg.includes('429') || 
          errMsg.includes('RESOURCE_EXHAUSTED') || 
          errMsg.includes('ResourceExhausted') || 
          errMsg.includes('quota exceeded') || 
          errMsg.includes('rate limit');

        const isTemporary = 
          errStatus.includes('503') || 
          errMsg.includes('503') || 
          errStatus.includes('UNAVAILABLE') || 
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('experiencing high demand');

        if (isQuotaExceeded) {
          console.warn(`[Gemini API] Quota or rate limit exceeded on model ${model}. Moving to next fallback model if available.`);
          break; // Break the retry loop for this model, fallback to next model in the chain
        }

        if (isTemporary && attempt <= maxRetries) {
          console.log(`[Gemini API] Temporary availability status on ${model} (attempt ${attempt} of ${maxRetries}). Retrying in ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue;
        }

        // For other errors or if max retries exceeded, break retry loop to try next model in chain
        console.warn(`[Gemini API] Error on model ${model}: ${errMsg}. Moving to next fallback model if available.`);
        break;
      }
    }
  }

  // If we exhausted all models and retries, throw the last encountered error
  throw lastError || new Error("All models in the generation chain failed.");
}

// Data persistence setup
const DB_FILE = path.join(process.cwd(), "db.json");

interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "STATUS_UPDATE" | "NEW_COMMENT" | "VICINITY_ISSUE" | "VERIFICATION_REQUEST";
  issueId: string;
  isRead: boolean;
  createdAt: string;
}

interface LocalDB {
  issues: any[];
  users: any[];
  notifications: Notification[];
  posts: any[];
}

const initialPosts = [
  {
    id: "post-1",
    authorId: "user-system-1",
    authorName: "Elena Rostova",
    authorHandle: "@elena_rostova",
    authorAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100",
    content: "Just completed my morning neighborhood walk! Glad to see that the Oakwood Boulevard pothole is being validated by so many people in the app. Let's keep our streets safe! 🚶‍♀️✨",
    media: [
      {
        url: "https://images.unsplash.com/photo-1513829096999-4978602297f7?auto=format&fit=crop&q=80&w=600",
        type: "image/jpeg"
      }
    ],
    likes: 14,
    likedBy: ["user-system-2"],
    comments: [
      {
        id: "pcomment-1",
        authorId: "user-system-2",
        authorName: "Marcus Vance",
        authorHandle: "@marcus_vance",
        authorAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100",
        text: "Yes! The community spirit here is incredible. Thanks for posting Elena!",
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
      }
    ],
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "post-hazard-1",
    authorId: "user-system-1",
    authorName: "Elena Rostova",
    authorHandle: "@elena_rostova",
    authorAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100",
    content: "URGENT SAFETY HAZARD! A major tree limb has cracked and is hanging low over the crosswalk on Oakwood Blvd near Elm Dr. Pedestrians have to step into the bike lane to pass. Reported via the hazard dispatch tool. Please watch out! 🌳⚠️ #HazardWatch #RoadSafety",
    media: [
      {
        url: "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&q=80&w=600",
        type: "image/jpeg"
      }
    ],
    likes: 18,
    likedBy: ["user-system-2", "user-current-1"],
    comments: [
      {
        id: "pcomment-h1",
        authorId: "user-system-2",
        authorName: "Marcus Vance",
        authorHandle: "@marcus_vance",
        authorAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100",
        text: "Wow, that looks extremely unstable! Thanks for the heads-up Elena. Upvoted and validated on the radar map so dispatch gets it immediately.",
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
      }
    ],
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "post-2",
    authorId: "user-system-2",
    authorName: "Marcus Vance",
    authorHandle: "@marcus_vance",
    authorAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100",
    content: "Water pipeline crew is doing active excavations on Pine Street East. Avoid this corridor if you are driving! 🚗💦 Great job to the water department for their speed.",
    media: [
      {
        url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=600",
        type: "image/jpeg"
      }
    ],
    likes: 8,
    likedBy: [],
    comments: [],
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "post-hazard-2",
    authorId: "user-system-3",
    authorName: "Julian Karr",
    authorHandle: "@julian_k",
    authorAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100",
    content: "Warning for drivers: There's an exposed metal construction plate that has shifted on Broad Street South, creating a dangerous metal lip that could puncture tires or cause a cyclist to lose control. Slow down as you approach the 400-block! ⚠️🚗 #HazardWatch #RoadSafety",
    media: [
      {
        url: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=600",
        type: "image/jpeg"
      }
    ],
    likes: 12,
    likedBy: [],
    comments: [],
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "post-hazard-3",
    authorId: "user-system-2",
    authorName: "Marcus Vance",
    authorHandle: "@marcus_vance",
    authorAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100",
    content: "The public trash receptacle near Broadway and Elm is completely overflowed with discarded construction debris and sharp glass shards. It's a walking hazard for pets and kids in the park area. I've filed a sanitation request, let's get this cleared! 🚮⚠️ #CleanAlleys #HazardWatch",
    media: [
      {
        url: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=600",
        type: "image/jpeg"
      }
    ],
    likes: 9,
    likedBy: [],
    comments: [],
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "post-3",
    authorId: "user-system-3",
    authorName: "Julian Karr",
    authorHandle: "@julian_k",
    authorAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100",
    content: "The parkside avenue streetlight has been fully replaced with bright, high-efficiency LEDs. Feels much safer to run here at night now! Thanks Sarah Chen! 🌟",
    media: [
      {
        url: "https://images.unsplash.com/photo-1508849789987-4e5333c12b78?auto=format&fit=crop&q=80&w=600",
        type: "image/jpeg"
      }
    ],
    likes: 21,
    likedBy: ["user-system-1", "user-current-1"],
    comments: [],
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "post-hazard-4",
    authorId: "user-system-1",
    authorName: "Elena Rostova",
    authorHandle: "@elena_rostova",
    authorAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100",
    content: "Great news! The fallen electrical wire on Pine Street East that was causing a serious hazard yesterday has been completely cleared and secured by the power grid crew. Thanks everyone who validated the dispatch ticket! ⚡👷‍♂️ #HazardWatch #WaterDeptSpeed",
    media: [
      {
        url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=600",
        type: "image/jpeg"
      }
    ],
    likes: 25,
    likedBy: ["user-system-3"],
    comments: [
      {
        id: "pcomment-h4",
        authorId: "user-system-3",
        authorName: "Julian Karr",
        authorHandle: "@julian_k",
        authorAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100",
        text: "Incredible response time! The system works perfectly when we coordinate.",
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
      }
    ],
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  }
];

const defaultDB: LocalDB = {
  issues: [
    {
      id: "issue-1",
      title: "Major Pothole on Oakwood Boulevard",
      description: "A deep, dangerous pothole measuring roughly 3 feet wide and 6 inches deep is located right in the middle of the northbound lane. Multiple cars have had to swerve suddenly, causing a high hazard for head-on collisions.",
      category: "POTHOLES",
      severity: "HIGH",
      latitude: 40.7259,
      longitude: -73.9920,
      address: "328 Oakwood Blvd (near Broadway intersection)",
      imageUrl: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=600",
      reporterId: "user-system-1",
      reporterName: "Elena Rostova",
      status: "VERIFIED",
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      upvotes: 42,
      downvotes: 1,
      validationsCount: 15,
      flagsCount: 0,
      comments: [
        {
          id: "c-1",
          authorId: "user-system-2",
          authorName: "Marcus Vance",
          authorAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100",
          text: "I hit this yesterday! Extremely dangerous, damaged my front-left tire alignment. Glad it is reported.",
          createdAt: new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "c-2",
          authorId: "user-official-1",
          authorName: "Sarah Chen",
          authorAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100",
          text: "Municipal Maintenance has noted this. A verification inspector has visited and validated the high urgency. Queueing up asphalt crews.",
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          isOfficial: true,
        }
      ],
      statusHistory: [
        {
          status: "REPORTED",
          note: "Issue created by community member Elena Rostova",
          updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          updatedBy: "Elena Rostova"
        },
        {
          status: "VERIFIED",
          note: "Community reached consensus verification. 15 validated reports.",
          updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          updatedBy: "Civic Community Engine"
        }
      ],
      votes: [
        { userId: "user-system-2", voteType: "VALIDATE" },
        { userId: "user-system-3", voteType: "VALIDATE" }
      ],
      upvotedBy: ["user-system-2", "user-system-3"]
    },
    {
      id: "issue-2",
      title: "Water Main Burst & Flooding",
      description: "Severe water leakage flowing onto the sidewalk and road, forming a massive puddle and undermining the pavement. It seems to be coming from a cracked municipal water line near the fire hydrant.",
      category: "WATER_LEAKAGE",
      severity: "CRITICAL",
      latitude: 40.7180,
      longitude: -74.0080,
      address: "105 Pine Street East",
      imageUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=600",
      reporterId: "user-system-2",
      reporterName: "Marcus Vance",
      status: "IN_PROGRESS",
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
      upvotes: 68,
      downvotes: 0,
      validationsCount: 28,
      flagsCount: 0,
      comments: [
        {
          id: "c-3",
          authorId: "user-official-1",
          authorName: "Water Dept (Sarah Chen)",
          authorAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100",
          text: "Water department dispatch has isolated the main line valve. Crews are currently excavating to replace the damaged high-density pipe. Roads are partially closed.",
          createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          isOfficial: true,
        }
      ],
      statusHistory: [
        {
          status: "REPORTED",
          note: "Hydrant-side pipeline leakage reported.",
          updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          updatedBy: "Marcus Vance"
        },
        {
          status: "VERIFIED",
          note: "Community validations achieved immediately.",
          updatedAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
          updatedBy: "Civic Community Engine"
        },
        {
          status: "IN_PROGRESS",
          note: "Water department has deployed crew #4B. Operations underway.",
          updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          updatedBy: "Sarah Chen"
        }
      ],
      votes: [],
      upvotedBy: []
    },
    {
      id: "issue-3",
      title: "Broken Streetlight on Parkside Avenue",
      description: "The street light in front of the community park has been out for three weeks. The sidewalk is completely dark at night, creating safety and security hazards for joggers and residents walking their dogs.",
      category: "STREETLIGHTS",
      severity: "LOW",
      latitude: 40.7380,
      longitude: -73.9880,
      address: "Parkside Ave, opposite Greenview Park",
      imageUrl: "https://images.unsplash.com/photo-1508849789987-4e5333c12b78?auto=format&fit=crop&q=80&w=600",
      reporterId: "user-system-3",
      reporterName: "Julian Karr",
      status: "RESOLVED",
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
      updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
      upvotes: 12,
      downvotes: 0,
      validationsCount: 4,
      flagsCount: 0,
      comments: [
        {
          id: "c-4",
          authorId: "user-official-1",
          authorName: "Sarah Chen",
          authorAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100",
          text: "Work order #92839 issued to Electric Utility Div. Light fixture replaced with high-efficiency long-life LED bulb.",
          createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
          isOfficial: true,
        }
      ],
      statusHistory: [
        {
          status: "REPORTED",
          note: "Issue submitted by Julian.",
          updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          updatedBy: "Julian Karr"
        },
        {
          status: "RESOLVED",
          note: "Bulb and fixture replaced. Light verified operational.",
          updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
          updatedBy: "Sarah Chen"
        }
      ],
      votes: [],
      upvotedBy: []
    },
    {
      id: "issue-4",
      title: "Illegal Dump of Building Materials",
      description: "A truck dumped piles of dry concrete blocks, drywall scraps, and metal wires in the public alleyway behind the local grocery store. It is blocking trash collector vehicle access.",
      category: "WASTE_MANAGEMENT",
      severity: "MEDIUM",
      latitude: 40.7300,
      longitude: -74.0010,
      address: "Alleyway behind 45 Commerce Rd",
      imageUrl: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=600",
      reporterId: "user-system-1",
      reporterName: "Elena Rostova",
      status: "REPORTED",
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
      updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      upvotes: 9,
      downvotes: 0,
      validationsCount: 2,
      flagsCount: 0,
      comments: [],
      statusHistory: [
        {
          status: "REPORTED",
          note: "Alley dump reported. Restricting access to waste vehicles.",
          updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          updatedBy: "Elena Rostova"
        }
      ],
      votes: [],
      upvotedBy: []
    },
    {
      id: "issue-5",
      title: "Severely Damaged Pedestrian Railing",
      description: "The metal safety railing along the canal walkway has rusted through completely, leaving a dangerous 15-foot gap where children or seniors could easily trip and fall into the deep water channel. Immediate intervention needed.",
      category: "PUBLIC_INFRASTRUCTURE",
      severity: "CRITICAL",
      latitude: 40.7110,
      longitude: -73.9990,
      address: "Canal Walkway near Pier 3",
      imageUrl: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&q=80&w=600",
      reporterId: "user-system-3",
      reporterName: "Julian Karr",
      status: "REPORTED",
      createdAt: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000).toISOString(),
      upvotes: 56,
      downvotes: 0,
      validationsCount: 18,
      flagsCount: 0,
      comments: [],
      statusHistory: [
        {
          status: "REPORTED",
          note: "Rusted channel railing reported.",
          updatedAt: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000).toISOString(),
          updatedBy: "Julian Karr"
        }
      ],
      votes: [],
      upvotedBy: []
    }
  ],
  users: [
    {
      id: "user-current-1",
      name: "Abhinav Srivastava",
      email: "srivastavaabhinav5158@gmail.com",
      xp: 1250,
      level: 3,
      badges: [
        {
          id: "badge-1",
          name: "Civic Champion",
          description: "Earned for high civic engagement and validated reports.",
          icon: "ShieldAlert",
          unlockedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "badge-2",
          name: "Pothole Patrol",
          description: "Reported or validated 5+ road quality concerns.",
          icon: "Hammer",
          unlockedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        }
      ],
      reportsCount: 4,
      validationsCount: 12
    },
    {
      id: "user-system-1",
      name: "Elena Rostova",
      email: "elena.rostova@metro.org",
      xp: 1850,
      level: 4,
      badges: [
        {
          id: "badge-1",
          name: "Civic Champion",
          description: "Earned for high civic engagement and validated reports.",
          icon: "ShieldAlert",
          unlockedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "badge-3",
          name: "Eco Guardian",
          description: "Reported 5+ waste management or recycling concerns.",
          icon: "Trash2",
          unlockedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
        }
      ],
      reportsCount: 11,
      validationsCount: 22
    },
    {
      id: "user-system-2",
      name: "Marcus Vance",
      email: "marcus.vance@urbanmail.net",
      xp: 920,
      level: 2,
      badges: [
        {
          id: "badge-4",
          name: "Validator",
          description: "Voted and confirmed 10+ reports accurately.",
          icon: "Vote",
          unlockedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        }
      ],
      reportsCount: 2,
      validationsCount: 14
    },
    {
      id: "user-system-3",
      name: "Julian Karr",
      email: "jkarr@vox.org",
      xp: 550,
      level: 1,
      badges: [
        {
          id: "badge-5",
          name: "Pioneer",
          description: "Signed up in the first wave of community watch.",
          icon: "Award",
          unlockedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString()
        }
      ],
      reportsCount: 3,
      validationsCount: 4
    }
  ],
  notifications: [
    {
      id: "notif-1",
      userId: "user-current-1",
      title: "Issue Promoted to Verified",
      message: "Your reported 'Major Pothole on Oakwood Boulevard' reached 5+ validations and is now Verified.",
      type: "STATUS_UPDATE",
      issueId: "issue-1",
      isRead: false,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "notif-2",
      userId: "user-current-1",
      title: "New Official Response",
      message: "Sarah Chen (Water Dept) commented on your reported 'Water Main Burst & Flooding' issue.",
      type: "NEW_COMMENT",
      issueId: "issue-2",
      isRead: false,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "notif-3",
      userId: "user-current-1",
      title: "Civic Concern Nearby",
      message: "A Broken Streetlight has been reported on Parkside Avenue, in your vicinity.",
      type: "VICINITY_ISSUE",
      issueId: "issue-3",
      isRead: true,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    }
  ],
  posts: initialPosts
};

// Local read-write helpers
const readDB = (): LocalDB => {
  if (!fs.existsSync(DB_FILE)) {
    // Add default user fields to defaultDB before writing
    const copy = JSON.parse(JSON.stringify(defaultDB));
    copy.users = copy.users.map((u: any) => {
      let handle = "@unknown";
      let avatar = "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=100";
      if (u.id === "user-current-1") {
        handle = "@abhinav_s";
        avatar = "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=100";
      } else if (u.id === "user-system-1") {
        handle = "@elena_rostova";
        avatar = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100";
      } else if (u.id === "user-system-2") {
        handle = "@marcus_vance";
        avatar = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100";
      } else if (u.id === "user-system-3") {
        handle = "@julian_k";
        avatar = "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100";
      }
      return {
        following: [],
        handle,
        avatar,
        ...u
      };
    });
    fs.writeFileSync(DB_FILE, JSON.stringify(copy, null, 2));
    return copy;
  }
  try {
    const data = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(data);
    let changed = false;

    if (!parsed.notifications) {
      parsed.notifications = [...defaultDB.notifications];
      changed = true;
    }
    if (!parsed.posts || parsed.posts.length === 0) {
      parsed.posts = [...initialPosts];
      changed = true;
    }
    if (parsed.users) {
      parsed.users = parsed.users.map((u: any) => {
        let uChanged = false;
        if (!u.following) {
          u.following = [];
          uChanged = true;
        }
        if (!u.handle) {
          if (u.id === "user-current-1") u.handle = "@abhinav_s";
          else if (u.id === "user-system-1") u.handle = "@elena_rostova";
          else if (u.id === "user-system-2") u.handle = "@marcus_vance";
          else if (u.id === "user-system-3") u.handle = "@julian_k";
          else u.handle = "@" + u.name.toLowerCase().replace(/[^a-z0-9]/g, "_");
          uChanged = true;
        }
        if (!u.avatar) {
          if (u.id === "user-current-1") u.avatar = "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=100";
          else if (u.id === "user-system-1") u.avatar = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100";
          else if (u.id === "user-system-2") u.avatar = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100";
          else if (u.id === "user-system-3") u.avatar = "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100";
          else u.avatar = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100";
          uChanged = true;
        }
        if (uChanged) changed = true;
        return u;
      });
    }

    if (changed) {
      fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2));
    }
    return parsed;
  } catch (err) {
    console.error("Error reading database file, resetting:", err);
    return defaultDB;
  }
};

const writeDB = (data: LocalDB) => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error writing database file:", err);
  }
};

function getCurrentUserId(req: express.Request): string {
  const headerId = req.headers["x-user-id"];
  if (headerId && typeof headerId === "string") {
    return headerId;
  }
  return "user-current-1";
}

// API Endpoints

app.get("/api/topic-info", async (req, res) => {
  const { topic } = req.query;
  if (!topic || typeof topic !== "string") {
    return res.status(400).json({ error: "Missing topic" });
  }

  try {
    const response = await generateContentWithRetry({
      model: "gemini-3.5-flash",
      contents: `Provide a short, concise summary (max 2 sentences) about the topic: ${topic}. If it's a local civic issue, provide general context.`,
      config: {
        generationConfig: {
          maxOutputTokens: 100,
        },
      },
    });

    const summary = response.text || "";
    res.json({ topic, summary });
  } catch (err) {
    console.error("Error fetching topic info:", err);
    res.status(500).json({ error: "Failed to fetch topic info" });
  }
});

// Authentication Endpoints
app.post("/api/auth/register", (req, res) => {
  const db = readDB();
  const { name, email, password, handle, avatar } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email, and password are required" });
  }

  const existingUser = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return res.status(400).json({ error: "A user with this email already exists" });
  }

  let formattedHandle = handle || "@" + name.toLowerCase().replace(/[^a-z0-9]/g, "_");
  if (!formattedHandle.startsWith("@")) {
    formattedHandle = "@" + formattedHandle;
  }

  const newUserId = `user-${Date.now()}`;
  const newUser = {
    id: newUserId,
    name,
    email,
    password, // Plain text for simplicity
    handle: formattedHandle,
    avatar: avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100",
    xp: 0, // Welcome bonus!
    level: 1,
    badges: [],
    reportsCount: 0,
    validationsCount: 0,
    following: []
  };

  db.users.push(newUser);
  writeDB(db);

  res.status(201).json(newUser);
});

app.post("/api/auth/login", (req, res) => {
  const db = readDB();
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const actualPassword = user.password || "password";
  if (password !== actualPassword) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  res.json(user);
});

// Google Sign-In Endpoints
app.get("/api/auth/google/url", (req, res) => {
  const redirectUri = req.query.redirect_uri as string;
  if (!redirectUri) {
    return res.status(400).json({ error: "Missing redirect_uri parameter" });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    const setupUrl = `/auth/google/setup-required?redirect_uri=${encodeURIComponent(redirectUri)}`;
    return res.json({ url: setupUrl });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
    state: redirectUri,
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  res.json({ url: authUrl });
});

app.get("/auth/google/setup-required", (req, res) => {
  const redirectUri = req.query.redirect_uri as string || "/";
  
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Google Sign-In Setup Required</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-slate-50 flex items-center justify-center min-h-screen font-sans p-6">
      <div class="bg-white border border-slate-100 shadow-xl rounded-3xl p-8 max-w-lg w-full">
        <div class="flex items-center gap-3 mb-6">
          <div class="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
          </div>
          <h2 class="text-xl font-bold text-slate-900">Google OAuth Setup Needed</h2>
        </div>
        
        <p class="text-sm text-slate-600 mb-6 leading-relaxed">
          The <span class="font-semibold text-slate-800">GOOGLE_CLIENT_ID</span> and <span class="font-semibold text-slate-800">GOOGLE_CLIENT_SECRET</span> environment variables are not configured yet. 
        </p>

        <div class="bg-slate-50 p-4 rounded-2xl mb-6 text-xs text-slate-500 space-y-3 border border-slate-100">
          <p class="font-bold text-slate-700">📋 Setup Steps for Google Sign-In:</p>
          <ol class="list-decimal pl-4 space-y-1.5">
            <li>Go to the <a href="https://console.cloud.google.com/apis/credentials" target="_blank" class="text-blue-600 hover:underline font-semibold">Google Cloud Console</a>.</li>
            <li>Create an OAuth Web Application client credential.</li>
            <li>Add this Authorized Redirect URI:
              <code class="block mt-1 p-1 bg-white border border-slate-200 rounded font-mono text-slate-800 overflow-x-auto">${redirectUri}</code>
            </li>
            <li>Set the <code class="font-bold">GOOGLE_CLIENT_ID</code> and <code class="font-bold">GOOGLE_CLIENT_SECRET</code> variables in the AI Studio Settings menu.</li>
          </ol>
        </div>

        <div class="flex flex-col gap-3">
          <button onclick="triggerDemoLogin()" class="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-2.5 px-4 rounded-xl text-xs shadow-md shadow-blue-500/10 cursor-pointer transition-all text-center">
            Demo Sandbox Sign-In (Auto-generates Google profile)
          </button>
          
          <button onclick="window.close()" class="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-4 rounded-xl text-xs cursor-pointer transition-all text-center">
            Cancel
          </button>
        </div>

        <script>
          function triggerDemoLogin() {
            const demoUser = { 
              name: "Abhinav Srivastava", 
              email: "srivastavaabhinav5158@gmail.com", 
              avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150" 
            };
            
            if (window.opener) {
              window.opener.postMessage({
                type: 'GOOGLE_AUTH_MOCK_SUCCESS',
                user: demoUser
              }, '*');
              window.close();
            } else {
              alert('Opener window not found. Please click from the main app.');
            }
          }
        </script>
      </body>
      </html>
  `);
});

app.get(["/auth/google/callback", "/auth/google/callback/"], async (req, res) => {
  const { code, state } = req.query;

  if (!code) {
    return res.status(400).send("Authorization code is missing");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = state as string;

  if (!clientId || !clientSecret) {
    return res.status(500).send("Google OAuth is not configured on the server.");
  }

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: code as string,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      throw new Error(tokenData.error_description || tokenData.error || "Failed to exchange authorization code");
    }

    const { access_token } = tokenData;

    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const userInfo = await userInfoResponse.json();

    if (!userInfoResponse.ok) {
      throw new Error(userInfo.error_description || "Failed to fetch user info from Google");
    }

    const db = readDB();
    const email = userInfo.email;
    const name = userInfo.name || "Google Citizen";
    const picture = userInfo.picture || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100";
    const sub = userInfo.sub;

    let user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      const formattedHandle = "@" + name.toLowerCase().replace(/[^a-z0-9]/g, "_") + "_g";
      const newUserId = `user-g-${sub || Date.now()}`;
      
      user = {
        id: newUserId,
        name,
        email,
        password: `google-oauth-${Date.now()}`,
        handle: formattedHandle,
        avatar: picture,
        xp: 0,
        level: 1,
        badges: [
          {
            id: "badge-google-verified",
            name: "Verified Watcher",
            description: "Linked Google account for verification.",
            icon: "Sparkles",
            unlockedAt: new Date().toISOString()
          }
        ],
        reportsCount: 0,
        validationsCount: 0,
        following: []
      };

      db.users.push(user);
      writeDB(db);
    } else {
      let updated = false;
      if (!user.avatar || user.avatar.includes("unsplash")) {
        user.avatar = picture;
        updated = true;
      }
      if (!user.badges.some(b => b.id === "badge-google-verified")) {
        user.badges.push({
          id: "badge-google-verified",
          name: "Verified Watcher",
          description: "Linked Google account for verification.",
          icon: "Sparkles",
          unlockedAt: new Date().toISOString()
        });
        user.xp += 50;
        updated = true;
      }
      if (updated) {
        writeDB(db);
      }
    }

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'GOOGLE_AUTH_SUCCESS', 
                user: ${JSON.stringify(user)} 
              }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);

  } catch (error: any) {
    console.error("Google auth error:", error);
    res.status(500).send(`
      <html>
        <body class="bg-slate-50 flex items-center justify-center min-h-screen font-sans p-6">
          <div class="bg-white border border-slate-100 shadow-xl rounded-3xl p-8 max-w-lg w-full text-center">
            <h2 class="text-xl font-bold text-red-600 mb-4">Google Sign-In Failed</h2>
            <p class="text-sm text-slate-600 mb-6 leading-relaxed">${error.message || "An unknown error occurred during code exchange."}</p>
            <button onclick="window.close()" class="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-xl text-xs cursor-pointer transition-all">
              Close Window
            </button>
          </div>
        </body>
      </html>
    `);
  }
});

app.post("/api/auth/google/mock-login", (req, res) => {
  const db = readDB();
  const { name, email, avatar } = req.body;

  if (!email || !name) {
    return res.status(400).json({ error: "Name and email are required" });
  }

  let user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    const formattedHandle = "@" + name.toLowerCase().replace(/[^a-z0-9]/g, "_") + "_g";
    const newUserId = `user-g-${Date.now()}`;
    
    user = {
      id: newUserId,
      name,
      email,
      password: `google-oauth-mock-${Date.now()}`,
      handle: formattedHandle,
      avatar: avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100",
      xp: 0,
      level: 1,
      badges: [
        {
          id: "badge-google-verified",
          name: "Verified Watcher",
          description: "Linked Google account for verification.",
          icon: "Sparkles",
          unlockedAt: new Date().toISOString()
        }
      ],
      reportsCount: 0,
      validationsCount: 0,
      following: []
    };

    db.users.push(user);
    writeDB(db);
  }

  res.json(user);
});

// 1. Get all issues
app.get("/api/issues", (req, res) => {
  const db = readDB();
  res.json(db.issues);
});

// 1.5 Seed issues around user's live location
app.post("/api/issues/seed-around", (req, res) => {
  const db = readDB();
  const { latitude, longitude } = req.body;

  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: "Latitude and longitude are required" });
  }

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  // Check if there are issues close to this lat/lng (within ~0.025 degrees, which is ~2.5km)
  const nearbyIssues = db.issues.filter(issue => {
    const dLat = issue.latitude - lat;
    const dLng = issue.longitude - lng;
    return Math.sqrt(dLat * dLat + dLng * dLng) < 0.025;
  });

  const seeded: any[] = [];

  // If there are fewer than 3 issues near the user, seed some!
  if (nearbyIssues.length < 3) {
    const countToSeed = 3 - nearbyIssues.length;
    
    // Sample categories and titles
    const templates = [
      {
        category: "POTHOLES",
        severity: "HIGH",
        title: "Disruptive Asphalt Pothole",
        description: "A wide structural depression has formed in the asphalt surface. Multiple vehicles have reported jarring impacts, presenting a severe risk for tire blowouts and steering misalignment.",
        address: "Public thoroughfare near your location"
      },
      {
        category: "STREETLIGHTS",
        severity: "MEDIUM",
        title: "Faulty Municipal Streetlight",
        description: "The street illumination fixture is completely dead or experiencing severe high-frequency flickering. This creates dark blindspots on the road and walkway, increasing pedestrian safety concerns.",
        address: "Intersection near your location"
      },
      {
        category: "WATER_LEAKAGE",
        severity: "CRITICAL",
        title: "Active Water Line Rupture",
        description: "Significant volumes of water are actively bubbling up through paving cracks, causing soil erosion under the roadbed and severe flooding across the lanes. Triage required to avoid asphalt collapse.",
        address: "Pavement boundary near your location"
      },
      {
        category: "WASTE_MANAGEMENT",
        severity: "MEDIUM",
        title: "Overfilled Civic Refuse Receptacle",
        description: "A public waste container has breached its maximum capacity, resulting in windblown litter polluting the immediate block. Neighborhood sanitation dispatch requested.",
        address: "Civic sidewalk near your location"
      }
    ];

    // Shuffle template choices
    const shuffled = [...templates].sort(() => 0.5 - Math.random());

    for (let i = 0; i < countToSeed; i++) {
      const template = shuffled[i % shuffled.length];
      
      // Offset randomly by 0.003 to 0.012 degrees (~300m to 1.2km) to position them nicely around the user!
      const angle = Math.random() * Math.PI * 2;
      const distance = 0.004 + Math.random() * 0.008; // nicely distributed
      const offsetLat = Math.sin(angle) * distance;
      const offsetLng = Math.cos(angle) * distance;

      const issueId = `seeded-${Date.now()}-${i}`;
      const newIssue = {
        id: issueId,
        title: template.title,
        description: template.description,
        category: template.category,
        severity: template.severity,
        latitude: lat + offsetLat,
        longitude: lng + offsetLng,
        address: template.address,
        imageUrl: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&q=80&w=600",
        videoUrl: null,
        reporterId: "user-system-3", // Julian K
        reporterName: "Julian K",
        status: "REPORTED",
        createdAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(), // within last 24h
        updatedAt: new Date().toISOString(),
        upvotes: Math.floor(Math.random() * 12) + 2,
        downvotes: 0,
        validationsCount: Math.floor(Math.random() * 4) + 1,
        flagsCount: 0,
        comments: [],
        statusHistory: [
          {
            status: "REPORTED",
            note: "Discovered by autonomous neighborhood consensus scan.",
            updatedAt: new Date().toISOString(),
            updatedBy: "System Dispatcher"
          }
        ],
        votes: [],
        upvotedBy: []
      };

      db.issues.unshift(newIssue);
      seeded.push(newIssue);
    }

    writeDB(db);
  }

  res.json({
    success: true,
    seededCount: seeded.length,
    nearbyCount: nearbyIssues.length + seeded.length,
    issues: db.issues
  });
});

// 2. Report a new issue
app.post("/api/issues", (req, res) => {
  const db = readDB();
  const { title, description, category, severity, latitude, longitude, address, imageUrl, videoUrl } = req.body;
  
  if (!title || !description || !category || !severity) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Find reporter profile (defaulting to the active current user)
  const currentUserId = getCurrentUserId(req);
  const currentUser = db.users.find(u => u.id === currentUserId) || db.users[0];

  const newIssue = {
    id: `issue-${Date.now()}`,
    title,
    description,
    category,
    severity,
    latitude: latitude || 40.7128 + (Math.random() - 0.5) * 0.05,
    longitude: longitude || -74.0060 + (Math.random() - 0.5) * 0.05,
    address: address || "Pinned Location",
    imageUrl: imageUrl || "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&q=80&w=600",
    videoUrl: videoUrl || null,
    reporterId: currentUserId,
    reporterName: currentUser.name,
    status: "REPORTED" as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    upvotes: 1,
    downvotes: 0,
    validationsCount: 1,
    flagsCount: 0,
    comments: [],
    statusHistory: [
      {
        status: "REPORTED" as const,
        note: `Issue filed by citizen ${currentUser.name}. Coordinates: (${latitude}, ${longitude})`,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser.name
      }
    ],
    votes: [{ userId: currentUserId, voteType: "VALIDATE" as const }],
    upvotedBy: [currentUserId]
  };

  db.issues.unshift(newIssue);

  // Award XP for reporting an issue
  if (currentUser) {
    currentUser.xp += 100;
    currentUser.reportsCount += 1;
    // Check level up
    const newLevel = Math.floor(currentUser.xp / 500) + 1;
    if (newLevel > currentUser.level) {
      currentUser.level = newLevel;
    }
  }

  writeDB(db);
  res.status(201).json({ issue: newIssue, profile: currentUser });
});

// 3. Upvote/downvote an issue
app.post("/api/issues/:id/vote", (req, res) => {
  const db = readDB();
  const { id } = req.params;
  const { direction } = req.body; // "up" or "down"
  const currentUserId = getCurrentUserId(req);

  const issue = db.issues.find(i => i.id === id);
  if (!issue) return res.status(404).json({ error: "Issue not found" });

  if (!issue.upvotedBy) issue.upvotedBy = [];

  const currentUser = db.users.find(u => u.id === currentUserId);

  if (direction === "up") {
    if (issue.upvotedBy.includes(currentUserId)) {
      // Remove upvote
      issue.upvotedBy = issue.upvotedBy.filter((uid: string) => uid !== currentUserId);
      issue.upvotes = Math.max(0, issue.upvotes - 1);
    } else {
      // Add upvote
      issue.upvotedBy.push(currentUserId);
      issue.upvotes += 1;
      
      // Reward subtle XP to voter
      if (currentUser) currentUser.xp += 10;
    }
  } else if (direction === "down") {
    issue.downvotes += 1;
  }

  // Sync profile levels
  if (currentUser) {
    const newLevel = Math.floor(currentUser.xp / 500) + 1;
    if (newLevel > currentUser.level) {
      currentUser.level = newLevel;
    }
  }

  writeDB(db);
  res.json({ issue, profile: currentUser });
});

// 4. Community Validation (Verify / Flag)
app.post("/api/issues/:id/validate", (req, res) => {
  const db = readDB();
  const { id } = req.params;
  const { voteType } = req.body; // "VALIDATE" or "FLAG"
  const currentUserId = getCurrentUserId(req);

  const issue = db.issues.find(i => i.id === id);
  if (!issue) return res.status(404).json({ error: "Issue not found" });

  if (!issue.votes) issue.votes = [];

  // Check if user already voted
  const existingVoteIndex = issue.votes.findIndex((v: any) => v.userId === currentUserId);
  const currentUser = db.users.find(u => u.id === currentUserId);

  if (existingVoteIndex !== -1) {
    const oldVote = issue.votes[existingVoteIndex].voteType;
    if (oldVote === voteType) {
      // Toggle off
      issue.votes.splice(existingVoteIndex, 1);
      if (voteType === "VALIDATE") issue.validationsCount = Math.max(0, issue.validationsCount - 1);
      if (voteType === "FLAG") issue.flagsCount = Math.max(0, issue.flagsCount - 1);
    } else {
      // Switch vote
      issue.votes[existingVoteIndex].voteType = voteType;
      if (voteType === "VALIDATE") {
        issue.validationsCount += 1;
        issue.flagsCount = Math.max(0, issue.flagsCount - 1);
      } else {
        issue.flagsCount += 1;
        issue.validationsCount = Math.max(0, issue.validationsCount - 1);
      }
    }
  } else {
    // New vote
    issue.votes.push({ userId: currentUserId, voteType });
    if (voteType === "VALIDATE") {
      issue.validationsCount += 1;
      if (currentUser) {
        currentUser.xp += 30;
        currentUser.validationsCount += 1;
      }
    } else {
      issue.flagsCount += 1;
      if (currentUser) {
        currentUser.xp += 15;
      }
    }
  }

  // Auto-verify threshold logic: if validations count >= 5 and status is REPORTED, upgrade to VERIFIED
  if (issue.validationsCount >= 5 && issue.status === "REPORTED") {
    issue.status = "VERIFIED";
    issue.statusHistory.push({
      status: "VERIFIED",
      note: "Promoted to Verified status automatically via community consensus thresholds (5+ validations achieved).",
      updatedAt: new Date().toISOString(),
      updatedBy: "Civic Community Engine"
    });
  }

  // Keep levels synchronized
  if (currentUser) {
    const newLevel = Math.floor(currentUser.xp / 500) + 1;
    if (newLevel > currentUser.level) {
      currentUser.level = newLevel;
    }
    // Check and trigger badges if they qualify for "Validator"
    const hasValidatorBadge = currentUser.badges.some((b: any) => b.id === "badge-4");
    if (!hasValidatorBadge && currentUser.validationsCount >= 5) {
      currentUser.badges.push({
        id: "badge-4",
        name: "Validator",
        description: "Voted and confirmed 5+ reports accurately.",
        icon: "Vote",
        unlockedAt: new Date().toISOString()
      });
      currentUser.xp += 150; // Bonus XP
    }
  }

  issue.updatedAt = new Date().toISOString();
  writeDB(db);
  res.json({ issue, profile: currentUser });
});

// 5. Add Comment
app.post("/api/issues/:id/comments", (req, res) => {
  const db = readDB();
  const { id } = req.params;
  const { text } = req.body;
  const currentUserId = getCurrentUserId(req);

  if (!text || text.trim() === "") {
    return res.status(400).json({ error: "Comment text cannot be empty" });
  }

  const issue = db.issues.find(i => i.id === id);
  if (!issue) return res.status(404).json({ error: "Issue not found" });

  const currentUser = db.users.find(u => u.id === currentUserId) || db.users[0];

  const newComment = {
    id: `c-${Date.now()}`,
    authorId: currentUserId,
    authorName: currentUser.name,
    authorAvatar: currentUser.avatar || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=100",
    text,
    createdAt: new Date().toISOString(),
    isOfficial: currentUser.email.endsWith("@metro.gov") || false,
  };

  issue.comments.push(newComment);
  issue.updatedAt = new Date().toISOString();

  // Award XP for constructive engagement
  currentUser.xp += 20;
  const newLevel = Math.floor(currentUser.xp / 500) + 1;
  if (newLevel > currentUser.level) {
    currentUser.level = newLevel;
  }

  // Trigger notification for the original reporter if it's not the current user commenting
  if (issue.reporterId !== currentUserId) {
    const commentNotif: Notification = {
      id: `notif-${Date.now()}`,
      userId: issue.reporterId,
      title: "New Comment on Your Issue",
      message: `${currentUser.name} commented on '${issue.title}': "${text.substring(0, 50)}${text.length > 50 ? "..." : ""}"`,
      type: "NEW_COMMENT",
      issueId: issue.id,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    db.notifications.unshift(commentNotif);
    broadcastNotification(commentNotif);
  } else {
    // If current user is commenting on their own issue, trigger a simulated municipal reply after 4 seconds to show real-time notification mechanics
    setTimeout(() => {
      try {
        const liveDB = readDB();
        const liveIssue = liveDB.issues.find((i: any) => i.id === issue.id);
        if (!liveIssue) return;

        const responder = liveDB.users.find((u: any) => u.id === "user-system-1") || liveDB.users[1];

        const replyComment = {
          id: `c-sim-${Date.now()}`,
          authorId: responder.id,
          authorName: responder.name,
          authorAvatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=100",
          text: `Thanks for posting this. Municipal Works team has logged this update, and regional inspectors will review the location.`,
          createdAt: new Date().toISOString(),
          isOfficial: false
        };

        liveIssue.comments.push(replyComment);
        liveIssue.updatedAt = new Date().toISOString();

        const replyNotif: Notification = {
          id: `notif-reply-${Date.now()}`,
          userId: currentUserId,
          title: "Discussion Reply Received",
          message: `${responder.name} replied on '${liveIssue.title}': "Thanks for posting this..."`,
          type: "NEW_COMMENT",
          issueId: liveIssue.id,
          isRead: false,
          createdAt: new Date().toISOString()
        };

        liveDB.notifications.unshift(replyNotif);
        writeDB(liveDB);
        broadcastNotification(replyNotif);
      } catch (e) {
        console.error("Delayed comment simulation error:", e);
      }
    }, 4000);
  }

  writeDB(db);
  res.status(201).json({ issue, profile: currentUser });
});

// 6. Update Status (Simulate Official Response or Moderator Workflow)
app.post("/api/issues/:id/status", (req, res) => {
  const db = readDB();
  const { id } = req.params;
  const { status, note } = req.body;

  if (!status || !note) {
    return res.status(400).json({ error: "Status and action details are required" });
  }

  const issue = db.issues.find(i => i.id === id);
  if (!issue) return res.status(404).json({ error: "Issue not found" });

  issue.status = status;
  issue.updatedAt = new Date().toISOString();
  issue.statusHistory.push({
    status,
    note,
    updatedAt: new Date().toISOString(),
    updatedBy: "Sarah Chen (Municipal Works Manager)"
  });

  // If issue is resolved, award XP to original reporter
  if (status === "RESOLVED") {
    const reporter = db.users.find(u => u.id === issue.reporterId);
    if (reporter) {
      reporter.xp += 200; // Large reward for successful civic resolution!
      const newLevel = Math.floor(reporter.xp / 500) + 1;
      if (newLevel > reporter.level) {
        reporter.level = newLevel;
      }
    }
  }

  // Send status update notification to the original reporter
  const statusNotif: Notification = {
    id: `notif-${Date.now()}`,
    userId: issue.reporterId,
    title: `Issue Status Updated: ${status}`,
    message: `Your reported issue '${issue.title}' has been moved to '${status}'. Action note: "${note}"`,
    type: "STATUS_UPDATE",
    issueId: issue.id,
    isRead: false,
    createdAt: new Date().toISOString()
  };
  db.notifications.unshift(statusNotif);
  broadcastNotification(statusNotif);

  writeDB(db);
  res.json(issue);
});

// --- Citizen Feed Endpoints (X-like app) ---

// 6a. Get all posts
app.get("/api/posts", (req, res) => {
  const db = readDB();
  const search = (req.query.search as string || "").toLowerCase().trim();
  let results = db.posts || [];
  if (search) {
    results = results.filter(p => 
      p.content.toLowerCase().includes(search) || 
      p.authorName.toLowerCase().includes(search) ||
      p.authorHandle.toLowerCase().includes(search)
    );
  }
  // Sort newest first
  results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(results);
});

// 6b. Create a new post
app.post("/api/posts", (req, res) => {
  const db = readDB();
  const { content, media } = req.body;
  
  if (!content && (!media || media.length === 0)) {
    return res.status(400).json({ error: "Post cannot be empty" });
  }

  const currentUserId = getCurrentUserId(req);
  const currentUser = db.users.find(u => u.id === currentUserId) || db.users[0];

  const newPost = {
    id: `post-${Date.now()}`,
    authorId: currentUserId,
    authorName: currentUser.name,
    authorHandle: currentUser.handle || "@abhinav_s",
    authorAvatar: currentUser.avatar || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=100",
    content: content || "",
    media: media || [],
    likes: 0,
    likedBy: [],
    comments: [],
    createdAt: new Date().toISOString()
  };

  db.posts = db.posts || [];
  db.posts.unshift(newPost);

  // Award user 50 XP for sharing active feedback on the feed!
  currentUser.xp = (currentUser.xp || 0) + 50;
  const newLevel = Math.floor(currentUser.xp / 500) + 1;
  if (newLevel > currentUser.level) {
    currentUser.level = newLevel;
  }

  writeDB(db);
  res.status(201).json({ post: newPost, profile: currentUser });
});

// 6c. Like/Unlike a post
app.post("/api/posts/:id/like", (req, res) => {
  const db = readDB();
  const { id } = req.params;
  const currentUserId = getCurrentUserId(req);

  const post = db.posts.find(p => p.id === id);
  if (!post) {
    return res.status(404).json({ error: "Post not found" });
  }

  post.likedBy = post.likedBy || [];
  const index = post.likedBy.indexOf(currentUserId);
  if (index > -1) {
    // Unlike
    post.likedBy.splice(index, 1);
    post.likes = Math.max(0, post.likes - 1);
  } else {
    // Like
    post.likedBy.push(currentUserId);
    post.likes += 1;
  }

  writeDB(db);
  res.json(post);
});

// 6d. Comment on a post
app.post("/api/posts/:id/comments", (req, res) => {
  const db = readDB();
  const { id } = req.params;
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: "Comment text is required" });
  }

  const post = db.posts.find(p => p.id === id);
  if (!post) {
    return res.status(404).json({ error: "Post not found" });
  }

  const currentUserId = getCurrentUserId(req);
  const currentUser = db.users.find(u => u.id === currentUserId) || db.users[0];

  const newComment = {
    id: `pcomment-${Date.now()}`,
    authorId: currentUserId,
    authorName: currentUser.name,
    authorHandle: currentUser.handle || "@abhinav_s",
    authorAvatar: currentUser.avatar || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=100",
    text: text.trim(),
    createdAt: new Date().toISOString()
  };

  post.comments = post.comments || [];
  post.comments.push(newComment);

  writeDB(db);
  res.json(post);
});

// 6e. Follow/unfollow a user
app.post("/api/users/:id/follow", (req, res) => {
  const db = readDB();
  const targetId = req.params.id;
  const currentUserId = getCurrentUserId(req);

  if (targetId === currentUserId) {
    return res.status(400).json({ error: "You cannot follow yourself" });
  }

  const currentUser = db.users.find(u => u.id === currentUserId);
  if (!currentUser) {
    return res.status(404).json({ error: "Current user not found" });
  }

  currentUser.following = currentUser.following || [];
  const index = currentUser.following.indexOf(targetId);
  let isFollowing = false;
  if (index > -1) {
    // Unfollow
    currentUser.following.splice(index, 1);
  } else {
    // Follow
    currentUser.following.push(targetId);
    isFollowing = true;
  }

  writeDB(db);
  res.json({ following: currentUser.following, isFollowing });
});

// Get user profile details by ID
app.get("/api/users/:id", (req, res) => {
  const db = readDB();
  const userId = req.params.id;
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const reportsCount = (db.issues || []).filter((r: any) => r.reporterId === userId).length;
  const userPosts = (db.posts || [])
    .filter((p: any) => p.authorId === userId)
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const postsCount = userPosts.length;

  res.json({
    id: user.id,
    name: user.name,
    handle: user.handle || `@${user.name?.toLowerCase().replace(/\s+/g, '_')}`,
    avatar: user.avatar,
    role: user.role || "Citizen",
    bio: user.bio || "Civic champion of our township, working to keep our community safe and clean.",
    level: user.level || 1,
    xp: user.xp || 0,
    reputation: user.reputation || 10,
    followingCount: (user.following || []).length,
    reportsCount: reportsCount,
    postsCount: postsCount,
    joinedAt: user.joinedAt || "June 2026",
    posts: userPosts,
    badges: user.badges || [
      {
        id: "badge-fallback-1",
        name: "Eco Patrol",
        description: "Enthusiastic community monitor",
        icon: "ShieldCheck",
        unlockedAt: new Date().toISOString()
      },
      {
        id: "badge-fallback-2",
        name: "Active Watcher",
        description: "Observant citizen keeping our roads and community clean",
        icon: "Award",
        unlockedAt: new Date().toISOString()
      }
    ]
  });
});

// Search other users by name or handle
app.get("/api/users/search", (req, res) => {
  const db = readDB();
  const query = (req.query.q || "").toString().toLowerCase().trim();
  const currentUserId = getCurrentUserId(req);

  let matchedUsers = [];
  if (query) {
    matchedUsers = db.users.filter(u => {
      const nameMatch = u.name && u.name.toLowerCase().includes(query);
      const handleMatch = u.handle && u.handle.toLowerCase().includes(query);
      return (nameMatch || handleMatch) && u.id !== currentUserId;
    });
  } else {
    // If no search query, provide some recommended/all users
    matchedUsers = db.users.filter(u => u.id !== currentUserId);
  }

  res.json(matchedUsers);
});

// 7. Get logged-in user profile
app.get("/api/profile", (req, res) => {
  const db = readDB();
  const currentUserId = getCurrentUserId(req);
  const user = db.users.find(u => u.id === currentUserId);
  if (!user) {
    return res.status(404).json({ error: "Profile not found" });
  }
  res.json(user);
});

// Update logged-in user profile
app.post("/api/profile", (req, res) => {
  const db = readDB();
  const currentUserId = getCurrentUserId(req);
  const user = db.users.find(u => u.id === currentUserId);
  if (!user) {
    return res.status(404).json({ error: "Profile not found" });
  }

  const { name, phone, address, state, city, gender, dob, avatar, handle } = req.body;

  if (!user.profileUpdatesLog) {
    user.profileUpdatesLog = [];
  }
  const timestamp = new Date().toISOString();

  if (name !== undefined && name !== null && name !== user.name) {
    user.profileUpdatesLog.push({ field: "Name", oldValue: user.name || "None", newValue: name, updatedAt: timestamp });
    user.name = name;
  }
  if (phone !== undefined && phone !== null && phone !== user.phone) {
    user.profileUpdatesLog.push({ field: "Phone", oldValue: user.phone || "None", newValue: phone, updatedAt: timestamp });
    user.phone = phone;
  }
  if (address !== undefined && address !== null && address !== user.address) {
    user.profileUpdatesLog.push({ field: "Address", oldValue: user.address || "None", newValue: address, updatedAt: timestamp });
    user.address = address;
  }
  if (state !== undefined && state !== null && state !== user.state) {
    user.profileUpdatesLog.push({ field: "State", oldValue: user.state || "None", newValue: state, updatedAt: timestamp });
    user.state = state;
  }
  if (city !== undefined && city !== null && city !== user.city) {
    user.profileUpdatesLog.push({ field: "City", oldValue: user.city || "None", newValue: city, updatedAt: timestamp });
    user.city = city;
  }
  if (gender !== undefined && gender !== null && gender !== user.gender) {
    user.profileUpdatesLog.push({ field: "Gender", oldValue: user.gender || "None", newValue: gender, updatedAt: timestamp });
    user.gender = gender;
  }
  if (dob !== undefined && dob !== null && dob !== user.dob) {
    user.profileUpdatesLog.push({ field: "DOB", oldValue: user.dob || "None", newValue: dob, updatedAt: timestamp });
    user.dob = dob;
  }
  if (avatar !== undefined && avatar !== null && avatar !== user.avatar) {
    user.profileUpdatesLog.push({ field: "Avatar", oldValue: "Updated picture", newValue: "Updated picture", updatedAt: timestamp });
    user.avatar = avatar;
  }
  if (handle !== undefined && handle !== null && handle !== user.handle) {
    user.profileUpdatesLog.push({ field: "Handle", oldValue: user.handle || "None", newValue: handle, updatedAt: timestamp });
    user.handle = handle;
  }

  writeDB(db);
  res.json(user);
});

// 8. Get Leaderboard
app.get("/api/leaderboard", (req, res) => {
  const db = readDB();
  // Sort users by XP descending
  const leaderboard = [...db.users].sort((a, b) => b.xp - a.xp);
  res.json(leaderboard);
});

// 9. Real-time Notifications Endpoints
// SSE stream endpoint
app.get("/api/notifications/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const client = {
    id: Date.now(),
    res
  };
  sseClients.push(client);

  res.write(`data: ${JSON.stringify({ type: "CONNECTED" })}\n\n`);

  req.on("close", () => {
    sseClients = sseClients.filter(c => c.id !== client.id);
  });
});

// Get user notifications
app.get("/api/notifications", (req, res) => {
  const db = readDB();
  const currentUserId = getCurrentUserId(req);
  const userNotifications = db.notifications.filter(n => n.userId === currentUserId);
  res.json(userNotifications);
});

// Mark single notification as read
app.post("/api/notifications/:id/read", (req, res) => {
  const db = readDB();
  const { id } = req.params;
  const currentUserId = getCurrentUserId(req);

  const notif = db.notifications.find(n => n.id === id && n.userId === currentUserId);
  if (notif) {
    notif.isRead = true;
    writeDB(db);
    res.json({ success: true, notification: notif });
  } else {
    res.status(404).json({ error: "Notification not found" });
  }
});

// Mark all notifications as read
app.post("/api/notifications/read-all", (req, res) => {
  const db = readDB();
  const currentUserId = getCurrentUserId(req);

  db.notifications.forEach(n => {
    if (n.userId === currentUserId) {
      n.isRead = true;
    }
  });

  writeDB(db);
  res.json({ success: true });
});

// Simulate live multi-user notification events for demo
app.post("/api/notifications/simulate", (req, res) => {
  const db = readDB();
  const currentUserId = getCurrentUserId(req);
  const { type } = req.body;

  let notif: Notification;

  if (type === "STATUS_UPDATE") {
    // Pick an issue reported by current user or a default one
    notif = {
      id: `notif-sim-${Date.now()}`,
      userId: currentUserId,
      title: "Crew Dispatch Underway",
      message: "The status of your reported 'Major Pothole on Oakwood Boulevard' has been updated to IN_PROGRESS. Heavy repair equipment is on-site.",
      type: "STATUS_UPDATE",
      issueId: "issue-1",
      isRead: false,
      createdAt: new Date().toISOString()
    };
  } else if (type === "NEW_COMMENT") {
    notif = {
      id: `notif-sim-${Date.now()}`,
      userId: currentUserId,
      title: "New Public Comment",
      message: "Elena Rostova commented on 'Water Main Burst & Flooding': 'This is flooding my driveway as well, glad it is reported!'",
      type: "NEW_COMMENT",
      issueId: "issue-2",
      isRead: false,
      createdAt: new Date().toISOString()
    };
  } else if (type === "VICINITY_ISSUE") {
    notif = {
      id: `notif-sim-${Date.now()}`,
      userId: currentUserId,
      title: "New Issue In Your Vicinity",
      message: "Marcus Vance just reported an active 'Illegal Dump of Building Materials' near Broadway & Oakwood (0.3 km away).",
      type: "VICINITY_ISSUE",
      issueId: "issue-4",
      isRead: false,
      createdAt: new Date().toISOString()
    };
  } else {
    // VERIFICATION_REQUEST
    notif = {
      id: `notif-sim-${Date.now()}`,
      userId: currentUserId,
      title: "Verification Request",
      message: "A citizen reported a Broken Streetlight nearby. Can you verify this concern to advance city consensus and earn +150 XP?",
      type: "VERIFICATION_REQUEST",
      issueId: "issue-3",
      isRead: false,
      createdAt: new Date().toISOString()
    };
  }

  db.notifications.unshift(notif);
  writeDB(db);
  broadcastNotification(notif);
  res.json(notif);
});

// 10. AI-powered Issue Analysis & Categorization
app.post("/api/analyze-issue", async (req, res) => {
  const { description, imageBase64 } = req.body;

  if (!description) {
    return res.status(400).json({ error: "Description is required for analysis." });
  }

  // Default fallback data for local simulation if API key is not active
  const fallbackResponse = {
    category: "OTHER",
    severity: "MEDIUM",
    refinedTitle: "Civic Hazard Report",
    refinedDescription: description,
    tags: ["Community Concern"],
    urgencyScore: 50,
    explanation: "Standard local baseline processing."
  };

  // Determine standard fallback mapping based on keyword heuristics
  const descLower = description.toLowerCase();
  if (descLower.includes("pothole") || descLower.includes("crater") || descLower.includes("asphalt") || descLower.includes("road")) {
    fallbackResponse.category = "POTHOLES";
    fallbackResponse.severity = descLower.includes("deep") || descLower.includes("dangerous") ? "HIGH" : "MEDIUM";
    fallbackResponse.refinedTitle = "Road Quality Concern: Pothole Detected";
    fallbackResponse.tags = ["Roadway", "Vehicle Safety", "Pothole Patrol"];
    fallbackResponse.urgencyScore = fallbackResponse.severity === "HIGH" ? 80 : 50;
  } else if (descLower.includes("leak") || descLower.includes("burst") || descLower.includes("water") || descLower.includes("flooding") || descLower.includes("drain")) {
    fallbackResponse.category = "WATER_LEAKAGE";
    fallbackResponse.severity = descLower.includes("gushing") || descLower.includes("flooding") ? "CRITICAL" : "HIGH";
    fallbackResponse.refinedTitle = "Water Infrastructure Outage: Pipeline Leakage";
    fallbackResponse.tags = ["Hydro Utilities", "Resource Waste", "Safety Hazard"];
    fallbackResponse.urgencyScore = fallbackResponse.severity === "CRITICAL" ? 95 : 75;
  } else if (descLower.includes("light") || descLower.includes("dark") || descLower.includes("lamp") || descLower.includes("streetlight") || descLower.includes("bulb")) {
    fallbackResponse.category = "STREETLIGHTS";
    fallbackResponse.severity = "LOW";
    fallbackResponse.refinedTitle = "Public Safety: Broken Streetlight Grid";
    fallbackResponse.tags = ["Electrical Utility", "Night Safety", "Illumination"];
    fallbackResponse.urgencyScore = 30;
  } else if (descLower.includes("trash") || descLower.includes("garbage") || descLower.includes("waste") || descLower.includes("dump") || descLower.includes("litter")) {
    fallbackResponse.category = "WASTE_MANAGEMENT";
    fallbackResponse.severity = descLower.includes("block") || descLower.includes("smell") ? "MEDIUM" : "LOW";
    fallbackResponse.refinedTitle = "Environmental Sanitation: Waste Pile-up";
    fallbackResponse.tags = ["Sanitation", "Hygiene", "Illegal Dumping"];
    fallbackResponse.urgencyScore = 45;
  } else if (descLower.includes("bridge") || descLower.includes("rail") || descLower.includes("sidewalk") || descLower.includes("park") || descLower.includes("infrastructure")) {
    fallbackResponse.category = "PUBLIC_INFRASTRUCTURE";
    fallbackResponse.severity = descLower.includes("rust") || descLower.includes("collapse") ? "HIGH" : "MEDIUM";
    fallbackResponse.refinedTitle = "Structural Facility Outage: Sidewalk/Railing Asset";
    fallbackResponse.tags = ["Municipal Structures", "Pedestrian Zone", "Public Asset"];
    fallbackResponse.urgencyScore = 65;
  }

  if (!ai) {
    console.log("No AI client configured. Returning local keyword analysis.");
    return res.json(fallbackResponse);
  }

  try {
    let contents: any[] = [];
    let systemInstruction = `You are a municipal safety assistant. Review the civic issue report (description text and optional image).
Analyze and return a JSON object with:
- "category" (string, must be exactly one of: "POTHOLES", "WATER_LEAKAGE", "STREETLIGHTS", "WASTE_MANAGEMENT", "PUBLIC_INFRASTRUCTURE", "OTHER")
- "severity" (string, must be exactly one of: "LOW", "MEDIUM", "HIGH", "CRITICAL")
- "refinedTitle" (string, a concise, professional title summarizing the hazard and address if known, max 8 words)
- "refinedDescription" (string, a cleaned up, professional version of the description focusing on factual details)
- "tags" (array of strings, e.g., ["Road Hazard", "Vehicle Risk"])
- "urgencyScore" (integer from 1 to 100 representing prioritize weights)
- "explanation" (string, a brief 2-sentence rationale for these ratings)

Format your output strictly as a valid JSON matching the schema.`;

    if (imageBase64) {
      // Split header from base64 if present
      const base64Clean = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
      contents.push({
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Clean } },
          { text: `Analyze this image and description: "${description}"` }
        ]
      });
    } else {
      contents.push(`Analyze this civic description: "${description}"`);
    }

    const response = await generateContentWithRetry({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            severity: { type: Type.STRING },
            refinedTitle: { type: Type.STRING },
            refinedDescription: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            urgencyScore: { type: Type.INTEGER },
            explanation: { type: Type.STRING }
          },
          required: ["category", "severity", "refinedTitle", "refinedDescription", "urgencyScore", "explanation"]
        }
      }
    });

    const textOutput = response.text;
    if (textOutput) {
      const parsed = JSON.parse(textOutput.trim());
      return res.json(parsed);
    } else {
      return res.json(fallbackResponse);
    }
  } catch (err: any) {
    console.log("[Gemini Fallback] Activated local smart simulation for issue analysis:", err?.message || err);
    return res.json(fallbackResponse);
  }
});

// 11. AI-powered Predictive Insights & Resource Allocation Projections
app.get("/api/predictive-insights", async (req, res) => {
  const db = readDB();

  // Local beautiful mock fallback data
  const fallbackInsights = [
    {
      id: "pred-1",
      title: "Elevated Pothole Formation Risk",
      description: "Based on consecutive temperature fluctuations and sudden precipitation forecasts, the Oakwood-Broadway corridor is predicted to see a high rate of tarmac erosion and expansion-cracking in the next 14 days.",
      riskLevel: "HIGH" as const,
      category: "POTHOLES" as const,
      latitude: 40.7280,
      longitude: -73.9910,
      address: "Oakwood Blvd & Broadway Corridor",
      probability: 88,
      recommendedAction: "Pre-deploy patching asphalt crews to key arterial lanes. Perform sub-surface ground sonar radar checks if possible."
    },
    {
      id: "pred-2",
      title: "Hydro-Infrastructure Stress Warning",
      description: "Water pressure telemetry in Sector C (Lower Pine St) indicates micro-cavitation spikes during peak hours. Rusted 1970s iron piping is highly susceptible to fatigue cracks.",
      riskLevel: "MEDIUM" as const,
      category: "WATER_LEAKAGE" as const,
      latitude: 40.7160,
      longitude: -74.0090,
      address: "Lower Pine Street Water Sector",
      probability: 62,
      recommendedAction: "Install micro-acoustic leak sensors near main fire hydrant nodes to catch early hairline bursts."
    },
    {
      id: "pred-3",
      title: "Illumination Failure Risk - Parkside",
      description: "Streetlight outage reports in the Parkside precinct exhibit a cyclic pattern every 6 months. Telemetry suggests standard older copper wiring arrays are overheating under elevated night summer loads.",
      riskLevel: "LOW" as const,
      category: "STREETLIGHTS" as const,
      latitude: 40.7395,
      longitude: -73.9870,
      address: "Greenview Park perimeter walkway",
      probability: 45,
      recommendedAction: "Schedule preventative thermal inspections on regional transformer cabinets before sunset peak loads."
    }
  ];

  if (!ai) {
    console.log("No AI client configured. Returning pre-seeded predictive insights.");
    return res.json({ insights: fallbackInsights, modelUsed: "local-simulation" });
  }

  try {
    const issuesBrief = db.issues.map(i => ({
      category: i.category,
      severity: i.severity,
      status: i.status,
      address: i.address,
      validations: i.validationsCount
    }));

    const systemInstruction = `You are a municipal urban planning AI. Analyze the existing reported civic infrastructure issues and forecast exactly 3 highly detailed "Predictive Insights" where new issues are highly likely to occur due to seasonal factors, historical trends, or geographic clustering.
Format your response as a JSON object containing an "insights" array. Each insight MUST have:
- "id" (string, e.g., "pred-x")
- "title" (string, e.g., "Precipitation-Induced Road Pavement Strain")
- "description" (string, high-fidelity forecasting explanation based on environmental stressors, max 3 sentences)
- "riskLevel" (string, must be exactly one of: "LOW", "MEDIUM", "HIGH")
- "category" (string, must be exactly one of: "POTHOLES", "WATER_LEAKAGE", "STREETLIGHTS", "WASTE_MANAGEMENT", "PUBLIC_INFRASTRUCTURE", "OTHER")
- "latitude" (number, between 40.71 and 40.74 reflecting our sample grid region)
- "longitude" (number, between -74.01 and -73.98 reflecting our sample grid region)
- "address" (string, a specific area, intersection or municipal corridor)
- "probability" (number between 0 and 100)
- "recommendedAction" (string, clear, actionable preventative maintenance suggestions for city engineers, max 2 sentences)`;

    const prompt = `Analyze these existing civic issues and project predictive insights: ${JSON.stringify(issuesBrief)}`;

    const response = await generateContentWithRetry({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            insights: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  riskLevel: { type: Type.STRING },
                  category: { type: Type.STRING },
                  latitude: { type: Type.NUMBER },
                  longitude: { type: Type.NUMBER },
                  address: { type: Type.STRING },
                  probability: { type: Type.INTEGER },
                  recommendedAction: { type: Type.STRING }
                },
                required: ["id", "title", "description", "riskLevel", "category", "latitude", "longitude", "address", "probability", "recommendedAction"]
              }
            }
          },
          required: ["insights"]
        }
      }
    });

    const textOutput = response.text;
    if (textOutput) {
      const parsed = JSON.parse(textOutput.trim());
      return res.json({ insights: parsed.insights, modelUsed: "gemini-3.5-flash" });
    } else {
      return res.json({ insights: fallbackInsights, modelUsed: "local-simulation-fallback" });
    }
  } catch (err: any) {
    console.log("[Gemini Fallback] Activated local smart simulation for predictive analytics:", err?.message || err);
    return res.json({ insights: fallbackInsights, modelUsed: "local-simulation-error-fallback" });
  }
});

// Create uploads directory if it does not exist
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files statically
app.use("/uploads", express.static(uploadsDir));

// Configure multer storage
const multerStorage = multer.memoryStorage();
const upload = multer({ storage: multerStorage });

// Helper to sanitize filename
function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9.-]/g, "_");
}

// Map to track chunk upload session info
interface ChunkSession {
  filename: string;
  mimeType: string;
  totalChunks: number;
  uploadedChunks: Set<number>;
  chunksDir: string;
}
const chunkSessions = new Map<string, ChunkSession>();

// Standard upload route
app.post("/api/media/upload", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file was uploaded." });
    }

    const fileId = "file-" + Date.now() + "-" + Math.random().toString(36).substring(2, 11);
    const originalName = req.file.originalname || "upload";
    const extension = path.extname(originalName) || ((req.file.mimetype && req.file.mimetype.startsWith("image/")) ? ".jpg" : ".webm");
    const sanitizedName = sanitizeFilename(path.basename(originalName, extension)) + extension;
    const filename = `${fileId}-${sanitizedName}`;
    const destinationPath = path.join(uploadsDir, filename);

    fs.writeFileSync(destinationPath, req.file.buffer);

    const url = `/uploads/${filename}`;
    return res.json({
      fileId,
      url,
      thumbnailUrl: url,
      uploadedAt: new Date().toISOString(),
      size: req.file.size,
      type: req.file.mimetype,
      name: originalName,
    });
  } catch (err: any) {
    console.error("Upload error in standard API:", err);
    return res.status(500).json({ error: "Failed to store uploaded file on server.", message: err.message });
  }
});

// Check resumable chunked upload progress status
app.get("/api/media/upload-chunked/status", (req, res) => {
  const sessionId = req.query.sessionId as string;
  if (!sessionId) {
    return res.status(400).json({ error: "sessionId is required." });
  }

  const session = chunkSessions.get(sessionId);
  if (!session) {
    return res.json({ nextChunkIndex: 0 });
  }

  let nextChunkIndex = 0;
  while (session.uploadedChunks.has(nextChunkIndex)) {
    nextChunkIndex++;
  }

  return res.json({ nextChunkIndex });
});

// Chunked resumable upload route
app.post("/api/media/upload-chunked", upload.single("chunk"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No chunk was uploaded." });
    }

    const sessionId = req.body.sessionId;
    const chunkIndex = parseInt(req.body.chunkIndex);
    const totalChunks = parseInt(req.body.totalChunks);
    const filenameInput = req.body.filename || "chunked_file";
    const mimeType = req.body.mimeType || "application/octet-stream";

    if (!sessionId || isNaN(chunkIndex) || isNaN(totalChunks)) {
      return res.status(400).json({ error: "sessionId, chunkIndex, and totalChunks are required." });
    }

    let session = chunkSessions.get(sessionId);
    if (!session) {
      const chunksDir = path.join(process.cwd(), "temp_chunks", sessionId);
      if (!fs.existsSync(chunksDir)) {
        fs.mkdirSync(chunksDir, { recursive: true });
      }
      session = {
        filename: filenameInput,
        mimeType,
        totalChunks,
        uploadedChunks: new Set<number>(),
        chunksDir,
      };
      chunkSessions.set(sessionId, session);
    }

    const chunkPath = path.join(session.chunksDir, `chunk_${chunkIndex}`);
    fs.writeFileSync(chunkPath, req.file.buffer);
    session.uploadedChunks.add(chunkIndex);

    if (session.uploadedChunks.size === session.totalChunks) {
      const fileId = "file-" + Date.now() + "-" + Math.random().toString(36).substring(2, 11);
      const extension = path.extname(session.filename) || ((session.mimeType && session.mimeType.startsWith("image/")) ? ".jpg" : ".webm");
      const sanitizedName = sanitizeFilename(path.basename(session.filename, extension)) + extension;
      const finalFilename = `${fileId}-${sanitizedName}`;
      const finalFilePath = path.join(uploadsDir, finalFilename);

      const buffers: Buffer[] = [];
      for (let i = 0; i < session.totalChunks; i++) {
        const piecePath = path.join(session.chunksDir, `chunk_${i}`);
        const data = fs.readFileSync(piecePath);
        buffers.push(data);
        fs.unlinkSync(piecePath);
      }
      fs.writeFileSync(finalFilePath, Buffer.concat(buffers));

      try {
        fs.rmdirSync(session.chunksDir);
      } catch (rmErr) {
        console.warn("Failed to remove temporary chunks directory:", rmErr);
      }

      chunkSessions.delete(sessionId);

      const url = `/uploads/${finalFilename}`;
      return res.json({
        uploadComplete: true,
        fileId,
        url,
        thumbnailUrl: url,
        uploadedAt: new Date().toISOString(),
        size: fs.statSync(finalFilePath).size,
        type: session.mimeType,
        name: session.filename,
      });
    }

    return res.json({
      uploadComplete: false,
      chunkReceived: chunkIndex,
      nextChunkIndex: chunkIndex + 1,
    });
  } catch (err: any) {
    console.error("Chunk upload error:", err);
    return res.status(500).json({ error: "Failed to process chunk upload.", message: err.message });
  }
});

// Delete media route
app.delete("/api/media/:fileId", (req, res) => {
  try {
    const fileId = req.params.fileId;
    if (!fileId) {
      return res.status(400).json({ error: "fileId is required." });
    }

    const files = fs.readdirSync(uploadsDir);
    const targetFile = files.find((name) => name.startsWith(fileId));

    if (targetFile) {
      const filePath = path.join(uploadsDir, targetFile);
      fs.unlinkSync(filePath);
      return res.json({ success: true, message: "File deleted successfully." });
    } else {
      return res.status(404).json({ error: "File not found or already deleted." });
    }
  } catch (err: any) {
    console.error("Failed to delete media:", err);
    return res.status(500).json({ error: "Failed to delete file from platform storage." });
  }
});

// Configure Vite middleware or build static folder serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Civic Platform Server running at http://localhost:${PORT}`);
  });
}

startServer();
