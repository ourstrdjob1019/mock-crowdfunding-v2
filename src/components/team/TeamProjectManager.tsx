"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import { Project } from "@/types";
import { Award, Eye, CheckCircle2, Users, Edit3, Lock } from "lucide-react";

interface TeamProjectManagerProps {
  onSelectProject?: (project: Project) => void;
  openCreateProject?: () => void;
  onEditProject?: (project: Project) => void;
}

export const TeamProjectManager: React.FC<TeamProjectManagerProps> = ({
  onSelectProject,
  openCreateProject,
  onEditProject,
}) => {
  const { currentUser, projects, event, canStudentEditProject } = useApp();

  if (!currentUser) return null;

  // 내 팀 프로젝트 찾기 (isUserProject이거나 currentUser.teamId 일치 또는 팀명 일치 또는 authorId 일치)
  const myProj = projects.find(
    (p) =>
      p.isUserProject ||
      (currentUser.teamId && currentUser.teamId === p.teamId) ||
      (currentUser.teamName && p.teamName && currentUser.teamName.trim() === p.teamName.trim()) ||
      p.authorId === currentUser.id
  );

  const canCreate = currentUser.role === "ADMIN" || Boolean(event.isRegistrationOpen);
  const canEdit = currentUser.role === "ADMIN" || canStudentEditProject;

  if (!myProj) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/90 p-12 text-center shadow-xs space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <Award className="w-7 h-7" />
        </div>
        <h2 className="font-bold text-slate-800 text-lg">아직 출품 등록된 팀 프로젝트가 없습니다</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          {canCreate
            ? "데모데이에 출품할 우리 팀의 혁신 아이템을 등록하고 동료와 심사위원들의 모의투자를 받아보세요."
            : "현재 출품 등록 시간이 마감되었거나 열리지 않았습니다. 관리자에게 문의해 주세요."}
        </p>
        {openCreateProject && canCreate && (
          <button
            type="button"
            onClick={openCreateProject}
            className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 transition cursor-pointer shadow-xs inline-flex items-center gap-1.5"
          >
            새 프로젝트 출품 등록하기
          </button>
        )}
      </div>
    );
  }

  const targetCredits = myProj.targetCredits || 20000;
  const progressPct = Math.round((myProj.totalCredits / targetCredits) * 100);

  return (
    <div className="flex flex-col gap-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200">
            <Award className="w-3.5 h-3.5" />
            내 팀 출품 프로젝트 대시보드
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
            [Team {String(myProj.teamNumber).padStart(2, "0")}] {myProj.teamName} - {myProj.title}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start">
          {canEdit && onEditProject ? (
            <button
              type="button"
              onClick={() => onEditProject(myProj)}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>출품작 수정하기</span>
            </button>
          ) : (
            <span className="px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 font-semibold text-xs flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>{event.isFundingOpen ? "펀딩 진행 중 (수정 잠금)" : "출품 마감 (수정 잠금)"}</span>
            </span>
          )}

          {onSelectProject && (
            <button
              type="button"
              onClick={() => onSelectProject(myProj)}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>상세페이지 확인</span>
            </button>
          )}
        </div>
      </div>

      {/* 3 KPI Stats for My Project */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500">누적 펀딩 모의투자액</p>
          <p className="text-2xl font-extrabold font-mono text-blue-600 mt-1">
            {myProj.totalCredits.toLocaleString()}{" "}
            <span className="text-xs font-sans text-slate-500">CR</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            목표 {targetCredits.toLocaleString()} CR 대비 {progressPct}% 달성
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500">투자 참여 서포터 수</p>
          <p className="text-2xl font-extrabold font-mono text-indigo-600 mt-1">
            {myProj.investorCount}{" "}
            <span className="text-xs font-sans text-slate-500">명</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">실시간 청중 평가 참여 중</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500">자가 투자 방지 상태</p>
          <p className="text-base font-bold text-amber-600 mt-2 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            규정 준수 (클린 펀딩)
          </p>
          <p className="text-[11px] text-slate-400 mt-1">본인 팀 투자 차단 기능 활성</p>
        </div>
      </div>

      {/* Backers & Investor Cheering Comments Feed */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
        <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-600" />
          우리 팀을 응원해준 서포터 & 피드백 로그
        </h2>

        {(myProj.comments && myProj.comments.length > 0) ? (
          <div className="divide-y divide-slate-100">
            {myProj.comments.map((cm) => (
              <div key={cm.id} className="py-3 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">{cm.author}</span>
                    <span className="text-[11px] text-slate-400">({cm.team})</span>
                    {cm.amount && (
                      <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold font-mono">
                        +{cm.amount.toLocaleString()} CR 투자
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{cm.message}</p>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0 font-mono">{cm.timestamp}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 text-xs">
            아직 등록된 응원 및 피드백 로그가 없습니다.
          </div>
        )}
      </div>

    </div>
  );
};
