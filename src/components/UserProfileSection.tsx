import React, { useState, useRef } from "react";
import { UserProfile } from "../types";
import { jsPDF } from "jspdf";
import { 
  Camera, User, Phone, MapPin, Calendar, Sparkles, 
  Building, Globe, Save, Loader2, Mail, Shield, AlertCircle, LogOut,
  FileText, History, Settings, ExternalLink, Clock, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle
} from "lucide-react";

interface UserProfileSectionProps {
  profile: UserProfile;
  issues: any[];
  onProfileUpdate: (updated: UserProfile) => void;
  onShowToast: (msg: string, type?: "success" | "info") => void;
  onSignOut: () => void;
}

export default function UserProfileSection({ 
  profile, 
  issues,
  onProfileUpdate, 
  onShowToast,
  onSignOut
}: UserProfileSectionProps) {
  const [name, setName] = useState(profile.name || "");
  const [handle, setHandle] = useState(profile.handle || "");
  const [phone, setPhone] = useState(profile.phone || "");
  const [address, setAddress] = useState(profile.address || "");
  const [city, setCity] = useState(profile.city || "");
  const [state, setState] = useState(profile.state || "");
  const [gender, setGender] = useState(profile.gender || "");
  const [dob, setDob] = useState(profile.dob || "");
  const [avatar, setAvatar] = useState(profile.avatar || "");
  
  const [activeTab, setActiveTab] = useState<"details" | "reports" | "history">("details");
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);
  
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
   const fileInputRef = useRef<HTMLInputElement>(null);
 
  const handleExportSinglePDF = (issue: any) => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const primaryColor = [16, 185, 129]; // Emerald
    const darkSlate = [15, 23, 42]; // Slate 900
    const lightGray = [241, 245, 249]; // Slate 100

    doc.setFillColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.rect(0, 0, 210, 40, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(22);
    doc.text("CIVIC WATCH PORTAL", 15, 18);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(16, 185, 129);
    doc.text("COMMUNITY WATCH & INFRASTRUCTURE RADAR", 15, 25);

    doc.setFontSize(9);
    doc.setTextColor(156, 163, 175);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 145, 18);
    doc.text(`System ID: CW-${issue.id || "TEMP"}`, 145, 24);

    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 40, 210, 3, "F");

    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(14);
    doc.text("COMMUNITY CONCERN REPORT", 15, 55);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(15, 58, 195, 58);

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

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Reporter Information", 15, 136);
    doc.line(15, 138, 195, 138);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Citizen Name:", 15, 146);
    doc.setFont("Helvetica", "normal");
    doc.text(profile.name || "Anonymous Citizen", 50, 146);

    doc.setFont("Helvetica", "bold");
    doc.text("Citizen Email:", 15, 154);
    doc.setFont("Helvetica", "normal");
    doc.text(profile.email || "N/A", 50, 154);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Detailed Description", 15, 167);
    doc.line(15, 169, 195, 169);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    
    const splitDescription = doc.splitTextToSize(issue.description || "No description provided.", 180);
    doc.text(splitDescription, 15, 177);

    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.rect(15, 250, 180, 25, "F");

    doc.setTextColor(71, 85, 105);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Thank you for your active participation in making our city safer and cleaner.", 20, 258);
    doc.text("This report is recorded in the Civic Watch blockchain catalog. Verified responses undergo", 20, 263);
    doc.text("active municipal triage within 24 to 48 hours.", 20, 268);

    doc.save(`civic_report_${issue.id}.pdf`);
    onShowToast("PDF report download initiated.");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("File size exceeds 5MB limit.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploadingImage(true);
      setError(null);
      const userId = localStorage.getItem("civic_watch_user_id");
      const headers: Record<string, string> = {};
      if (userId) {
        headers["x-user-id"] = userId;
      }
      
      const response = await fetch("/api/media/upload", {
        method: "POST",
        headers,
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();
      setAvatar(data.url);
      onShowToast("Profile picture uploaded successfully!", "success");
    } catch (err: any) {
      console.error("Image upload failed:", err);
      setError("Failed to upload image. Please try again.");
    } finally {
      setUploadingImage(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const userId = localStorage.getItem("civic_watch_user_id");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (userId) {
        headers["x-user-id"] = userId;
      }

      // Format handle to start with @
      let formattedHandle = handle.trim();
      if (formattedHandle && !formattedHandle.startsWith("@")) {
        formattedHandle = "@" + formattedHandle;
      }

      const response = await fetch("/api/profile", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: name.trim(),
          handle: formattedHandle || undefined,
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
          city: city.trim() || undefined,
          state: state.trim() || undefined,
          gender: gender || undefined,
          dob: dob || undefined,
          avatar: avatar || undefined,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to update profile");
      }

      const updatedUser = await response.json();
      onProfileUpdate(updatedUser);
      onShowToast("Your profile details have been saved successfully!", "success");
    } catch (err: any) {
      console.error("Profile update error:", err);
      setError(err.message || "Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const xpProgress = profile.xp % 500;
  const xpPercentage = Math.min(100, Math.max(0, (xpProgress / 500) * 100));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column: Avatar & Summary Info Card */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
          {/* Subtle background decoration */}
          <div className="absolute top-0 inset-x-0 h-20 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-100"></div>
          
          {/* Profile Picture Upload and Visual Area */}
          <div className="relative mt-4 z-10">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-md relative group">
              <img 
                src={avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150"} 
                alt={name}
                className="w-full h-full object-cover transition-all group-hover:scale-105"
              />
              {uploadingImage && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                </div>
              )}
              <button 
                type="button"
                onClick={triggerFileInput}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity cursor-pointer text-[10px] font-semibold"
                title="Upload Profile Picture"
              >
                <Camera className="w-5 h-5 mb-0.5" />
                <span>Upload</span>
              </button>
            </div>
            
            {/* Camera Floating Badge */}
            <button 
              type="button"
              onClick={triggerFileInput}
              className="absolute bottom-0 right-0 p-1.5 bg-slate-900 text-white rounded-full border border-white shadow hover:bg-slate-800 transition-colors cursor-pointer"
              title="Upload picture"
            >
              <Camera className="w-3 h-3" />
            </button>
            
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          <div className="mt-4 z-10 w-full">
            <h2 className="text-base font-bold text-slate-800 font-display">{name || "Your Name"}</h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{handle ? handle : `@${(name || "user").toLowerCase().replace(/[^a-z0-9]/g, "")}`}</p>
            <p className="text-[11px] text-slate-500 font-medium mt-1 inline-flex items-center gap-1 bg-slate-50 border border-slate-100 rounded-full px-2.5 py-0.5">
              <Mail className="w-3 h-3 text-slate-400" />
              {profile.email}
            </p>
          </div>

          {/* Level and XP Progress Widget */}
          <div className="w-full mt-6 pt-5 border-t border-slate-100 text-left">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Level {profile.level} Progress</span>
              <span className="text-[10px] font-bold text-slate-700 font-mono">{xpProgress} / 500 XP</span>
            </div>
            
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/50">
              <div 
                className="bg-gradient-to-r from-slate-700 to-slate-950 h-full rounded-full transition-all duration-500"
                style={{ width: `${xpPercentage}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 text-center font-medium">
              {500 - xpProgress} XP remaining to reach Level {profile.level + 1}
            </p>
          </div>

          {/* Civic Badge Inventory Summary */}
          <div className="w-full mt-5 pt-5 border-t border-slate-100 text-left">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2.5">Earned Medals ({profile.badges.length})</span>
            {profile.badges.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic">No medals unlocked yet. Submit and validate reports to earn them!</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {profile.badges.map((badge) => (
                  <div 
                    key={badge.id}
                    className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl px-2.5 py-1 text-[11px] text-slate-700 font-medium transition-colors cursor-default"
                    title={badge.description}
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>{badge.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Account Security / Operations Card inside Left Column */}
        <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
          <div>
            <h4 className="text-xs font-bold text-slate-500 font-display uppercase tracking-wider">Account Access</h4>
            <p className="text-[11px] text-slate-400 mt-1">Manage your active session or log out of this device.</p>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-150 hover:border-rose-200 rounded-xl py-2.5 px-4 text-xs font-bold transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out of Account</span>
          </button>
        </div>
      </div>

      {/* Right Column: Interactive Sub-tabs Panel */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        {/* Navigation Tabs Bar */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-1.5 shadow-xs flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab("details")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "details"
                ? "active-green-tab shadow-sm"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Profile Details</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("reports")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "reports"
                ? "active-green-tab shadow-sm"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>My Reports ({issues.filter(i => i.reporterId === profile.id).length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "history"
                ? "active-green-tab shadow-sm"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Updates Timeline ({profile.profileUpdatesLog?.length || 0})</span>
          </button>
        </div>

        {activeTab === "details" && (
          <form onSubmit={handleSave} className="active-green-panel border border-slate-200/60 rounded-3xl p-6 shadow-sm flex flex-col gap-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-800 font-display">Personal Credentials & Details</h3>
              <p className="text-xs text-slate-400 mt-1">Keep your profile current to facilitate community reports verification and official communication.</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-700 rounded-2xl p-4 text-xs flex gap-2.5 items-start">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-bold">An error occurred:</span>
                  <p className="mt-0.5 leading-relaxed">{error}</p>
                </div>
              </div>
            )}

            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name Field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-400" />
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Abhinav Srivastava"
                  className="bg-slate-50/50 border border-slate-200 focus:border-slate-900 focus:bg-white text-slate-800 rounded-xl px-3.5 py-2.5 text-xs outline-none transition-all placeholder:text-slate-400 font-medium"
                  required
                />
              </div>

              {/* Handle Field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                  <Shield className="w-3 h-3 text-slate-400" />
                  Community Username / Handle
                </label>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="e.g. @abhinav_watcher"
                  className="bg-slate-50/50 border border-slate-200 focus:border-slate-900 focus:bg-white text-slate-800 rounded-xl px-3.5 py-2.5 text-xs outline-none transition-all placeholder:text-slate-400 font-medium"
                />
              </div>

              {/* Phone Field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 (999) 000-0000"
                  className="bg-slate-50/50 border border-slate-200 focus:border-slate-900 focus:bg-white text-slate-800 rounded-xl px-3.5 py-2.5 text-xs outline-none transition-all placeholder:text-slate-400 font-mono text-slate-800 font-medium"
                />
              </div>

              {/* Date of Birth Field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="bg-slate-50/50 border border-slate-200 focus:border-slate-900 focus:bg-white text-slate-800 rounded-xl px-3.5 py-2.5 text-xs outline-none transition-all font-medium text-slate-700 font-sans"
                />
              </div>

              {/* Gender Field */}
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Gender Identity</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { value: "Male", label: "Male" },
                    { value: "Female", label: "Female" },
                    { value: "Non-binary", label: "Non-binary" },
                    { value: "Rather not say", label: "Rather not say" }
                  ].map((option) => {
                    const isSelected = gender === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setGender(option.value)}
                        className={`py-2 px-3 border rounded-xl text-xs font-semibold transition-all text-center cursor-pointer ${
                          isSelected 
                            ? "bg-slate-900 border-slate-900 text-white shadow-sm" 
                            : "bg-slate-50/50 border-slate-200 hover:border-slate-300 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Address Field */}
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  Street Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Apartment, Suite, Unit, Street address"
                  className="bg-slate-50/50 border border-slate-200 focus:border-slate-900 focus:bg-white text-slate-800 rounded-xl px-3.5 py-2.5 text-xs outline-none transition-all placeholder:text-slate-400 font-medium"
                />
              </div>

              {/* City Field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                  <Building className="w-3 h-3 text-slate-400" />
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Delhi"
                  className="bg-slate-50/50 border border-slate-200 focus:border-slate-900 focus:bg-white text-slate-800 rounded-xl px-3.5 py-2.5 text-xs outline-none transition-all placeholder:text-slate-400 font-medium"
                />
              </div>

              {/* State Field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                  <Globe className="w-3 h-3 text-slate-400" />
                  State / Region
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder=""
                  className="bg-slate-50/50 border border-slate-200 focus:border-slate-900 focus:bg-white text-slate-800 rounded-xl px-3.5 py-2.5 text-xs outline-none transition-all placeholder:text-slate-400 font-medium"
                />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-5 mt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving || uploadingImage}
                className="bg-slate-950 hover:bg-slate-900 text-white rounded-xl py-2.5 px-6 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Profile Details</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {activeTab === "reports" && (
          <div className="active-green-panel border border-slate-200/60 rounded-3xl p-6 shadow-sm flex flex-col gap-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-800 font-display">My Filed Reports History</h3>
              <p className="text-xs text-slate-400 mt-1">A timeline list of all civic and infrastructure issues you have reported through the application.</p>
            </div>

            {issues.filter(i => i.reporterId === profile.id).length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center justify-center gap-3">
                <div className="p-4 bg-slate-50 border border-slate-100 text-slate-400 rounded-full">
                  <FileText className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-700">No Reports Cataloged</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">You haven't filed any reports yet. Pin an issue on the interactive map to contribute!</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {issues
                  .filter(i => i.reporterId === profile.id)
                  .map((issue) => {
                    const isExpanded = expandedIssueId === issue.id;
                    const formattedDate = new Date(issue.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    // Determine color coding based on issue category or status
                    let statusColor = "bg-slate-100 text-slate-700 border-slate-200";
                    if (issue.status === "REPORTED") statusColor = "bg-blue-50 text-blue-700 border-blue-150";
                    else if (issue.status === "VERIFIED") statusColor = "bg-amber-50 text-amber-700 border-amber-150";
                    else if (issue.status === "IN_PROGRESS") statusColor = "bg-purple-50 text-purple-700 border-purple-150";
                    else if (issue.status === "RESOLVED") statusColor = "bg-emerald-50 text-emerald-700 border-emerald-150";

                    return (
                      <div 
                        key={issue.id} 
                        className="border border-slate-150 hover:border-slate-250 rounded-2xl overflow-hidden transition-all duration-200 bg-white shadow-xs"
                      >
                        <div 
                          onClick={() => setExpandedIssueId(isExpanded ? null : issue.id)}
                          className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/40 select-none"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            {issue.imageUrl ? (
                              <img 
                                src={issue.imageUrl} 
                                alt="" 
                                className="w-12 h-12 rounded-xl object-cover border border-slate-200 bg-slate-50 shrink-0" 
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                                <FileText className="w-5 h-5 text-slate-400" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-slate-800 truncate leading-snug">{issue.title}</h4>
                              <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-1 font-mono">
                                <Clock className="w-3 h-3 shrink-0" />
                                {formattedDate}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${statusColor} uppercase tracking-wider font-mono`}>
                              {issue.status}
                            </span>
                            <button
                              onClick={() => handleExportSinglePDF(issue)}
                              className="px-2.5 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-[10px] font-bold uppercase tracking-wider font-mono cursor-pointer transition-all shrink-0"
                            >
                              Export PDF
                            </button>
                            <div 
                              onClick={() => setExpandedIssueId(isExpanded ? null : issue.id)}
                              className="p-1 hover:bg-slate-100 rounded-md cursor-pointer shrink-0"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="px-4 pb-4 pt-1 border-t border-slate-100 bg-slate-50/40 text-xs flex flex-col gap-3.5">
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Description</span>
                              <p className="text-slate-600 leading-relaxed font-medium">{issue.description}</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-1">
                              <div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Location Details</span>
                                <p className="text-slate-600 font-semibold flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  {issue.address || "Pinned Location"}
                                </p>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5 ml-4.5">({issue.latitude.toFixed(5)}, {issue.longitude.toFixed(5)})</p>
                              </div>

                              <div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Issue Category & Severity</span>
                                <div className="flex flex-wrap gap-1.5 mt-0.5">
                                  <span className="bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-md text-[10px] border border-slate-200">
                                    {issue.category}
                                  </span>
                                  <span className={`font-semibold px-2 py-0.5 rounded-md text-[10px] border ${
                                    issue.severity === "CRITICAL" ? "bg-rose-50 text-rose-700 border-rose-200" :
                                    issue.severity === "HIGH" ? "bg-amber-50 text-amber-700 border-amber-200" :
                                    issue.severity === "MEDIUM" ? "bg-blue-50 text-blue-700 border-blue-200" :
                                    "bg-slate-100 text-slate-600 border-slate-200"
                                  }`}>
                                    {issue.severity}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {issue.statusHistory && issue.statusHistory.length > 0 && (
                              <div className="border-t border-slate-100 pt-3">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Verification History</span>
                                <div className="flex flex-col gap-2 pl-2 border-l-2 border-slate-200">
                                  {issue.statusHistory.map((history: any, idx: number) => (
                                    <div key={idx} className="text-[11px]">
                                      <div className="flex items-center gap-1.5 font-bold text-slate-700">
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-900 shrink-0"></span>
                                        <span>Status updated to <span className="text-slate-900">{history.status}</span></span>
                                        <span className="text-[9px] font-normal text-slate-400 font-mono">({new Date(history.updatedAt).toLocaleDateString()})</span>
                                      </div>
                                      <p className="text-slate-500 font-medium ml-3 mt-0.5">{history.note}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div className="active-green-panel border border-slate-200/60 rounded-3xl p-6 shadow-sm flex flex-col gap-6">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-800 font-display">Profile Updates Timeline</h3>
              <p className="text-xs text-slate-400 mt-1">A persistent secure log of all updates made to your account details, proving session synchronization.</p>
            </div>

            {!profile.profileUpdatesLog || profile.profileUpdatesLog.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center justify-center gap-3">
                <div className="p-4 bg-slate-50 border border-slate-100 text-slate-400 rounded-full">
                  <History className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-700">No Changes Recorded</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">No profile edits recorded yet. Any field modifications saved under the Details form will automatically create history logs here!</p>
                </div>
              </div>
            ) : (
              <div className="relative border-l-2 border-slate-100 pl-6 ml-3 py-1 flex flex-col gap-6">
                {[...profile.profileUpdatesLog].reverse().map((log, idx) => {
                  const logDate = new Date(log.updatedAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  });

                  return (
                    <div key={idx} className="relative">
                      {/* Left timeline anchor bullet */}
                      <span className="absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-900 ring-4 ring-white" />

                      <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                        <div className="text-xs">
                          <span className="text-[10px] font-extrabold font-mono uppercase text-slate-400 tracking-wider">Field Modified</span>
                          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                            <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            {log.field}
                          </h4>
                          <div className="mt-2 text-[11px] text-slate-500 flex flex-wrap items-center gap-1.5 font-medium">
                            <span className="line-through bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-400 font-mono">{log.oldValue}</span>
                            <span className="text-slate-400">➔</span>
                            <span className="bg-white border border-slate-200 px-2 py-0.5 rounded font-bold text-slate-700 font-mono">{log.newValue}</span>
                          </div>
                        </div>

                        <span className="text-[10px] text-slate-400 font-bold font-mono self-start sm:self-center bg-white border border-slate-100 rounded-full px-2.5 py-1 flex items-center gap-1 shadow-2xs shrink-0">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {logDate}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
