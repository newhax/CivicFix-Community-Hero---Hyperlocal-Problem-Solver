import React, { useState } from "react";
import { UserProfile } from "../types";
import { 
  ArrowRight, ShieldAlert, 
  Eye, EyeOff, Sparkles, AlertCircle,
  Infinity
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AuthScreenProps {
  onAuthSuccess: (user: UserProfile) => void;
}

const PRESET_AVATARS = [
  {
    id: "avatar-1",
    url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150",
    label: "Active Watcher"
  },
  {
    id: "avatar-2",
    url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150",
    label: "Local Champion"
  },
  {
    id: "avatar-3",
    url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
    label: "Eco Patrol"
  },
  {
    id: "avatar-4",
    url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150",
    label: "Safety Advocate"
  }
];

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [selectedAvatar] = useState(PRESET_AVATARS[0].url);

  React.useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        const user = event.data.user;
        localStorage.setItem("civic_watch_user_id", user.id);
        onAuthSuccess(user);
      } else if (event.data?.type === 'GOOGLE_AUTH_MOCK_SUCCESS') {
        const mockUser = event.data.user;
        setLoading(true);
        try {
          const res = await fetch("/api/auth/google/mock-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(mockUser)
          });
          if (res.ok) {
            const data = await res.json();
            localStorage.setItem("civic_watch_user_id", data.id);
            onAuthSuccess(data);
          } else {
            throw new Error("Failed to complete demo sandbox login");
          }
        } catch (err: any) {
          setError(err.message || "Failed to complete login");
        } finally {
          setLoading(false);
        }
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onAuthSuccess]);

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      const redirectUri = `${window.location.origin}/auth/google/callback`;
      const response = await fetch(`/api/auth/google/url?redirect_uri=${encodeURIComponent(redirectUri)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch auth endpoint');
      }
      const { url } = await response.json();

      const authWindow = window.open(
        url,
        'google_oauth_popup',
        'width=500,height=650'
      );

      if (!authWindow) {
        alert('Please allow popups for this site to sign in with Google.');
      }
    } catch (error: any) {
      console.error('Google Sign-In error:', error);
      setError(error.message || 'Failed to initiate Google Sign-In.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const fullName = isLogin ? "" : (firstName.trim() + " " + lastName.trim()).trim();
    const userHandle = isLogin ? "" : `@${firstName.toLowerCase() || 'user'}${Math.floor(Math.random() * 900 + 100)}`;

    const url = isLogin ? "/api/auth/login" : "/api/auth/register";
    const body = isLogin 
      ? { email, password }
      : { name: fullName, email, password, handle: userHandle, avatar: selectedAvatar };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong. Please try again.");
      }

      localStorage.setItem("civic_watch_user_id", data.id);
      onAuthSuccess(data);
    } catch (err: any) {
      setError(err.message || "Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] flex items-center justify-center p-4 sm:p-6 lg:p-8 select-none text-white font-sans">
      <AnimatePresence mode="wait">
        <motion.div 
          key={isLogin ? "login" : "signup"}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="w-full max-w-5xl bg-[#000000] rounded-[2.5rem] flex flex-col md:flex-row overflow-hidden min-h-[620px] shadow-2xl relative"
        >
          {/* Left Side: Gradient Welcome Panel with Mesh effect */}
          <div 
            style={{ 
              background: "radial-gradient(circle at 40% 30%, #6d28d9 0%, #1e1b4b 55%, #000000 100%)" 
            }}
            className="hidden md:flex w-1/2 p-12 flex-col justify-between rounded-[2rem] relative border border-neutral-900 overflow-hidden"
          >
            {/* Animated background mesh circles in an infinite loop */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
              <motion.div 
                animate={{
                  scale: [1, 1.25, 0.95, 1.15, 1],
                  x: [0, 30, -20, 15, 0],
                  y: [0, -40, 20, -10, 0],
                }}
                transition={{
                  duration: 15,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute top-[-15%] left-[-15%] w-[75%] h-[75%] rounded-full bg-purple-600/25 blur-[70px]"
              />
              <motion.div 
                animate={{
                  scale: [1, 1.15, 1.3, 0.9, 1],
                  x: [0, -40, 30, -15, 0],
                  y: [0, 30, -10, 25, 0],
                }}
                transition={{
                  duration: 18,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute bottom-[-15%] right-[-15%] w-[80%] h-[80%] rounded-full bg-teal-500/15 blur-[90px]"
              />
            </div>

            {/* Logo/Name with infinite rotating Infinity icon */}
            <div className="flex items-center gap-2.5 relative z-10">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 rounded-full border border-white flex items-center justify-center text-white"
              >
                <Infinity className="w-3 h-3" />
              </motion.div>
              <span className="font-semibold text-sm tracking-tight text-white/95">CivicFix</span>
            </div>

            {/* Stepper Center section */}
            <div className="my-auto space-y-8 relative z-10">
              <div className="space-y-3">
                <h2 className="text-3xl lg:text-4xl font-black font-display tracking-tight text-white leading-tight">
                  {isLogin ? "Welcome Back to Us" : "Get Started with Us"}
                </h2>
                {!isLogin && (
                  <p className="text-neutral-400 text-xs lg:text-sm leading-relaxed max-w-xs">
                    Complete these easy steps to register your account.
                  </p>
                )}
              </div>

              {/* Steps indicators */}
              <div className="space-y-3.5 pt-4 max-w-xs">
                {isLogin ? (
                  <>
                    <div className="flex items-center gap-3 bg-white p-3.5 rounded-2xl text-black font-bold transition-all shadow-md">
                      <div className="w-5 h-5 rounded-full bg-black text-white text-[11px] font-black flex items-center justify-center shrink-0">
                        1
                      </div>
                      <span className="text-xs">Log in to your account</span>
                    </div>
                    <div className="flex items-center gap-3 bg-white/[0.05] border border-white/[0.02] p-3.5 rounded-2xl text-neutral-400 font-medium">
                      <div className="w-5 h-5 rounded-full bg-white/10 text-neutral-400 text-[11px] font-black flex items-center justify-center shrink-0">
                        2
                      </div>
                      <span className="text-xs">Synchronize device gateway</span>
                    </div>
                    <div className="flex items-center gap-3 bg-white/[0.05] border border-white/[0.02] p-3.5 rounded-2xl text-neutral-400 font-medium">
                      <div className="w-5 h-5 rounded-full bg-white/10 text-neutral-400 text-[11px] font-black flex items-center justify-center shrink-0">
                        3
                      </div>
                      <span className="text-xs">Access community terminal</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3 bg-white p-3.5 rounded-2xl text-black font-bold transition-all shadow-md">
                      <div className="w-5 h-5 rounded-full bg-black text-white text-[11px] font-black flex items-center justify-center shrink-0">
                        1
                      </div>
                      <span className="text-xs">Sign up your account</span>
                    </div>
                    <div className="flex items-center gap-3 bg-white/[0.05] border border-white/[0.02] p-3.5 rounded-2xl text-neutral-400 font-medium">
                      <div className="w-5 h-5 rounded-full bg-white/10 text-neutral-400 text-[11px] font-black flex items-center justify-center shrink-0">
                        2
                      </div>
                      <span className="text-xs">Set up your workspace</span>
                    </div>
                    <div className="flex items-center gap-3 bg-white/[0.05] border border-white/[0.02] p-3.5 rounded-2xl text-neutral-400 font-medium">
                      <div className="w-5 h-5 rounded-full bg-white/10 text-neutral-400 text-[11px] font-black flex items-center justify-center shrink-0">
                        3
                      </div>
                      <span className="text-xs">Set up your profile</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Subtle branding or watermark */}
            <div className="text-[10px] text-neutral-500 font-mono relative z-10">
              Secure Terminal Connection • v2.6.0
            </div>
          </div>

          {/* Right Side: Black Theme Form Area */}
          <div className="w-full md:w-1/2 p-6 sm:p-10 md:p-14 flex flex-col justify-center bg-[#000000]">
            <div className="max-w-md mx-auto w-full space-y-6">
              
              <div className="text-center md:text-left space-y-2">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  {isLogin ? "Sign In Account" : "Sign Up Account"}
                </h2>
                <p className="text-neutral-400 text-xs sm:text-sm">
                  {isLogin 
                    ? "Enter your details to log in to your account."
                    : "Enter your personal data to create your account."}
                </p>
              </div>

              {/* Social Login Buttons */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleGoogleSignIn}
                  className="w-full bg-[#090d16] hover:bg-neutral-900 text-white font-medium py-2.5 px-4 rounded-xl text-xs border border-neutral-800 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                  </svg>
                  <span>Google</span>
                </button>
              </div>

              {/* Or divider */}
              <div className="relative flex items-center justify-center py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-neutral-900"></div>
                </div>
                <span className="relative z-10 bg-[#000000] px-3.5 text-[11px] font-semibold text-neutral-500 uppercase tracking-widest font-mono">
                  Or
                </span>
              </div>

              {/* Main Form */}
              <form className="space-y-4" onSubmit={handleSubmit}>
                {error && (
                  <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded-xl flex items-center gap-2.5 text-rose-200 text-xs animate-pulse">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                
                {/* Inputs for Name (Only in Registration Mode) */}
                {!isLogin && (
                  <div className="flex gap-3">
                    <div className="w-1/2 space-y-1.5">
                      <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                        First Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="eg. John"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full bg-[#0c0c0e] p-3 rounded-xl border border-neutral-800 focus:border-purple-500 outline-none text-white text-xs transition-colors"
                      />
                    </div>
                    <div className="w-1/2 space-y-1.5">
                      <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                        Last Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="eg. Francisco"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full bg-[#0c0c0e] p-3 rounded-xl border border-neutral-800 focus:border-purple-500 outline-none text-white text-xs transition-colors"
                      />
                    </div>
                  </div>
                )}
                
                {/* Email field */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="eg. johnfrans@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#0c0c0e] p-3 rounded-xl border border-neutral-800 focus:border-purple-500 outline-none text-white text-xs transition-colors"
                  />
                </div>
                
                {/* Password field with Show/Hide Toggle */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#0c0c0e] p-3 pr-10 rounded-xl border border-neutral-800 focus:border-purple-500 outline-none text-white text-xs transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {!isLogin && (
                    <p className="text-[10px] text-neutral-500">
                      Must be at least 8 characters.
                    </p>
                  )}
                </div>

                {/* Submitting button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-white hover:bg-neutral-100 text-black py-3 rounded-xl font-bold text-sm transition-all duration-200 disabled:opacity-50 active:scale-98 cursor-pointer mt-4"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-black" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Authenticating...
                    </span>
                  ) : (
                    isLogin ? "Sign In" : "Sign Up"
                  )}
                </button>
              </form>

              {/* Toggle Login/Signup Mode Link */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => { setIsLogin(!isLogin); setError(null); }}
                  className="text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  {isLogin ? (
                    <span>
                      Don't have an account? <strong className="text-white hover:underline">Sign up</strong>
                    </span>
                  ) : (
                    <span>
                      Already have an account? <strong className="text-white hover:underline">Log in</strong>
                    </span>
                  )}
                </button>
              </div>

            </div>
          </div>

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
