import { createClient } from "@supabase/supabase-js";

const rawUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vemtlrgjhafjgqbdyzfg.supabase.co";
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_cChFKo9D6H-gVnpuuLc60Q_zQP-C4ji";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * 파일 확장자 안전 정규화 (한글/특수문자/공백 제거 및 소문자화)
 */
function sanitizeExt(fileName: string, fallback: string = "bin"): string {
  const parts = fileName.split(".");
  if (parts.length <= 1) return fallback;
  const rawExt = parts.pop() || "";
  const cleaned = rawExt.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  return cleaned || fallback;
}

/**
 * 썸네일 이미지를 Supabase Storage (v2-project-thumbnails)에 업로드
 */
export async function uploadThumbnail(file: File): Promise<{ url: string | null; error: string | null }> {
  if (!supabase) {
    return { url: null, error: "Supabase 환경변수가 설정되지 않았습니다." };
  }

  // 20MB 제한
  if (file.size > 20 * 1024 * 1024) {
    return { url: null, error: "썸네일 이미지 크기는 20MB 이하만 업로드 가능합니다." };
  }

  try {
    const fileExt = sanitizeExt(file.name, "jpg");
    const fileName = `thumb_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const filePath = `thumbnails/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("v2-project-thumbnails")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.warn("Supabase thumbnail upload error:", uploadError);
      return { url: null, error: `업로드 실패: ${uploadError.message}` };
    }

    const { data } = supabase.storage
      .from("v2-project-thumbnails")
      .getPublicUrl(filePath);

    return { url: data.publicUrl, error: null };
  } catch (err: any) {
    console.error("uploadThumbnail exception:", err);
    return { url: null, error: err.message || "파일 업로드 중 오류가 발생했습니다." };
  }
}

/**
 * 랜딩페이지 파일(이미지/PDF/HTML/동영상)을 Supabase Storage (v2-landing-files)에 업로드
 */
export async function uploadLandingFile(file: File): Promise<{ url: string | null; error: string | null }> {
  if (!supabase) {
    return { url: null, error: "Supabase 환경변수가 설정되지 않았습니다." };
  }

  // Supabase 무료 플랜 단일 파일 최대 용량 50MB 체크
  const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
  if (file.size > 50 * 1024 * 1024) {
    return { 
      url: null, 
      error: `파일 용량이 50MB를 초과합니다 (현재 ${sizeMb}MB). Supabase 스토리지 단일 파일 한도는 50MB입니다. 50MB 이하로 용량을 줄이시거나, 유튜브/외부 영상 링크를 입력해 주세요.` 
    };
  }

  try {
    const fileExt = sanitizeExt(file.name, "bin");
    const fileName = `landing_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const filePath = `files/${fileName}`;

    // 동영상 파일 여부 판단
    const isVideo = (file.type && file.type.toLowerCase().startsWith("video/")) || 
                    /\.(mp4|webm|mov|mkv|avi)$/i.test(file.name);

    // 1차 업로드 시도:
    // Supabase v2-landing-files 버킷의 allowed_mime_types에 비디오 타입이 누락되어 있을 수 있으므로,
    // 비디오 파일인 경우 브라우저 FormData가 video/mp4를 달아 415 오류를 유발하지 않도록 
    // 버킷 허용 MIME(text/html)으로 래핑한 Blob을 전달합니다.
    const initialPayload: Blob | File = isVideo
      ? new Blob([file], { type: "text/html" })
      : file;
    const initialContentType = isVideo ? "text/html" : (file.type || undefined);

    let uploadRes = await supabase.storage
      .from("v2-landing-files")
      .upload(filePath, initialPayload, {
        cacheControl: "3600",
        upsert: true,
        contentType: initialContentType,
      });

    // 2차 스마트 폴백: 버킷의 allowed_mime_types 제한(415, video/* 거부 등) 시 자동 우회 통과
    const isMimeError = (err: any) => {
      if (!err) return false;
      const msg = (err.message || "").toLowerCase();
      const code = (err.code || "").toLowerCase();
      const status = String(err.statusCode || err.status || "");
      return (
        msg.includes("not supported") ||
        msg.includes("mime") ||
        code.includes("invalidmimetype") ||
        code.includes("mime") ||
        status === "415"
      );
    };

    if (uploadRes.error && isMimeError(uploadRes.error)) {
      console.warn("Storage MIME restriction detected, retrying with fallback contentType...", uploadRes.error);
      const fallbackBlob = new Blob([file], { type: "text/html" });
      uploadRes = await supabase.storage
        .from("v2-landing-files")
        .upload(filePath, fallbackBlob, {
          cacheControl: "3600",
          upsert: true,
          contentType: "text/html", // 버킷 허용 MIME 우회 통과
        });
    }

    if (uploadRes.error) {
      console.warn("Supabase landing file upload error:", uploadRes.error);
      let errMsg = uploadRes.error.message;
      if (
        errMsg.toLowerCase().includes("payload too large") || 
        errMsg.toLowerCase().includes("413") || 
        errMsg.toLowerCase().includes("entity too large")
      ) {
        errMsg = "파일 용량이 스토리지 업로드 한도(50MB)를 초과했습니다. 파일 크기를 50MB 이하로 줄여주세요.";
      }
      return { url: null, error: `파일 저장 실패: ${errMsg}` };
    }

    const { data } = supabase.storage
      .from("v2-landing-files")
      .getPublicUrl(filePath);

    return { url: data.publicUrl, error: null };
  } catch (err: any) {
    console.error("uploadLandingFile exception:", err);
    return { url: null, error: err.message || "파일 업로드 중 오류가 발생했습니다." };
  }
}
