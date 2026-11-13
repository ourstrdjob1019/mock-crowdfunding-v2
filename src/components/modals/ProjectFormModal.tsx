"use client";

import React, { useState, useEffect, useRef } from "react";
import { Project, LandingFormat, ProjectCategory, MediaType, ProjectMediaItem, TeamMemberDetail } from "@/types";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/Button";
import { supabase, uploadThumbnail, uploadLandingFile } from "@/lib/supabase";
import { 
  X, 
  Upload, 
  Image as ImageIcon, 
  FileText, 
  Globe, 
  Trash2, 
  Plus, 
  Minus,
  AlertCircle, 
  Sparkles,
  Link as LinkIcon,
  Video,
  Users,
  Check,
  CheckCircle2,
  Film,
  Play,
  ArrowUpDown,
  Loader2
} from "lucide-react";

interface ProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editProject?: Project | null;
}

export const ProjectFormModal: React.FC<ProjectFormModalProps> = ({
  isOpen,
  onClose,
  editProject,
}) => {
  const { currentUser, users, roster, event, createProject, updateProject, deleteProject } = useApp();

  const isEditing = Boolean(editProject);

  const [title, setTitle] = useState("");
  const [teamName, setTeamName] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ProjectCategory>("AI/SaaS");
  const [targetCredits, setTargetCredits] = useState<number>(20000);
  const [highlight1, setHighlight1] = useState("");
  const [highlight2, setHighlight2] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");

  // 1. 팀원 관리 상태
  const [showMemberSettings, setShowMemberSettings] = useState(false);
  const [memberInputs, setMemberInputs] = useState<string[]>([""]);
  const [resolvedMembers, setResolvedMembers] = useState<TeamMemberDetail[]>([]);
  const [memberLookupMessage, setMemberLookupMessage] = useState<string>("");
  const [activeSearchIdx, setActiveSearchIdx] = useState<number | null>(null);

  // 2. 미디어 4종 다중 선택 및 우선순위 (1~4)
  const [enabledMedia, setEnabledMedia] = useState<{
    IMAGE: boolean;
    PDF: boolean;
    HTML: boolean;
    VIDEO: boolean;
  }>({
    IMAGE: true,
    PDF: false,
    HTML: false,
    VIDEO: false,
  });

  const [priorities, setPriorities] = useState<{
    IMAGE: number;
    PDF: number;
    HTML: number;
    VIDEO: number;
  }>({
    IMAGE: 1,
    PDF: 2,
    HTML: 3,
    VIDEO: 4,
  });

  // 미디어별 세부 데이터 (4종 모두 다중 파일/URL 등록 지원)
  // A. 이미지 (다중)
  const [mediaImages, setMediaImages] = useState<string[]>([]);
  const [mediaImageUrl, setMediaImageUrl] = useState<string>("");

  // B. PDF (다중)
  const [mediaPdfList, setMediaPdfList] = useState<
    { id: string; url: string; fileName: string }[]
  >([]);
  const [mediaPdfUrlInput, setMediaPdfUrlInput] = useState<string>("");

  // C. HTML (다중)
  const [mediaHtmlList, setMediaHtmlList] = useState<
    { id: string; url: string; htmlContent?: string; fileName: string }[]
  >([]);
  const [mediaHtmlUrlInput, setMediaHtmlUrlInput] = useState<string>("");

  // D. 동영상 (다중)
  const [mediaVideoList, setMediaVideoList] = useState<
    { id: string; url: string; videoType: "FILE" | "URL"; fileName: string }[]
  >([]);
  const [mediaVideoUrlInput, setMediaVideoUrlInput] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const submitLockRef = useRef<boolean>(false);
  // 폼 초기화는 "모달이 열릴 때" 또는 "수정 대상 프로젝트가 바뀔 때" 단 1회만 수행
  // (백그라운드 동기화로 currentUser 객체가 갱신되어도 입력 중인 내용이 초기화되지 않도록 방지)
  const initializedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      initializedKeyRef.current = null;
      return;
    }
    const initKey = editProject ? `edit:${editProject.id}` : "new";
    if (initializedKeyRef.current === initKey) return;
    initializedKeyRef.current = initKey;

    if (editProject) {
      setTitle(editProject.title);
      setTeamName(editProject.teamName);
      setSummary(editProject.summary);
      setDescription(editProject.description);
      setCategory(editProject.category || "AI/SaaS");
      setTargetCredits(editProject.targetCredits || 20000);
      setHighlight1(editProject.pitchHighlights?.[0] || "");
      setHighlight2(editProject.pitchHighlights?.[1] || "");
      setThumbnailUrl(editProject.thumbnailUrl);

      // 팀원 데이터 복원
      if (editProject.teamMemberDetails && editProject.teamMemberDetails.length > 0) {
        setResolvedMembers(editProject.teamMemberDetails);
        setMemberInputs(editProject.teamMemberDetails.map(m => m.email || m.id));
      } else if (editProject.teamMemberIds && editProject.teamMemberIds.length > 0) {
        // ID 기반 조회 복원
        const matched = editProject.teamMemberIds.map(id => {
          const u = users.find(user => user.id === id || user.email === id);
          if (u) {
            return {
              id: u.id,
              email: u.email,
              name: u.name,
              department: u.department,
              studentNumber: u.studentNumber,
            };
          }
          return { id, email: id, name: "팀원", department: "", studentNumber: "" };
        });
        setResolvedMembers(matched);
        setMemberInputs(matched.map(m => m.email || m.id));
      } else {
        setResolvedMembers([]);
        setMemberInputs([""]);
      }

      // 미디어 아이템 복원 (다중 아이템 누적 복원)
      if (editProject.mediaItems && editProject.mediaItems.length > 0) {
        const newEnabled = { IMAGE: false, PDF: false, HTML: false, VIDEO: false };
        const newPriorities = { IMAGE: 1, PDF: 2, HTML: 3, VIDEO: 4 };
        const restoredImages: string[] = [];
        const restoredPdfs: { id: string; url: string; fileName: string }[] = [];
        const restoredHtmls: { id: string; url: string; htmlContent?: string; fileName: string }[] = [];
        const restoredVideos: { id: string; url: string; videoType: "FILE" | "URL"; fileName: string }[] = [];

        editProject.mediaItems.forEach((item, idx) => {
          if (item.type in newEnabled) {
            newEnabled[item.type] = true;
            newPriorities[item.type] = item.priority;

            if (item.type === "IMAGE") {
              const imgs = item.images && item.images.length > 0 ? item.images : [item.url].filter(Boolean);
              imgs.forEach((u) => {
                if (u && !restoredImages.includes(u)) restoredImages.push(u);
              });
            } else if (item.type === "PDF") {
              if (item.url) {
                restoredPdfs.push({
                  id: item.id || `media-pdf-${idx}`,
                  url: item.url,
                  fileName: item.fileName || item.title || `PDF 문서 #${restoredPdfs.length + 1}`,
                });
              }
            } else if (item.type === "HTML") {
              if (item.url || item.htmlContent) {
                restoredHtmls.push({
                  id: item.id || `media-html-${idx}`,
                  url: item.url || "",
                  htmlContent: item.htmlContent || "",
                  fileName: item.fileName || item.title || `HTML 시연 #${restoredHtmls.length + 1}`,
                });
              }
            } else if (item.type === "VIDEO") {
              if (item.url) {
                restoredVideos.push({
                  id: item.id || `media-video-${idx}`,
                  url: item.url,
                  videoType: item.videoType || "FILE",
                  fileName: item.fileName || item.title || `소개 영상 #${restoredVideos.length + 1}`,
                });
              }
            }
          }
        });

        setEnabledMedia(newEnabled);
        setPriorities(newPriorities);
        setMediaImages(restoredImages);
        setMediaImageUrl("");
        setMediaPdfList(restoredPdfs);
        setMediaPdfUrlInput("");
        setMediaHtmlList(restoredHtmls);
        setMediaHtmlUrlInput("");
        setMediaVideoList(restoredVideos);
        setMediaVideoUrlInput("");
      } else {
        // 기존 단일 landingFormat 기반 마이그레이션 복원
        const fmt = editProject.landingFormat;
        const isPdf = fmt === "PDF";
        const isHtml = fmt === "HTML" || fmt === "WEB";
        const isVideo = fmt === "VIDEO";
        const isImg = fmt === "IMAGE" || (!isPdf && !isHtml && !isVideo);

        setEnabledMedia({
          IMAGE: isImg,
          PDF: isPdf,
          HTML: isHtml,
          VIDEO: isVideo,
        });

        setMediaImages(isImg ? (editProject.landingImages || [editProject.landingUrl].filter(Boolean)) : []);
        setMediaImageUrl("");
        setMediaPdfList(
          isPdf && editProject.landingUrl
            ? [{ id: "media-pdf-0", url: editProject.landingUrl, fileName: "IR 피치덱 PDF" }]
            : []
        );
        setMediaPdfUrlInput("");
        setMediaHtmlList(
          isHtml && editProject.landingUrl
            ? [{ id: "media-html-0", url: editProject.landingUrl, fileName: "시연 웹페이지" }]
            : []
        );
        setMediaHtmlUrlInput("");
        setMediaVideoList(
          isVideo && editProject.landingUrl
            ? [{ id: "media-video-0", url: editProject.landingUrl, videoType: "FILE", fileName: "소개 영상" }]
            : []
        );
        setMediaVideoUrlInput("");
      }
    } else {
      // 신규 등록 기본값
      setTitle("");
      setTeamName(currentUser?.teamName || `${currentUser?.name || "학생"} 팀`);
      setSummary("");
      setDescription("");
      setCategory("AI/SaaS");
      setTargetCredits(20000);
      setHighlight1("");
      setHighlight2("");
      setThumbnailUrl("https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80");
      
      // 팀원 기본값
      setResolvedMembers([]);
      setMemberInputs([""]);
      setShowMemberSettings(false);
      setMemberLookupMessage("");

      // 미디어 기본값 (이미지 1순위)
      setEnabledMedia({
        IMAGE: true,
        PDF: false,
        HTML: false,
        VIDEO: false,
      });
      setPriorities({
        IMAGE: 1,
        PDF: 2,
        HTML: 3,
        VIDEO: 4,
      });
      setMediaImages([]);
      setMediaImageUrl("");
      setMediaPdfList([]);
      setMediaPdfUrlInput("");
      setMediaHtmlList([]);
      setMediaHtmlUrlInput("");
      setMediaVideoList([]);
      setMediaVideoUrlInput("");
    }
    setErrorMessage("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editProject?.id, isOpen]);

  if (!isOpen) return null;

  // 1. 대표 썸네일 업로드
  const handleThumbnailFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus("썸네일 이미지 Storage 서버 업로드 중...");
    setIsUploading(true);
    setErrorMessage("");

    try {
      const res = await uploadThumbnail(file);
      if (res.url) {
        setThumbnailUrl(res.url);
        setUploadStatus("✅ 썸네일 등록 완료!");
        setTimeout(() => setUploadStatus(""), 2000);
      } else {
        setErrorMessage(res.error || "썸네일 업로드에 실패했습니다.");
        setUploadStatus("");
      }
    } catch (err: any) {
      console.warn("Thumbnail upload warning:", err);
      setErrorMessage(`썸네일 업로드 오류: ${err.message || err}`);
      setUploadStatus("");
    } finally {
      setIsUploading(false);
      try {
        e.target.value = "";
      } catch (_) {}
    }
  };

  // 2. 팀원 조회 및 확인 (로컬 + DB 실시간 검색 및 본인 등록 방지)
  const handleSaveTeamMembers = async () => {
    setMemberLookupMessage("팀원 계정 확인 중...");
    const trimmedInputs = memberInputs.map(s => s.trim()).filter(Boolean);

    if (trimmedInputs.length === 0) {
      setResolvedMembers([]);
      setMemberLookupMessage("등록된 추가 팀원이 없습니다.");
      return;
    }

    const matched: TeamMemberDetail[] = [];
    const notFound: string[] = [];
    let selfDetected = false;

    for (const inputVal of trimmedInputs) {
      // 본인(대표자) 입력 감지
      const isCurrentUser = currentUser && (
        inputVal.toLowerCase() === currentUser.email?.toLowerCase() ||
        inputVal.toLowerCase() === currentUser.id.toLowerCase() ||
        (currentUser.studentNumber && inputVal === currentUser.studentNumber)
      );

      if (isCurrentUser) {
        selfDetected = true;
        continue;
      }

      // 1) users 메모리에서 email, id, studentNumber 대조
      const foundUser = users.find(u => 
        u.email.toLowerCase() === inputVal.toLowerCase() ||
        u.id.toLowerCase() === inputVal.toLowerCase() ||
        (u.studentNumber && u.studentNumber === inputVal)
      );

      if (foundUser) {
        matched.push({
          id: foundUser.id,
          email: foundUser.email,
          name: foundUser.name,
          department: foundUser.department || "창업학부",
          studentNumber: foundUser.studentNumber || "",
        });
        continue;
      }

      // 2) roster에서 대조
      const foundRoster = roster.find(r => 
        r.email.toLowerCase() === inputVal.toLowerCase() ||
        (r.studentNumber && r.studentNumber === inputVal)
      );

      if (foundRoster) {
        matched.push({
          id: foundRoster.email,
          email: foundRoster.email,
          name: foundRoster.name,
          department: foundRoster.department || "창업학부",
          studentNumber: foundRoster.studentNumber || "",
        });
        continue;
      }

      // 3) Supabase V2 DB 실시간 조회 (방금 가입한 학생 지원)
      if (supabase) {
        try {
          const { data: dbUser } = await supabase
            .from("v2_users")
            .select("*")
            .or(`email.ilike.${inputVal},student_number.eq.${inputVal},id.eq.${inputVal}`)
            .maybeSingle();

          if (dbUser) {
            matched.push({
              id: dbUser.id,
              email: dbUser.email,
              name: dbUser.name,
              department: dbUser.department || "창업학부",
              studentNumber: dbUser.student_number || "",
            });
            continue;
          }
        } catch (dbErr) {
          console.warn("DB user lookup error:", dbErr);
        }
      }

      notFound.push(inputVal);
    }

    // 중복 제거
    const uniqueMatched = matched.filter((v, idx, arr) => 
      arr.findIndex(item => item.email.toLowerCase() === v.email.toLowerCase()) === idx
    );

    setResolvedMembers(uniqueMatched);

    let msg = "";
    if (uniqueMatched.length > 0) {
      msg += `✅ ${uniqueMatched.length}명의 팀원이 정상 확인되어 등록되었습니다. `;
    }
    if (selfDetected) {
      msg += `ℹ️ 대표자 본인은 이미 기본 등록되어 있어 팀원 목록에서 자동 제외되었습니다. `;
    }
    if (notFound.length > 0) {
      msg += `⚠️ 미가입 아이디/이메일: [${notFound.join(", ")}]. 먼저 회원가입 후 등록해 주세요.`;
    }
    setMemberLookupMessage(msg.trim());
  };

  const handleAddMemberInput = () => {
    setMemberInputs(prev => [...prev, ""]);
  };

  const handleRemoveMemberInput = (index: number) => {
    setMemberInputs(prev => prev.filter((_, i) => i !== index));
    if (activeSearchIdx === index) setActiveSearchIdx(null);
  };

  const handleMemberInputChange = (index: number, val: string) => {
    setMemberInputs(prev => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  // 검색어에 따른 학생 후보군 자동 필터링 (이름, 이메일, 학번, 학과)
  const getMemberSuggestions = (query: string) => {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 1) return [];

    const currentUserId = currentUser?.id?.toLowerCase();
    const currentUserEmail = currentUser?.email?.toLowerCase();
    const resolvedEmails = resolvedMembers.map(m => m.email?.toLowerCase());

    const allCandidates: { id: string; name: string; email: string; department: string; studentNumber: string }[] = [];

    // 1) users에서 검색
    users.forEach(u => {
      const uId = u.id?.toLowerCase();
      const uEmail = u.email?.toLowerCase();
      if (uId === currentUserId || uEmail === currentUserEmail) return;
      if (resolvedEmails.includes(uEmail)) return;

      const nameMatch = u.name?.toLowerCase().includes(q);
      const emailMatch = u.email?.toLowerCase().includes(q);
      const numberMatch = u.studentNumber?.toLowerCase().includes(q);
      const deptMatch = u.department?.toLowerCase().includes(q);

      if (nameMatch || emailMatch || numberMatch || deptMatch) {
        allCandidates.push({
          id: u.id,
          name: u.name,
          email: u.email,
          department: u.department || "창업학부",
          studentNumber: u.studentNumber || "",
        });
      }
    });

    // 2) roster에서 검색
    roster.forEach(r => {
      const rEmail = r.email?.toLowerCase();
      if (rEmail === currentUserEmail) return;
      if (resolvedEmails.includes(rEmail)) return;
      if (allCandidates.some(c => c.email.toLowerCase() === rEmail)) return;

      const nameMatch = r.name?.toLowerCase().includes(q);
      const emailMatch = r.email?.toLowerCase().includes(q);
      const numberMatch = r.studentNumber?.toLowerCase().includes(q);
      const deptMatch = r.department?.toLowerCase().includes(q);

      if (nameMatch || emailMatch || numberMatch || deptMatch) {
        allCandidates.push({
          id: r.email,
          name: r.name,
          email: r.email,
          department: r.department || "창업학부",
          studentNumber: r.studentNumber || "",
        });
      }
    });

    return allCandidates.slice(0, 5); // 상위 5명
  };

  // 자동완성 드롭다운에서 학생을 클릭했을 때 즉시 팀원으로 반영
  const handleSelectSuggestedMember = (index: number, candidate: { id: string; name: string; email: string; department: string; studentNumber: string }) => {
    setMemberInputs(prev => {
      const next = [...prev];
      next[index] = candidate.email;
      return next;
    });

    setResolvedMembers(prev => {
      const exists = prev.some(m => m.email.toLowerCase() === candidate.email.toLowerCase());
      if (exists) return prev;
      return [
        ...prev,
        {
          id: candidate.id,
          email: candidate.email,
          name: candidate.name,
          department: candidate.department,
          studentNumber: candidate.studentNumber,
        }
      ];
    });

    setMemberLookupMessage(`✅ ${candidate.name} (${candidate.department} · ${candidate.studentNumber}) 학생이 팀원으로 추가되었습니다.`);
    setActiveSearchIdx(null);
  };

  // 3. 미디어 파일 업로드 핸들러들 (4종 모두 다중 업로드 지원)
  // A. 이미지 다중 업로드 (Storage 안전 업로드)
  const handleDetailImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setEnabledMedia((prev) => ({ ...prev, IMAGE: true }));
    setUploadStatus(`상세 이미지 ${files.length}장 Storage 서버 업로드 중...`);
    setIsUploading(true);
    setErrorMessage("");

    try {
      const uploadedUrls: string[] = [];
      const errors: string[] = [];

      for (const file of Array.from(files)) {
        const res = await uploadLandingFile(file);
        if (res.url) {
          uploadedUrls.push(res.url);
        } else if (res.error) {
          errors.push(`${file.name}: ${res.error}`);
        }
      }

      if (uploadedUrls.length > 0) {
        setMediaImages((prev) => [...prev, ...uploadedUrls]);
        setUploadStatus(`✅ 이미지 ${uploadedUrls.length}장 업로드 완료!`);
        setTimeout(() => setUploadStatus(""), 2200);
      }
      if (errors.length > 0) {
        setErrorMessage(errors.join(" / "));
        if (uploadedUrls.length === 0) setUploadStatus("");
      }
    } catch (err: any) {
      console.warn("Detail images upload warning:", err);
      setErrorMessage(`이미지 업로드 오류: ${err.message || err}`);
      setUploadStatus("");
    } finally {
      setIsUploading(false);
      try {
        e.target.value = "";
      } catch (_) {}
    }
  };

  // B. PDF 다중 업로드 (Storage 안전 업로드)
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setEnabledMedia((prev) => ({ ...prev, PDF: true }));
    setUploadStatus(`PDF 문서 ${files.length}개 Storage 서버 업로드 중...`);
    setIsUploading(true);
    setErrorMessage("");

    try {
      const addedItems: { id: string; url: string; fileName: string }[] = [];
      const errors: string[] = [];

      for (const file of Array.from(files)) {
        const res = await uploadLandingFile(file);
        if (res.url) {
          addedItems.push({
            id: `media-pdf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            url: res.url,
            fileName: file.name,
          });
        } else {
          errors.push(`${file.name}: ${res.error || "업로드 실패"}`);
        }
      }

      if (addedItems.length > 0) {
        setMediaPdfList((prev) => [...prev, ...addedItems]);
        setUploadStatus(`✅ PDF 문서 ${addedItems.length}개 업로드 완료!`);
        setTimeout(() => setUploadStatus(""), 2200);
      }
      if (errors.length > 0) {
        setErrorMessage(errors.join(" / "));
        if (addedItems.length === 0) setUploadStatus("");
      }
    } catch (err: any) {
      console.warn("PDF upload warning:", err);
      setErrorMessage(`PDF 업로드 오류: ${err.message || err}`);
      setUploadStatus("");
    } finally {
      setIsUploading(false);
      try {
        e.target.value = "";
      } catch (_) {}
    }
  };

  // C. HTML 파일 다중 업로드
  const handleHtmlFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setEnabledMedia((prev) => ({ ...prev, HTML: true }));
    setUploadStatus(`HTML 파일 ${files.length}개 읽기 및 Storage 서버 업로드 중...`);
    setIsUploading(true);
    setErrorMessage("");

    try {
      const addedItems: { id: string; url: string; htmlContent?: string; fileName: string }[] = [];
      const errors: string[] = [];

      for (const file of Array.from(files)) {
        let htmlText = "";
        try {
          htmlText = await file.text();
        } catch (_) {}

        const res = await uploadLandingFile(file);
        if (res.url || htmlText) {
          addedItems.push({
            id: `media-html-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            url: res.url || "",
            htmlContent: htmlText,
            fileName: file.name,
          });
        } else {
          errors.push(`${file.name}: ${res.error || "업로드 실패"}`);
        }
      }

      if (addedItems.length > 0) {
        setMediaHtmlList((prev) => [...prev, ...addedItems]);
        setUploadStatus(`✅ HTML 파일 ${addedItems.length}개 업로드 완료!`);
        setTimeout(() => setUploadStatus(""), 2200);
      }
      if (errors.length > 0) {
        setErrorMessage(errors.join(" / "));
        if (addedItems.length === 0) setUploadStatus("");
      }
    } catch (err: any) {
      console.warn("HTML upload warning:", err);
      setErrorMessage(`HTML 업로드 오류: ${err.message || err}`);
      setUploadStatus("");
    } finally {
      setIsUploading(false);
      try {
        e.target.value = "";
      } catch (_) {}
    }
  };

  // D. 동영상 파일 다중 업로드 (대용량 안전 업로드)
  const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setEnabledMedia((prev) => ({ ...prev, VIDEO: true }));
    setIsUploading(true);
    setErrorMessage("");

    try {
      const addedItems: { id: string; url: string; videoType: "FILE" | "URL"; fileName: string }[] = [];
      const errors: string[] = [];

      for (const file of Array.from(files)) {
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        setUploadStatus(`동영상 Storage 서버 업로드 중... (${file.name} · ${sizeMb} MB)`);
        const res = await uploadLandingFile(file);
        if (res.url) {
          addedItems.push({
            id: `media-video-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            url: res.url,
            videoType: "FILE",
            fileName: `${file.name} (${sizeMb} MB)`,
          });
        } else {
          errors.push(`${file.name}: ${res.error || "업로드 실패"}`);
        }
      }

      if (addedItems.length > 0) {
        setMediaVideoList((prev) => [...prev, ...addedItems]);
        setUploadStatus(`✅ 동영상 ${addedItems.length}개 업로드 완료!`);
        setTimeout(() => setUploadStatus(""), 2500);
      }
      if (errors.length > 0) {
        setErrorMessage(errors.join(" / "));
        if (addedItems.length === 0) setUploadStatus("");
      }
    } catch (err: any) {
      console.warn("Video upload warning:", err);
      setErrorMessage(`동영상 업로드 오류: ${err.message || err}`);
      setUploadStatus("");
    } finally {
      setIsUploading(false);
      try {
        e.target.value = "";
      } catch (_) {}
    }
  };

  // 4. 저장 제출 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLockRef.current || isSubmitting || isUploading) return;
    setErrorMessage("");

    // 업로드 진행 중 가드
    if (isUploading) {
      setErrorMessage("파일이 서버에 업로드 중입니다. 업로드가 완료된 후 출품을 완료해 주세요.");
      return;
    }

    // 임시 blob URL 잔존 방어 가드
    if (
      thumbnailUrl.startsWith("blob:") ||
      mediaImages.some((img) => img.startsWith("blob:")) ||
      mediaPdfList.some((p) => p.url.startsWith("blob:")) ||
      mediaVideoList.some((v) => v.url.startsWith("blob:"))
    ) {
      setErrorMessage("파일 서버 전송이 아직 처리 중입니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    if (!title.trim()) {
      setErrorMessage("프로젝트 제목을 입력해 주세요.");
      return;
    }

    if (!thumbnailUrl.trim()) {
      setErrorMessage("대표 썸네일 이미지를 등록해 주세요.");
      return;
    }

    // 선택된 미디어 검증
    const hasAnyMedia = Object.values(enabledMedia).some(Boolean);
    if (!hasAnyMedia) {
      setErrorMessage("최소 1개 이상의 미디어 포맷(이미지, PDF, HTML, 동영상)을 선택해주세요.");
      return;
    }

    // 우선순위 정렬 및 mediaItems 구성
    const items: ProjectMediaItem[] = [];

    if (enabledMedia.IMAGE) {
      const combinedImages = [...mediaImages];
      if (mediaImageUrl.trim() && !combinedImages.includes(mediaImageUrl.trim())) {
        combinedImages.push(mediaImageUrl.trim());
      }
      const finalImages = combinedImages.length > 0 ? combinedImages : [thumbnailUrl.trim()];
      items.push({
        id: "media-img",
        type: "IMAGE",
        priority: priorities.IMAGE,
        title: `상세 이미지 (${finalImages.length}장)`,
        url: finalImages[0],
        images: finalImages,
      });
    }

    if (enabledMedia.PDF) {
      const finalPdfs = [...mediaPdfList];
      if (mediaPdfUrlInput.trim()) {
        finalPdfs.push({
          id: `media-pdf-url-${Date.now()}`,
          url: mediaPdfUrlInput.trim(),
          fileName: "외부 PDF 문서",
        });
      }
      if (finalPdfs.length === 0) {
        setErrorMessage("PDF 문서를 선택했으나 파일이나 URL이 등록되지 않았습니다.");
        return;
      }
      finalPdfs.forEach((pdf, idx) => {
        items.push({
          id: pdf.id || `media-pdf-${idx}`,
          type: "PDF",
          priority: priorities.PDF,
          title:
            finalPdfs.length > 1
              ? `IR 피치덱 PDF #${idx + 1}${pdf.fileName ? ` · ${pdf.fileName}` : ""}`
              : `IR 피치덱 PDF${pdf.fileName ? ` · ${pdf.fileName}` : ""}`,
          url: pdf.url.trim(),
          fileName: pdf.fileName,
        });
      });
    }

    if (enabledMedia.HTML) {
      const finalHtmls = [...mediaHtmlList];
      if (mediaHtmlUrlInput.trim()) {
        finalHtmls.push({
          id: `media-html-url-${Date.now()}`,
          url: mediaHtmlUrlInput.trim(),
          fileName: "외부 웹 시연 URL",
        });
      }
      if (finalHtmls.length === 0) {
        setErrorMessage("HTML 포맷을 선택했으나 파일이나 URL이 등록되지 않았습니다.");
        return;
      }
      finalHtmls.forEach((html, idx) => {
        items.push({
          id: html.id || `media-html-${idx}`,
          type: "HTML",
          priority: priorities.HTML,
          title:
            finalHtmls.length > 1
              ? `시연 웹페이지 (HTML) #${idx + 1}${html.fileName ? ` · ${html.fileName}` : ""}`
              : `시연 웹페이지 (HTML)${html.fileName ? ` · ${html.fileName}` : ""}`,
          url: html.url.trim(),
          htmlContent: html.htmlContent,
          fileName: html.fileName,
        });
      });
    }

    if (enabledMedia.VIDEO) {
      const finalVideos = [...mediaVideoList];
      if (mediaVideoUrlInput.trim()) {
        finalVideos.push({
          id: `media-video-url-${Date.now()}`,
          url: mediaVideoUrlInput.trim(),
          videoType: "URL",
          fileName: "외부 영상 링크",
        });
      }
      if (finalVideos.length === 0) {
        setErrorMessage("동영상 포맷을 선택했으나 영상 파일이나 URL이 등록되지 않았습니다.");
        return;
      }
      finalVideos.forEach((vid, idx) => {
        items.push({
          id: vid.id || `media-video-${idx}`,
          type: "VIDEO",
          priority: priorities.VIDEO,
          title:
            finalVideos.length > 1
              ? `프로젝트 소개 영상 #${idx + 1}${vid.fileName ? ` · ${vid.fileName}` : ""}`
              : `프로젝트 소개 영상${vid.fileName ? ` · ${vid.fileName}` : ""}`,
          url: vid.url.trim(),
          videoType: vid.videoType,
          fileName: vid.fileName,
        });
      });
    }

    // 우선순위 정렬
    items.sort((a, b) => a.priority - b.priority);

    // 하위 호환을 위한 대표 포맷 설정
    const topItem = items[0];
    const topFormat: LandingFormat = topItem ? topItem.type : "IMAGE";
    const topUrl = topItem ? topItem.url : thumbnailUrl;
    const topImages = topItem && topItem.type === "IMAGE" ? (topItem.images || [topUrl]) : [];

    submitLockRef.current = true;
    setIsSubmitting(true);

    try {
      const highlights = [highlight1, highlight2].filter(Boolean);
      if (highlights.length === 0) {
        highlights.push("2026 데모데이 출품작 및 시장 검증 진행");
      }

      const teamMemberIds = resolvedMembers.map(m => m.id);

      if (isEditing && editProject) {
        const res = await updateProject({
          id: editProject.id,
          title: title.trim(),
          teamName: teamName.trim() || editProject.teamName,
          summary: summary.trim(),
          description: description.trim(),
          category,
          targetCredits: Number(targetCredits) || 20000,
          pitchHighlights: highlights,
          thumbnailUrl: thumbnailUrl.trim(),
          landingFormat: topFormat,
          landingUrl: topUrl,
          landingImages: topImages,
          teamMemberIds,
          teamMemberDetails: resolvedMembers,
          mediaItems: items,
        });

        if (res.success) {
          onClose();
        } else {
          setErrorMessage(res.message);
        }
      } else {
        const isAdminUser = currentUser?.role === "ADMIN";
        const res = await createProject({
          eventId: event.id,
          // 관리자는 여러 과정을 오가므로 기존 팀ID를 재사용하지 않고 항상 새 팀ID로 등록
          teamId: !isAdminUser && currentUser?.teamId
            ? currentUser.teamId
            : `team-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          teamName: teamName.trim() || `${currentUser?.name || "학생"} 팀`,
          teamNumber: 0,
          title: title.trim(),
          summary: summary.trim(),
          description: description.trim(),
          category,
          targetCredits: Number(targetCredits) || 20000,
          pitchHighlights: highlights,
          thumbnailUrl: thumbnailUrl.trim(),
          landingFormat: topFormat,
          landingUrl: topUrl,
          landingImages: topImages,
          authorId: currentUser?.id,
          authorName: currentUser?.name,
          authorEmail: currentUser?.email,
          teamMemberIds,
          teamMemberDetails: resolvedMembers,
          mediaItems: items,
        });

        if (res.success) {
          onClose();
        } else {
          setErrorMessage(res.message);
        }
      }
    } catch (err: any) {
      setErrorMessage(`저장 실패: ${err.message || err}`);
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200/90 w-full max-w-3xl my-8 overflow-hidden shadow-2xl transition-all">
        {/* 모달 상단 헤더 */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <Sparkles size={16} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                {isEditing ? "프로젝트 출품작 정보 수정" : "새 프로젝트 데모 등록"}
              </h2>
              <p className="text-xs text-slate-500">
                팀원 설정 및 4종 미디어(이미지, PDF, HTML, 동영상) 우선순위 배치가 가능합니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* 폼 본문 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {uploadStatus && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />
              <span>{uploadStatus}</span>
            </div>
          )}

          {/* 1. 기본 정보: 프로젝트명 & 팀명 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                프로젝트 제목 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 핀테크 AI 이상거래 탐지 솔루션"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                출품 팀명 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="예: 넥스트웨이브"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
              />
            </div>
          </div>

          {/* ========================================================
              ★ 2. 내 팀원 설정하기 섹션 (요구사항 1)
              ======================================================== */}
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                  <Users size={14} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    내 팀원 설정하기
                    <span className="text-[10px] font-normal text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">
                      투자 제한 연동
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    등록된 팀원들은 같은 프로젝트에 투자가 제한됩니다.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowMemberSettings(!showMemberSettings)}
                className="px-3 py-1.5 rounded-lg bg-white border border-indigo-200 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition cursor-pointer shadow-2xs flex items-center gap-1"
              >
                <span>{showMemberSettings ? "설정 닫기" : "+ 팀원 등록/관리"}</span>
              </button>
            </div>

            {/* 대표 등록자 기본 표시 */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="font-semibold text-slate-500 text-[11px]">소속 인원:</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 font-medium text-[11px] border border-blue-200">
                <span className="px-1 py-0.2 rounded bg-blue-600 text-white text-[9px] font-bold">대표</span>
                <span>{currentUser?.name || "작성자"} ({currentUser?.department || "자유"} · {currentUser?.studentNumber || "등록자"})</span>
              </span>

              {resolvedMembers.map((m, idx) => (
                <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800 font-medium text-[11px] border border-indigo-200 shadow-2xs">
                  <span className="px-1 py-0.2 rounded bg-indigo-600 text-white text-[9px] font-bold">팀원</span>
                  <span>{m.name} {m.department ? `· ${m.department}` : ""} {m.studentNumber ? `(${m.studentNumber})` : ""}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setResolvedMembers(prev => prev.filter((_, i) => i !== idx));
                      setMemberInputs(prev => prev.filter((val) => val.toLowerCase() !== m.email.toLowerCase()));
                      setMemberLookupMessage(`팀원 [${m.name}] 학생이 제외되었습니다.`);
                    }}
                    className="p-0.5 text-indigo-400 hover:text-rose-600 hover:bg-white rounded transition cursor-pointer"
                    title="팀원 목록에서 제외"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>

            {/* 팀원 등록 펼침 화면 */}
            {showMemberSettings && (
              <div className="mt-3 pt-3 border-t border-indigo-200/60 space-y-3 bg-white p-3.5 rounded-xl border border-indigo-100 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800">팀원 검색 및 추가</span>
                    <span className="block text-[10px] text-indigo-600 font-medium">이름, 이메일, 또는 학번을 1글자만 쳐도 아래에 학생 목록이 자동 검색됩니다.</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddMemberInput}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition cursor-pointer"
                  >
                    <Plus size={13} /> 추가하기
                  </button>
                </div>

                <div className="space-y-3">
                  {memberInputs.map((val, idx) => (
                    <div key={idx} className="relative">
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={val}
                            onFocus={() => setActiveSearchIdx(idx)}
                            onBlur={() => setTimeout(() => setActiveSearchIdx(null), 250)}
                            onChange={(e) => {
                              handleMemberInputChange(idx, e.target.value);
                              setActiveSearchIdx(idx);
                            }}
                            placeholder="팀원 이름(예: 홍길동), 이메일, 또는 학번 입력..."
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                          />
                          {val && (
                            <button
                              type="button"
                              onClick={() => {
                                handleMemberInputChange(idx, "");
                                setActiveSearchIdx(null);
                              }}
                              className="absolute right-2.5 top-2.5 text-slate-300 hover:text-slate-500 p-0.5"
                            >
                              <X size={13} />
                            </button>
                          )}
                        </div>
                        {memberInputs.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMemberInput(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                            title="입력칸 삭제"
                          >
                            <Minus size={14} />
                          </button>
                        )}
                      </div>

                      {/* 자동완성 드롭다운 검색 결과 */}
                      {activeSearchIdx === idx && val.trim().length >= 1 && (
                        <div className="absolute left-0 right-8 top-full mt-1 bg-white border border-indigo-200 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 max-h-56 overflow-y-auto">
                          {getMemberSuggestions(val).length > 0 ? (
                            getMemberSuggestions(val).map((candidate) => (
                              <button
                                type="button"
                                key={candidate.id}
                                onMouseDown={(e) => {
                                  e.preventDefault(); // onBlur 조기 발생 방지
                                  handleSelectSuggestedMember(idx, candidate);
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-indigo-50/80 flex items-center justify-between transition cursor-pointer group"
                              >
                                <div className="flex items-center gap-2.5">
                                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                                    {candidate.name.slice(0, 1)}
                                  </span>
                                  <div>
                                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                      <span>{candidate.name}</span>
                                      <span className="text-[10px] font-normal text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.2 rounded">
                                        {candidate.department} · {candidate.studentNumber}
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono">
                                      {candidate.email}
                                    </div>
                                  </div>
                                </div>
                                <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md group-hover:bg-indigo-600 group-hover:text-white transition">
                                  선택 +
                                </span>
                              </button>
                            ))
                          ) : (
                            <div className="p-3 text-center text-xs text-slate-400 font-medium">
                              검색어와 일치하는 가입 학생이 없습니다.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleSaveTeamMembers}
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <Check size={13} /> 팀원 확인 및 저장하기
                  </button>
                  <span className="text-[11px] text-slate-400">목록에서 클릭하거나 직접 입력 후 저장하세요</span>
                </div>

                {memberLookupMessage && (
                  <p className="text-xs font-medium text-indigo-700 bg-indigo-50 p-2 rounded-lg border border-indigo-100">
                    {memberLookupMessage}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 3. 분야 및 목표 투자 크레딧 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                카테고리 / 산업 분야
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProjectCategory)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none bg-white"
              >
                <option value="AI/SaaS">AI / SaaS</option>
                <option value="Bio/Health">Bio / Healthcare</option>
                <option value="FinTech">FinTech / 금융</option>
                <option value="GreenTech">GreenTech / 환경</option>
                <option value="Robotics">Robotics / 하드웨어</option>
                <option value="EdTech">EdTech / 교육</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                목표 모금액 (CR)
              </label>
              <input
                type="number"
                step={1000}
                value={targetCredits}
                onChange={(e) => setTargetCredits(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
              />
            </div>
          </div>

          {/* 4. 요약 및 설명 */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              한 줄 요약 (카드 노출) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="예: 초개인화 AI 알고리즘을 통한 금융 거래 실시간 보안 솔루션"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              상세 소개글
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="프로젝트의 문제 정의, 솔루션, 비즈니스 모델 등을 자유롭게 입력하세요."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
            />
          </div>

          {/* 5. 대표 썸네일 이미지 */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              대표 썸네일 이미지 <span className="text-rose-500">*</span>
            </label>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-all cursor-pointer shrink-0">
                <Upload size={15} /> 썸네일 파일 업로드
                <input
                  type="file"
                  accept="image/*"
                  onClick={(e) => {
                    (e.target as HTMLInputElement).value = "";
                  }}
                  onChange={handleThumbnailFileUpload}
                  className="hidden"
                />
              </label>
              <div className="flex-1 w-full">
                <input
                  type="text"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="또는 이미지 URL 직접 입력"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-700 focus:outline-none"
                />
              </div>
            </div>

            {thumbnailUrl && (
              <div className="w-24 h-16 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                <img src={thumbnailUrl} alt="Thumbnail preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* ========================================================
              ★ 6. 상세페이지 컨텐츠 미디어 4종 & 우선순위 (다중 파일 업로드 지원)
              ======================================================== */}
          <div className="pt-2 border-t border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Film size={16} className="text-blue-600" />
                  상세페이지 컨텐츠 미디어 (4종 모두 여러 개 파일 업로드 & 우선순위 지정)
                </h3>
                <p className="text-xs text-slate-500">
                  이미지, PDF, HTML, 동영상 각각 여러 개의 파일이나 URL을 추가할 수 있으며 1~4순위 노출 순서를 정할 수 있습니다.
                </p>
              </div>
            </div>

            {/* 4종 미디어 카드 목록 */}
            <div className="space-y-3">
              {/* [미디어 1: 이미지 (다중)] */}
              <div className={`p-4 rounded-2xl border transition-all ${
                enabledMedia.IMAGE ? "border-blue-300 bg-blue-50/20" : "border-slate-200 bg-slate-50 opacity-75"
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enabledMedia.IMAGE}
                      onChange={(e) => setEnabledMedia({ ...enabledMedia, IMAGE: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      <ImageIcon size={15} className="text-blue-600" /> 이미지 상세페이지 (다중 이미지 업로드 · 현재 {mediaImages.length}장)
                    </span>
                  </label>

                  {enabledMedia.IMAGE && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-slate-500 text-[11px] font-medium">노출 순서:</span>
                      <select
                        value={priorities.IMAGE}
                        onChange={(e) => setPriorities({ ...priorities, IMAGE: Number(e.target.value) })}
                        className="px-2 py-1 rounded-lg border border-blue-200 bg-white font-bold text-blue-700 text-xs outline-none"
                      >
                        <option value={1}>1순위 (최상단)</option>
                        <option value={2}>2순위</option>
                        <option value={3}>3순위</option>
                        <option value={4}>4순위</option>
                      </select>
                    </div>
                  )}
                </div>

                {enabledMedia.IMAGE && (
                  <div className="space-y-2.5 pl-6">
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-blue-700 hover:bg-blue-50 cursor-pointer shadow-2xs shrink-0">
                        <Upload size={13} /> 이미지 파일 다중 선택
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onClick={(e) => {
                            (e.target as HTMLInputElement).value = "";
                          }}
                          onChange={handleDetailImagesUpload}
                          className="hidden"
                        />
                      </label>
                      <div className="flex items-center gap-1.5 flex-1 w-full">
                        <input
                          type="text"
                          value={mediaImageUrl}
                          onChange={(e) => setMediaImageUrl(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && mediaImageUrl.trim()) {
                              e.preventDefault();
                              setMediaImages((prev) => [...prev, mediaImageUrl.trim()]);
                              setMediaImageUrl("");
                            }
                          }}
                          placeholder="또는 이미지 URL 입력 후 [+ URL 추가]"
                          className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono bg-white outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!mediaImageUrl.trim()) return;
                            setMediaImages((prev) => [...prev, mediaImageUrl.trim()]);
                            setMediaImageUrl("");
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shrink-0 cursor-pointer"
                        >
                          + URL 추가
                        </button>
                      </div>
                    </div>

                    {mediaImages.length > 0 && (
                      <div className="flex items-center gap-2 overflow-x-auto py-1">
                        {mediaImages.map((img, idx) => (
                          <div key={idx} className="relative w-20 h-14 rounded-lg overflow-hidden border border-slate-200 shrink-0 group bg-white">
                            <img src={img} alt={`thumb-${idx}`} className="w-full h-full object-cover" />
                            <span className="absolute top-0.5 left-0.5 px-1 rounded bg-black/60 text-white text-[9px] font-mono">
                              #{idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => setMediaImages(mediaImages.filter((_, i) => i !== idx))}
                              className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
                              title="이미지 삭제"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* [미디어 2: PDF 문서 (다중)] */}
              <div className={`p-4 rounded-2xl border transition-all ${
                enabledMedia.PDF ? "border-indigo-300 bg-indigo-50/20" : "border-slate-200 bg-slate-50 opacity-75"
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enabledMedia.PDF}
                      onChange={(e) => setEnabledMedia({ ...enabledMedia, PDF: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      <FileText size={15} className="text-indigo-600" /> PDF 문서 (다중 업로드 지원 · 현재 {mediaPdfList.length}개)
                    </span>
                  </label>

                  {enabledMedia.PDF && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-slate-500 text-[11px] font-medium">노출 순서:</span>
                      <select
                        value={priorities.PDF}
                        onChange={(e) => setPriorities({ ...priorities, PDF: Number(e.target.value) })}
                        className="px-2 py-1 rounded-lg border border-indigo-200 bg-white font-bold text-indigo-700 text-xs outline-none"
                      >
                        <option value={1}>1순위 (최상단)</option>
                        <option value={2}>2순위</option>
                        <option value={3}>3순위</option>
                        <option value={4}>4순위</option>
                      </select>
                    </div>
                  )}
                </div>

                {enabledMedia.PDF && (
                  <div className="space-y-2.5 pl-6">
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 cursor-pointer shadow-2xs shrink-0">
                        <Upload size={13} /> PDF 파일 다중 선택
                        <input
                          type="file"
                          accept="application/pdf,.pdf"
                          multiple
                          onClick={(e) => {
                            (e.target as HTMLInputElement).value = "";
                          }}
                          onChange={handlePdfUpload}
                          className="hidden"
                        />
                      </label>
                      <div className="flex items-center gap-1.5 flex-1 w-full">
                        <input
                          type="text"
                          value={mediaPdfUrlInput}
                          onChange={(e) => setMediaPdfUrlInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && mediaPdfUrlInput.trim()) {
                              e.preventDefault();
                              setMediaPdfList((prev) => [
                                ...prev,
                                {
                                  id: `media-pdf-url-${Date.now()}`,
                                  url: mediaPdfUrlInput.trim(),
                                  fileName: `PDF 링크 #${prev.length + 1}`,
                                },
                              ]);
                              setMediaPdfUrlInput("");
                            }
                          }}
                          placeholder="또는 PDF URL 입력 후 [+ URL 추가]"
                          className="flex-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono bg-white outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!mediaPdfUrlInput.trim()) return;
                            setMediaPdfList((prev) => [
                              ...prev,
                              {
                                id: `media-pdf-url-${Date.now()}`,
                                url: mediaPdfUrlInput.trim(),
                                fileName: `PDF 링크 #${prev.length + 1}`,
                              },
                            ]);
                            setMediaPdfUrlInput("");
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shrink-0 cursor-pointer"
                        >
                          + URL 추가
                        </button>
                      </div>
                    </div>

                    {mediaPdfList.length > 0 && (
                      <div className="space-y-1.5">
                        {mediaPdfList.map((pdf, idx) => (
                          <div
                            key={pdf.id || idx}
                            className="p-2 rounded-xl bg-white border border-indigo-200 flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-mono text-[10px] font-bold shrink-0">
                                PDF #{idx + 1}
                              </span>
                              <span className="font-semibold text-slate-800 truncate">
                                {pdf.fileName || "PDF 문서"}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono truncate hidden sm:inline">
                                ({pdf.url.slice(0, 45)}...)
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setMediaPdfList((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                            >
                              <Trash2 size={12} /> 삭제
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* [미디어 3: HTML 시연 및 HTML 파일 업로드 (다중)] */}
              <div className={`p-4 rounded-2xl border transition-all ${
                enabledMedia.HTML ? "border-emerald-300 bg-emerald-50/20" : "border-slate-200 bg-slate-50 opacity-75"
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enabledMedia.HTML}
                      onChange={(e) => setEnabledMedia({ ...enabledMedia, HTML: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      <Globe size={15} className="text-emerald-600" /> HTML (웹페이지 URL 또는 HTML 파일 다중 업로드 · 현재 {mediaHtmlList.length}개)
                    </span>
                  </label>

                  {enabledMedia.HTML && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-slate-500 text-[11px] font-medium">노출 순서:</span>
                      <select
                        value={priorities.HTML}
                        onChange={(e) => setPriorities({ ...priorities, HTML: Number(e.target.value) })}
                        className="px-2 py-1 rounded-lg border border-emerald-200 bg-white font-bold text-emerald-700 text-xs outline-none"
                      >
                        <option value={1}>1순위 (최상단)</option>
                        <option value={2}>2순위</option>
                        <option value={3}>3순위</option>
                        <option value={4}>4순위</option>
                      </select>
                    </div>
                  )}
                </div>

                {enabledMedia.HTML && (
                  <div className="space-y-2.5 pl-6">
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 cursor-pointer shadow-2xs shrink-0">
                        <Upload size={13} /> HTML 파일 다중 업로드
                        <input
                          type="file"
                          accept=".html,.htm,text/html"
                          multiple
                          onClick={(e) => {
                            (e.target as HTMLInputElement).value = "";
                          }}
                          onChange={handleHtmlFileUpload}
                          className="hidden"
                        />
                      </label>
                      <div className="flex items-center gap-1.5 flex-1 w-full">
                        <input
                          type="text"
                          value={mediaHtmlUrlInput}
                          onChange={(e) => setMediaHtmlUrlInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && mediaHtmlUrlInput.trim()) {
                              e.preventDefault();
                              setMediaHtmlList((prev) => [
                                ...prev,
                                {
                                  id: `media-html-url-${Date.now()}`,
                                  url: mediaHtmlUrlInput.trim(),
                                  fileName: `웹 시연 URL #${prev.length + 1}`,
                                },
                              ]);
                              setMediaHtmlUrlInput("");
                            }
                          }}
                          placeholder="또는 시연 웹사이트 URL 입력 후 [+ URL 추가]"
                          className="flex-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono bg-white outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!mediaHtmlUrlInput.trim()) return;
                            setMediaHtmlList((prev) => [
                              ...prev,
                              {
                                id: `media-html-url-${Date.now()}`,
                                url: mediaHtmlUrlInput.trim(),
                                fileName: `웹 시연 URL #${prev.length + 1}`,
                              },
                            ]);
                            setMediaHtmlUrlInput("");
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0 cursor-pointer"
                        >
                          + URL 추가
                        </button>
                      </div>
                    </div>

                    {mediaHtmlList.length > 0 && (
                      <div className="space-y-1.5">
                        {mediaHtmlList.map((html, idx) => (
                          <div
                            key={html.id || idx}
                            className="p-2 rounded-xl bg-white border border-emerald-200 flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-mono text-[10px] font-bold shrink-0">
                                HTML #{idx + 1}
                              </span>
                              <span className="font-semibold text-slate-800 truncate">
                                {html.fileName || html.url || "HTML 시연 파일"}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setMediaHtmlList((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                            >
                              <Trash2 size={12} /> 삭제
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* [미디어 4: 동영상 파일 업로드 & 동영상 URL (다중)] */}
              <div className={`p-4 rounded-2xl border transition-all ${
                enabledMedia.VIDEO ? "border-rose-300 bg-rose-50/20" : "border-slate-200 bg-slate-50 opacity-75"
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enabledMedia.VIDEO}
                      onChange={(e) => setEnabledMedia({ ...enabledMedia, VIDEO: e.target.checked })}
                      className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                    />
                    <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      <Video size={15} className="text-rose-600" /> 동영상 (파일 다중 업로드 or 영상 URL · 현재 {mediaVideoList.length}개)
                    </span>
                  </label>

                  {enabledMedia.VIDEO && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-slate-500 text-[11px] font-medium">노출 순서:</span>
                      <select
                        value={priorities.VIDEO}
                        onChange={(e) => setPriorities({ ...priorities, VIDEO: Number(e.target.value) })}
                        className="px-2 py-1 rounded-lg border border-rose-200 bg-white font-bold text-rose-700 text-xs outline-none"
                      >
                        <option value={1}>1순위 (최상단)</option>
                        <option value={2}>2순위</option>
                        <option value={3}>3순위</option>
                        <option value={4}>4순위</option>
                      </select>
                    </div>
                  )}
                </div>

                {enabledMedia.VIDEO && (
                  <div className="space-y-2.5 pl-6">
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-rose-700 hover:bg-rose-50 cursor-pointer shadow-2xs shrink-0">
                        <Upload size={13} /> 동영상 파일 다중 업로드 (MP4/WebM)
                        <input
                          type="file"
                          accept="video/mp4,video/webm,video/*"
                          multiple
                          onClick={(e) => {
                            (e.target as HTMLInputElement).value = "";
                          }}
                          onChange={handleVideoFileUpload}
                          className="hidden"
                        />
                      </label>
                      <div className="flex items-center gap-1.5 flex-1 w-full">
                        <input
                          type="text"
                          value={mediaVideoUrlInput}
                          onChange={(e) => setMediaVideoUrlInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && mediaVideoUrlInput.trim()) {
                              e.preventDefault();
                              setMediaVideoList((prev) => [
                                ...prev,
                                {
                                  id: `media-video-url-${Date.now()}`,
                                  url: mediaVideoUrlInput.trim(),
                                  videoType: "URL",
                                  fileName: `영상 링크 #${prev.length + 1}`,
                                },
                              ]);
                              setMediaVideoUrlInput("");
                            }
                          }}
                          placeholder="또는 유튜브 / 비디오 URL 입력 후 [+ URL 추가]"
                          className="flex-1 w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono bg-white outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!mediaVideoUrlInput.trim()) return;
                            setMediaVideoList((prev) => [
                              ...prev,
                              {
                                id: `media-video-url-${Date.now()}`,
                                url: mediaVideoUrlInput.trim(),
                                videoType: "URL",
                                fileName: `영상 링크 #${prev.length + 1}`,
                              },
                            ]);
                            setMediaVideoUrlInput("");
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shrink-0 cursor-pointer"
                        >
                          + URL 추가
                        </button>
                      </div>
                    </div>

                    {/* 동영상 업로드 목록 표시 */}
                    {mediaVideoList.length > 0 && (
                      <div className="space-y-1.5">
                        {mediaVideoList.map((vid, idx) => (
                          <div
                            key={vid.id || idx}
                            className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 flex items-center justify-between gap-2 text-xs font-mono"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Play size={14} className="text-emerald-600 shrink-0" />
                              <span className="px-1.5 py-0.5 rounded bg-emerald-200/70 text-emerald-900 text-[10px] font-bold shrink-0">
                                VIDEO #{idx + 1}
                              </span>
                              <span className="truncate font-sans font-semibold">
                                {vid.fileName || vid.url}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[11px] font-sans font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                                ✓ 등록됨
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setMediaVideoList((prev) => prev.filter((_, i) => i !== idx))
                                }
                                className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-[11px] font-sans font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 size={12} /> 삭제
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 7. 모달 하단 버튼 */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            {isEditing && editProject ? (
              <button
                type="button"
                onClick={async () => {
                  if (confirm("정말 이 프로젝트를 삭제하시겠습니까?")) {
                    await deleteProject(editProject.id);
                    onClose();
                  }
                }}
                className="px-4 py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 size={14} /> 프로젝트 삭제
              </button>
            ) : <div />}

            <div className="flex items-center gap-2.5">
              {uploadStatus && (
                <div className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 flex items-center gap-1.5 animate-pulse">
                  {isUploading && <Loader2 size={12} className="animate-spin" />}
                  {uploadStatus}
                </div>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
              >
                취소
              </button>
              <Button type="submit" variant="primary" disabled={isSubmitting || isUploading}>
                {isSubmitting ? "저장 처리 중..." : isUploading ? "파일 서버 전송 중..." : (isEditing ? "수정사항 저장" : "프로젝트 최종 출품")}
              </Button>
            </div>
          </div>
      </form>

        {/* 파일 업로드 또는 DB 출품 저장 중 전면 잠금 오버레이 팝업 (광클릭 및 중복 제출 원천 차단) */}
        {(isUploading || isSubmitting) && (
          <div
            className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 select-none cursor-wait"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-200 flex flex-col items-center text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-extrabold text-slate-900">
                  {isUploading ? "파일을 서버에 업로드하고 있습니다" : "프로젝트 출품 정보를 저장 중입니다"}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {uploadStatus || "서버와 안전하게 데이터 통신 중입니다. 잠시만 기다려 주세요..."}
                </p>
              </div>
              <div className="w-full py-2 px-3 rounded-xl bg-amber-50 border border-amber-200/80 text-[11px] font-semibold text-amber-800">
                ⚠️ 전송이 완료될 때까지 창을 닫거나 버튼을 연타하지 마세요.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
