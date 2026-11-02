"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import { 
  Compass, 
  Briefcase, 
  Building2, 
  Sliders, 
  Coins, 
  RotateCcw, 
  Plus, 
  LogOut,
  X
} from "lucide-react";

interface SidebarProps {
  currentTab: "gallery" | "my-investments" | "team-project" | "admin";
  setCurrentTab: (tab: "gallery" | "my-investments" | "team-project" | "admin") => void;
  openProjectorRanking?: () => void;
  openCreateProject?: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  openProjectorRanking,
  openCreateProject,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const {
    event,
    currentUser,
    users,
    setCurrentUser,
    logout,
    remainingCredits,
    usedCredits,
    projects,
    getUserTotalInvestments,
    resetCreditsToDefault,
  } = useApp();

  if (!currentUser) return null;

  const creditUsagePercent = Math.min(100, Math.round((usedCredits / event.baseCredit) * 100));
  const myInvestments = getUserTotalInvestments();

  const handleTabClick = (tab: "gallery" | "my-investments" | "team-project" | "admin") => {
    setCurrentTab(tab);
    if (onCloseMobile) onCloseMobile();
  };

  const sidebarContent = (
    <>
      <div className="flex flex-col gap-4 p-5 overflow-y-auto flex-1">
        
        {/* 1. Logo Header */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <div className="font-display text-xl font-normal tracking-tight bg-gradient-to-r from-blue-700 to-indigo-800 bg-clip-text text-transparent">
                레디스타트업
              </div>
              <div className="text-[11px] font-medium text-slate-500 tracking-wide">
                클라우드펀딩 플랫폼
              </div>
            </div>
          </div>

          {/* 모바일 닫기 버튼 */}
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              title="사이드바 닫기"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* 2. Bento Wallet Card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs relative overflow-hidden group hover:border-blue-300 transition-colors">
          <div className="absolute -top-12 -right-12 w-28 h-28 bg-blue-100 rounded-full blur-2xl opacity-60 pointer-events-none"></div>

          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1.5">
            <span className="flex items-center gap-1.5 text-slate-700">
              <Coins className="w-3.5 h-3.5 text-amber-500" />
              내 투자 지갑 (Wallet)
            </span>
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
              1인 한도
            </span>
          </div>

          <div className="text-2xl font-extrabold font-mono text-slate-900 tracking-tight flex items-baseline gap-1">
            {remainingCredits.toLocaleString()}
            <span className="text-xs font-bold text-blue-600 font-sans">CR</span>
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex justify-between text-[11px] text-slate-500 font-mono mb-1">
              <span>사용 {usedCredits.toLocaleString()} CR</span>
              <span className="font-semibold text-blue-600">잔여 {remainingCredits.toLocaleString()} CR</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
              <div
                className="bg-gradient-to-r from-blue-600 to-cyan-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${creditUsagePercent}%` }}
              ></div>
            </div>
          </div>

          {/* Fast Credit Reset / Refill for testing */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] text-slate-400">테스트 잔액 리필</span>
            <button
              type="button"
              onClick={resetCreditsToDefault}
              className="text-[10px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              초기화
            </button>
          </div>
        </div>

        {/* 3. Navigation Menu */}
        <nav className="flex flex-col gap-1.5 bg-white rounded-2xl p-2 border border-slate-200/90 shadow-2xs">
          <button
            type="button"
            onClick={() => handleTabClick("gallery")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition cursor-pointer ${
              currentTab === "gallery"
                ? "bg-blue-50 text-blue-700 font-bold"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Compass className={`w-4 h-4 ${currentTab === "gallery" ? "text-blue-600" : "text-slate-400"}`} />
              <span>프로젝트 둘러보기</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400 font-semibold">{projects.length}</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabClick("my-investments")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition cursor-pointer ${
              currentTab === "my-investments"
                ? "bg-blue-50 text-blue-700 font-bold"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Briefcase className={`w-4 h-4 ${currentTab === "my-investments" ? "text-emerald-600" : "text-slate-400"}`} />
              <span>내 투자 내역</span>
            </div>
            {myInvestments.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white font-mono">
                {myInvestments.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabClick("team-project")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition cursor-pointer ${
              currentTab === "team-project"
                ? "bg-blue-50 text-blue-700 font-bold"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Building2 className={`w-4 h-4 ${currentTab === "team-project" ? "text-amber-500" : "text-slate-400"}`} />
              <span>내 팀 프로젝트</span>
            </div>
            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
              {currentUser.teamName || "Team 01"}
            </span>
          </button>

          {/* Admin Console (관리자 역할일 때만 활성화) */}
          {currentUser.role === "ADMIN" && (
            <button
              type="button"
              onClick={() => handleTabClick("admin")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition cursor-pointer ${
                currentTab === "admin"
                  ? "bg-slate-900 text-white font-bold shadow-xs"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>관리자 콘솔</span>
              </div>
              <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-amber-400/20 text-amber-500 font-bold">
                ADMIN
              </span>
            </button>
          )}
        </nav>

        {/* 4. CTA Button: Glowing primary blue "+ 새 프로젝트 출품 등록" */}
        {openCreateProject && (
          currentUser.role === "ADMIN" || event.isRegistrationOpen ? (
            <button
              type="button"
              onClick={() => {
                openCreateProject();
                if (onCloseMobile) onCloseMobile();
              }}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold text-xs md:text-sm shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/35 transition-all duration-200 flex items-center justify-center gap-2 group cursor-pointer active:scale-98"
            >
              <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
              <span>새 프로젝트 출품 등록</span>
            </button>
          ) : (
            <div className="w-full py-2.5 px-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-400 font-semibold text-xs text-center">
              🔒 출품 등록이 마감되었습니다
            </div>
          )
        )}
      </div>

      {/* 5. Bottom User Profile */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
        <div className="bg-white rounded-2xl p-3 border border-slate-200/90 shadow-2xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-xs shrink-0">
              {currentUser.name.slice(0, 1)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900 truncate">{currentUser.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                  currentUser.role === "ADMIN" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                }`}>
                  {currentUser.role === "ADMIN" ? "관리자" : currentUser.role === "JUDGE" ? "심사위원" : "학생"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate">{currentUser.teamName || currentUser.department || "2026 청중 평가단"}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            title="로그아웃"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* 1. 데스크톱 & 태블릿(md 이상): 고정 사이드바 */}
      <aside className="hidden md:flex w-72 lg:w-80 bg-white border-r border-slate-200/90 flex-col justify-between h-screen sticky top-0 shrink-0 z-30 shadow-xs">
        {sidebarContent}
      </aside>

      {/* 2. 모바일 (md 미만): 슬라이드인 오버레이 드로어 */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* 어두운 배경 (클릭 시 닫힘) */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={onCloseMobile}
          />
          
          {/* 슬라이드인 사이드바 본체 */}
          <div className="relative w-80 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col justify-between z-10 animate-in slide-in-from-left duration-250">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
