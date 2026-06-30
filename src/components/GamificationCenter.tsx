import React, { useState, useEffect } from "react";
import { UserProfile, Badge } from "../types";
import { Trophy, Award, Target, Flame, ChevronRight, Medal, ShieldAlert, Hammer, Trash2, Vote, Sparkles } from "lucide-react";

interface GamificationCenterProps {
  profile: UserProfile | null;
  leaderboard: UserProfile[];
}

export default function GamificationCenter({ profile, leaderboard }: GamificationCenterProps) {
  if (!profile) return null;

  // Level XP requirements: 500 XP per level
  const xpInCurrentLevel = profile.xp % 500;
  const xpNeededForNextLevel = 500 - xpInCurrentLevel;
  const levelProgressPercent = (xpInCurrentLevel / 500) * 100;

  const badgeIconMap = (iconName: string) => {
    switch (iconName) {
      case "ShieldAlert": return <ShieldAlert className="w-5 h-5 text-rose-500" />;
      case "Hammer": return <Hammer className="w-5 h-5 text-amber-500" />;
      case "Trash2": return <Trash2 className="w-5 h-5 text-emerald-500" />;
      case "Vote": return <Vote className="w-5 h-5 text-indigo-500" />;
      default: return <Award className="w-5 h-5 text-blue-500" />;
    }
  };

  const getRankBadgeTitle = (level: number) => {
    if (level === 1) return "Novice Watcher";
    if (level === 2) return "Community Sentinel";
    if (level === 3) return "Civic Guardian";
    if (level === 4) return "Municipal Pioneer";
    return "Civic Champion";
  };

  return (
    <div id="gamification-panel" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-slate-50 pb-4">
        <div>
          <h2 className="text-lg font-semibold font-display text-slate-800 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500 animate-bounce" />
            Citizen Engagement Portal
          </h2>
          <p className="text-xs text-slate-500">Earn XP and unlock badges for identifying, validating, and reporting issues</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Profile Card & XP tracker */}
        <div className="lg:col-span-4 bg-slate-50/50 rounded-2xl border border-slate-100 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white text-lg font-display">
                {profile.name.slice(0, 2)}
              </div>
              <div>
                <h3 className="text-sm font-bold font-display text-slate-800">{profile.name}</h3>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                  Level {profile.level}: {getRankBadgeTitle(profile.level)}
                </span>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">XP Progression</span>
                <span className="font-bold text-slate-800">{profile.xp} / {Math.floor(profile.xp / 500 + 1) * 500} XP</span>
              </div>
              <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 rounded-full transition-all duration-500" 
                  style={{ width: `${levelProgressPercent}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                {xpNeededForNextLevel} XP needed to reach Level {profile.level + 1}
              </span>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-200/50 grid grid-cols-2 gap-2 text-center">
            <div className="bg-white p-3 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block font-display">Reports Filed</span>
              <strong className="text-lg font-display text-slate-700 block mt-0.5">{profile.reportsCount}</strong>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block font-display">Validations</span>
              <strong className="text-lg font-display text-slate-700 block mt-0.5">{profile.validationsCount}</strong>
            </div>
          </div>
        </div>

        {/* Unlocked Badges Cabinet */}
        <div className="lg:col-span-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3.5 font-display flex items-center gap-1">
            <Award className="w-4 h-4 text-blue-500" />
            Unlocked Achievements ({profile.badges.length})
          </h3>

          <div className="grid grid-cols-1 gap-3">
            {profile.badges.length === 0 ? (
              <p className="text-xs italic text-slate-400 p-4 text-center bg-slate-50 rounded">No achievements earned yet. Report your first concern to unlock Pioneer badge!</p>
            ) : (
              profile.badges.map((badge) => (
                <div key={badge.id} className="bg-white hover:bg-slate-50/50 p-3 rounded-xl border border-slate-100 flex items-center gap-3.5 transition-colors">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex-shrink-0">
                    {badgeIconMap(badge.icon)}
                  </div>
                  <div className="text-xs">
                    <h4 className="font-bold text-slate-800 flex items-center gap-1.5 font-display">
                      {badge.name}
                      <Sparkles className="w-3 h-3 text-blue-500" />
                    </h4>
                    <p className="text-slate-500 leading-snug text-[11px] mt-0.5">{badge.description}</p>
                    <span className="text-[9px] text-slate-400 font-mono block mt-1">Unlocked {new Date(badge.unlockedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Civic Watch Leaderboard */}
        <div className="lg:col-span-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3.5 font-display flex items-center gap-1.5">
            <Medal className="w-4 h-4 text-amber-500" />
            Weekly Leaderboard
          </h3>

          <div className="flex flex-col gap-2">
            {leaderboard.map((user, idx) => {
              const isCurrentUser = user.id === "user-current-1";
              
              return (
                <div 
                  key={user.id} 
                  className={`p-3 rounded-xl flex items-center justify-between border transition-all ${
                    isCurrentUser 
                      ? "bg-blue-50/50 border-blue-200/80 shadow-sm" 
                      : "bg-white border-slate-50 hover:border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-5 text-center text-xs font-bold ${
                      idx === 0 ? "text-amber-500 text-sm" : idx === 1 ? "text-slate-400" : idx === 2 ? "text-amber-700" : "text-slate-400"
                    }`}>
                      #{idx + 1}
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-xs font-display">
                      {user.name.slice(0, 2)}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1 font-display">
                        {user.name}
                        {isCurrentUser && <span className="bg-blue-100 text-blue-800 text-[8px] px-1 py-0.2 rounded font-mono">YOU</span>}
                      </h4>
                      <span className="text-[9px] text-slate-400">Level {user.level} {getRankBadgeTitle(user.level)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-700 block font-display">{user.xp} XP</span>
                    <span className="text-[8px] text-slate-400 uppercase tracking-widest">{user.reportsCount} Reports</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
