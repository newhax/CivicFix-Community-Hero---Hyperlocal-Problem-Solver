import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { 
  Heart, MessageCircle, Repeat2, Share, Search, Image, Film, 
  UserPlus, UserMinus, Check, X, Loader2, Sparkles, MessageSquare, Flame,
  Calendar, Award, ShieldCheck
} from "lucide-react";
import { CitizenPost, UserProfile } from "../types";

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
          return url.includes("/posts") || url.includes("/users") || url.includes("/recommend") ? [] : {};
        }

        try {
          return JSON.parse(text);
        } catch (parseErr) {
          console.error(`[API FETCH] Failed to parse JSON for ${url}: ${String(parseErr)}. Text was: "${text.substring(0, 100)}". Returning safe fallback.`);
          return url.includes("/posts") || url.includes("/users") || url.includes("/recommend") ? [] : {};
        }
      } catch (err) {
        console.error(`[API FETCH] Error in customized json() method for ${url}:`, err);
        return url.includes("/posts") || url.includes("/users") || url.includes("/recommend") ? [] : {};
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

interface CitizenFeedProps {
  currentUserProfile: UserProfile | null;
  onProfileUpdate: (updated: UserProfile) => void;
  showToast: (msg: string, type?: "success" | "info") => void;
}

export default function CitizenFeed({ 
  currentUserProfile, 
  onProfileUpdate,
  showToast 
}: CitizenFeedProps) {
  const [posts, setPosts] = useState<CitizenPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<"FOR_YOU" | "FOLLOWING" | "MY_POSTS">("FOR_YOU");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Debounce search query input to prevent excess API queries and layout lag
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(searchInput);
      setUserSearchInput(searchInput);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // User Search States
  const [userSearchInput, setUserSearchInput] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);

  // Suggested Active Citizens Recommendation States
  const [recommendedUsers, setRecommendedUsers] = useState<any[]>([]);
  const [recommendedLoading, setRecommendedLoading] = useState(false);

  // Fetch users when userSearchInput or login state changes
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setUserSearchLoading(true);
        const res = await apiFetch(`/api/users/search?q=${encodeURIComponent(userSearchInput)}`);
        if (res.ok) {
          const data = await res.json();
          setUserSearchResults(data);
        }
      } catch (err) {
        console.error("Error searching users:", err);
      } finally {
        setUserSearchLoading(false);
      }
    };

    const delayDebounce = setTimeout(() => {
      fetchUsers();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [userSearchInput, currentUserProfile]);

  // Fetch recommended users for static sidebar
  useEffect(() => {
    const fetchRecommended = async () => {
      try {
        setRecommendedLoading(true);
        const res = await apiFetch("/api/users/search?q=");
        if (res.ok) {
          const data = await res.json();
          setRecommendedUsers(data);
        }
      } catch (err) {
        console.error("Error fetching recommended users:", err);
      } finally {
        setRecommendedLoading(false);
      }
    };
    fetchRecommended();
  }, [currentUserProfile]);

  // Other User Profile States
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [loadingUserDetail, setLoadingUserDetail] = useState(false);
  const [zoomedPhoto, setZoomedPhoto] = useState<string | null>(null);

  const fetchAndShowUserProfile = async (userId: string) => {
    try {
      setLoadingUserDetail(true);
      const res = await apiFetch(`/api/users/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedUser(data);
      } else {
        showToast("Unable to fetch citizen profile.", "info");
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
      showToast("Error loading citizen details.", "info");
    } finally {
      setLoadingUserDetail(false);
    }
  };
  
  // Post Creator State
  const [postText, setPostText] = useState("");
  const [attachedMedia, setAttachedMedia] = useState<{ url: string; type: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Comment Creator State per Post ID
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

  // Recommended follow suggestions list (mocked based on actual systems users)
  const [suggestions, setSuggestions] = useState([
    { id: "user-system-1", name: "Elena Rostova", handle: "@elena_rostova", role: "Eco Inspector", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100" },
    { id: "user-system-2", name: "Marcus Vance", handle: "@marcus_vance", role: "Water Inspector", avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100" },
    { id: "user-system-3", name: "Julian Karr", handle: "@julian_k", role: "Transit Warden", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100" }
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Fetch posts with optional search query
  const fetchPosts = async (search: string = "") => {
    try {
      setLoading(true);
      const url = search ? `/api/posts?search=${encodeURIComponent(search)}` : "/api/posts";
      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } catch (err) {
      console.error("Error fetching posts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts(searchQuery);
  }, [searchQuery]);

  // Handle media file upload
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>, fileType: "image" | "video") => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Size check: e.g. Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      showToast("Media file size exceeds the 10MB limit.", "info");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setIsUploading(true);
    try {
      const res = await apiFetch("/api/media/upload", {
        method: "POST",
        body: formData
      });

      if (res.ok) {
        const uploadResult = await res.json();
        setAttachedMedia(prev => [
          ...prev, 
          { url: uploadResult.url, type: file.type }
        ]);
        showToast("Media attached successfully!");
      } else {
        showToast("Failed to upload media.", "info");
      }
    } catch (err) {
      console.error("Error uploading media:", err);
      showToast("Server connection error during upload.", "info");
    } finally {
      setIsUploading(false);
      // Reset input
      e.target.value = "";
    }
  };

  // Submit Feedback Post
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postText.trim() && attachedMedia.length === 0) {
      showToast("Post content cannot be completely empty.", "info");
      return;
    }

    if (postText.length > 280) {
      showToast("Posts must be within 280 characters.", "info");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiFetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: postText,
          media: attachedMedia
        })
      });

      if (res.ok) {
        const data = await res.json();
        setPosts(prev => [data.post, ...prev]);
        setPostText("");
        setAttachedMedia([]);
        showToast("Feedback published! +50 Civic XP!");
        
        // Update user profile globally
        if (data.profile) {
          onProfileUpdate(data.profile);
        }
      } else {
        showToast("Error publishing post.", "info");
      }
    } catch (err) {
      console.error("Post create error:", err);
      showToast("Network failure creating post.", "info");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Like / Unlike Post
  const handleLikePost = async (postId: string) => {
    try {
      const res = await apiFetch(`/api/posts/${postId}/like`, { method: "POST" });
      if (res.ok) {
        const updatedPost = await res.json();
        setPosts(prev => prev.map(p => p.id === postId ? updatedPost : p));
      }
    } catch (err) {
      console.error("Like post error:", err);
    }
  };

  // Follow / Unfollow user
  const handleFollowUser = async (userId: string, userHandle: string) => {
    if (!currentUserProfile) return;
    try {
      const res = await apiFetch(`/api/users/${userId}/follow`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        
        // Update local user profile state
        const updatedProfile = {
          ...currentUserProfile,
          following: data.following
        };
        onProfileUpdate(updatedProfile);

        if (data.isFollowing) {
          showToast(`Now following ${userHandle}!`);
        } else {
          showToast(`Unfollowed ${userHandle}.`);
        }
      }
    } catch (err) {
      console.error("Follow error:", err);
    }
  };

  // Submit Post Comment
  const handleAddComment = async (postId: string) => {
    const text = commentInputs[postId];
    if (!text || !text.trim()) return;

    try {
      const res = await apiFetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });

      if (res.ok) {
        const updatedPost = await res.json();
        setPosts(prev => prev.map(p => p.id === postId ? updatedPost : p));
        setCommentInputs(prev => ({ ...prev, [postId]: "" }));
        showToast("Comment added!");
      }
    } catch (err) {
      console.error("Comment submit error:", err);
    }
  };

  // Filter posts based on timeline tab
  const followingIds = currentUserProfile?.following || [];
  const displayedPosts = posts.filter(post => {
    if (activeSubTab === "FOLLOWING") {
      return followingIds.includes(post.authorId);
    }
    if (activeSubTab === "MY_POSTS") {
      return post.authorId === currentUserProfile?.id;
    }
    return true; // For You contains all posts
  });

  const handleTopicClick = async (tag: string) => {
    setSearchInput(tag);
    try {
      const res = await fetch(`/api/topic-info?topic=${encodeURIComponent(tag)}`);
      if (res.ok) {
        const data = await res.json();
        showToast(data.summary, "info");
      }
    } catch (err) {
      console.error("Error fetching topic info:", err);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
      {/* LEFT: X Timeline & composer (8 columns) */}
      <div className="lg:col-span-8 flex flex-col gap-3 sm:gap-4">
        
        {/* Search Bar / Header of Timeline */}
        <div className="bg-white border border-slate-100 shadow-sm rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full relative">
              <input 
                type="text"
                placeholder="Search topics, posts, or citizens by name..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-8 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-medium"
              />
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              {searchInput && (
                <button 
                  onClick={() => setSearchInput("")}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            
            {/* Sub-tab Selection */}
            <div className="flex border border-slate-100 p-0.5 rounded-lg sm:rounded-xl bg-slate-50 w-full sm:w-auto relative">
              <button
                onClick={() => setActiveSubTab("FOR_YOU")}
                className={`flex-1 text-center px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-colors duration-200 relative cursor-pointer ${
                  activeSubTab === "FOR_YOU"
                    ? "text-slate-900"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {activeSubTab === "FOR_YOU" && (
                  <motion.div
                    layoutId="feedActiveSubTabIndicator"
                    className="absolute inset-0 bg-white rounded-lg shadow-sm"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10">For You</span>
              </button>
              <button
                onClick={() => setActiveSubTab("FOLLOWING")}
                className={`flex-1 text-center px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-colors duration-200 relative cursor-pointer ${
                  activeSubTab === "FOLLOWING"
                    ? "text-slate-900"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {activeSubTab === "FOLLOWING" && (
                  <motion.div
                    layoutId="feedActiveSubTabIndicator"
                    className="absolute inset-0 bg-white rounded-lg shadow-sm"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10">Following</span>
              </button>
              <button
                onClick={() => setActiveSubTab("MY_POSTS")}
                className={`flex-1 text-center px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-colors duration-200 relative cursor-pointer ${
                  activeSubTab === "MY_POSTS"
                    ? "text-slate-900"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {activeSubTab === "MY_POSTS" && (
                  <motion.div
                    layoutId="feedActiveSubTabIndicator"
                    className="absolute inset-0 bg-white rounded-lg shadow-sm"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10">My Posts</span>
              </button>
            </div>
          </div>

          {/* Combined Search by Name Result Panel */}
          {searchInput && (
            <div className="border-t border-slate-100 pt-3 mt-1 text-left animate-fade-in">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-display flex items-center gap-1">
                  <UserPlus className="w-3.5 h-3.5 text-emerald-500" />
                  Matching Citizens ({userSearchResults.length})
                </span>
                {userSearchLoading && (
                  <Loader2 className="w-3 h-3 animate-spin text-emerald-500" />
                )}
              </div>
              
              {userSearchResults.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic py-1">No citizens found matching "{searchInput}"</p>
              ) : (
                <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-slate-200">
                  {userSearchResults.map((user) => {
                    const isFollowing = (currentUserProfile?.following || []).includes(user.id);
                    const isSelf = currentUserProfile?.id === user.id;
                    if (isSelf) return null;
                    return (
                      <div key={user.id} className="flex-shrink-0 flex items-center gap-2 bg-slate-50/80 hover:bg-slate-100/90 p-2 rounded-xl border border-slate-150/70 transition-all">
                        <div 
                          onClick={() => fetchAndShowUserProfile(user.id)}
                          className="flex items-center gap-2 cursor-pointer group"
                        >
                          <img 
                            src={user.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100"} 
                            alt={user.name} 
                            className="w-7 h-7 rounded-full object-cover border border-white shadow-sm flex-shrink-0"
                          />
                          <div className="leading-tight text-left">
                            <p className="text-[11px] font-bold text-slate-800 font-display truncate max-w-[100px] group-hover:underline">{user.name}</p>
                            <p className="text-[9px] text-slate-400 truncate max-w-[100px]">{user.handle || `@${user.name?.toLowerCase().replace(/\s+/g, '_')}`}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleFollowUser(user.id, user.handle || `@${user.name?.toLowerCase().replace(/\s+/g, '_')}`)}
                          className={`text-[9px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex-shrink-0 ${
                            isFollowing
                              ? "bg-white text-slate-500 border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100"
                              : "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
                          }`}
                        >
                          {isFollowing ? "Unfollow" : "Follow"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Post Creator / Composer */}
        <div className="bg-white border border-slate-100 shadow-sm rounded-xl sm:rounded-2xl p-3 sm:p-5 flex gap-3 sm:gap-4">
          <img 
            src={currentUserProfile?.avatar || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=100"} 
            alt="My Avatar"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border border-slate-100 flex-shrink-0"
          />
          <form onSubmit={handleCreatePost} className="flex-1 flex flex-col gap-2 sm:gap-3">
            <textarea
              placeholder="What's happening?"
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              rows={2}
              maxLength={280}
              className="w-full text-sm placeholder-slate-400 text-slate-800 border-0 focus:ring-0 focus:outline-none resize-none py-1 leading-relaxed"
            />

            {/* Uploaded media previews */}
            {attachedMedia.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-1">
                {attachedMedia.map((media, idx) => (
                  <div key={idx} className="relative aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-100 group shadow-sm">
                    {media.type.startsWith("video/") ? (
                      <video src={media.url} className="w-full h-full object-cover" muted playsInline />
                    ) : (
                      <img src={media.url} alt="Attached attachment" className="w-full h-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => setAttachedMedia(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute top-2 right-2 bg-black/60 text-white hover:bg-rose-600 p-1.5 rounded-full transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-between border-t border-slate-50 pt-3 mt-1">
              <div className="flex items-center gap-1.5">
                {/* Photo Upload Trigger */}
                <input 
                  type="file" 
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={(e) => handleMediaUpload(e, "image")}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-all cursor-pointer"
                  title="Attach Photo"
                >
                  <Image className="w-4 h-4" />
                </button>

                {/* Video Upload Trigger */}
                <input 
                  type="file" 
                  ref={videoInputRef}
                  accept="video/*"
                  onChange={(e) => handleMediaUpload(e, "video")}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={isUploading}
                  className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer"
                  title="Attach Video"
                >
                  <Film className="w-4 h-4" />
                </button>

                {isUploading && (
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                    <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                    <span>Processing media upload...</span>
                  </div>
                )}
              </div>

              {/* Character Limit and Post button */}
              <div className="flex items-center gap-3">
                <span className={`text-[11px] font-bold font-mono ${
                  postText.length > 250 ? "text-rose-500" : "text-slate-400"
                }`}>
                  {280 - postText.length}
                </span>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploading || (!postText.trim() && attachedMedia.length === 0)}
                  className="bg-slate-900 hover:bg-slate-850 disabled:bg-slate-200 text-white font-bold text-xs px-4.5 py-2 rounded-xl transition-all shadow-sm cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-blue-300" />
                  )}
                  <span>Post Feed</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* TIMELINE LIST */}
        {loading ? (
          <div className="bg-white border border-slate-100 rounded-2xl p-16 text-center text-xs text-slate-400 italic flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <span>Assembling your community feed...</span>
          </div>
        ) : displayedPosts.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-2xl p-16 text-center text-xs text-slate-400 italic">
            {activeSubTab === "FOLLOWING" 
              ? "You aren't following anyone yet or they haven't posted. Try following some active citizens in the sidebar!"
              : activeSubTab === "MY_POSTS"
                ? "You haven't posted anything to the citizen feed yet. Write your first post above!"
                : "No posts found. Be the first to share active civic feedback!"}
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {displayedPosts.map((post) => {
              const isLikedByMe = post.likedBy?.includes(currentUserProfile?.id || "");
              const isFollowingAuthor = followingIds.includes(post.authorId);
              const isSelf = post.authorId === currentUserProfile?.id;

              return (
                <div 
                  key={post.id} 
                  id={`feed-post-${post.id}`}
                  className="bg-white border border-slate-100 shadow-sm rounded-xl sm:rounded-2xl p-3 sm:p-5 hover:border-slate-150 transition-all flex gap-3 sm:gap-4"
                >
                  {/* User Avatar */}
                  <img 
                    src={post.authorAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100"} 
                    alt={post.authorName}
                    onClick={() => fetchAndShowUserProfile(post.authorId)}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border border-slate-50 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                    title={`View ${post.authorName}'s profile`}
                  />

                  {/* Main post layout */}
                  <div className="flex-1 flex flex-col gap-2 min-w-0">
                    
                    {/* Header: Author Name, Handle, Time, and Follow Toggle */}
                    <div className="flex items-center justify-between">
                      <div className="text-xs truncate">
                        <span 
                          onClick={() => fetchAndShowUserProfile(post.authorId)}
                          className="font-bold text-slate-800 font-display hover:underline cursor-pointer"
                          title={`View ${post.authorName}'s profile`}
                        >
                          {post.authorName}
                        </span>
                        <span 
                          onClick={() => fetchAndShowUserProfile(post.authorId)}
                          className="text-slate-400 font-medium ml-1.5 truncate cursor-pointer hover:underline"
                          title={`View ${post.authorName}'s profile`}
                        >
                          {post.authorHandle || "@anonymous"}
                        </span>
                        <span className="text-slate-300 mx-1.5">•</span>
                        <span className="text-slate-400 font-mono text-[10px]">
                          {new Date(post.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                        </span>
                      </div>

                      {/* Follow / Following button (No follow button for self) */}
                      {!isSelf && (
                        <button
                          onClick={() => handleFollowUser(post.authorId, post.authorHandle)}
                          className={`text-[10px] font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1 ${
                            isFollowingAuthor
                              ? "bg-slate-50 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 text-slate-500 border-slate-150"
                              : "bg-slate-900 hover:bg-slate-850 text-white border-slate-900"
                          }`}
                        >
                          {isFollowingAuthor ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span>Following</span>
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-3 h-3" />
                              <span>Follow</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Content text */}
                    <p className="text-xs text-slate-700 leading-relaxed font-sans whitespace-pre-wrap break-words">
                      {post.content}
                    </p>

                    {/* Attached Media Carousel / Single */}
                    {post.media && post.media.length > 0 && (
                      <div className="rounded-xl overflow-hidden border border-slate-100 bg-slate-50 shadow-sm max-w-full">
                        {post.media.map((media, mIdx) => (
                          <div key={mIdx} className="w-full relative aspect-video bg-black/5">
                            {media.type.startsWith("video/") ? (
                              <video 
                                src={media.url} 
                                controls 
                                playsInline
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <img 
                                src={media.url} 
                                alt="Post attachments" 
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Interactive Action Bar */}
                    <div className="flex items-center justify-between sm:justify-start sm:gap-6 text-slate-400 mt-1 select-none border-t border-slate-50 pt-2.5">
                      
                      {/* Comments Trigger */}
                      <button 
                        onClick={() => setExpandedComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                        className={`flex items-center gap-1 text-[10px] sm:text-[11px] font-bold transition-all hover:text-blue-500 cursor-pointer ${
                          expandedComments[post.id] ? "text-blue-500" : ""
                        }`}
                      >
                        <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span>{post.comments?.length || 0} <span className="hidden sm:inline">Comments</span></span>
                      </button>

                      {/* Like Action */}
                      <button 
                        onClick={() => handleLikePost(post.id)}
                        className={`flex items-center gap-1 text-[10px] sm:text-[11px] font-bold transition-all hover:text-rose-500 cursor-pointer ${
                          isLikedByMe ? "text-rose-500 font-extrabold" : ""
                        }`}
                      >
                        <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isLikedByMe ? "fill-current" : ""}`} />
                        <span>{post.likes || 0} <span className="hidden sm:inline">Likes</span></span>
                      </button>

                      {/* Mock Retweet */}
                      <button 
                        onClick={() => showToast("Republished to your civic timeline!")}
                        className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold transition-all hover:text-emerald-500 cursor-pointer"
                      >
                        <Repeat2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Repost</span>
                      </button>

                      {/* Mock Share */}
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/#feed-post-${post.id}`);
                          showToast("Post link copied to clipboard!");
                        }}
                        className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold transition-all hover:text-indigo-500 cursor-pointer"
                      >
                        <Share className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Share</span>
                      </button>
                    </div>

                    {/* COMMENTS PANEL */}
                    {expandedComments[post.id] && (
                      <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-4 mt-2 flex flex-col gap-3 animate-fade-in">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-display flex items-center gap-1">
                          <MessageSquare className="w-3 h-3 text-blue-500" />
                          Discussion Comments
                        </span>

                        {/* Existing comments list */}
                        {post.comments && post.comments.length > 0 ? (
                          <div className="flex flex-col gap-2.5 max-h-60 overflow-y-auto">
                            {post.comments.map((comment) => (
                              <div key={comment.id} className="flex gap-2 bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm">
                                <img 
                                  src={comment.authorAvatar} 
                                  alt={comment.authorName}
                                  onClick={() => comment.authorId && fetchAndShowUserProfile(comment.authorId)}
                                  className="w-7 h-7 rounded-full object-cover border border-slate-50 flex-shrink-0 mt-0.5 cursor-pointer hover:opacity-85 transition-opacity"
                                  title={`View ${comment.authorName}'s profile`}
                                />
                                <div className="flex-1 text-xs text-left">
                                  <div className="flex items-center gap-1.5">
                                    <span 
                                      onClick={() => comment.authorId && fetchAndShowUserProfile(comment.authorId)}
                                      className="font-bold text-slate-800 font-display cursor-pointer hover:underline"
                                      title={`View ${comment.authorName}'s profile`}
                                    >
                                      {comment.authorName}
                                    </span>
                                    <span 
                                      onClick={() => comment.authorId && fetchAndShowUserProfile(comment.authorId)}
                                      className="text-[10px] text-slate-400 cursor-pointer hover:underline"
                                      title={`View ${comment.authorName}'s profile`}
                                    >
                                      {comment.authorHandle}
                                    </span>
                                    <span className="text-slate-300">•</span>
                                    <span className="text-[9px] text-slate-400 font-mono">
                                      {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <p className="text-slate-600 mt-1 leading-relaxed">{comment.text}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] italic text-slate-400">No replies yet. Start the conversation!</span>
                        )}

                        {/* New comment input form */}
                        <div className="flex items-center gap-2 mt-1 border-t border-slate-100 pt-3">
                          <input 
                            type="text"
                            placeholder="Post your reply..."
                            value={commentInputs[post.id] || ""}
                            onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleAddComment(post.id);
                            }}
                            className="flex-1 bg-white border border-slate-150 rounded-xl px-3.5 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                          />
                          <button
                            onClick={() => handleAddComment(post.id)}
                            disabled={!commentInputs[post.id]?.trim()}
                            className="bg-blue-600 disabled:bg-blue-200 text-white font-bold text-[10px] px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed"
                          >
                            Reply
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* RIGHT: Trends & Follow Sidebar (4 columns) */}
      <div className="lg:col-span-4 flex flex-col gap-4 sticky top-24">
        
        {/* Suggested Active Citizens */}
        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-5 flex flex-col gap-4">
          <div>
            <h3 className="text-xs font-bold text-slate-800 font-display flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-emerald-500" />
              <span>Suggested Active Citizens</span>
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Connect with other highly active township organizers.</p>
          </div>

          {/* Display recommended users */}
          <div className="flex flex-col gap-3.5">
            {recommendedLoading ? (
              <div className="flex items-center justify-center py-6 text-xs text-slate-400 gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                <span>Loading suggestions...</span>
              </div>
            ) : recommendedUsers.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-150">
                No suggestions available at this time.
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1 font-sans">
                {recommendedUsers.map((user) => {
                  const isFollowing = (currentUserProfile?.following || []).includes(user.id);
                  const isSelf = currentUserProfile?.id === user.id;

                  if (isSelf) return null;

                  return (
                    <div key={user.id} className="flex items-center justify-between gap-2.5 bg-slate-50/50 hover:bg-slate-50 p-2.5 rounded-xl border border-slate-100 transition-colors">
                      <div 
                        onClick={() => fetchAndShowUserProfile(user.id)}
                        className="flex items-center gap-2.5 min-w-0 cursor-pointer group/card"
                        title={`View ${user.name}'s profile`}
                      >
                        <img 
                          src={user.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100"} 
                          alt={user.name} 
                          className="w-9 h-9 rounded-full object-cover border border-slate-50 flex-shrink-0 group-hover/card:opacity-85 transition-opacity"
                        />
                        <div className="text-left leading-none min-w-0">
                          <span className="text-xs font-bold text-slate-800 font-display block truncate group-hover/card:underline">
                            {user.name}
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-1.5 truncate">
                            {user.handle || `@${user.name?.toLowerCase().replace(/\s+/g, '_')}`}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleFollowUser(user.id, user.handle || `@${user.name?.toLowerCase().replace(/\s+/g, '_')}`)}
                        className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer flex-shrink-0 ${
                          isFollowing
                            ? "bg-white text-slate-500 border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100"
                            : "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 hover:scale-[1.02]"
                        }`}
                      >
                        {isFollowing ? "Unfollow" : "Follow"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Local Trends (Civic-Themed Trends for extreme X app fidelity!) */}
        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-5 flex flex-col gap-4">
          <div>
            <h3 className="text-xs font-bold text-slate-800 font-display">Township Trends</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Popular civic discussions across Metro Region.</p>
          </div>

          <div className="flex flex-col gap-3.5">
            {[
              { tag: "#OakwoodPothole", postsCount: "42 posts", desc: "Consensus validation trending" },
              { tag: "#StreetlightBright", postsCount: "28 posts", desc: "Energy efficient LED upgrades" },
              { tag: "#WaterDeptSpeed", postsCount: "19 posts", desc: "Rapid excavation on Pine St" },
              { tag: "#CleanAlleys", postsCount: "11 posts", desc: "Sanitation enforcement guidelines" },
              { tag: "#CivicWatchXP", postsCount: "8 posts", desc: "Level 3 reward claims active" }
            ].map((trend, idx) => (
              <div 
                key={idx} 
                onClick={() => handleTopicClick(trend.tag)}
                className="group flex items-start justify-between gap-1 cursor-pointer text-left"
              >
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono block">
                    {idx + 1} • Trending Local Topics
                  </span>
                  <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600 block mt-0.5 transition-colors">
                    {trend.tag}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {trend.desc}
                  </span>
                </div>
                <div className="text-[9px] font-bold font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded flex items-center gap-0.5 flex-shrink-0">
                  <Flame className="w-3 h-3 text-orange-500 animate-pulse" />
                  <span>{trend.postsCount}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* USER DETAIL LOADING PORTAL */}
      {loadingUserDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-[2px]">
          <div className="bg-white px-5 py-4 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-150">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
            <span className="text-xs font-bold text-slate-700">Retrieving citizen profile...</span>
          </div>
        </div>
      )}

      {/* CITIZEN PROFILE MODAL */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop blur */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedUser(null)}
            className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm"
          />

          {/* Modal Card content */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="bg-white border border-slate-100 shadow-2xl rounded-2xl w-full max-w-md md:max-w-3xl lg:max-w-4xl overflow-hidden relative z-10 flex flex-col h-[92vh] sm:h-[85vh] max-h-[780px]"
          >
            {/* Header / Banner and Profile Avatar */}
            <div className="relative flex-shrink-0 bg-white">
              <div className="h-24 sm:h-28 bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 relative">
                <button 
                  onClick={() => setSelectedUser(null)}
                  className="absolute right-4 top-4 bg-black/20 hover:bg-black/40 text-white p-1.5 rounded-full backdrop-blur-sm transition-all cursor-pointer z-20"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              {/* Profile Photo absolute positioning over the header-content boundary */}
              <div className="absolute -bottom-10 left-6 sm:left-8 z-20">
                <img 
                  src={selectedUser.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150"} 
                  alt={selectedUser.name} 
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-white shadow-md bg-slate-50 cursor-pointer hover:scale-105 active:scale-95 hover:brightness-95 transition-all duration-200"
                  onClick={() => setZoomedPhoto(selectedUser.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150")}
                  title="Click to view full photo"
                />
              </div>
            </div>

            {/* Profile Content container */}
            <div className="flex-1 overflow-y-auto md:overflow-hidden flex flex-col md:grid md:grid-cols-5 p-6 pt-2 text-left relative min-h-0 gap-6 md:gap-0">
              
              {/* Left Column: User details, bio, badges, levels */}
              <div className="relative md:col-span-2 md:overflow-y-auto md:pr-5 md:border-r md:border-slate-100 flex flex-col pt-12 md:pt-14">

                {/* Action area: Follow Button */}
                <div className="flex justify-end gap-2 h-10 mt-1">
                  {currentUserProfile?.id !== selectedUser.id && (
                    <button
                      onClick={() => {
                        const isFollowing = (currentUserProfile?.following || []).includes(selectedUser.id);
                        handleFollowUser(selectedUser.id, selectedUser.handle);
                        
                        // Update local selectedUser stats for visual feedback
                        setSelectedUser(prev => {
                          if (!prev) return null;
                          const wasFollowing = isFollowing;
                          return {
                            ...prev,
                            followingCount: prev.followingCount + (wasFollowing ? -1 : 1)
                          };
                        });
                      }}
                      className={`text-[11px] font-bold px-3.5 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 shadow-sm ${
                        (currentUserProfile?.following || []).includes(selectedUser.id)
                          ? "bg-slate-50 text-slate-500 border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100"
                          : "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 hover:scale-[1.02]"
                      }`}
                    >
                      {(currentUserProfile?.following || []).includes(selectedUser.id) ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Following</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Follow Citizen</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Primary User Details */}
                <div className="mt-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h2 className="text-lg font-black text-slate-900 font-display">{selectedUser.name}</h2>
                    <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-wide flex items-center gap-0.5">
                      <ShieldCheck className="w-3 h-3" />
                      <span>{selectedUser.role}</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-medium font-sans mt-0.5">{selectedUser.handle}</p>
                </div>

                {/* Joined date */}
                <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-2.5 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-slate-300" />
                  <span>Joined Town Council • {selectedUser.joinedAt}</span>
                </div>

                {/* Bio description */}
                <p className="text-xs text-slate-600 mt-3.5 leading-relaxed font-sans bg-slate-50 p-3 rounded-xl border border-slate-100/60">
                  {selectedUser.bio}
                </p>

                {/* Level progress indicator */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-display">XP progression</span>
                    <span className="text-[11px] font-black font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                      Level {selectedUser.level}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, Math.max(10, selectedUser.xp % 100))}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-400 mt-1 font-mono">
                    <span>{selectedUser.xp % 100} / 100 XP</span>
                    <span>Next Level: {selectedUser.level + 1}</span>
                  </div>
                </div>

                {/* Badge Rack */}
                {selectedUser.badges && selectedUser.badges.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2 font-display">Civic Badges</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedUser.badges.map((badge: any, bIdx: number) => {
                        const name = typeof badge === 'object' && badge !== null ? badge.name : badge;
                        const description = typeof badge === 'object' && badge !== null ? badge.description : '';
                        return (
                          <span 
                            key={bIdx} 
                            title={description}
                            className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-100"
                          >
                            <Award className="w-3 h-3 text-amber-500" />
                            <span>{name}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Numeric Stats Cards Grid */}
                <div className="grid grid-cols-3 gap-2.5 mt-5 pt-4 border-t border-slate-100 mb-2">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center leading-none">
                    <span className="text-xs font-black text-slate-800 font-mono">{selectedUser.reportsCount}</span>
                    <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mt-1">Reports</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center leading-none">
                    <span className="text-xs font-black text-slate-800 font-mono">{selectedUser.postsCount}</span>
                    <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mt-1">Posts</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center leading-none">
                    <span className="text-xs font-black text-emerald-600 font-mono">+{selectedUser.reputation}</span>
                    <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mt-1">Reputation</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Citizen's Previous Posts History */}
              <div className="md:col-span-3 md:overflow-y-auto flex flex-col md:pl-5 border-t md:border-t-0 border-slate-100 pt-5 md:pt-0">
                <div className="flex items-center justify-between mb-3.5 sticky top-0 bg-white z-10 pb-2 border-b border-slate-100/80">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-display">Civic Posts History</span>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-mono">
                    {selectedUser.postsCount} {selectedUser.postsCount === 1 ? 'Post' : 'Posts'}
                  </span>
                </div>

                <div className="flex flex-col gap-3.5">
                  {!selectedUser.posts || selectedUser.posts.length === 0 ? (
                    <div className="text-center py-10 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-150">
                      <p className="text-xs text-slate-400 italic">No previous civic watch posts published by this citizen.</p>
                      <p className="text-[10px] text-slate-400 mt-1">Check back later for community updates.</p>
                    </div>
                  ) : (
                    selectedUser.posts.map((p: any) => {
                      const isLiked = (p.likedBy || []).includes(currentUserProfile?.id || "");
                      return (
                        <div key={p.id} className="bg-slate-50/40 hover:bg-slate-50/80 p-4 rounded-xl border border-slate-100 transition-colors flex flex-col gap-2.5 text-left">
                          {/* Post Header / Date */}
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                              {new Date(p.createdAt).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}
                            </span>
                            <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
                              <span>at {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>

                          {/* Post content */}
                          <p className="text-xs text-slate-700 leading-relaxed font-sans whitespace-pre-wrap break-words">
                            {p.content}
                          </p>

                          {/* Post media */}
                          {p.media && p.media.length > 0 && (
                            <div className="rounded-lg overflow-hidden border border-slate-100 bg-slate-100 max-h-[160px] flex items-center justify-center">
                              {p.media.map((med: any, mIdx: number) => (
                                <div key={mIdx} className="w-full relative aspect-video">
                                  {med.type && med.type.startsWith("video/") ? (
                                    <video src={med.url} controls className="w-full h-full object-cover" />
                                  ) : (
                                    <img src={med.url} alt="Attached media" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Quick engagement stats */}
                          <div className="flex items-center gap-4 mt-1 pt-2 border-t border-slate-100/50 text-slate-400">
                            <div className="flex items-center gap-1 hover:text-emerald-500 transition-colors">
                              <Heart className={`w-3.5 h-3.5 ${isLiked ? "fill-rose-500 text-rose-500" : ""}`} />
                              <span className="text-[10px] font-mono">{p.likes || 0}</span>
                            </div>
                            <div className="flex items-center gap-1 hover:text-emerald-500 transition-colors">
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span className="text-[10px] font-mono">{(p.comments || []).length}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          </motion.div>
        </div>
      )}

      {/* PHOTO ZOOM LIGHTBOX */}
      {zoomedPhoto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative max-w-md w-full max-h-[80vh] flex flex-col items-center justify-center z-10"
          >
            <button 
              onClick={() => setZoomedPhoto(null)}
              className="absolute -top-12 right-0 sm:-right-4 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-colors cursor-pointer"
              title="Close Image"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="bg-slate-900 p-2.5 rounded-3xl border border-white/10 shadow-2xl max-w-full">
              <img 
                src={zoomedPhoto} 
                alt="Zoomed Profile" 
                className="max-w-full max-h-[60vh] object-contain rounded-2xl shadow-inner"
                referrerPolicy="no-referrer"
              />
            </div>
            {selectedUser && (
              <div className="text-center mt-4">
                <p className="text-white text-sm font-black font-display">
                  {selectedUser.name}
                </p>
                <p className="text-slate-400 text-xs font-mono mt-0.5">
                  {selectedUser.handle}
                </p>
              </div>
            )}
          </motion.div>
          {/* Clicking backdrop closes it */}
          <div className="absolute inset-0 cursor-zoom-out" onClick={() => setZoomedPhoto(null)} />
        </div>
      )}

    </div>
  );
}
