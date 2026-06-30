import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSwipeable } from "react-swipeable";
import { motion } from "motion/react";
import { Issue, UserProfile, IssueCategory, IssueStatus, Notification } from "./types";
import IssueCard from "./components/IssueCard";
import ImpactDashboard from "./components/ImpactDashboard";
import PredictiveInsightsPanel from "./components/PredictiveInsightsPanel";
import GamificationCenter from "./components/GamificationCenter";
import IssueReportForm from "./components/IssueReportForm";
import CitizenFeed from "./components/CitizenFeed";
import AuthScreen from "./components/AuthScreen";
import UserProfileSection from "./components/UserProfileSection";
import TypewriterText from "./components/TypewriterText";
import IssueMap from "./components/IssueMap";
import IssueViewModal from "./components/IssueViewModal";
import { jsPDF } from "jspdf";


import { 
  Compass, Map, FileText, BarChart3, BrainCircuit, Trophy, 
  Sparkles, Search, SlidersHorizontal, AlertCircle, CheckCircle, HelpCircle,
  Bell, BellRing, MessageSquare, MapPin, TrendingUp, ShieldAlert, Check, CheckSquare, X, Radio,
  Camera, User, Menu
} from "lucide-react";

// Professional high-fidelity PDF Generator for Civic Reports
export function generateReportPDF(issue: Issue, user: UserProfile) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Theme colors matching the Civic Watch aesthetic
  const primaryColor = [16, 185, 129]; // Emerald (#10b981)
  const darkSlate = [15, 23, 42]; // Slate 900
  const lightGray = [241, 245, 249]; // Slate 100

  // Title / Header Banner
  doc.setFillColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.rect(0, 0, 210, 40, "F");

  // App Title
  doc.setTextColor(255, 255, 255);
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(22);
  doc.text("CIVIC WATCH PORTAL", 15, 18);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(16, 185, 129); // Emerald
  doc.text("COMMUNITY WATCH & INFRASTRUCTURE RADAR", 15, 25);

  doc.setFontSize(9);
  doc.setTextColor(156, 163, 175); // Gray 400
  doc.text(`Generated: ${new Date().toLocaleString()}`, 145, 18);
  doc.text(`System ID: CW-${issue.id || "TEMP"}`, 145, 24);

  // Decorative Accent bar
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 40, 210, 3, "F");

  // Section 1: Report Overview
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(14);
  doc.text("COMMUNITY CONCERN REPORT", 15, 55);

  // Draw thin line under header
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setLineWidth(0.5);
  doc.line(15, 58, 195, 58);

  // Details Grid
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Report Title:", 15, 68);
  doc.setFont("Helvetica", "normal");
  doc.text(issue.title || "N/A", 50, 68);

  doc.setFont("Helvetica", "bold");
  doc.text("Category:", 15, 76);
  doc.setFont("Helvetica", "normal");
  doc.text(String(issue.category || "N/A").replace("_", " "), 50, 76);

  doc.setFont("Helvetica", "bold");
  doc.text("Severity Level:", 15, 84);
  doc.setFont("Helvetica", "normal");
  doc.text(issue.severity || "N/A", 50, 84);

  doc.setFont("Helvetica", "bold");
  doc.text("Current Status:", 15, 92);
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(issue.status || "REPORTED", 50, 92);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);

  // Section 2: Location
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Location Information", 15, 105);
  doc.line(15, 107, 195, 107);

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Street Address:", 15, 115);
  doc.setFont("Helvetica", "normal");
  doc.text(issue.address || "Pinned Location", 50, 115);

  doc.setFont("Helvetica", "bold");
  doc.text("GPS Coordinates:", 15, 123);
  doc.setFont("Helvetica", "normal");
  doc.text(`Lat: ${issue.latitude || "N/A"}, Lng: ${issue.longitude || "N/A"}`, 50, 123);

  // Section 3: Reporter Details
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Reporter Information", 15, 136);
  doc.line(15, 138, 195, 138);

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Citizen Name:", 15, 146);
  doc.setFont("Helvetica", "normal");
  doc.text(user.name || "Anonymous Citizen", 50, 146);

  doc.setFont("Helvetica", "bold");
  doc.text("Citizen Email:", 15, 154);
  doc.setFont("Helvetica", "normal");
  doc.text(user.email || "N/A", 50, 154);

  // Section 4: Description
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Detailed Description", 15, 167);
  doc.line(15, 169, 195, 169);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(10);
  
  // Wrap description text
  const splitDescription = doc.splitTextToSize(issue.description || "No description provided.", 180);
  doc.text(splitDescription, 15, 177);

  // Footer banner
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.rect(15, 250, 180, 25, "F");

  doc.setTextColor(71, 85, 105); // Slate 600
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Thank you for your active participation in making our city safer and cleaner.", 20, 258);
  doc.text("This report is recorded in the Civic Watch blockchain catalog. Verified responses undergo", 20, 263);
  doc.text("active municipal triage within 24 to 48 hours.", 20, 268);

  return doc;
}

type TabState = "MAP" | "FEED" | "ANALYTICS" | "PREDICTIVE" | "GAMIFICATION" | "PROFILE";
const TABS: TabState[] = ["MAP", "FEED", "ANALYTICS", "PREDICTIVE", "GAMIFICATION", "PROFILE"];

