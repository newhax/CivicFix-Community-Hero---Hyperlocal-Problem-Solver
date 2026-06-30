export type IssueStatus = 'REPORTED' | 'VERIFIED' | 'IN_PROGRESS' | 'RESOLVED';
export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IssueCategory = 
  | 'POTHOLES' 
  | 'WATER_LEAKAGE' 
  | 'STREETLIGHTS' 
  | 'WASTE_MANAGEMENT' 
  | 'PUBLIC_INFRASTRUCTURE' 
  | 'OTHER';

export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  text: string;
  createdAt: string;
  isOfficial?: boolean;
}

export interface StatusUpdate {
  status: IssueStatus;
  note: string;
  updatedAt: string;
  updatedBy: string;
}

export interface ValidationVote {
  userId: string;
  voteType: 'VALIDATE' | 'FLAG';
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  category: IssueCategory;
  severity: SeverityLevel;
  latitude: number;
  longitude: number;
  address: string;
  imageUrl?: string;
  videoUrl?: string;
  reporterId: string;
  reporterName: string;
  status: IssueStatus;
  createdAt: string;
  updatedAt: string;
  upvotes: number;
  downvotes: number;
  validationsCount: number;
  flagsCount: number;
  comments: Comment[];
  statusHistory: StatusUpdate[];
  votes: ValidationVote[];
  upvotedBy: string[]; // List of user IDs who upvoted
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  xp: number;
  level: number;
  badges: Badge[];
  reportsCount: number;
  validationsCount: number;
  following: string[]; // list of user IDs followed by this user
  handle?: string;     // Twitter-like handle (e.g. @civic_star)
  avatar?: string;     // Profile picture URL
  phone?: string;
  address?: string;
  state?: string;
  city?: string;
  gender?: string;
  dob?: string;
  profileUpdatesLog?: {
    field: string;
    oldValue: string;
    newValue: string;
    updatedAt: string;
  }[];
}

export interface PredictiveInsight {
  id: string;
  title: string;
  description: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  category: IssueCategory;
  latitude: number;
  longitude: number;
  address: string;
  probability: number; // 0 to 100
  recommendedAction: string;
}

export interface ImpactMetrics {
  totalReported: number;
  totalResolved: number;
  averageResolutionDays: number;
  communityXP: number;
  categoryDistribution: Record<IssueCategory, number>;
  statusDistribution: Record<IssueStatus, number>;
  monthlyResolutionTrend: { month: string; reported: number; resolved: number }[];
}

export type NotificationType = 'STATUS_UPDATE' | 'NEW_COMMENT' | 'VICINITY_ISSUE' | 'VERIFICATION_REQUEST';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  issueId: string;
  isRead: boolean;
  createdAt: string;
}

export interface CitizenComment {
  id: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorAvatar: string;
  text: string;
  createdAt: string;
}

export interface CitizenPost {
  id: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorAvatar: string;
  content: string;
  media: { url: string; type: string }[];
  likes: number;
  likedBy: string[]; // user IDs who liked the post
  comments: CitizenComment[];
  createdAt: string;
}

