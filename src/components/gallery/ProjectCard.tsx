"use client";

import React from "react";
import { Project } from "@/types";
import { useApp } from "@/context/AppContext";
import { Users, ChevronRight, Award, CheckCircle2, Edit3 } from "lucide-react";

interface ProjectCardProps {
  project: Project;
  onSelect: (project: Project) => void;
  onInvestClick?: (project: Project) => void;
  onEditClick?: (project: Project) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onSelect,
  onEditClick,
}) => {
  const { currentUser, canStudentEditProject, getUserInvestmentForProject } = useApp();

  const isOwned = Boolean(
    currentUser &&
      (project.isUserProject ||
        (currentUser.teamId && currentUser.teamId === project.teamId) ||
        currentUser.id === project.authorId ||
        (currentUser.email && project.authorEmail?.toLowerCase() === currentUser.email.toLowerCase()) ||
        (project.teamMemberIds && currentUser.id && project.teamMemberIds.includes(currentUser.id)))
  );

  const canEdit = Boolean(
    currentUser && (currentUser.role === "ADMIN" || (isOwned && canStudentEditProject))
  );

  const existingInvestment = currentUser ? getUserInvestmentForProject(project.id) : undefined;
  const targetCredits = project.targetCredits || 20000;
  const progressPct = Math.round((project.totalCredits / targetCredits) * 100);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs hover:-translate-y-1 hover:shadow-lg transition-all duration-200 flex flex-col group">
      
      {/* 16:9 Thumbnail with Zoom */}
      <div 
        className="relative aspect-16/9 overflow-hidden bg-slate-100 cursor-pointer" 
        onClick={() => onSelect(project)}
      >
        <img
          src={project.thumbnailUrl}
          alt={project.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Badges in Thumbnail */}
        <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
          <span className="px-2 py-0.5 rounded-md bg-white/90 backdrop-blur-md text-slate-800 text-[11px] font-bold shadow-xs">
            Team {String(project.teamNumber).padStart(2, "0")}
          </span>
          <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold text-white backdrop-blur-md shadow-xs ${
            project.landingFormat === "WEB" || project.landingFormat === "HTML"
              ? "bg-cyan-600/90" 
              : project.landingFormat === "PDF" 
              ? "bg-indigo-600/90" 
              : "bg-emerald-600/90"
          }`}>
            {project.landingFormat === "HTML" ? "WEB" : project.landingFormat}
          </span>
        </div>

        {/* Owned or Invested Badge */}
        {isOwned ? (
          <div className="absolute top-3 right-3 px-2.5 py-0.5 rounded-md bg-amber-500 text-white text-[11px] font-bold shadow-md flex items-center gap-1 animate-pulse">
            <Award className="w-3 h-3" />
            내 팀 출품작
          </div>
        ) : existingInvestment ? (
          <div className="absolute top-3 right-3 px-2.5 py-0.5 rounded-md bg-blue-600 text-white text-[11px] font-bold shadow-md flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            {existingInvestment.amount.toLocaleString()} CR 참여중
          </div>
        ) : null}

        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white text-xs">
          <span className="font-semibold text-slate-200 truncate">{project.teamName}</span>
          {project.category && (
            <span className="px-1.5 py-0.5 rounded bg-black/40 text-[10px] font-medium text-slate-300 shrink-0">
              {project.category}
            </span>
          )}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
        <div className="space-y-2">
          <h2
            onClick={() => onSelect(project)}
            className="font-bold text-slate-900 text-base line-clamp-1 group-hover:text-blue-600 transition-colors cursor-pointer"
          >
            {project.title}
          </h2>
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
            {project.summary}
          </p>
        </div>

        {/* Funding Progress Bar */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-extrabold font-mono text-slate-900">
                {project.totalCredits.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-slate-500">CR</span>
            </div>
            <span className="text-sm font-extrabold font-mono text-blue-600">
              {progressPct}%
            </span>
          </div>

          {/* Progress track */}
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-600 to-cyan-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, progressPct)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>목표: {targetCredits.toLocaleString()} CR</span>
            <span className="flex items-center gap-1 text-slate-600 font-medium">
              <Users className="w-3 h-3 text-slate-400" />
              {project.investorCount}명 참여
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSelect(project)}
            className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer ${
              isOwned
                ? "bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200"
                : "bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200/80 hover:border-blue-600"
            }`}
          >
            <span>{isOwned ? "내 팀 프로젝트 상세 확인" : "프로젝트 상세 & 모의투자"}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {canEdit && onEditClick && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditClick(project);
              }}
              title="출품작 수정 및 파일 업로드"
              className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition flex items-center justify-center gap-1 cursor-pointer shrink-0"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>수정</span>
            </button>
          )}
        </div>
      </div>

    </div>
  );
};
