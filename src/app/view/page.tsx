"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { mapDbProjectToModel } from "@/lib/supabaseService";
import { Project } from "@/types";
import { Globe, X, ExternalLink, Loader2, AlertCircle } from "lucide-react";

export default function HtmlFullViewerPage() {
  const [project, setProject] = useState<Project | null>(null);
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [externalUrl, setExternalUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [hideHeader, setHideHeader] = useState<boolean>(false);

  useEffect(() => {
    const loadHtmlProject = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const projectId = params.get("id");
        const directUrl = params.get("url");

        if (!projectId && !directUrl) {
          setErrorMsg("표시할 프로젝트 정보를 찾을 수 없습니다.");
          setIsLoading(false);
          return;
        }

        // 1. projectId로 Supabase v2_projects 조회
        if (projectId && supabase) {
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
          if (typeof document !== "undefined") {
            document.title = `${mapped.title} (${mapped.teamName}) · 웹 시연 뷰어`;
          }

          const itemId = params.get("itemId");
          const htmlItems = mapped.mediaItems?.filter((m) => m.type === "HTML") || [];
          const htmlItem =
            (itemId && htmlItems.find((m) => m.id === itemId)) ||
            (directUrl && htmlItems.find((m) => m.url === directUrl)) ||
            htmlItems[0];
          const targetUrl = directUrl || htmlItem?.url || mapped.landingUrl || "";

          // A. DB에 htmlContent 텍스트가 바로 저장되어 있는 경우
          if (htmlItem?.htmlContent && htmlItem.htmlContent.trim()) {
            setHtmlContent(htmlItem.htmlContent);
            setIsLoading(false);
            return;
          }

          // B. Supabase Storage URL이거나 .html 파일인 경우 텍스트를 가져와(fetch) 렌더링
          if (
            targetUrl &&
            (targetUrl.includes("/storage/v1/object/public/") ||
              targetUrl.toLowerCase().endsWith(".html") ||
              targetUrl.toLowerCase().endsWith(".htm"))
          ) {
            const resp = await fetch(targetUrl);
            if (!resp.ok) {
              throw new Error("스토리지에서 HTML 파일을 불러오지 못했습니다.");
            }
            const text = await resp.text();
            setHtmlContent(text);
            setIsLoading(false);
            return;
          }

          // C. 일반 외부 웹사이트 URL인 경우
          if (targetUrl) {
            const formatted =
              targetUrl.startsWith("http://") || targetUrl.startsWith("https://")
                ? targetUrl
                : `https://${targetUrl}`;
            setExternalUrl(formatted);
            setIsLoading(false);
            return;
          }

          setErrorMsg("등록된 HTML 파일이나 웹 시연 주소가 없습니다.");
          setIsLoading(false);
          return;
        }

        // 2. directUrl만 전달된 경우 폴백
        if (directUrl) {
          if (
            directUrl.includes("/storage/v1/object/public/") ||
            directUrl.toLowerCase().endsWith(".html")
          ) {
            const resp = await fetch(directUrl);
            const text = await resp.text();
            setHtmlContent(text);
          } else {
            setExternalUrl(directUrl);
          }
          setIsLoading(false);
        }
      } catch (err: any) {
        console.error("[HtmlFullViewerPage] Load error:", err);
        setErrorMsg(err.message || "HTML 시연 화면을 불러오는 중 오류가 발생했습니다.");
        setIsLoading(false);
      }
    };

    loadHtmlProject();
  }, []);

  if (isLoading) {
    return (
      <div className="w-screen h-screen bg-slate-950 text-white flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        <p className="text-xs text-slate-300 font-medium">
          출품작 HTML 웹 시연 화면을 렌더링하고 있습니다...
        </p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="w-screen h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center gap-4">
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
    <div className="w-screen h-screen flex flex-col bg-white overflow-hidden">
      {/* 상단 슬림 컨트롤 바 (숨기기 가능) */}
      {!hideHeader ? (
        <header className="h-11 px-4 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between gap-3 shrink-0 z-20">
          <div className="flex items-center gap-2 min-w-0">
            <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-xs font-bold truncate">
              {project ? `${project.title} (${project.teamName})` : "HTML 웹 시연 전체화면"}
            </span>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-mono">
              LIVE HTML PREVIEW
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

      {/* 본문: 전체화면 HTML 렌더링 영역 */}
      <main className="flex-1 w-full h-full relative bg-white">
        {htmlContent ? (
          <iframe
            srcDoc={htmlContent}
            title={project?.title || "Uploaded HTML Fullscreen"}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-forms allow-popups allow-modals"
          />
        ) : (
          <iframe
            src={externalUrl}
            title={project?.title || "External Web Fullscreen"}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-modals"
          />
        )}
      </main>
    </div>
  );
}