// API Fetch wrapper to automatically inject user-id header if available with network retry resilience
const apiFetch = async (url: string, options: RequestInit = {}, retries = 3, delay = 1000): Promise<Response> => {
  const userId = localStorage.getItem("civic_watch_user_id");
  const headers = {
    ...options.headers,
    ...(userId ? { "x-user-id": userId } : {})
  };
  try {
    const res = await fetch(url, { ...options, headers });
    
    // Automatically retry if rate limited (429) or temporary server errors (500+)
    if ((res.status === 429 || res.status >= 500) && retries > 0) {
      console.warn(`[API FETCH RETRY] Received status ${res.status} for ${url}. Retrying in ${delay}ms... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return apiFetch(url, options, retries - 1, delay * 1.5);
    }

    // Wrap the response .json() method to handle Rate exceeded plain text / non-JSON responses gracefully
    const originalJson = res.json.bind(res);
    res.json = async function () {
      try {
        const clone = res.clone();
        const text = await clone.text();
        
        if (text.includes("Rate exceeded.") || text.trim() === "Rate exceeded.") {
          console.warn(`[API FETCH] Intercepted 'Rate exceeded.' response for ${url}. Returning safe fallback.`);
          return url.includes("/issues") || url.includes("/leaderboard") || url.includes("/notifications") ? [] : {};
        }

        try {
          return JSON.parse(text);
        } catch (parseErr) {
          console.error(`[API FETCH] Failed to parse JSON for ${url}: ${String(parseErr)}. Text was: "${text.substring(0, 100)}". Returning safe fallback.`);
          return url.includes("/issues") || url.includes("/leaderboard") || url.includes("/notifications") ? [] : {};
        }
      } catch (err) {
        console.error(`[API FETCH] Error in customized json() method for ${url}:`, err);
        return url.includes("/issues") || url.includes("/leaderboard") || url.includes("/notifications") ? [] : {};
      }
    };

    return res;
  } catch (err) {
    if (retries > 0) {
      console.warn(`[API FETCH RETRY] Failed to fetch ${url} due to network error. Retrying in ${delay}ms... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return apiFetch(url, options, retries - 1, delay * 1.5);
    }
    throw err;
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState<TabState>("MAP");
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    localStorage.removeItem("civic_watch_dark_mode");
  }, []);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // User Geolocation States
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [isLocatingOnLogin, setIsLocatingOnLogin] = useState(false);

  // Coordinate Pinning variables
  const [selectedAddress, setSelectedAddress] = useState("");
  const [tempPin, setTempPin] = useState<any>(null);
  const [isPinningMode, setIsPinningMode] = useState(false);
  const [selectedIssueMap, setSelectedIssueMap] = useState<Issue | null>(null);

  // Notifications State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showCreateFeedPost, setShowCreateFeedPost] = useState(false);
  const isFetchingIssues = useRef(false);

  // Global Toast Notification
  const [toast, setToast] = useState<{ msg: string; type: "success" | "info" } | null>(null);

  // Real-time live geolocation tracking watch with automatic robust fallbacks
  useEffect(() => {
    if (!navigator.geolocation) {
      console.warn("Geolocation is not supported by this browser.");
      return;
    }

    let watchId: number;

    const startWatch = (highAccuracy: boolean) => {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setUserLocation((prev) => {
            if (prev && Math.abs(prev.lat - lat) < 0.00001 && Math.abs(prev.lng - lng) < 0.00001) {
              return prev;
            }
            return { lat, lng };
          });
        },
        (err) => {
          console.warn(`Live location watch error (highAccuracy=${highAccuracy}):`, err);
          if (highAccuracy && (err.code === err.TIMEOUT || err.code === err.POSITION_UNAVAILABLE)) {
            console.info("Retrying live location watch with standard accuracy...");
            navigator.geolocation.clearWatch(watchId);
            startWatch(false);
          }
        },
        { enableHighAccuracy: highAccuracy, timeout: highAccuracy ? 8000 : 25000, maximumAge: highAccuracy ? 0 : 300000 }
      );
    };

    startWatch(true);

    return () => {
      if (watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  // Submission popup states
  const [submittedIssueReport, setSubmittedIssueReport] = useState<{ issue: Issue; pdf: any } | null>(null);
  const [reportCount, setReportCount] = useState(0);

  const showToast = (msg: string, type: "success" | "info" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const autoIdentifyLocation = useCallback(async (userId: string) => {
    if (!navigator.geolocation) {
      console.warn("Geolocation is not supported by this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setUserLocation({ lat, lng });
        showToast("Auto-located successfully! Synchronizing neighborhood hazards around you.");

        // Post coordinates to seed local issues
        try {
          const res = await apiFetch("/api/issues/seed-around", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ latitude: lat, longitude: lng })
          });
          if (res.ok) {
            const data = await res.json();
            if (data.seededCount > 0) {
              showToast(`Seeded ${data.seededCount} active local hazards in your neighborhood!`);
            } else {
              showToast("Community database synced. Viewing active neighborhood hazards.");
            }
            setIssues(data.issues);
          }
        } catch (err) {
          console.error("Error seeding around user location:", err);
        }
      },
      async (err) => {
        console.warn("[Geolocation] Auto-identify fallback active:", err);
        const fallbackLat = 37.7749;
        const fallbackLng = -122.4194;
        setUserLocation({ lat: fallbackLat, lng: fallbackLng });
        showToast("Auto-location sync unavailable. Reverting to municipal defaults.", "info");

        // Seed with default coordinates to keep the experience seamless
        try {
          const res = await apiFetch("/api/issues/seed-around", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ latitude: fallbackLat, longitude: fallbackLng })
          });
          if (res.ok) {
            const data = await res.json();
            setIssues(data.issues);
          }
        } catch (seedErr) {
          console.warn("Failed to seed using fallback location:", seedErr);
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await apiFetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error("Error loading notifications:", err);
    }
  }, []);

  const handleMarkAsRead = async (notifId: string) => {
    try {
      const res = await apiFetch(`/api/notifications/${notifId}/read`, { method: "POST" });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, isRead: true } : n));
      }
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await apiFetch("/api/notifications/read-all", { method: "POST" });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        showToast("All notifications marked as read.");
      }
    } catch (err) {
      console.error("Error marking all read:", err);
    }
  };

  const handleTriggerSimulation = async (type: string) => {
    try {
      const res = await apiFetch("/api/notifications/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type })
      });
      if (res.ok) {
        showToast("Simulation signal dispatched!");
      } else {
        console.error("Simulation failed");
      }
    } catch (err) {
      console.error("Error triggering simulation:", err);
    }
  };

  const loadIssues = useCallback(async () => {
    if (isFetchingIssues.current) return;
    isFetchingIssues.current = true;
    try {
      const res = await apiFetch("/api/issues");
      const data = await res.json();
      setIssues(data);
    } catch (err) {
      console.error("Error loading issues:", err);
    } finally {
      isFetchingIssues.current = false;
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [resIssues, resProfile, resLeaderboard] = await Promise.all([
        apiFetch("/api/issues"),
        apiFetch("/api/profile"),
        apiFetch("/api/leaderboard")
      ]);

      const issuesData = await resIssues.json();
      const profileData = await resProfile.json();
      const leaderboardData = await resLeaderboard.json();

      setIssues(issuesData);
      setProfile(profileData);
      setLeaderboard(leaderboardData);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const storedUserId = localStorage.getItem("civic_watch_user_id");
    if (storedUserId) {
      loadData();
      loadNotifications();
      
      const hasBeenPromptedBefore = localStorage.getItem(`civic_watch_location_prompted_${storedUserId}`);
      if (hasBeenPromptedBefore === "true") {
        autoIdentifyLocation(storedUserId);
      }
    } else {
      setLoading(false);
    }
  }, [autoIdentifyLocation]);

  useEffect(() => {
    if (!profile) return;

    // Establish real-time SSE stream connection
    const eventSource = new EventSource("/api/notifications/stream");

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "NOTIFICATION") {
          const newNotif = payload.data;
          // Only show notification if it belongs to the current logged-in user
          if (newNotif.userId === profile.id) {
            setNotifications(prev => [newNotif, ...prev]);
            showToast(`🔔 ${newNotif.title}: ${newNotif.message.substring(0, 50)}...`, "info");
            
            // Re-fetch issues to display the new update/comment immediately!
            loadIssues();
          }
        }
      } catch (err) {
        console.error("Error parsing live SSE notification payload:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn("SSE stream connection lost or interrupted. Retrying...", err);
    };

    return () => {
      eventSource.close();
    };
  }, [profile]);

  const handleNotificationClick = (notif: Notification) => {
    handleMarkAsRead(notif.id);
    setShowNotifDropdown(false);
    
    // Find matching issue
    const issue = issues.find(i => i.id === notif.issueId);
    if (issue) {
      showToast(`Notification: "${issue.title}" is currently [${issue.status}]`, "info");
    } else {
      showToast(`Notification action linked to issue id ${notif.issueId}`, "info");
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem("civic_watch_user_id");
    setProfile(null);
    setUserLocation(null);
    setNotifications([]);
    showToast("Signed out successfully from portal.", "info");
  };

  const handleReportIssue = async (formData: any) => {
    try {
      const response = await apiFetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      
      if (response.ok) {
        // Add to issue list
        setIssues(prev => [data.issue, ...prev]);
        setProfile(data.profile);
        setTempPin(null);
        setIsPinningMode(false);
        setShowCreateFeedPost(false);
        setReportCount(prev => prev + 1);
        showToast("Issue cataloged! +100 XP Civic Contribution points awarded!");
        
        // Reload leaderboards
        const resLeaderboard = await apiFetch("/api/leaderboard");
        const leaderboardData = await resLeaderboard.json();
        setLeaderboard(leaderboardData);

        // Generate high-fidelity PDF client-side
        const userProfileObj = data.profile || profile || { name: "Abhinav Srivastava", email: "srivastavaabhinav5158@gmail.com" };
        const pdfDoc = generateReportPDF(data.issue, userProfileObj);
        
        // Show popup modal immediately to the user with the PDF object
        setSubmittedIssueReport({ issue: data.issue, pdf: pdfDoc });
      } else {
        alert(data.error || "Failed to submit issue.");
      }
    } catch (err) {
      console.error("Error submitting issue:", err);
    }
  };

  const handleVote = async (id: string, direction: "up" | "down") => {
    try {
      const response = await apiFetch(`/api/issues/${id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction }),
      });
      const data = await response.json();
      
      if (response.ok) {
        setIssues(prev => prev.map(issue => issue.id === id ? data.issue : issue));
        if (data.profile) setProfile(data.profile);
      }
    } catch (err) {
      console.error("Error voting:", err);
    }
  };

  const handleValidate = async (id: string, voteType: "VALIDATE" | "FLAG") => {
    try {
      const response = await apiFetch(`/api/issues/${id}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voteType }),
      });
      const data = await response.json();
      
      if (response.ok) {
        setIssues(prev => prev.map(issue => issue.id === id ? data.issue : issue));
        if (data.profile) setProfile(data.profile);
        
        if (voteType === "VALIDATE") {
          showToast("Community Validation logged! Accurate voting advances consensus.");
        } else {
          showToast("Concern Flagged. Community moderation will audit.", "info");
        }
      }
    } catch (err) {
      console.error("Error validating issue:", err);
    }
  };

  const handleAddComment = async (id: string, text: string) => {
    try {
      const response = await apiFetch(`/api/issues/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await response.json();
      
      if (response.ok) {
        setIssues(prev => prev.map(issue => issue.id === id ? data.issue : issue));
        if (data.profile) setProfile(data.profile);
        showToast("Discussion point posted successfully!");
      }
    } catch (err) {
      console.error("Error commenting on issue:", err);
    }
  };

  const handleStatusUpdate = async (id: string, status: IssueStatus, note: string) => {
    try {
      const response = await apiFetch(`/api/issues/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note }),
      });
      const data = await response.json();
      
      if (response.ok) {
        setIssues(prev => prev.map(issue => issue.id === id ? data : issue));
        showToast(`Official resolution workflow updated: ${status}`);
        loadData(); // Sync XP gains
      }
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      const currentIndex = TABS.indexOf(activeTab);
      if (currentIndex < TABS.length - 1) {
        setActiveTab(TABS[currentIndex + 1]);
      }
    },
    onSwipedRight: () => {
      const currentIndex = TABS.indexOf(activeTab);
      if (currentIndex > 0) {
        setActiveTab(TABS[currentIndex - 1]);
      }
    },
    preventScrollOnSwipe: true,
  });

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center">
        {toast && (
          <div className={`fixed top-4 left-4 right-4 sm:left-auto sm:right-5 sm:top-5 z-50 px-4 sm:px-5 py-3 rounded-2xl shadow-xl flex items-center justify-between sm:justify-start gap-2 border animate-fade-in transition-all max-w-[calc(100vw-32px)] sm:max-w-md ${
            toast.type === "success" 
              ? "bg-slate-900 text-white border-slate-800" 
              : "bg-indigo-900 text-white border-indigo-800"
          }`}>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400 animate-pulse shrink-0" />
              <span className="text-xs font-semibold break-words leading-tight">{toast.msg}</span>
            </div>
            <button 
              onClick={() => setToast(null)} 
              className="text-white/50 hover:text-white text-xs px-1 hover:bg-white/10 rounded cursor-pointer transition-colors shrink-0"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        )}
        <AuthScreen onAuthSuccess={(user) => {
          setProfile(user);
          setActiveTab("MAP");
          loadData();
          loadNotifications();
          
          const hasBeenPromptedBefore = localStorage.getItem(`civic_watch_location_prompted_${user.id}`);
          if (hasBeenPromptedBefore === "true") {
            setShowLocationModal(false);
            autoIdentifyLocation(user.id);
          } else {
            setShowLocationModal(true);
          }
        }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 flex flex-col font-sans selection:bg-blue-200">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 left-4 right-4 sm:left-auto sm:right-5 sm:top-5 z-50 px-4 sm:px-5 py-3 rounded-2xl shadow-xl flex items-center justify-between sm:justify-start gap-2 border animate-fade-in transition-all max-w-[calc(100vw-32px)] sm:max-w-md ${
          toast.type === "success" 
            ? "bg-slate-900 text-white border-slate-800" 
            : "bg-indigo-900 text-white border-indigo-800"
        }`}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400 animate-pulse shrink-0" />
            <span className="text-xs font-semibold break-words leading-tight">{toast.msg}</span>
          </div>
          <button 
            onClick={() => setToast(null)} 
            className="text-white/50 hover:text-white text-xs px-1 hover:bg-white/10 rounded cursor-pointer transition-colors shrink-0"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}
         {/* GPS Location Permission Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/40 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-5 sm:p-6 max-w-md w-full text-slate-800 shadow-2xl relative overflow-y-auto max-h-[92vh] sm:max-h-[95vh] text-center scrollbar-none"
          >
            {/* Decorative colored glow on top */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />
            
            <div className="flex flex-col items-center mt-4">
              {/* Pulsing emerald GPS target icon */}
              <div className="p-4 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 mb-4 relative">
                <span className="absolute -inset-1 rounded-full bg-emerald-500/10 animate-ping animate-duration-1000" />
                <MapPin className="w-10 h-10" />
              </div>
              
              <h2 className="text-xl font-bold tracking-tight text-slate-900 font-display">
                Verify Local Precinct Range
              </h2>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed max-w-sm">
                To map infrastructure concerns, synchronize neighborhood dispatch routes, and reveal civic hazards in your immediate area, please enable location linkage.
              </p>
 
              <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 my-5 text-left space-y-3">
                <div className="flex items-start gap-2.5 text-xs text-slate-600">
                  <span className="text-emerald-600 mt-0.5 font-bold">✓</span>
                  <p>Plot your active position on street and satellite maps</p>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-slate-600">
                  <span className="text-emerald-600 mt-0.5 font-bold">✓</span>
                  <p>Analyze and view civic problems around your direct vicinity</p>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-slate-600">
                  <span className="text-emerald-600 mt-0.5 font-bold">✓</span>
                  <p>Ensure dispatch validation metrics match real physical coordinates</p>
                </div>
              </div>
 
              {/* Actions */}
              <div className="flex flex-col gap-2.5 w-full">
                <button
                  onClick={async () => {
                    if (!navigator.geolocation) {
                      showToast("Geolocation is not supported by this browser.", "info");
                      setShowLocationModal(false);
                      return;
                    }
                    setIsLocatingOnLogin(true);
                    
                    // Save prompted state to localStorage
                    if (profile?.id) {
                      localStorage.setItem(`civic_watch_location_prompted_${profile.id}`, "true");
                    } else {
                      localStorage.setItem("civic_watch_location_prompted_temp", "true");
                    }
 
                    navigator.geolocation.getCurrentPosition(
                      async (position) => {
                        const lat = position.coords.latitude;
                        const lng = position.coords.longitude;
                        setUserLocation({ lat, lng });
                        setIsLocatingOnLogin(false);
                        setShowLocationModal(false);
                        showToast("Located successfully! Synchronizing community hazards around you.");
 
                        // Post coordinates to seed local issues
                        try {
                          const res = await apiFetch("/api/issues/seed-around", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ latitude: lat, longitude: lng })
                          });
                          if (res.ok) {
                            const data = await res.json();
                            if (data.seededCount > 0) {
                              showToast(`Seeded ${data.seededCount} active local hazards in your neighborhood!`);
                            } else {
                              showToast("Community database synced. Viewing active neighborhood hazards.");
                            }
                            setIssues(data.issues);
                          }
                        } catch (err) {
                          console.error("Error seeding around user location:", err);
                        }
                      },
                      async (err) => {
                        console.warn("[Geolocation] Manual locate fallback active:", err);
                        setIsLocatingOnLogin(false);
                        const fallbackLat = 37.7749;
                        const fallbackLng = -122.4194;
                        setUserLocation({ lat: fallbackLat, lng: fallbackLng });
                        showToast("Could not retrieve GPS location. Reverting to municipal defaults.", "info");
                        setShowLocationModal(false);

                        // Seed fallback coordinates to ensure map renders local issues
                        try {
                          const res = await apiFetch("/api/issues/seed-around", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ latitude: fallbackLat, longitude: fallbackLng })
                          });
                          if (res.ok) {
                            const data = await res.json();
                            setIssues(data.issues);
                          }
                        } catch (seedErr) {
                          console.warn("Failed to seed using fallback location:", seedErr);
                        }
                      },
                      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
                    );
                  }}
                  disabled={isLocatingOnLogin}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:cursor-not-allowed text-white font-black py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm font-sans uppercase tracking-wider"
                >
                  {isLocatingOnLogin ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      Locking GPS Signal...
                    </>
                  ) : (
                    <>
                      <Compass className="w-4 h-4 text-white animate-spin" style={{ animationDuration: "10s" }} />
                      Grant Access & Locate Me
                    </>
                  )}
                </button>
 
                <button
                  onClick={() => {
                    // Save prompted state to localStorage
                    if (profile?.id) {
                      localStorage.setItem(`civic_watch_location_prompted_${profile.id}`, "true");
                    } else {
                      localStorage.setItem("civic_watch_location_prompted_temp", "true");
                    }
                    setShowLocationModal(false);
                    showToast("Using default municipal precinct boundaries.");
                  }}
                  disabled={isLocatingOnLogin}
                  className="w-full bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs cursor-pointer transition-all font-sans uppercase tracking-wider border border-slate-200"
                >
                  Use default layout
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modern Compact Floating Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile Sidebar Hamburger Toggle Button */}
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 -ml-1 rounded-xl hover:bg-slate-50 text-slate-500 lg:hidden cursor-pointer"
            aria-label="Open navigation sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black text-sm sm:text-lg shadow-sm shadow-emerald-500/20 font-display">
            C
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold font-display text-slate-800 tracking-tight leading-none flex items-center gap-1.5">
              CivicFix Gateway
              <span className="hidden sm:inline-block bg-emerald-50 text-emerald-700 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full font-mono uppercase">
                Active Civic Watch
              </span>
            </h1>
            <p className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5 hidden sm:block">Autonomous Infrastructure Verification & Predictive Dispatch</p>
          </div>
        </div>

        {/* Header Actions Container */}
        <div className="flex items-center gap-3">
          
          {/* Real-time Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className={`p-2.5 rounded-xl border relative transition-all duration-200 cursor-pointer ${
                showNotifDropdown
                  ? "bg-blue-50 border-blue-200 text-blue-600 shadow-sm"
                  : "bg-white border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800"
              }`}
              id="notifications-bell-btn"
            >
              {notifications.some(n => !n.isRead) ? (
                <BellRing className="w-4 h-4 text-emerald-600 animate-pulse" />
              ) : (
                <Bell className="w-4 h-4" />
              )}
              {notifications.filter(n => !n.isRead).length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full ring-2 ring-white shadow-sm flex items-center justify-center min-w-[18px]">
                  {notifications.filter(n => !n.isRead).length}
                </span>
              )}
            </button>

            {showNotifDropdown && (
              <>
                {/* Mobile-only backdrop to dismiss dropdown on tap outside */}
                <div 
                  onClick={() => setShowNotifDropdown(false)}
                  className="fixed inset-0 bg-slate-900/15 backdrop-blur-xs z-40 sm:hidden"
                />
                
                <div 
                  className="fixed inset-x-4 top-[72px] sm:absolute sm:right-0 sm:left-auto sm:top-auto sm:inset-x-auto sm:mt-2.5 w-auto sm:w-96 bg-white border border-slate-150 rounded-2xl shadow-xl z-50 overflow-hidden flex flex-col max-h-[calc(100vh-110px)] sm:max-h-[500px]"
                  id="notifications-dropdown-menu"
                >
                  {/* Header */}
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                      <span className="text-xs font-bold text-slate-800 font-display">Civic Live Monitor</span>
                    </div>
                    {notifications.some(n => !n.isRead) && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <CheckSquare className="w-3 h-3" />
                        Mark all read
                      </button>
                    )}
                  </div>

                  {/* List */}
                  <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-400">
                        <Bell className="w-8 h-8 mx-auto stroke-[1.5] text-slate-300 mb-2" />
                        <p className="text-xs font-medium">All caught up!</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">No civic alerts logged.</p>
                      </div>
                    ) : (
                      notifications.map(notif => {
                        // Icon & bg color per type
                        let iconBg = "bg-blue-50 text-blue-600";
                        let Icon = TrendingUp;
                        if (notif.type === "NEW_COMMENT") {
                          iconBg = "bg-purple-50 text-purple-600";
                          Icon = MessageSquare;
                        } else if (notif.type === "VICINITY_ISSUE") {
                          iconBg = "bg-emerald-50 text-emerald-600";
                          Icon = MapPin;
                        } else if (notif.type === "VERIFICATION_REQUEST") {
                          iconBg = "bg-amber-50 text-amber-600";
                          Icon = ShieldAlert;
                        }

                        return (
                          <div
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            className={`p-3.5 flex gap-3 cursor-pointer hover:bg-slate-50/80 transition-colors relative ${
                              !notif.isRead ? "bg-blue-50/15" : ""
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-800 font-display flex items-center gap-1.5 text-left leading-tight">
                                  {notif.title}
                                  {!notif.isRead && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                                  )}
                                </span>
                                <span className="text-[9px] text-slate-400 font-mono flex-shrink-0 ml-1">
                                  {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-slate-600 mt-1 leading-normal text-[11px] text-left">{notif.message}</p>
                              <span className="text-[9px] text-blue-500 font-mono hover:underline block mt-1.5 text-left">
                                View Linked Issue →
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Developer Simulation Controls inside Dropdown */}
                  <div className="p-3 border-t border-slate-100 bg-slate-50/70">
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-2 font-mono flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-blue-500" />
                      Civic Demo Simulator
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                      <button
                        onClick={() => handleTriggerSimulation("STATUS_UPDATE")}
                        className="bg-white border border-slate-200 hover:border-slate-300 text-slate-700 px-2 py-1 rounded-lg text-left font-medium transition-all hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                        Status Update
                      </button>
                      <button
                        onClick={() => handleTriggerSimulation("NEW_COMMENT")}
                        className="bg-white border border-slate-200 hover:border-slate-300 text-slate-700 px-2 py-1 rounded-lg text-left font-medium transition-all hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 flex-shrink-0" />
                        Official Reply
                      </button>
                      <button
                        onClick={() => handleTriggerSimulation("VICINITY_ISSUE")}
                        className="bg-white border border-slate-200 hover:border-slate-300 text-slate-700 px-2 py-1 rounded-lg text-left font-medium transition-all hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                        Nearby Report
                      </button>
                      <button
                        onClick={() => handleTriggerSimulation("VERIFICATION_REQUEST")}
                        className="bg-white border border-slate-200 hover:border-slate-300 text-slate-700 px-2 py-1 rounded-lg text-left font-medium transition-all hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                        Verify Request
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Elegant "My Profile" Top-Right Indicator Button */}
          {profile && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (activeTab === "PROFILE") {
                    setActiveTab("MAP");
                  } else {
                    setActiveTab("PROFILE");
                  }
                }}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                  activeTab === "PROFILE"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700 font-bold ring-2 ring-emerald-100"
                    : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-xs"
                }`}
                title="View My Profile"
              >
                <div className="relative">
                  <img 
                    src={profile.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100"} 
                    alt={profile.name} 
                    className="w-7 h-7 rounded-full object-cover border border-slate-200"
                  />
                  <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full text-[8px] font-black text-white flex items-center justify-center border border-white shadow-xs">
                    {profile.level}
                  </span>
                </div>
                <div className="text-left leading-none">
                  <span className="text-[9px] text-slate-400 font-mono block">Level {profile.level}</span>
                  <span className="text-xs font-bold text-slate-800 block mt-0.5">My Profile</span>
                </div>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Structural Layout Grid */}
      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-[1440px] mx-auto relative">
        
        {/* DESKTOP SIDEBAR: Sticky left-hand navigation column */}
        <aside className="hidden lg:flex w-64 flex-col border-r border-slate-200/50 bg-white/50 backdrop-blur-md p-5 sticky top-[73px] h-[calc(100vh-73px)] overflow-y-auto shrink-0 justify-between">
          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Township Hub</p>
              <p className="text-[11px] text-slate-450 mt-0.5">Autonomous community grid</p>
            </div>
            
            <nav className="space-y-1.5">
              {[
                { id: "MAP", label: "File a Report", icon: FileText, desc: "Submit municipal issues" },
                { id: "FEED", label: "Citizen Feed", icon: MessageSquare, desc: "Trends & neighborhood feed" },
                { id: "ANALYTICS", label: "Impact Analytics", icon: BarChart3, desc: "Track community metrics" },
                { id: "PREDICTIVE", label: "Predictive Forecast", icon: BrainCircuit, desc: "Incident risk prediction" },
                { id: "GAMIFICATION", label: "Civic Watch Rewards", icon: Trophy, desc: "Earn badges & log safety" },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabState)}
                    className={`w-full flex items-center px-3.5 py-3 rounded-xl text-left cursor-pointer group relative transition-colors duration-200 ${
                      isActive
                        ? "text-white"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="desktopActiveTabIndicator"
                        className="absolute inset-0 bg-emerald-600 rounded-xl shadow-md shadow-emerald-500/10"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <div className="relative z-10 flex items-center gap-3 w-full">
                      <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600"}`} />
                      <div className="leading-tight">
                        <span className="text-xs font-semibold block">{tab.label}</span>
                        <span className={`text-[9px] block mt-0.5 ${isActive ? "text-emerald-100" : "text-slate-400"}`}>{tab.desc}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Mini-metadata footer inside left desktop sidebar */}
          <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-xl text-[10px] leading-relaxed text-slate-500 font-mono">
            <span className="font-bold text-slate-700 block mb-0.5">Municipal Linkage</span>
            Consensus Engine Active v2.6. Local authority dispatch routes configured.
          </div>
        </aside>

        {/* MOBILE SIDEBAR: Sliding navigation overlay drawer */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            {/* Backdrop Overlay */}
            <div 
              onClick={() => setMobileSidebarOpen(false)}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity duration-350"
            />
            
            {/* Drawer Panel */}
            <div className="relative flex flex-col w-72 max-w-xs bg-white h-full p-6 shadow-2xl border-r border-slate-100 justify-between z-10">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 font-display">Township Menu</h3>
                    <p className="text-[10px] text-slate-400 font-mono">CivicFix Portal Navigation</p>
                  </div>
                  <button 
                    onClick={() => setMobileSidebarOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <nav className="space-y-1.5">
                  {[
                    { id: "MAP", label: "File a Report", icon: FileText, desc: "Submit municipal issues" },
                    { id: "FEED", label: "Citizen Feed", icon: MessageSquare, desc: "Trends & neighborhood feed" },
                    { id: "ANALYTICS", label: "Impact Analytics", icon: BarChart3, desc: "Track community metrics" },
                    { id: "PREDICTIVE", label: "Predictive Forecast", icon: BrainCircuit, desc: "Incident risk prediction" },
                    { id: "GAMIFICATION", label: "Civic Watch Rewards", icon: Trophy, desc: "Earn badges & log safety" },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id as TabState);
                          setMobileSidebarOpen(false);
                        }}
                        className={`w-full flex items-center px-3.5 py-3 rounded-xl text-left cursor-pointer group relative transition-colors duration-200 ${
                          isActive
                            ? "text-white"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="mobileActiveTabIndicator"
                            className="absolute inset-0 bg-emerald-600 rounded-xl shadow-md"
                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                          />
                        )}
                        <div className="relative z-10 flex items-center gap-3 w-full">
                          <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                          <div className="leading-tight">
                            <span className="text-xs font-semibold block">{tab.label}</span>
                            <span className={`text-[9px] block mt-0.5 ${isActive ? "text-emerald-100" : "text-slate-400"}`}>{tab.desc}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl text-[10px] leading-normal text-slate-500 font-mono">
                  <span className="font-bold text-slate-700 block">Civic GPS Link</span>
                  Consensus Engine Active v2.6.
                </div>
                
                {profile && (
                  <div className="p-3 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img 
                        src={profile.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100"} 
                        alt={profile.name} 
                        className="w-8 h-8 rounded-full object-cover border border-slate-200"
                      />
                      <div className="text-[10px]">
                        <span className="font-bold text-slate-700 block">{profile.name}</span>
                        <span className="text-slate-400 block font-mono">Lvl {profile.level}</span>
                      </div>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="text-[10px] text-red-500 font-bold hover:underline cursor-pointer"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MAIN PANE: Adaptive content canvas */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 overflow-x-hidden flex flex-col justify-between">
          <div>
            {/* Content Router */}
            {loading ? (
              <div className="h-96 flex flex-col items-center justify-center gap-2 text-xs italic text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
                <span>Syncing community grids and civic files...</span>
              </div>
            ) : (
              <div className="flex flex-col gap-6" {...swipeHandlers}>
                {/* View 1: New Self-Contained Civic Action & Reporting Hub */}
                {activeTab === "MAP" && (
                  <div className="space-y-6 animate-fade-in">
                    <div>
                      <h2 className="text-lg font-bold text-slate-800 font-display">Civic Watch Interactive Hub</h2>
                      <div className="text-xs text-slate-500 mt-1 min-h-[2.5rem] md:min-h-[1.5rem] leading-relaxed">
                        <TypewriterText 
                          phrases={[
                            "Click anywhere on the interactive radar map to place a target pin and auto-fill coordinates instantly.",
                            "Submit localized concerns like potholes, broken streetlights, water leaks, and structural hazards to local crews.",
                            "Explore reported neighborhood hazards, support validation audits, and earn Civic XP for your contributions."
                          ]}
                          typingSpeed={30}
                          deletingSpeed={15}
                          delayBetween={4000}
                        />
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-6">
                      {/* Top: Dynamic Interactive Issue Map (Civic Watch Radar Grid) */}
                      <div className="w-full">
                        <IssueMap 
                          issues={issues}
                          selectedIssue={selectedIssueMap}
                          onIssueSelect={(issue) => setSelectedIssueMap(issue)}
                          tempPin={tempPin}
                          onSelectLocation={(coords) => setTempPin(coords)}
                          onClearTempPin={() => setTempPin(null)}
                          userLocation={userLocation}
                          onUpdateUserLocation={setUserLocation}
                        />
                      </div>
                    </div>

                    {/* Secondary Information & Legend Section */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Target Response Windows */}
                      <div className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-col gap-3 text-xs leading-relaxed text-slate-700 shadow-xs">
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-display flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                          Target Response Windows
                        </h3>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 text-[11px] border border-slate-100">
                            <span className="text-slate-600 font-medium">🚨 Water Pipeline Leaks</span>
                            <span className="!text-blue-400 font-mono text-[9px] font-bold !bg-blue-50/50 px-1.5 py-0.5 rounded border !border-blue-500/20">24h (Urgent)</span>
                          </div>
                          <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 text-[11px] border border-slate-100">
                            <span className="text-slate-600 font-medium">🚗 Potholes & Road Cracks</span>
                            <span className="!text-blue-400 font-mono text-[9px] font-bold !bg-blue-50/50 px-1.5 py-0.5 rounded border !border-blue-500/20">36h</span>
                          </div>
                          <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 text-[11px] border border-slate-100">
                            <span className="text-slate-600 font-medium">💡 Broken Streetlights</span>
                            <span className="!text-blue-400 font-mono text-[9px] font-bold !bg-blue-50/50 px-1.5 py-0.5 rounded border !border-blue-500/20">48h</span>
                          </div>
                        </div>
                      </div>

                      {/* AI Help Card */}
                      <div className="bg-emerald-50 border border-emerald-150 p-5 rounded-2xl flex gap-3 text-xs leading-relaxed text-emerald-900">
                        <AlertCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold font-display text-emerald-950">Intelligent Routing:</span>
                          <p className="text-emerald-800 mt-1 text-[11px]">
                            Describe the problem naturally, attach an image, and click <strong>"Run AI Auto-Fill"</strong> to let the neural router refine the category, assessment, and title parameters automatically.
                          </p>
                        </div>
                      </div>

                      {/* Gamification Points Banner */}
                      <div className="bg-white border border-slate-200 p-5 rounded-2xl flex gap-3 text-xs leading-relaxed text-slate-700 shadow-xs">
                        <Trophy className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold font-display text-slate-900">Earn Civic Points:</span>
                          <p className="text-slate-600 mt-1 text-[11px]">
                            Every filed hazard contributes to the community safety index and rewards you with <strong>100 XP</strong>. Build your streak, level up your profile, and earn town council honors.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Bottom: Submit Form (Report Community Concern) */}
                    <div key={reportCount} className="w-full">
                      <IssueReportForm onFormSubmit={handleReportIssue} selectedCoords={tempPin} />
                    </div>
                  </div>
                )}

                {/* View 2.5: Citizen Feed (Twitter-style feedback timeline) */}
                {activeTab === "FEED" && (
                  <CitizenFeed 
                    currentUserProfile={profile}
                    onProfileUpdate={(updated) => setProfile(updated)}
                    showToast={showToast}
                  />
                )}

                {/* View 3: Impact Analytics Dashboard */}
                {activeTab === "ANALYTICS" && (
                  <ImpactDashboard issues={issues} userId={profile.id} />
                )}

                {/* View 4: Predictive Forecast Panel */}
                {activeTab === "PREDICTIVE" && (
                  <PredictiveInsightsPanel />
                )}

                {/* View 5: Gamification Rewards Panel */}
                {activeTab === "GAMIFICATION" && (
                  <GamificationCenter profile={profile} leaderboard={leaderboard} />
                )}

                {/* View 6: My Profile Details & Personal Credentials Editor */}
                {activeTab === "PROFILE" && profile && (
                  <UserProfileSection 
                    profile={profile} 
                    issues={issues}
                    onProfileUpdate={(updated) => setProfile(updated)}
                    onShowToast={showToast}
                    onSignOut={handleSignOut}
                  />
                )}

              </div>
            )}
          </div>

          {selectedIssueMap && (
            <IssueViewModal 
              issue={selectedIssueMap} 
              onClose={() => setSelectedIssueMap(null)} 
            />
          )}

          {submittedIssueReport && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-5 sm:p-6 max-w-lg w-full text-slate-800 shadow-2xl relative overflow-y-auto max-h-[92vh] sm:max-h-[95vh] scrollbar-none"
              >
                {/* Decorative colored glow on top */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />
                
                <div className="flex flex-col items-center text-center mt-4">
                  {/* Animated Checkmark Circle */}
                  <div className="p-4 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-200 mb-4">
                    <Check className="w-10 h-10" />
                  </div>
                  
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">
                    Report Submitted Successfully!
                  </h2>
                  <p className="text-xs text-slate-500 mt-1.5">
                    Your community concern has been cataloged in the civic database.
                  </p>

                  {/* Issue Details Box */}
                  <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-200 my-5 text-left space-y-2">
                    <p className="text-[10px] uppercase font-bold tracking-widest text-emerald-600 font-mono">Report Summary</p>
                    <h3 className="text-sm font-bold text-slate-900">{submittedIssueReport.issue.title}</h3>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                      <div>
                        <span className="font-semibold text-slate-400">Category:</span> <span className="text-slate-700 font-mono text-[11px]">{submittedIssueReport.issue.category.replace("_", " ")}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-400">Severity:</span> <span className={`font-mono text-[11px] font-bold ${
                          submittedIssueReport.issue.severity === "CRITICAL" ? "text-rose-600" :
                          submittedIssueReport.issue.severity === "HIGH" ? "text-amber-600" :
                          submittedIssueReport.issue.severity === "MEDIUM" ? "text-blue-600" : "text-slate-600"
                        }`}>{submittedIssueReport.issue.severity}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="font-semibold text-slate-400">Location:</span> <span className="text-slate-700">{submittedIssueReport.issue.address || "Pinned coordinates"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Success prompt note */}
                  <div className="w-full text-xs text-slate-500 text-center py-2 px-3 bg-slate-50 rounded-xl border border-slate-200 mb-6 leading-relaxed">
                    A high-fidelity municipal digital artifact of your report has been generated. You can download the official PDF report below.
                  </div>

                  {/* Actions buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 w-full">
                    <button
                      onClick={() => {
                        submittedIssueReport.pdf.save(`civic_report_${submittedIssueReport.issue.id}.pdf`);
                        showToast("PDF report download initiated.");
                      }}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm shadow-emerald-600/10 font-sans"
                    >
                      <FileText className="w-4 h-4" />
                      Download PDF Report
                    </button>
                    <button
                      onClick={() => setSubmittedIssueReport(null)}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 border border-slate-200 font-bold py-2.5 px-4 rounded-xl text-xs cursor-pointer transition-all font-sans"
                    >
                      Done & Return
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          <footer className="bg-white border-t border-slate-100 px-6 py-6 text-center text-xs text-slate-400 mt-12 font-mono">
            <p>© 2026 CivicFix Municipal Response Network. All rights reserved.</p>
            <p className="mt-1 text-[10px] text-slate-300 font-mono">Sanitized sandboxed full-stack citizen reporting console</p>
          </footer>
        </main>
      </div>
    </div>
  );
}

// Simple fallback CSS Spinner
function Loader2({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}
