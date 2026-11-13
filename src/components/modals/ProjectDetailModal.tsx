"use client";

import React, { useState, useEffect, useRef } from "react";
import { Project } from "@/types";
import { useApp } from "@/context/AppContext";
import {
  X,
  Lock,
  Sparkles,
  Check,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertCircle,
  FileText,
  Globe,
  Image as ImageIcon,
  Edit3,
  Trash2,
  ExternalLink,
  Video,
  Play,
  Users,
} from "lucide-react";
import confetti from "canvas-confetti";
import { PdfDetailViewer } from "@/components/ui/PdfDetailViewer";

const formatWebUrl = (url?: string): string => {
  if (!url) return "";
  const trimmed = url.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:")) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

const getYouTubeEmbedUrl = (url?: string): string | null => {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=0&rel=0` : null;
};

interface ProjectDetailModalProps {
  project: Project | null;
  onClose: () => void;
  onOpenInvest?: (project: Project) => void;
  onOpenEdit?: (project: Project) => void;
}

export const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({
  project,
  onClose,
  onOpenEdit,
}) => {
  const {
    event,
    currentUser,
    remainingCredits,
    isMutating,
    canStudentEditProject,
    getUserInvestmentForProject,
    invest,
    addComment,
    deleteProject,
  } = useApp();

  const [investmentInputVal, setInvestmentInputVal] = useState<string>("2000");
  const [investmentError, setInvestmentError] = useState<string>("");
  const [commentInput, setCommentInput] = useState<string>("");
  const [pdfSlideIndex, setPdfSlideIndex] = useState<number>(0);
  const [toastNotice, setToastNotice] = useState<string | null>(null);
  const [fetchedHtmlMap, setFetchedHtmlMap] = useState<Record<string, string>>({});
  const [isInvestingLocal, setIsInvestingLocal] = useState<boolean>(false);
  const isInvestingRef = useRef<boolean>(false);

  // Supabase Storage에 업로드된 HTML 파일을 상세 모달 열람 시 온디맨드(On-demand)로 로드하여 srcDoc에 주입
  useEffect(() => {
    if (!project) return;
    const urlsToFetch: string[] = [];

    if (project.mediaItems && project.mediaItems.length > 0) {
      project.mediaItems.forEach((item) => {
        if (
          item.type === "HTML" &&
          !item.htmlContent &&
          item.url &&
          (item.url.includes("/storage/v1/object/public/") ||
            item.url.toLowerCase().endsWith(".html") ||
            item.url.toLowerCase().endsWith(".htm"))
        ) {
          urlsToFetch.push(item.url);
        }
      });
    } else if (
      (project.landingFormat === "HTML" || project.landingFormat === "WEB") &&
      project.landingUrl &&
      (project.landingUrl.includes("/storage/v1/object/public/") ||
        project.landingUrl.toLowerCase().endsWith(".html") ||
        project.landingUrl.toLowerCase().endsWith(".htm"))
    ) {
      urlsToFetch.push(project.landingUrl);
    }

    urlsToFetch.forEach((targetUrl) => {
      fetch(targetUrl)
        .then((res) => (res.ok ? res.text() : ""))
        .then((htmlText) => {
          if (htmlText) {
            setFetchedHtmlMap((prev) => ({ ...prev, [targetUrl]: htmlText }));
          }
        })
        .catch((err) => console.warn("HTML Storage fetch fallback:", err));
    });
  }, [project]);

  if (!project || !currentUser) return null;

  const isOwned = Boolean(
    project.isUserProject ||
      (currentUser.teamId && currentUser.teamId === project.teamId) ||
      (currentUser.teamName && project.teamName && currentUser.teamName.trim() === project.teamName.trim()) ||
      currentUser.id === project.authorId ||
      (currentUser.email && project.authorEmail?.toLowerCase() === currentUser.email.toLowerCase()) ||
      (project.teamMemberIds && (
        project.teamMemberIds.includes(currentUser.id) ||
        (currentUser.email && project.teamMemberIds.map(s => s.toLowerCase()).includes(currentUser.email.toLowerCase())) ||
        (currentUser.studentNumber && project.teamMemberIds.includes(currentUser.studentNumber))
      )) ||
      (project.teamMemberDetails && project.teamMemberDetails.some(m => 
        m.id === currentUser.id ||
        (currentUser.email && m.email?.toLowerCase() === currentUser.email.toLowerCase()) ||
        (currentUser.studentNumber && m.studentNumber === currentUser.studentNumber)
      ))
  );

  const canEdit = currentUser.role === "ADMIN" || (isOwned && canStudentEditProject);
  const isEditLockedForOwner = isOwned && currentUser.role !== "ADMIN" && !canStudentEditProject;
  const targetCredits = project.targetCredits || 20000;
  const progressPct = Math.round((project.totalCredits / targetCredits) * 100);

  const showToast = (msg: string) => {
    setToastNotice(msg);
    setTimeout(() => setToastNotice(null), 3000);
  };

  // ★ 돈(지폐, 동전, 돈자루) 샤워 효과
  const triggerMoneyEffect = () => {
    try {
      const scalar = 3.6;
      const dollar = confetti.shapeFromText({ text: "💵", scalar });
      const coin = confetti.shapeFromText({ text: "🪙", scalar });
      const moneyBag = confetti.shapeFromText({ text: "💰", scalar });
      const yen = confetti.shapeFromText({ text: "💴", scalar });

      confetti({
        shapes: [dollar, coin, moneyBag, yen],
        scalar,
        particleCount: 50,
        spread: 90,
        origin: { y: 0.6 },
        ticks: 250,
      });

      setTimeout(() => {
        confetti({
          shapes: [dollar, coin],
          scalar: 3.2,
          particleCount: 45,
          angle: 60,
          spread: 80,
          origin: { x: 0.1, y: 0.75 },
          ticks: 260,
        });
        confetti({
          shapes: [moneyBag, coin],
          scalar: 3.2,
          particleCount: 45,
          angle: 120,
          spread: 80,
          origin: { x: 0.9, y: 0.75 },
          ticks: 260,
        });
      }, 180);

      setTimeout(() => {
        confetti({
          particleCount: 85,
          spread: 120,
          origin: { y: 0.55 },
          colors: ["#F59E0B", "#FCD34D", "#10B981", "#3B82F6", "#FFFFFF"],
          ticks: 280,
        });
      }, 350);
    } catch (e) {
      console.warn("Confetti fallback:", e);
    }
  };

  // 직접 숫자 입력 핸들러 (2,000 ~ 5,000 제한)
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/[^0-9]/g, "");
    if (!rawVal) {
      setInvestmentInputVal("");
      return;
    }

    const numVal = parseInt(rawVal, 10);
    if (numVal > 5000) {
      setInvestmentInputVal("5000");
      setInvestmentError("최대 투자 금액은 5,000 CR 입니다.");
    } else {
      setInvestmentInputVal(String(numVal));
      if (numVal >= 2000 && numVal <= 5000) {
        setInvestmentError("");
      }
    }
  };

  const handleAmountBlur = () => {
    const num = parseInt(investmentInputVal, 10) || 0;
    if (num < 2000) {
      setInvestmentInputVal("2000");
      setInvestmentError("최소 투자 금액은 2,000 CR 입니다.");
    } else if (num > 5000) {
      setInvestmentInputVal("5000");
      setInvestmentError("");
    } else {
      setInvestmentError("");
    }
  };

  const existingInv = getUserInvestmentForProject(project.id);
  const availableCreditsForProject = remainingCredits + (existingInv ? existingInv.amount : 0);

  const handleInvestment = async (amount: number) => {
    if (isInvestingRef.current || isMutating || isInvestingLocal) {
      return;
    }

    if (!event.isFundingOpen) {
      showToast("현재 모의투자(펀딩) 진행 시간이 아닙니다.");
      return;
    }

    if (isOwned) {
      showToast("⚠️ 본인이 출품했거나 소속 팀원으로 등록된 프로젝트에는 투자할 수 없습니다 (팀원 자가 투자 방지 정책).");
      return;
    }

    if (isNaN(amount) || amount < 2000 || amount > 5000) {
      setInvestmentError("투자 금액은 최소 2,000 CR ~ 최대 5,000 CR 사이여야 합니다.");
      return;
    }

    if (amount > availableCreditsForProject) {
      showToast("잔여 모의투자 크레딧이 부족합니다.");
      return;
    }

    isInvestingRef.current = true;
    setIsInvestingLocal(true);
    try {
      const result = await invest(project.id, amount);
      if (result.success) {
        triggerMoneyEffect();
        showToast(`💵 ${result.message}`);
      } else {
        showToast(result.message);
      }
    } finally {
      isInvestingRef.current = false;
      setIsInvestingLocal(false);
    }
  };

  const handleAddCommentSubmit = async () => {
    if (!commentInput.trim()) return;
    const res = await addComment(project.id, commentInput);
    if (res.success) {
      setCommentInput("");
      showToast("💬 응원 댓글이 등록되었습니다.");
    }
  };

  const handleDelete = async () => {
    if (confirm("정말로 이 출품작을 삭제하시겠습니까?")) {
      const res = await deleteProject(project.id);
      if (res.success) {
        onClose();
      } else {
        alert(res.message);
      }
    }
  };

  // 슬라이드 데이터 기본 폴백
  const pdfSlides = project.pdfSlides || [
    {
      title: "SLIDE 01: " + project.title,
      subtitle: project.summary,
      content: project.description,
      keyMetrics: [
        `목표: ${targetCredits.toLocaleString()} CR`,
        `팀: ${project.teamName}`,
        `분야: ${project.category || "혁신 스타트업"}`,
      ],
    },
    {
      title: "SLIDE 02: 핵심 기술 및 비즈니스 모델",
      subtitle: "독자적 기술 경쟁력과 시장 침투 전략",
      content: "대학 연구실 원천 특허 및 시장 검증 데이터를 기반으로 빠르게 수익을 창출하는 비즈니스 구조를 구축했습니다.",
      keyMetrics: ["시장 침투율 연 35%", "특허 등록 완료", "사전 고객 검증"],
    },
  ];

  const detailImages = project.detailImages && project.detailImages.length > 0
    ? project.detailImages
    : (project.landingImages && project.landingImages.length > 0 ? project.landingImages : [project.thumbnailUrl]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-6 overflow-y-auto">
      
      {/* Toast Notice */}
      {toastNotice && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[70] px-4 sm:px-5 py-2.5 rounded-2xl bg-slate-900 text-white border border-slate-700 shadow-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <span>{toastNotice}</span>
        </div>
      )}

      <div className="bg-white w-full max-w-5xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[96vh] sm:max-h-[92vh] animate-in fade-in duration-200">
        
        {/* Top Modal Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-200 flex items-center justify-between gap-2 bg-slate-50/70">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5">
            <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md bg-blue-600 text-white font-bold text-[11px] sm:text-xs shrink-0">
              Team {String(project.teamNumber).padStart(2, "0")}
            </span>
            <span className="font-semibold text-xs text-slate-700 line-clamp-1">
              {project.teamName} · {project.category || "스타트업"}
            </span>
            <span className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono font-bold shrink-0">
              {project.landingFormat}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {isEditLockedForOwner && (
              <span
                title="펀딩 진행 중이거나 출품 마감 상태에서는 수정할 수 없습니다."
                className="px-2.5 py-1 rounded-lg bg-slate-200/80 text-slate-600 text-[11px] font-semibold flex items-center gap-1 mr-1"
              >
                <Lock className="w-3 h-3 text-slate-500" />
                <span>수정 잠금 (펀딩 진행/마감)</span>
              </span>
            )}
            {canEdit && (
              <div className="flex items-center gap-1 mr-1">
                {onOpenEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenEdit(project);
                    }}
                    className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition cursor-pointer flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">수정</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-2 py-1 rounded-lg bg-rose-50 text-rose-700 text-xs font-semibold hover:bg-rose-100 transition cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">삭제</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 flex items-center justify-center text-slate-600 hover:text-slate-900 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body: Split Layout (65% Scrollable Left + 35% Sticky Right) */}
        <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row">
          
          {/* ----------------------------------------------------
              LEFT CONTENT (65% Scrollable + Copyright Protection)
              ---------------------------------------------------- */}
          <div
            onContextMenu={(e) => {
              e.preventDefault();
              showToast("🔒 저작권 보호를 위해 우클릭 및 이미지 저장이 제한됩니다.");
            }}
            className="lg:w-[65%] p-4 sm:p-6 border-b lg:border-b-0 lg:border-r border-slate-200 select-none overflow-y-auto space-y-5 sm:space-y-6"
          >
            {/* Copyright Protection Notice Banner */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-[11px] sm:text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 shrink-0" />
                <span>2026 DEMODAY 저작권 보호 구역 · 무단 복제 및 캡처 금지</span>
              </div>
              <span className="text-[10px] text-amber-700 font-mono font-bold self-end sm:self-auto">PROTECTED</span>
            </div>

            {/* Title & Summary */}
            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug">
                {project.title}
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">
                {project.description}
              </p>
            </div>

            {/* Pitch Highlights Card */}
            {project.pitchHighlights && project.pitchHighlights.length > 0 && (
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2">
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  핵심 피치 하이라이트 (Key Highlights)
                </h3>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {project.pitchHighlights.map((hl, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{hl}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* ========================================================
                ★ MULTI-MEDIA PRIORITY VIEWER (요구사항 2)
                ======================================================== */}
            <div className="space-y-6">
              {project.mediaItems && project.mediaItems.length > 0 ? (
                // 1) 다중 미디어 우선순위 렌더링
                [...project.mediaItems]
                  .sort((a, b) => a.priority - b.priority)
                  .map((item, idx) => (
                    <div key={item.id || idx} className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800 pb-1 border-b border-slate-200/80">
                        <span className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-mono">
                            {idx + 1}순위
                          </span>
                          {item.type === "IMAGE" && <ImageIcon className="w-4 h-4 text-emerald-600" />}
                          {item.type === "PDF" && <FileText className="w-4 h-4 text-indigo-600" />}
                          {item.type === "HTML" && <Globe className="w-4 h-4 text-cyan-600" />}
                          {item.type === "VIDEO" && <Video className="w-4 h-4 text-rose-600" />}
                          <span>{item.title || `${item.type} 컨텐츠`}</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">MEDIA #{idx + 1}</span>
                      </div>

                      {/* A. IMAGE */}
                      {item.type === "IMAGE" && (
                        <div className="space-y-3 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 p-2">
                          {(item.images && item.images.length > 0 ? item.images : [item.url]).map((imgUrl, imgIdx) => (
                            <div key={imgIdx} className="relative rounded-xl overflow-hidden shadow-2xs">
                              <img
                                src={imgUrl}
                                alt={`상세 ${imgIdx + 1}`}
                                className="w-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* B. PDF */}
                      {item.type === "PDF" && (
                        <div className="w-full">
                          <PdfDetailViewer
                            url={item.url}
                            title={`${project.title} - 피치덱 PDF`}
                          />
                        </div>
                      )}

                      {/* C. HTML */}
                      {item.type === "HTML" &&
                        (() => {
                          const isUploadedHtml = Boolean(
                            item.fileName ||
                              item.htmlContent ||
                              fetchedHtmlMap[item.url] ||
                              item.url?.includes("/storage/v1/object/public/") ||
                              item.url?.toLowerCase().endsWith(".html") ||
                              item.url?.toLowerCase().endsWith(".htm")
                          );
                          const openInNewTabHref = isUploadedHtml
                            ? `/view?id=${encodeURIComponent(project.id)}&itemId=${encodeURIComponent(item.id || "")}&url=${encodeURIComponent(item.url || "")}`
                            : formatWebUrl(item.url);

                          return (
                            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                              <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-xs">
                                <span className="font-mono text-slate-600 truncate">
                                  {item.fileName
                                    ? `HTML 파일: ${item.fileName}`
                                    : isUploadedHtml
                                    ? "업로드된 HTML 웹 시연 파일"
                                    : formatWebUrl(item.url)}
                                </span>
                                {(item.url || item.htmlContent) && (
                                  <a
                                    href={openInNewTabHref}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1 shadow-2xs shrink-0"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span>새 창 열기</span>
                                  </a>
                                )}
                              </div>
                              <div className="p-2 sm:p-3">
                                <div className="relative w-full h-[500px] sm:h-[620px] rounded-xl overflow-hidden border border-slate-200 bg-white shadow-inner">
                                  {item.htmlContent || fetchedHtmlMap[item.url] ? (
                                    <iframe
                                      srcDoc={item.htmlContent || fetchedHtmlMap[item.url]}
                                      title={`${project.title} Uploaded HTML`}
                                      className="w-full h-full border-0"
                                      sandbox="allow-scripts allow-forms allow-popups allow-modals"
                                    />
                                  ) : (
                                    <iframe
                                      src={formatWebUrl(item.url)}
                                      title={`${project.title} Web Prototype`}
                                      className="w-full h-full border-0"
                                      sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
                                    />
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                      {/* D. VIDEO */}
                      {item.type === "VIDEO" && (
                        <div className="rounded-2xl border border-slate-200 bg-black overflow-hidden shadow-md">
                          {getYouTubeEmbedUrl(item.url) ? (
                            <div className="relative w-full aspect-video">
                              <iframe
                                src={getYouTubeEmbedUrl(item.url)!}
                                title={`${project.title} YouTube Video`}
                                className="w-full h-full border-0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            </div>
                          ) : (
                            <video
                              src={item.url}
                              controls
                              playsInline
                              preload="metadata"
                              className="w-full max-h-[500px] object-contain mx-auto"
                            />
                          )}
                          <div className="bg-slate-900 px-4 py-2 text-[11px] text-slate-400 flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-white font-medium">
                              <Play className="w-3 h-3 text-rose-500 fill-rose-500" />
                              {item.fileName || "프로젝트 소개 영상"}
                            </span>
                            <span className="font-mono text-slate-500">VIDEO PLAYER</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
              ) : (
                // 2) 구버전 단일 포맷 하위 호환 렌더링
                <div>
                  <h3 className="text-xs font-bold text-slate-900 flex items-center justify-between mb-3">
                    <span className="flex items-center gap-1.5">
                      {project.landingFormat === "IMAGE" && <ImageIcon className="w-4 h-4 text-emerald-600" />}
                      {project.landingFormat === "PDF" && <FileText className="w-4 h-4 text-indigo-600" />}
                      {(project.landingFormat === "WEB" || project.landingFormat === "HTML") && <Globe className="w-4 h-4 text-cyan-600" />}
                      {project.landingFormat === "VIDEO" && <Video className="w-4 h-4 text-rose-600" />}
                      <span>출품 자료 상세 뷰어 ({project.landingFormat})</span>
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">2026 DEMODAY VIEWER</span>
                  </h3>

                  {/* 구버전 이미지 */}
                  {project.landingFormat === "IMAGE" && (
                    <div className="space-y-3 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 p-2">
                      {detailImages.map((imgUrl, idx) => (
                        <div key={idx} className="relative rounded-xl overflow-hidden shadow-2xs">
                          <img src={imgUrl} alt={`상세 ${idx + 1}`} className="w-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 구버전 PDF */}
                  {project.landingFormat === "PDF" && (
                    <div className="w-full">
                      {project.landingUrl ? (
                        <PdfDetailViewer url={project.landingUrl} title={`${project.title} - 출품 IR 피치덱`} />
                      ) : null}
                    </div>
                  )}

                  {/* 구버전 WEB/HTML */}
                  {(project.landingFormat === "WEB" || project.landingFormat === "HTML") &&
                    (() => {
                      const rawUrl = project.landingUrl || project.webDemoUrl || "";
                      const isUploadedHtml = Boolean(
                        fetchedHtmlMap[rawUrl] ||
                          rawUrl.includes("/storage/v1/object/public/") ||
                          rawUrl.toLowerCase().endsWith(".html") ||
                          rawUrl.toLowerCase().endsWith(".htm")
                      );
                      const openHref = isUploadedHtml
                        ? `/view?id=${encodeURIComponent(project.id)}`
                        : formatWebUrl(rawUrl);

                      return (
                        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                          <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-xs">
                            <span className="font-mono text-slate-700 truncate">
                              {isUploadedHtml ? "업로드된 HTML 웹 시연 파일" : formatWebUrl(rawUrl)}
                            </span>
                            {rawUrl && (
                              <a
                                href={openHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1 shrink-0"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>새 창 열기</span>
                              </a>
                            )}
                          </div>
                          <div className="p-2 sm:p-3">
                            {fetchedHtmlMap[rawUrl] ? (
                              <iframe
                                srcDoc={fetchedHtmlMap[rawUrl]}
                                title={`${project.title} Uploaded HTML`}
                                className="w-full h-[550px] border-0 rounded-xl"
                                sandbox="allow-scripts allow-forms allow-popups allow-modals"
                              />
                            ) : (
                              <iframe
                                src={formatWebUrl(rawUrl)}
                                title={`${project.title} Web Prototype`}
                                className="w-full h-[550px] border-0 rounded-xl"
                                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                              />
                            )}
                          </div>
                        </div>
                      );
                    })()}
                </div>
              )}
            </div>

            {/* Team Members & Details */}
            {((project.teamMemberDetails && project.teamMemberDetails.length > 0) || (project.teamMembers && project.teamMembers.length > 0)) && (
              <div className="space-y-2 pt-3 border-t border-slate-200">
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                  소속 팀원 정보 (Team Members)
                </h3>
                <div className="flex flex-wrap gap-2">
                  {project.teamMemberDetails && project.teamMemberDetails.length > 0 ? (
                    project.teamMemberDetails.map((mem, mi) => (
                      <div key={mi} className="px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-950 flex items-center gap-1.5">
                        <span className="font-bold text-indigo-900">{mem.name}</span>
                        {mem.department && <span className="text-indigo-400">|</span>}
                        {mem.department && <span className="text-indigo-700 text-[11px]">{mem.department}</span>}
                        {mem.studentNumber && <span className="text-indigo-500 font-mono text-[10px]">({mem.studentNumber})</span>}
                      </div>
                    ))
                  ) : (
                    project.teamMembers?.map((mem, mi) => (
                      <div key={mi} className="px-3 py-1.5 rounded-xl bg-slate-100 text-xs text-slate-800 flex items-center gap-1.5">
                        <span className="font-bold text-slate-900">{mem.name}</span>
                        <span className="text-slate-400">|</span>
                        <span className="text-slate-500 text-[11px]">{mem.role}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            {/* Cheering Comments & Discussion */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 flex items-center justify-between">
                <span>응원 및 심사의견 ({project.comments?.length || 0})</span>
                <span className="text-[11px] text-slate-400 font-normal">건전한 피드백을 남겨주세요</span>
              </h3>

              {/* Comment Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="프로젝트를 향한 응원 또는 질문을 남겨주세요..."
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddCommentSubmit();
                  }}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20"
                />
                <button
                  type="button"
                  onClick={handleAddCommentSubmit}
                  className="px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <Send className="w-3 h-3" />
                  등록
                </button>
              </div>

              {/* Comment list */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {(project.comments && project.comments.length > 0) ? (
                  project.comments.map((cm) => (
                    <div key={cm.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="font-bold">
                          {cm.author} <span className="text-slate-400 font-normal">({cm.team})</span>
                          {cm.amount && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold font-mono text-[10px]">
                              +{cm.amount.toLocaleString()} CR 투자
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{cm.timestamp}</span>
                      </div>
                      <p className="text-slate-600 mt-1">{cm.message}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 py-3 text-center">첫 번째 응원 댓글을 남겨보세요!</p>
                )}
              </div>
            </div>

          </div>

          {/* ----------------------------------------------------
              RIGHT STICKY INVESTMENT WIDGET (35%)
              ---------------------------------------------------- */}
          <div className="lg:w-[35%] p-4 sm:p-6 bg-slate-50/50 flex flex-col justify-between gap-5 sm:gap-6">
            
            <div className="space-y-5">
              <div>
                <span className="text-xs font-semibold text-slate-500">모의 크라우드펀딩 진행 현황</span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-3xl font-extrabold font-mono text-slate-900">
                    {project.totalCredits.toLocaleString()}
                  </span>
                  <span className="text-sm font-bold text-blue-600">CR</span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
                  <span className="font-bold text-blue-600 font-mono text-sm">
                    {progressPct}% 달성
                  </span>
                  <span>목표 {targetCredits.toLocaleString()} CR</span>
                </div>

                {/* Progress track */}
                <div className="w-full bg-slate-200 rounded-full h-2.5 mt-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-cyan-500 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, progressPct)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 mt-2 font-mono">
                  <span>총 {project.investorCount}명 모의투자 참여</span>
                  <span>1회 한도 5,000 CR</span>
                </div>
              </div>

              {/* STRICT SELF-INVESTMENT BLOCK CHECK */}
              {isOwned ? (
                <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300/80 text-amber-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-amber-800">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>자가 투자 방지 정책 (Self-Investment Block)</span>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    ⚠️ 본인이 출품한 프로젝트에는 투자할 수 없습니다. 타 팀의 혁신 아이템을 둘러보고 분산 투자하세요.
                  </p>
                  <div className="text-[10px] text-amber-700 font-mono pt-1">
                    소속: {currentUser.teamName || "내 팀"}
                  </div>
                </div>
              ) : (
                /* NORMAL INVESTMENT FLOW */
                <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">투자 금액 직접 입력</span>
                    <span className="text-[11px] font-semibold text-blue-600">
                      2,000 ~ 5,000 CR
                    </span>
                  </div>

                  {/* 직접 숫자 입력 필드 (2,000 ~ 5,000 강제 제한) */}
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={investmentInputVal}
                      onChange={handleAmountChange}
                      onBlur={handleAmountBlur}
                      placeholder="2000"
                      className="w-full pl-4 pr-14 py-2.5 rounded-xl border border-slate-300 font-mono text-xl font-black text-slate-900 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                    />
                    <span className="absolute right-3.5 text-xs font-bold text-slate-500 font-sans">
                      CR
                    </span>
                  </div>

                  {/* Quick preset buttons */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {[2000, 3000, 4000, 5000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setInvestmentInputVal(String(preset));
                          setInvestmentError("");
                        }}
                        className={`py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer border ${
                          (parseInt(investmentInputVal, 10) || 0) === preset
                            ? "bg-blue-600 text-white border-blue-600 shadow-2xs scale-102"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {preset.toLocaleString()}
                      </button>
                    ))}
                  </div>

                  {investmentError && (
                    <p className="text-[11px] text-rose-600 font-medium">
                      ⚠️ {investmentError}
                    </p>
                  )}

                  {/* Live remaining credits calculation */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1 text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>현재 내 잔여 지갑:</span>
                      <span className="font-mono font-semibold text-slate-800">{remainingCredits.toLocaleString()} CR</span>
                    </div>
                    <div className="flex justify-between text-slate-700 font-bold pt-1 border-t border-slate-200">
                      <span>투자 후 잔여 예상:</span>
                      <span className={`font-mono ${(remainingCredits - (parseInt(investmentInputVal, 10) || 0)) < 0 ? "text-rose-600" : "text-blue-600"}`}>
                        {(remainingCredits - (parseInt(investmentInputVal, 10) || 0)).toLocaleString()} CR
                      </span>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <button
                    type="button"
                    disabled={
                      isInvestingLocal ||
                      isMutating ||
                      !event.isFundingOpen ||
                      availableCreditsForProject < (parseInt(investmentInputVal, 10) || 0) ||
                      (parseInt(investmentInputVal, 10) || 0) < 2000 ||
                      (parseInt(investmentInputVal, 10) || 0) > 5000
                    }
                    onClick={() => handleInvestment(parseInt(investmentInputVal, 10) || 0)}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-xs sm:text-sm shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>
                      {isInvestingLocal || isMutating
                        ? "서버에 투자 내역 저장 중..."
                        : !event.isFundingOpen
                        ? "현재 펀딩 진행 시간이 아닙니다"
                        : `${(parseInt(investmentInputVal, 10) || 0).toLocaleString()} CR ${existingInv ? "투자 금액 변경하기" : "모의투자 참여하기"}`}
                    </span>
                  </button>

                  {remainingCredits < (parseInt(investmentInputVal, 10) || 0) && (
                    <p className="text-[11px] text-rose-500 text-center font-medium">
                      잔여 크레딧이 부족합니다. 좌측 지갑 리필을 이용하세요.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="text-[11px] text-slate-400 text-center">
              CROWDFUND 2026 데모데이 심사 보안 규정을 준수합니다.
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
