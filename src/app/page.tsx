"use client";

import React, { useState, useMemo } from "react";
import { AppProvider, useApp } from "@/context/AppContext";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { Sidebar } from "@/components/layout/Sidebar";
import { ProjectCard } from "@/components/gallery/ProjectCard";
import { ProjectDetailModal } from "@/components/modals/ProjectDetailModal";
import { ProjectFormModal } from "@/components/modals/ProjectFormModal";
import { RankingBoard } from "@/components/ranking/RankingBoard";
import { MyInvestmentsView } from "@/components/investments/MyInvestmentsView";
import { TeamProjectManager } from "@/components/team/TeamProjectManager";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { Project } from "@/types";
import { 
  Search, 
  Sparkles, 
  Calendar, 
  Users, 
  ShieldAlert, 
  Info, 
  X, 
  Plus,
  Menu,
  Compass,
  Briefcase,
  Building2,
  Sliders,
  Trophy,
  LogOut
} from "lucide-react";

function MainDashboard() {
  const { event, events, selectCourse, canStudentEditProject, projects, currentUser, logout } = useApp();
  const [currentTab, setCurrentTab] = useState<"gallery" | "my-investments" | "team-project" | "admin">("gallery");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isProjectorRankingOpen, setIsProjectorRankingOpen] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  
  // Gallery Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedFormat, setSelectedFormat] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"RAISED" | "PERCENT" | "BACKERS" | "LATEST">("RAISED");

  // Global Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  // Filtered & Sorted Projects
  const filteredProjects = useMemo(() => {
    return projects
      .filter((p) => {
        if (p.isHidden) return false;
        const matchSearch =
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.teamName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchCat = selectedCategory === "ALL" || p.category === selectedCategory;
        const matchFmt =
          selectedFormat === "ALL" ||
          p.landingFormat === selectedFormat ||
          (selectedFormat === "WEB" && p.landingFormat === "HTML");
        return matchSearch && matchCat && matchFmt;
      })
      .sort((a, b) => {
        const targetA = a.targetCredits || 20000;
        const targetB = b.targetCredits || 20000;
        if (sortBy === "RAISED") return b.totalCredits - a.totalCredits;
        if (sortBy === "PERCENT") return b.totalCredits / targetB - a.totalCredits / targetA;
        if (sortBy === "BACKERS") return b.investorCount - a.investorCount;
        return 0;
      });
  }, [projects, searchQuery, selectedCategory, selectedFormat, sortBy]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#F8FAFC] text-slate-800 font-sans selection:bg-blue-600 selection:text-white">
      
      {/* ========================================================
          1. TOP GLOBAL HEADER & ROLE TOGGLE
          ======================================================== */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs shrink-0">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-15 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Left: Mobile Menu Button & Live Indicator */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile Hamburger Drawer Trigger */}
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-2 -ml-1 text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              aria-label="전체 메뉴 열기"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-[11px] sm:text-xs font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600" />
              </span>
              <span className="hidden xs:inline">초대코드: {event.inviteCode || "2026"}</span>
              <span className="xs:hidden">#{event.inviteCode || "2026"}</span>
            </div>

            {currentUser?.role === "ADMIN" && events.length > 0 ? (
              <select
                value={event.id}
                onChange={(e) => selectCourse(e.target.value)}
                aria-label="운영 과정 선택"
                className="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-xs font-bold border border-slate-700 cursor-pointer max-w-[180px] sm:max-w-[260px] truncate"
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    [{ev.inviteCode || "2026"}] {ev.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 truncate max-w-[240px]">
                <span className="truncate">{event.name}</span>
              </div>
            )}

            <div className="hidden lg:flex items-center gap-1.5">
              <span
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                  event.isRegistrationOpen
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-slate-100 text-slate-500 border-slate-200"
                }`}
              >
                출품등록 {event.isRegistrationOpen ? "ON" : "OFF"}
              </span>
              <span
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                  event.isFundingOpen
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-slate-100 text-slate-500 border-slate-200"
                }`}
              >
                펀딩진행 {event.isFundingOpen ? "ON" : "OFF"}
              </span>
            </div>
          </div>

          {/* Right: Quick Stage Notice & Role Switcher */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden lg:flex items-center text-xs text-slate-500 font-mono">
              <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
              <span>D-DAY · 실시간 가상 펀딩 세션 진행 중</span>
            </div>

            {/* Current Logged-in User Status Badge (Account Switching Blocked) */}
            <div className="flex items-center px-2.5 sm:px-3 py-1 sm:py-1.5 bg-slate-100 rounded-lg border border-slate-200 text-[11px] sm:text-xs font-medium text-slate-700 gap-1.5">
              {currentUser?.role === "ADMIN" ? (
                <>
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="font-bold text-slate-900">{currentUser.name}</span>
                  <span className="hidden xs:inline text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                    관리자
                  </span>
                </>
              ) : (
                <>
                  <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="font-bold text-slate-900 truncate max-w-[90px] sm:max-w-[140px]">
                    {currentUser?.name}
                  </span>
                  <span className="hidden xs:inline text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                    {currentUser?.role === "JUDGE" ? "심사위원" : "학생"}
                  </span>
                </>
              )}
            </div>

            {/* Quick Logout Button */}
            <button
              type="button"
              onClick={logout}
              title="로그아웃"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer shrink-0"
              aria-label="로그아웃"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>
      </header>

      {/* ========================================================
          2. MAIN BODY (LEFT SIDEBAR + RIGHT SCROLLABLE CONTENT)
          ======================================================== */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sticky Navigation Sidebar (Drawer on mobile, fixed on desktop) */}
        <Sidebar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          openProjectorRanking={() => setIsProjectorRankingOpen(true)}
          openCreateProject={() => {
            setEditingProject(null);
            setIsCreateModalOpen(true);
          }}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Right Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto relative p-3 sm:p-6 lg:p-8 pb-24 md:pb-8">
          <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
            
            {/* VIEW 1: PROJECT GALLERY */}
            {currentTab === "gallery" && (
              <div className="space-y-6">
                
                {/* Hero Banner: Deep Gradient Card */}
                <div className="rounded-2xl sm:rounded-3xl p-4 sm:p-7 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white relative overflow-hidden border border-slate-800 shadow-xl">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-cyan-500/15 rounded-full blur-2xl pointer-events-none" />

                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6">
                    <div className="max-w-xl space-y-2">
                      <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] sm:text-xs text-cyan-300 font-medium">
                        <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                        <span>2026 대학 스타트업 데모데이 크라우드펀딩</span>
                      </div>
                      <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                        미래를 이끌 청년 창업팀에게<br className="hidden sm:inline" />
                        당신의 모의투자 크레딧을 베팅하세요
                      </h1>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-1">
                        모든 참여자에게 <span className="text-amber-400 font-mono font-bold">10,000 CR</span> 기본 지급. 건당 <span className="text-cyan-300 font-mono font-bold">2,000 ~ 5,000 CR</span> 분산 투자 가능하며, 실시간 펀딩 점수는 심사 평가에 자동 반영됩니다.
                      </p>
                    </div>

                    {/* Quick Rule Chips */}
                    <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-3.5 sm:p-4 flex flex-col gap-2 shrink-0 w-full md:w-auto md:min-w-56 text-xs">
                      <div className="text-slate-300 font-semibold flex items-center gap-1.5 pb-1 border-b border-white/10">
                        <Info className="w-3.5 h-3.5 text-cyan-400" />
                        <span>모의투자 핵심 원칙</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-200">
                        <span>1인 지급 크레딧</span>
                        <span className="font-mono font-bold text-amber-400">10,000 CR</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-200">
                        <span>1회 투자 제한</span>
                        <span className="font-mono font-bold text-cyan-300">2,000~5,000 CR</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-200">
                        <span>자가 투자 방지</span>
                        <span className="font-semibold text-rose-300">본인 팀 투자 불가</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Search & Filter Bar */}
                <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/90 shadow-2xs flex flex-col gap-3 sm:gap-4">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
                    
                    {/* Search input */}
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="프로젝트명, 팀명 또는 키워드로 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Sort selector & Count */}
                    <div className="flex items-center justify-between sm:justify-end gap-2.5">
                      <div className="text-xs text-slate-500 shrink-0 font-medium">
                        총 <span className="font-mono font-bold text-blue-600">{filteredProjects.length}</span>개
                      </div>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        aria-label="프로젝트 정렬 방식"
                        className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-2.5 sm:px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                      >
                        <option value="RAISED">펀딩액 높은순</option>
                        <option value="PERCENT">달성률 높은순</option>
                        <option value="BACKERS">참여자 많은순</option>
                        <option value="LATEST">최신순</option>
                      </select>
                    </div>
                  </div>

                  {/* Filter tags (Category & Format) - Horizontal Scroll on Mobile */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
                    {/* Category Pills (Touch friendly horizontal scroll) */}
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1 sm:mx-0 sm:px-0">
                      {["ALL", "AI/SaaS", "Bio/Health", "FinTech", "GreenTech", "Robotics", "EdTech"].map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedCategory(cat)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer shrink-0 whitespace-nowrap ${
                            selectedCategory === cat
                              ? "bg-blue-600 text-white font-semibold shadow-2xs"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {cat === "ALL" ? "전체 분야" : cat}
                        </button>
                      ))}
                    </div>

                    {/* Format Pills */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs shrink-0 self-start sm:self-auto overflow-x-auto no-scrollbar">
                      <span className="text-[10px] text-slate-400 px-1 font-medium">형식:</span>
                      {["ALL", "IMAGE", "PDF", "WEB"].map((fmt) => (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => setSelectedFormat(fmt)}
                          className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer shrink-0 ${
                            selectedFormat === fmt
                              ? "bg-white text-blue-700 font-bold shadow-2xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          {fmt === "ALL" ? "전체" : fmt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Responsive Project Cards Grid */}
                {filteredProjects.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {filteredProjects.map((project) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        onSelect={(p) => setSelectedProject(p)}
                        onInvestClick={(p) => setSelectedProject(p)}
                        onEditClick={(p) => {
                          setEditingProject(p);
                          setIsCreateModalOpen(true);
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-slate-800 text-base">
                      {searchQuery ? "검색 결과와 일치하는 프로젝트가 없습니다" : "출품 프로젝트가 아직 없습니다"}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 mb-5">
                      {searchQuery
                        ? "검색어를 다시 확인하시거나 필터를 초기화해 보세요."
                        : "첫 번째 혁신 스타트업 프로젝트를 직접 출품 등록해 보세요!"}
                    </p>
                    {!searchQuery && (currentUser?.role === "ADMIN" || canStudentEditProject) && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProject(null);
                          setIsCreateModalOpen(true);
                        }}
                        className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 transition inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Plus className="w-4 h-4" /> 프로젝트 출품 등록하기
                      </button>
                    )}
                  </div>
                )}

              </div>
            )}

            {/* VIEW 2: MY INVESTMENTS */}
            {currentTab === "my-investments" && (
              <MyInvestmentsView
                onExploreGallery={() => setCurrentTab("gallery")}
                onEditInvestment={(p) => setSelectedProject(p)}
              />
            )}

            {/* VIEW 3: MY TEAM PROJECT */}
            {currentTab === "team-project" && (
              <TeamProjectManager
                onSelectProject={(p) => setSelectedProject(p)}
                openCreateProject={() => {
                  setEditingProject(null);
                  setIsCreateModalOpen(true);
                }}
                onEditProject={(p) => {
                  setEditingProject(p);
                  setIsCreateModalOpen(true);
                }}
              />
            )}

            {/* VIEW 4: ADMIN DASHBOARD */}
            {currentTab === "admin" && currentUser?.role === "ADMIN" && (
              <AdminDashboard
                openProjectorRanking={() => setIsProjectorRankingOpen(true)}
              />
            )}

          </div>
        </main>
      </div>

      {/* ========================================================
          MOBILE FIXED BOTTOM NAVIGATION BAR (< 768px)
          ======================================================== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-2 py-1.5 flex items-center justify-around shadow-lg pb-[max(env(safe-area-inset-bottom),0.375rem)]">
        <button
          type="button"
          onClick={() => setCurrentTab("gallery")}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition cursor-pointer ${
            currentTab === "gallery" ? "text-blue-600 font-bold" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Compass className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-medium">둘러보기</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab("my-investments")}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition cursor-pointer ${
            currentTab === "my-investments" ? "text-blue-600 font-bold" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Briefcase className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-medium">내 투자</span>
        </button>

        {/* Quick Center Floating Action Button for Project Submission */}
        <button
          type="button"
          onClick={() => {
            if (currentUser?.role !== "ADMIN" && !canStudentEditProject) {
              showToast(
                event.isFundingOpen
                  ? "🔒 펀딩 진행 중에는 작품을 등록하거나 수정할 수 없습니다."
                  : "🔒 현재 출품 등록 기간이 아닙니다."
              );
              return;
            }
            setEditingProject(null);
            setIsCreateModalOpen(true);
          }}
          className="flex flex-col items-center justify-center -mt-5"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 active:scale-95 transition cursor-pointer">
            <Plus className="w-6 h-6" />
          </div>
          <span className="text-[10px] text-slate-700 font-bold mt-0.5">출품하기</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab("team-project")}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition cursor-pointer ${
            currentTab === "team-project" ? "text-blue-600 font-bold" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Building2 className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-medium">내 팀</span>
        </button>

        {currentUser?.role === "ADMIN" && (
          <button
            type="button"
            onClick={() => setCurrentTab("admin")}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition cursor-pointer ${
              currentTab === "admin" ? "text-blue-600 font-bold" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Sliders className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 font-medium">운영관리</span>
          </button>
        )}
      </nav>

      {/* ========================================================
          MODALS & OVERLAYS
          ======================================================== */}
      {/* 1. Project Detail Modal (Wadiz-style Split Viewer) */}
      {selectedProject && (
        <ProjectDetailModal
          project={projects.find((p) => p.id === selectedProject.id) || selectedProject}
          onClose={() => setSelectedProject(null)}
          onOpenEdit={(p) => {
            setSelectedProject(null);
            setEditingProject(p);
            setIsCreateModalOpen(true);
          }}
        />
      )}

      {/* 2. New Project Submission / Edit Modal */}
      {isCreateModalOpen && (
        <ProjectFormModal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingProject(null);
          }}
          editProject={editingProject}
        />
      )}

      {/* 3. 16:9 Dark Projector Screen View (3D Podium - Admin only) */}
      {isProjectorRankingOpen && currentUser?.role === "ADMIN" && (
        <RankingBoard onClose={() => setIsProjectorRankingOpen(false)} />
      )}

      {/* 4. Global Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-6 right-3 sm:right-6 z-[80] max-w-sm sm:max-w-md bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in slide-in-from-bottom duration-200">
          <Info className="w-4 h-4 text-cyan-400 shrink-0" />
          <p className="text-xs font-medium leading-relaxed">{toastMessage}</p>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white cursor-pointer ml-auto"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

    </div>
  );
}

function MainContent() {
  const { currentUser, isLoading } = useApp();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F8FAFC]">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-slate-500 font-mono">2026 데모데이 시스템 연결 중...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthScreen />;
  }

  return <MainDashboard />;
}

export default function Home() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
