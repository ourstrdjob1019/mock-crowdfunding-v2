"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { mapDbProjectToModel } from "@/lib/supabaseService";
import { Project, MediaType } from "@/types";
import { PdfDetailViewer } from "@/components/ui/PdfDetailViewer";
import { injectHtmlProtection } from "@/components/modals/ProjectDetailModal";
import {
  Globe,
  X,
  Loader2,
  AlertCircle,
  Lock,
  FileText,
  Image as ImageIcon,
  Video,
} from "lucide-react";

const getYouTubeEmbedUrl = (url?: string): string | null => {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
  );
  return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=0&rel=0` : null;
};

export default function SecureMediaFullViewerPage() {
  const [project, setProject] = useState<Project | null>(null);
  const [mediaType, setMediaType] = useState<MediaType>("HTML");
  const [mediaTitle, setMediaTitle] = useState<string>("");
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [externalUrl, setExternalUrl] = useState<string>("");
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [hideHeader, setHideHeader] = useState<boolean>(false);
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  const showSecurityToast = (msg = "🔒 개인 자료 및 저작권 보호를 위해 우클릭·다운로드·저장이 제한됩니다.") => {
    setToastNotice(msg);
    setTimeout(() => setToastNotice(null), 2800);
  };

  // 전역 우클릭, 드래그, 저장/인쇄/소스보기 단축키 차단
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      showSecurityToast();
    };
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = (e.key || "").toLowerCase();
      if ((e.ctrlKey || e.metaKey) && (k === "s" || k === "p" || k === "u")) {
        e.preventDefault();
        e.stopPropagation();
        showSecurityToast();
      }
      if (
        e.key === "F12" ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (k === "i" || k === "c" || k === "j"))
      ) {
        e.preventDefault();
        e.stopPropagation();
        showSecurityToast();
      }
    };

    window.addEventListener("contextmenu", handleContextMenu, true);
    window.addEventListener("dragstart", handleDragStart, true);
    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("contextmenu", handleContextMenu, true);
      window.removeEventListener("dragstart", handleDragStart, true);
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, []);

  useEffect(() => {
    const loadSecureMedia = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const projectId = params.get("id");
        const requestedType = (params.get("type") || "").toUpperCase() as MediaType;
        const itemId = params.get("itemId");

        if (!projectId) {
          setErrorMsg("표시할 프로젝트 정보를 찾을 수 없습니다.");
          setIsLoading(false);
          return;
        }

        if (!supabase) {
          setErrorMsg("데이터베이스 연결이 설정되지 않았습니다.");
          setIsLoading(false);
          return;
        }

        const { data: row, error } = await supabase
          .from("v2_projects")
          .select("*")
          .eq("id", projectId)
          .maybeSingle();

        if (error || !row) {
          setErrorMsg("해당 출품작 데이터를 불러올 수 없습니다.");
          setIsLoading(false);
          return;
        }

        const mapped = mapDbProjectToModel(row);
        setProject(mapped);

        const allItems = mapped.mediaItems || [];
        const matchedItem =
          (itemId && allItems.find((m) => m.id === itemId)) ||
          (requestedType && allItems.find((m) => m.type === requestedType)) ||
          allItems.find((m) => m.type === "HTML") ||
          allItems[0];

        const resolvedType: MediaType =
          matchedItem?.type ||
          requestedType ||
          (mapped.landingFormat === "PDF"
            ? "PDF"
            : mapped.landingFormat === "VIDEO"
            ? "VIDEO"
            : mapped.landingFormat === "IMAGE"
            ? "IMAGE"
            : "HTML");

        setMediaType(resolvedType);
        setMediaTitle(matchedItem?.title || mapped.title);

        if (typeof document !== "undefined") {
          document.title = `${mapped.title} (${mapped.teamName}) · 보안 뷰어`;
        }

        // 1. PDF 보안 뷰어
        if (resolvedType === "PDF") {
          const targetPdf = matchedItem?.url || mapped.landingUrl || "";
          if (!targetPdf) {
            setErrorMsg("등록된 PDF 문서를 찾을 수 없습니다.");
          } else {
            setPdfUrl(targetPdf);
          }
          setIsLoading(false);
          return;
        }

        // 2. IMAGE 보안 뷰어
        if (resolvedType === "IMAGE") {
          const imgs =
            matchedItem?.images && matchedItem.images.length > 0
              ? matchedItem.images
              : matchedItem?.url
              ? [matchedItem.url]
              : mapped.landingImages && mapped.landingImages.length > 0
              ? mapped.landingImages
              : [mapped.thumbnailUrl].filter(Boolean);
          setImageUrls(imgs);
          setIsLoading(false);
          return;
        }

        // 3. VIDEO 보안 뷰어
        if (resolvedType === "VIDEO") {
          const targetVid = matchedItem?.url || mapped.landingUrl || "";
          if (!targetVid) {
            setErrorMsg("등록된 동영상 자료를 찾을 수 없습니다.");
          } else {
            setVideoUrl(targetVid);
          }
          setIsLoading(false);
          return;
        }

        // 4. HTML 보안 뷰어
        const targetHtmlUrl = matchedItem?.url || mapped.landingUrl || "";
        if (matchedItem?.htmlContent && matchedItem.htmlContent.trim()) {
          setHtmlContent(injectHtmlProtection(matchedItem.htmlContent));
          setIsLoading(false);
          return;
        }

        if (
          targetHtmlUrl &&
          (targetHtmlUrl.includes("/storage/v1/object/public/") ||
            targetHtmlUrl.toLowerCase().endsWith(".html") ||
            targetHtmlUrl.toLowerCase().endsWith(".htm"))
        ) {
          const resp = await fetch(targetHtmlUrl);
          if (!resp.ok) {
            throw new Error("스토리지에서 HTML 파일을 불러오지 못했습니다.");
          }
          const text = await resp.text();
          setHtmlContent(injectHtmlProtection(text));
          setIsLoading(false);
          return;
        }

        if (targetHtmlUrl) {
          const formatted =
            targetHtmlUrl.startsWith("http://") || targetHtmlUrl.startsWith("https://")
              ? targetHtmlUrl
              : `https://${targetHtmlUrl}`;
          setExternalUrl(formatted);
          setIsLoading(false);
          return;
        }

        setErrorMsg("등록된 시연 자료가 없습니다.");
        setIsLoading(false);
      } catch (err: any) {
        console.error("[SecureMediaFullViewerPage] Load error:", err);
        setErrorMsg(err.message || "보안 뷰어 화면을 불러오는 중 오류가 발생했습니다.");
        setIsLoading(false);
      }
    };

    loadSecureMedia();
  }, []);

  if (isLoading) {
    return (
      <div className="w-screen h-screen bg-slate-950 text-white flex flex-col items-center justify-center gap-3 select-none">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        <p className="text-xs text-slate-300 font-medium">
          출품작 보안 뷰어(다운로드·우클릭 방지)를 준비하고 있습니다...
        </p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="w-screen h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center gap-4 select-none">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h1 className="text-base font-bold">{errorMsg}</h1>
          <p className="text-xs text-slate-400">창을 닫고 프로젝트 상세 화면에서 다시 시도해 주세요.</p>
        </div>
        <button
          type="button"
          onClick={() => window.close()}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white cursor-pointer"
        >
          창 닫기
        </button>
      </div>
    );
  }

  return (
    <div
      onContextMenu={(e) => {
        e.preventDefault();
        showSecurityToast();
      }}
      onDragStart={(e) => e.preventDefault()}
      className="w-screen h-screen flex flex-col bg-slate-950 overflow-hidden select-none protected-media"
    >
      {/* 보안 알림 토스트 */}
      {toastNotice && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-2xl bg-slate-900/95 text-white border border-amber-500/50 shadow-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-150">
          <span>{toastNotice}</span>
        </div>
      )}

      {/* 상단 보안 컨트롤 바 */}
      {!hideHeader ? (
        <header className="h-11 px-4 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between gap-3 shrink-0 z-20">
          <div className="flex items-center gap-2 min-w-0">
            {mediaType === "PDF" && <FileText className="w-4 h-4 text-indigo-400 shrink-0" />}
            {mediaType === "IMAGE" && <ImageIcon className="w-4 h-4 text-emerald-400 shrink-0" />}
            {mediaType === "VIDEO" && <Video className="w-4 h-4 text-rose-400 shrink-0" />}
            {mediaType === "HTML" && <Globe className="w-4 h-4 text-cyan-400 shrink-0" />}
            <span className="text-xs font-bold truncate">
              {project ? `${project.title} (${project.teamName})` : mediaTitle}
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono border border-amber-500/30">
              <Lock className="w-2.5 h-2.5" /> PROTECTED · 다운로드/우클릭 방지
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setHideHeader(true)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 cursor-pointer"
              title="상단바 숨기고 전체화면으로 보기"
            >
              상단바 숨기기
            </button>
            <button
              type="button"
              onClick={() => window.close()}
              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-[11px] font-bold text-white flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>닫기</span>
            </button>
          </div>
        </header>
      ) : (
        <button
          type="button"
          onClick={() => setHideHeader(false)}
          className="fixed top-2 right-2 z-50 px-2.5 py-1 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white text-[10px] shadow-lg backdrop-blur-xs cursor-pointer"
        >
          상단바 표시
        </button>
      )}

      {/* 본문: 미디어 유형별 보안 전체화면 렌더링 */}
      <main className="flex-1 w-full h-full relative overflow-auto bg-slate-900">
        {/* 1. PDF 보안 캔버스 뷰어 */}
        {mediaType === "PDF" && pdfUrl && (
          <div className="w-full h-full flex flex-col">
            <PdfDetailViewer
              url={pdfUrl}
              title={mediaTitle || `${project?.title} - IR 피치덱`}
              isFullScreenPage={true}
              className="flex-1 rounded-none border-0"
            />
          </div>
        )}

        {/* 2. IMAGE 보안 전체화면 갤러리 */}
        {mediaType === "IMAGE" && (
          <div className="max-w-4xl mx-auto py-6 px-3 sm:px-6 space-y-4">
            {imageUrls.map((imgUrl, idx) => (
              <div
                key={idx}
                onContextMenu={(e) => {
                  e.preventDefault();
                  showSecurityToast();
                }}
                onDragStart={(e) => e.preventDefault()}
                className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-950 select-none"
              >
                <img
                  src={imgUrl}
                  alt={`상세 이미지 ${idx + 1}`}
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                  onDragStart={(e) => e.preventDefault()}
                  className="w-full h-auto object-contain pointer-events-none protected-media"
                />
                <div className="absolute inset-0 z-10 select-none" />
              </div>
            ))}
          </div>
        )}

        {/* 3. VIDEO 보안 전체화면 플레이어 */}
        {mediaType === "VIDEO" && videoUrl && (
          <div className="w-full h-full flex items-center justify-center bg-black p-4">
            {getYouTubeEmbedUrl(videoUrl) ? (
              <div className="w-full max-w-5xl aspect-video rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
                <iframe
                  src={getYouTubeEmbedUrl(videoUrl)!}
                  title={project?.title || "YouTube Video"}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <video
                src={videoUrl}
                controls
                controlsList="nodownload noplaybackrate"
                disablePictureInPicture
                onContextMenu={(e) => {
                  e.preventDefault();
                  showSecurityToast();
                }}
                onDragStart={(e) => e.preventDefault()}
                playsInline
                autoPlay
                className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl protected-media"
              />
            )}
          </div>
        )}

        {/* 4. HTML 보안 전체화면 뷰어 */}
        {mediaType === "HTML" && (
          <div className="w-full h-full bg-white">
            {htmlContent ? (
              <iframe
                srcDoc={htmlContent}
                title={project?.title || "Uploaded HTML Fullscreen"}
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-forms allow-modals"
              />
            ) : (
              <iframe
                src={externalUrl}
                title={project?.title || "External Web Fullscreen"}
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-forms allow-same-origin allow-modals"
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
