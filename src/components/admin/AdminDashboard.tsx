"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { EventStage, User, UserRole } from "@/types";
import {
  Download,
  Tv,
  Layers,
  BarChart3,
  RefreshCw,
  KeyRound,
  Copy,
  Check,
  X,
  Users,
  RotateCcw,
  Power,
  Award,
  Plus,
  Trash2,
  FolderKanban,
  Sparkles,
  UserPlus,
  FileSpreadsheet,
} from "lucide-react";
import * as XLSX from "xlsx";

interface AdminDashboardProps {
  openProjectorRanking: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ openProjectorRanking }) => {
  const {
    event,
    events,
    selectCourse,
    createCourse,
    updateCourse,
    deleteCourse,
    toggleCourseSwitch,
    setStage,
    projects,
    toggleProjectVisibility,
    users,
    bulkCreateAccounts,
    deleteUserAccount,
    resetPassword,
    resetAllInvestments,
    refreshFromSupabase,
  } = useApp();

  const [activeAdminSubTab, setActiveAdminSubTab] = useState<"control" | "roster" | "courses">("control");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // [채점 1] 포인트 -> 점수 환산 기준 설정
  const [creditUnit, setCreditUnit] = useState<number>(event.creditUnitForScore || 1000);
  const [scorePerUnit, setScorePerUnit] = useState<number>(event.scorePerCreditUnit || 10);

  // [채점 2] 등수별 10점 만점 차감 환산 팀 수 설정 (예: 5팀 -> 10, 8, 6, 4, 2 / 10팀 -> 10, 9, 8...)
  const [rankTeamCount, setRankTeamCount] = useState<number>(
    event.rankScoreTeamCount || Math.max(projects.length, 5)
  );

  const [toastNotice, setToastNotice] = useState<string | null>(null);

  // 비밀번호 리셋 팝업
  const [resetModalData, setResetModalData] = useState<{
    userName: string;
    userEmail: string;
    tempPassword: string;
  } | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // [사전 계정 생성 1] 팀 개수 & 팀별 인원수 기준 자동 생성 상태
  const [genTeamCount, setGenTeamCount] = useState<number>(5);
  const [teamMemberCounts, setTeamMemberCounts] = useState<number[]>([4, 4, 4, 4, 4]);
  const [teamIdPrefix, setTeamIdPrefix] = useState<string>("team");
  const [teamDefaultPw, setTeamDefaultPw] = useState<string>("123456");
  const [useRandomPwForTeam, setUseRandomPwForTeam] = useState<boolean>(false);

  // [사전 계정 생성 2] 불특정 다수 개별 아이디 일괄 생성 상태
  const [indivCount, setIndivCount] = useState<number>(10);
  const [indivRole, setIndivRole] = useState<UserRole>("STUDENT");
  const [indivPrefix, setIndivPrefix] = useState<string>("user");
  const [indivDefaultPw, setIndivDefaultPw] = useState<string>("123456");
  const [useRandomPwForIndiv, setUseRandomPwForIndiv] = useState<boolean>(false);

  // [사전 계정 생성 3] 임의 아이디/비밀번호 직접 지정 생성 상태
  const [customId, setCustomId] = useState<string>("");
  const [customPw, setCustomPw] = useState<string>("123456");
  const [customName, setCustomName] = useState<string>("");
  const [customRole, setCustomRole] = useState<UserRole>("STUDENT");
  const [customTeamNo, setCustomTeamNo] = useState<string>("");

  // [과정 관리] 신규 과정 개설 및 현재 과정 수정 상태
  const [newCourseName, setNewCourseName] = useState<string>("");
  const [newCourseInstitution, setNewCourseInstitution] = useState<string>("2026 창업교육센터");
  const [newCourseSession, setNewCourseSession] = useState<string>("2026 정규 세션");
  const [newCourseInviteCode, setNewCourseInviteCode] = useState<string>("");
  const [newCourseBaseCredit, setNewCourseBaseCredit] = useState<number>(10000);

  const [editCourseName, setEditCourseName] = useState<string>(event.name);
  const [editCourseInstitution, setEditCourseInstitution] = useState<string>(event.institution || "");
  const [editCourseSession, setEditCourseSession] = useState<string>(event.session);
  const [editCourseInviteCode, setEditCourseInviteCode] = useState<string>(event.inviteCode || "2026");
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedRatio = localStorage.getItem("mc_v2_score_ratio");
      if (savedRatio) {
        const parsed = JSON.parse(savedRatio);
        if (parsed.creditUnit) setCreditUnit(parsed.creditUnit);
        if (parsed.scorePerUnit) setScorePerUnit(parsed.scorePerUnit);
        if (parsed.rankTeamCount) setRankTeamCount(parsed.rankTeamCount);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (event.creditUnitForScore) setCreditUnit(event.creditUnitForScore);
    if (event.scorePerCreditUnit) setScorePerUnit(event.scorePerCreditUnit);
    if (event.rankScoreTeamCount) {
      setRankTeamCount(event.rankScoreTeamCount);
    } else if (projects.length > 0) {
      setRankTeamCount(projects.length);
    }
    setEditCourseName(event.name);
    setEditCourseInstitution(event.institution || "");
    setEditCourseSession(event.session);
    setEditCourseInviteCode(event.inviteCode || "2026");
  }, [event, projects.length]);

  const showToast = (msg: string) => {
    setToastNotice(msg);
    setTimeout(() => setToastNotice(null), 3200);
  };

  const saveScoreSettings = (nextCreditUnit: number, nextScorePerUnit: number, nextRankTeamCount: number) => {
    try {
      localStorage.setItem(
        "mc_v2_score_ratio",
        JSON.stringify({
          creditUnit: nextCreditUnit,
          scorePerUnit: nextScorePerUnit,
          rankTeamCount: nextRankTeamCount,
        })
      );
    } catch {}
    updateCourse({
      creditUnitForScore: nextCreditUnit,
      scorePerCreditUnit: nextScorePerUnit,
      rankScoreTeamCount: nextRankTeamCount,
    });
  };

  const handleUnitCreditChange = (val: number) => {
    const updated = Math.max(1, val);
    setCreditUnit(updated);
    saveScoreSettings(updated, scorePerUnit, rankTeamCount);
  };

  const handleScorePerUnitChange = (val: number) => {
    const updated = Math.max(0.1, val);
    setScorePerUnit(updated);
    saveScoreSettings(creditUnit, updated, rankTeamCount);
  };

  const handleRankTeamCountChange = (val: number) => {
    const updated = Math.max(1, Math.min(200, val));
    setRankTeamCount(updated);
    saveScoreSettings(creditUnit, scorePerUnit, updated);
  };

  // 팀 개수 입력 변경 시 팀별 인원 배열 길이 조정
  const handleGenTeamCountChange = (count: number) => {
    const safeCount = Math.max(1, Math.min(50, count));
    setGenTeamCount(safeCount);
    setTeamMemberCounts((prev) => {
      const next = [...prev];
      while (next.length < safeCount) next.push(4);
      return next.slice(0, safeCount);
    });
  };

  const stages: { key: EventStage; code: string; title: string; desc: string }[] = [
    { key: "PREPARING", code: "01", title: "준비 중", desc: "출품 사전 가이드 및 시스템 점검" },
    { key: "REGISTRATION", code: "02", title: "출품 등록", desc: "팀별 IR 피치덱 및 시연 자료 자유 등록/수정" },
    { key: "FUNDING_OPEN", code: "03", title: "펀딩 진행 중", desc: "실시간 모의투자 진행 (학생 작품 수정 잠금)" },
    { key: "FUNDING_CLOSED", code: "04", title: "펀딩 마감", desc: "투자 집계 완료 및 검증 절차 진행" },
    { key: "RANKING_PUBLISHED", code: "05", title: "랭킹 공개", desc: "최종 환산 점수 발표 및 시상식 진행" },
  ];

  const currentStageObj = stages.find((s) => s.key === event.currentStage) || stages[2];

  // 계산 통계
  const totalRaisedAll = useMemo(() => {
    return projects.reduce((acc, p) => acc + p.totalCredits, 0);
  }, [projects]);

  const totalBackersAll = useMemo(() => {
    return projects.reduce((acc, p) => acc + p.investorCount, 0);
  }, [projects]);

  // 10점 만점 등수 차감 간격 계산 (예: 5팀이면 10/5 = 2점씩 차감, 10팀이면 1점씩 차감, 20팀이면 0.5점씩 차감)
  const effectiveRankTeams = Math.max(1, rankTeamCount || projects.length || 1);
  const rankDeductionStep = 10 / effectiveRankTeams;

  // 동적 환산 리더보드 (토큰 환산 점수 + 등수별 10점 만점 환산 점수)
  const leaderboardData = useMemo(() => {
    const sorted = [...projects].sort((a, b) => b.totalCredits - a.totalCredits);
    return sorted.map((p, idx) => {
      const convertedPoints = creditUnit > 0 ? (p.totalCredits / creditUnit) * scorePerUnit : 0;
      // 1등(idx === 0) = 10점, 이후 등수마다 (10 / effectiveRankTeams)점씩 차감 (최소 0점, 설정 팀수 초과 순위는 0점)
      const rawRankScore = idx < effectiveRankTeams ? 10 - idx * rankDeductionStep : 0;
      const rankScore10 = Math.max(0, Number(rawRankScore.toFixed(2)));
      return {
        ...p,
        convertedPoints: Number(convertedPoints.toFixed(1)),
        rankScore10,
      };
    });
  }, [projects, creditUnit, scorePerUnit, effectiveRankTeams, rankDeductionStep]);

  // 수동 실시간 DB 동기화
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshFromSupabase();
      showToast("🔄 Supabase 최신 데이터가 동기화되었습니다.");
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // [엑셀 내보내기 1] 최종 집계 순위 및 환산 점수 (10점 등수 환산 + 토큰 환산 포함)
  const handleExportExcel = () => {
    const rankingData = leaderboardData.map((p, idx) => ({
      순위: idx + 1,
      과정명: event.name,
      과정초대코드: event.inviteCode || "2026",
      팀번호: p.teamNumber,
      팀명: p.teamName,
      프로젝트명: p.title,
      누적투자액_CR: p.totalCredits,
      [`등수환산점수_10점만점(${effectiveRankTeams}팀기준)`]: p.rankScore10,
      [`토큰환산점수(${creditUnit}CR당_${scorePerUnit}점)`]: p.convertedPoints,
      참여투자자수: p.investorCount,
      포맷: p.landingFormat,
      분야: p.category || "AI/SaaS",
    }));

    const wb = XLSX.utils.book_new();
    const wsRanking = XLSX.utils.json_to_sheet(rankingData);
    XLSX.utils.book_append_sheet(wb, wsRanking, "최종집계_순위");
    XLSX.writeFile(wb, `${event.name.replace(/\s+/g, "_")}_최종결과_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast("📊 엑셀 결과 보고서 다운로드가 완료되었습니다.");
  };

  // [엑셀 내보내기 2] 사전 배정된 참가자 아이디/비밀번호 명단 엑셀 다운로드
  const handleExportAccountsExcel = () => {
    const accountRows = users.map((u, idx) => ({
      연번: idx + 1,
      과정명: event.name,
      입장초대코드: event.inviteCode || "2026",
      역할: u.role === "ADMIN" ? "관리자" : u.role === "JUDGE" ? "심사위원" : "학생/참가자",
      소속팀명: u.teamName || "-",
      소속팀ID: u.teamId || "-",
      이름: u.name,
      로그인아이디: u.email,
      비밀번호: u.password || "123456",
      소속기관_학과: u.department || u.institution || "-",
    }));

    const wb = XLSX.utils.book_new();
    const wsAccounts = XLSX.utils.json_to_sheet(accountRows);
    XLSX.utils.book_append_sheet(wb, wsAccounts, "사전배정_계정목록");
    XLSX.writeFile(wb, `${event.name.replace(/\s+/g, "_")}_아이디비번목록_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast("📥 사전 배정 아이디/비밀번호 엑셀 다운로드가 완료되었습니다.");
  };

  const makeRandomPw = () => String(Math.floor(100000 + Math.random() * 900000));

  // [사전 계정 생성 1 실행] 팀 개수 & 팀별 인원수 기준 자동 생성
  const handleGenerateTeamAccounts = async () => {
    const newUsers: User[] = [];
    const coursePrefix = (event.inviteCode || "2026").toLowerCase();

    for (let t = 1; t <= genTeamCount; t++) {
      const memberCount = teamMemberCounts[t - 1] || 1;
      const teamIdStr = `team-${coursePrefix}-${String(t).padStart(2, "0")}`;
      const teamNameStr = `${t}팀`;

      for (let m = 1; m <= memberCount; m++) {
        const loginId = `${teamIdPrefix}${t}_${m}`;
        const pw = useRandomPwForTeam ? makeRandomPw() : teamDefaultPw;
        newUsers.push({
          id: `usr-${Date.now()}-t${t}-m${m}-${Math.random().toString(36).slice(2, 6)}`,
          email: loginId,
          name: `${t}팀 팀원${m}`,
          institution: event.institution || "창업캠프",
          department: `${t}팀`,
          studentNumber: `${t}-${m}`,
          role: "STUDENT",
          teamId: teamIdStr,
          teamName: teamNameStr,
          eventId: event.id,
          privacyAgreed: true,
          password: pw,
        });
      }
    }

    if (
      !confirm(
        `총 ${genTeamCount}개 팀, ${newUsers.length}명의 팀원 아이디/비밀번호를 일괄 생성하시겠습니까?\n(생성 후 엑셀 다운로드로 명단을 배포할 수 있습니다.)`
      )
    ) {
      return;
    }

    const res = await bulkCreateAccounts(newUsers);
    showToast(`✅ ${res.message}`);
  };

  // [사전 계정 생성 2 실행] 불특정 다수 개별 아이디 일괄 생성
  const handleGenerateIndividualAccounts = async () => {
    const safeCount = Math.max(1, Math.min(200, indivCount));
    const existingCount = users.filter((u) => u.email.startsWith(indivPrefix)).length;
    const newUsers: User[] = [];

    for (let i = 1; i <= safeCount; i++) {
      const seq = existingCount + i;
      const loginId = `${indivPrefix}${seq}`;
      const pw = useRandomPwForIndiv ? makeRandomPw() : indivDefaultPw;
      const label = indivRole === "JUDGE" ? "심사위원" : "참가자";
      newUsers.push({
        id: `usr-${Date.now()}-ind${seq}-${Math.random().toString(36).slice(2, 6)}`,
        email: loginId,
        name: `${label}${seq}`,
        institution: event.institution || "초청 평가단",
        department: label,
        studentNumber: String(seq),
        role: indivRole,
        eventId: event.id,
        privacyAgreed: true,
        password: pw,
      });
    }

    if (!confirm(`불특정 다수 개별 계정 ${newUsers.length}개를 일괄 생성하시겠습니까?`)) {
      return;
    }

    const res = await bulkCreateAccounts(newUsers);
    showToast(`✅ ${res.message}`);
  };

  // [사전 계정 생성 3 실행] 관리자 임의 아이디/비밀번호 단건 직접 생성
  const handleCreateCustomAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customId.trim() || !customPw.trim()) {
      alert("아이디와 비밀번호를 모두 입력해 주세요.");
      return;
    }
    const tNo = customTeamNo.trim() ? parseInt(customTeamNo.trim(), 10) : undefined;
    const coursePrefix = (event.inviteCode || "2026").toLowerCase();
    const newUser: User = {
      id: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      email: customId.trim(),
      name: customName.trim() || customId.trim(),
      institution: event.institution || "창업캠프",
      department: tNo ? `${tNo}팀` : customRole === "JUDGE" ? "심사위원" : "일반참가자",
      studentNumber: "-",
      role: customRole,
      teamId: tNo ? `team-${coursePrefix}-${String(tNo).padStart(2, "0")}` : undefined,
      teamName: tNo ? `${tNo}팀` : undefined,
      eventId: event.id,
      privacyAgreed: true,
      password: customPw.trim(),
    };

    const res = await bulkCreateAccounts([newUser]);
    if (res.success) {
      setCustomId("");
      setCustomName("");
      showToast(`✅ 계정 [${newUser.email}] 이(가) 생성되었습니다.`);
    } else {
      alert(res.message);
    }
  };

  const handleResetUserPassword = async (userItem: User) => {
    if (confirm(`${userItem.name} (${userItem.email}) 님의 비밀번호를 임시 비밀번호로 초기화하시겠습니까?`)) {
      const res = await resetPassword(userItem.id);
      if (res.success && res.tempPassword) {
        setResetModalData({
          userName: userItem.name,
          userEmail: userItem.email,
          tempPassword: res.tempPassword,
        });
        setIsCopied(false);
      } else {
        alert(res.message);
      }
    }
  };

  // [과정 관리] 신규 과정 생성
  const handleCreateCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseName.trim() || !newCourseInviteCode.trim()) {
      alert("과정명과 초대코드 번호를 입력해 주세요.");
      return;
    }
    const res = await createCourse({
      name: newCourseName.trim(),
      institution: newCourseInstitution.trim() || "창업교육센터",
      session: newCourseSession.trim() || "2026 정규 세션",
      eventDate: new Date().toISOString().slice(0, 10),
      baseCredit: newCourseBaseCredit || 10000,
      minInvestment: 2000,
      maxInvestment: 5000,
      currentStage: "REGISTRATION",
      isRankingPublic: false,
      inviteCode: newCourseInviteCode.trim(),
      isRegistrationOpen: true,
      isFundingOpen: false,
      rankScoreTeamCount: 10,
      creditUnitForScore: 1000,
      scorePerCreditUnit: 10,
    });
    if (res.success) {
      setNewCourseName("");
      setNewCourseInviteCode("");
      showToast(`🎉 ${res.message}`);
    } else {
      alert(res.message);
    }
  };

  // [과정 관리] 현재 과정 정보 수정
  const handleUpdateCurrentCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCourseName.trim() || !editCourseInviteCode.trim()) {
      alert("과정명과 초대코드는 비워둘 수 없습니다.");
      return;
    }
    const res = await updateCourse({
      name: editCourseName.trim(),
      institution: editCourseInstitution.trim(),
      session: editCourseSession.trim(),
      inviteCode: editCourseInviteCode.trim(),
    });
    if (res.success) {
      showToast("✅ 과정 이름 및 초대코드가 저장되었습니다.");
    } else {
      alert(res.message);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Toast Notice */}
      {toastNotice && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[70] px-5 py-2.5 rounded-2xl bg-slate-900 text-white border border-slate-700 shadow-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <span>{toastNotice}</span>
        </div>
      )}

      {/* Header with Projector Launcher Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-md">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-400/20 text-amber-300 text-xs font-bold font-mono">
              CONTROL TOWER V2
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-500/20 text-blue-300 text-xs font-bold">
              현재 과정: {event.name}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold">
              초대코드: {event.inviteCode || "2026"}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight mt-1.5">
            모의 클라우드 펀딩 총괄 운영 센터
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            과정별 초대코드 운영 · 출품등록/펀딩진행 토글 스위치 제어 · 10점 만점 등수 환산 · 사전 계정 생성 및 엑셀 다운로드
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>DB 동기화</span>
          </button>

          <button
            type="button"
            onClick={async () => {
              if (confirm("현재 과정의 모든 프로젝트 누적 투자액과 참여 투자 내역을 0 CR로 일괄 초기화하시겠습니까?")) {
                const res = await resetAllInvestments();
                showToast(`🧹 ${res.message}`);
              }
            }}
            className="px-3 py-2.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800/70 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
            <span>투자 0원 초기화</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>채점/순위 엑셀 다운로드</span>
          </button>

          {/* Big CTA: Launch Projector Screen */}
          <button
            type="button"
            onClick={openProjectorRanking}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-extrabold text-sm shadow-lg shadow-amber-500/30 transition-all flex items-center gap-2 cursor-pointer active:scale-98 shrink-0"
          >
            <Tv className="w-5 h-5 text-slate-950" />
            <span>🏆 빔프로젝터 대형 랭킹 전광판 송출</span>
          </button>
        </div>
      </div>

      {/* Subtab Toggle (Control Tower / Roster & Pre-assigned IDs / Course Manager) */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveAdminSubTab("control")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
            activeAdminSubTab === "control"
              ? "bg-blue-600 text-white shadow-2xs"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Power className="w-3.5 h-3.5" />
          실시간 토글 스위치 & 채점 환산 (10점 등수/토큰)
        </button>
        <button
          type="button"
          onClick={() => setActiveAdminSubTab("roster")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
            activeAdminSubTab === "roster"
              ? "bg-blue-600 text-white shadow-2xs"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          아이디/비번 사전 배정 및 명단 관리 ({users.length}명)
        </button>
        <button
          type="button"
          onClick={() => setActiveAdminSubTab("courses")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
            activeAdminSubTab === "courses"
              ? "bg-blue-600 text-white shadow-2xs"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <FolderKanban className="w-3.5 h-3.5" />
          과정(Course) 및 초대코드 관리 ({events.length}개 과정)
        </button>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: 프로세스 토글 스위치 제어 & 채점 환산 (토큰 + 등수별 10점 만점) */}
      {/* ===================================================================== */}
      {activeAdminSubTab === "control" && (
        <>
          {/* 핵심 요구사항 1: 출품등록 / 펀딩진행중 / 랭킹공개 토글 스위치 제어기 */}
          <div className="bg-white rounded-2xl p-5 border-2 border-blue-200/90 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <Power className="w-4 h-4 text-blue-600" />
                  과정 프로세스 토글 스위치 제어 (출품등록 / 펀딩 진행중)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  토글 스위치가 열려 있으면(ON) 해당 과정이 활성화되고, 닫혀 있으면(OFF) 비활성화됩니다.{" "}
                  <strong className="text-rose-600">
                    출품등록 시간에는 수정이 자유롭지만, [펀딩 진행 중] 스위치가 켜지면 학생들의 작품 수정이 자동으로 차단됩니다.
                  </strong>
                </p>
              </div>
              <div className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 shrink-0">
                현재 학생 수정 상태:{" "}
                {event.isRegistrationOpen && !event.isFundingOpen ? (
                  <span className="text-emerald-600">✅ 자유 등록/수정 가능</span>
                ) : (
                  <span className="text-rose-600">🔒 학생 수정 제한됨</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 스위치 1: 출품 등록 (ON/OFF) */}
              <div
                className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between gap-3 ${
                  event.isRegistrationOpen
                    ? "bg-emerald-50/60 border-emerald-400"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        event.isRegistrationOpen ? "bg-emerald-500 animate-ping" : "bg-slate-400"
                      }`}
                    />
                    <span className="font-extrabold text-sm text-slate-900">출품 등록 스위치</span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        event.isRegistrationOpen
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-300 text-slate-700"
                      }`}
                    >
                      {event.isRegistrationOpen ? "ON (열림)" : "OFF (닫힘)"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    {event.isRegistrationOpen
                      ? event.isFundingOpen
                        ? "신규 등록 가능 (단, 펀딩 진행 중이라 기존 작품 수정은 잠김)"
                        : "학생들이 자유롭게 출품작을 등록하고 수정할 수 있습니다."
                      : "출품 등록 및 수정이 모두 닫혀 있습니다."}
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={Boolean(event.isRegistrationOpen)}
                  onClick={async () => {
                    const nextVal = !event.isRegistrationOpen;
                    await toggleCourseSwitch("isRegistrationOpen", nextVal);
                    showToast(
                      nextVal
                        ? "🟢 [출품 등록] 토글 스위치가 열렸습니다 (ON)."
                        : "⚪ [출품 등록] 토글 스위치가 닫혔습니다 (OFF)."
                    );
                  }}
                  className={`relative inline-flex h-8 w-15 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    event.isRegistrationOpen ? "bg-emerald-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                      event.isRegistrationOpen ? "translate-x-7" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* 스위치 2: 펀딩 진행 중 (ON/OFF) */}
              <div
                className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between gap-3 ${
                  event.isFundingOpen
                    ? "bg-blue-50/70 border-blue-500"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        event.isFundingOpen ? "bg-blue-600 animate-ping" : "bg-slate-400"
                      }`}
                    />
                    <span className="font-extrabold text-sm text-slate-900">펀딩 진행 중 스위치</span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        event.isFundingOpen
                          ? "bg-blue-600 text-white"
                          : "bg-slate-300 text-slate-700"
                      }`}
                    >
                      {event.isFundingOpen ? "ON (진행중)" : "OFF (대기/마감)"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    {event.isFundingOpen
                      ? "실시간 모의투자 가능 · 학생들의 출품작 수정은 즉시 차단됩니다."
                      : "투자가 비활성화되어 있습니다. (출품등록 ON이면 학생 수정 가능)"}
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={Boolean(event.isFundingOpen)}
                  onClick={async () => {
                    const nextVal = !event.isFundingOpen;
                    await toggleCourseSwitch("isFundingOpen", nextVal);
                    showToast(
                      nextVal
                        ? "🔵 [펀딩 진행 중] 스위치가 켜졌습니다 (ON) — 학생 작품 수정이 잠깁니다."
                        : "⚪ [펀딩 진행 중] 스위치가 꺼졌습니다 (OFF)."
                    );
                  }}
                  className={`relative inline-flex h-8 w-15 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    event.isFundingOpen ? "bg-blue-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                      event.isFundingOpen ? "translate-x-7" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* 스위치 3: 실시간 순위 공개 (ON/OFF) */}
              <div
                className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between gap-3 ${
                  event.isRankingPublic
                    ? "bg-amber-50/70 border-amber-400"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        event.isRankingPublic ? "bg-amber-500 animate-ping" : "bg-slate-400"
                      }`}
                    />
                    <span className="font-extrabold text-sm text-slate-900">랭킹 공개 스위치</span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        event.isRankingPublic
                          ? "bg-amber-500 text-slate-950"
                          : "bg-slate-300 text-slate-700"
                      }`}
                    >
                      {event.isRankingPublic ? "ON (공개)" : "OFF (비공개)"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    {event.isRankingPublic
                      ? "최종 랭킹 및 전광판 공개 상태입니다."
                      : "참가자들에게 순위가 블라인드 처리됩니다."}
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={Boolean(event.isRankingPublic)}
                  onClick={async () => {
                    const nextVal = !event.isRankingPublic;
                    await toggleCourseSwitch("isRankingPublic", nextVal);
                    showToast(
                      nextVal
                        ? "🟡 [랭킹 공개] 스위치가 켜졌습니다 (ON)."
                        : "⚪ [랭킹 공개] 스위치가 꺼졌습니다 (OFF)."
                    );
                  }}
                  className={`relative inline-flex h-8 w-15 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    event.isRankingPublic ? "bg-amber-500" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                      event.isRankingPublic ? "translate-x-7" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* 1. 4 Bento KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs">
              <p className="text-xs font-semibold text-slate-500">총 펀딩 투자액 (Total CR)</p>
              <p className="text-2xl font-extrabold font-mono text-blue-600 mt-1">
                {totalRaisedAll.toLocaleString()}
              </p>
              <span className="text-[10px] text-slate-400 font-mono">현재 과정 전체 팀 합산</span>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs">
              <p className="text-xs font-semibold text-slate-500">총 투자 참여 건수</p>
              <p className="text-2xl font-extrabold font-mono text-emerald-600 mt-1">
                {totalBackersAll}
              </p>
              <span className="text-[10px] text-slate-400 font-mono">청중 평가단 참여 수</span>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs">
              <p className="text-xs font-semibold text-slate-500">출품 등록 팀 수</p>
              <p className="text-2xl font-extrabold font-mono text-slate-900 mt-1">
                {projects.length}
              </p>
              <span className="text-[10px] text-slate-400 font-mono">경쟁 스타트업</span>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs">
              <p className="text-xs font-semibold text-slate-500">팀당 평균 펀딩액</p>
              <p className="text-2xl font-extrabold font-mono text-indigo-600 mt-1">
                {projects.length > 0 ? Math.round(totalRaisedAll / projects.length).toLocaleString() : 0}
              </p>
              <span className="text-[10px] text-slate-400 font-mono">평균 CR</span>
            </div>
          </div>

          {/* 2. 5-Stage Event Flow Switcher */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                행사 진행 5단계 프리셋 (클릭 시 상단 토글 스위치 자동 연동)
              </h2>
              <span className="text-xs text-slate-500">
                현재 적용:{" "}
                <strong className="text-blue-700 font-mono">
                  {currentStageObj.code}. {currentStageObj.title}
                </strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              {stages.map((stg) => {
                const isActive = event.currentStage === stg.key;

                return (
                  <button
                    key={stg.key}
                    type="button"
                    onClick={() => {
                      setStage(stg.key);
                      showToast(`📢 행사 단계가 [${stg.code}. ${stg.title}] 로 전환되었습니다.`);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isActive
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs font-semibold"
                        : "bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-mono font-bold ${
                          isActive ? "text-blue-200" : "text-slate-400"
                        }`}
                      >
                        STAGE {stg.code}
                      </span>
                      {isActive && <span className="w-2 h-2 rounded-full bg-cyan-300 animate-pulse" />}
                    </div>
                    <div className={`text-xs font-bold mt-1 ${isActive ? "text-white" : "text-slate-800"}`}>
                      {stg.title}
                    </div>
                    <div
                      className={`text-[10px] line-clamp-1 mt-0.5 ${
                        isActive ? "text-blue-100" : "text-slate-400"
                      }`}
                    >
                      {stg.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Real-time Point-to-Score Converter + 10-Point Rank Converter */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-amber-500" />
                  실시간 심사 점수 자동 환산기 (토큰 비례 환산 & 10점 만점 등수별 차감 환산)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  ① 토큰 금액 환산과 ② <strong>10점부터 등수마다 일정 점수씩 차감하는 등수별 환산 점수</strong>를 나란히 설정하고 자동 계산합니다.
                </p>
              </div>

              {/* 나란히 배치된 2개의 환산 입력 칸 */}
              <div className="flex flex-wrap items-center gap-3">
                {/* 기존 칸: 토큰 환산 금액 칸 */}
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-medium">
                  <span className="font-bold text-slate-700">① 토큰 환산:</span>
                  <span className="text-slate-600">매</span>
                  <input
                    type="number"
                    value={creditUnit}
                    min={100}
                    step={100}
                    onChange={(e) => handleUnitCreditChange(Number(e.target.value))}
                    className="w-20 px-2 py-1 bg-white border border-slate-300 rounded font-mono font-bold text-slate-900 text-center"
                  />
                  <span className="text-slate-600 font-mono">CR 당 =</span>
                  <input
                    type="number"
                    value={scorePerUnit}
                    min={0.1}
                    step={1}
                    onChange={(e) => handleScorePerUnitChange(Number(e.target.value))}
                    className="w-14 px-2 py-1 bg-white border border-slate-300 rounded font-mono font-bold text-blue-600 text-center"
                  />
                  <span className="text-slate-600">점</span>
                </div>

                {/* 신규 칸: 그 옆에 10점부터 몇 개 팀을 환산점수로 할지 직접 입력 & 자동 계산 */}
                <div className="flex flex-wrap items-center gap-2 bg-amber-50/90 border-2 border-amber-300 px-3 py-2 rounded-xl text-xs font-medium">
                  <Award className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="font-extrabold text-amber-900">② 등수별 10점 환산:</span>
                  <span className="text-amber-800">10점부터</span>
                  <input
                    type="number"
                    value={rankTeamCount}
                    min={1}
                    max={100}
                    onChange={(e) => handleRankTeamCountChange(Number(e.target.value))}
                    className="w-16 px-2 py-1 bg-white border-2 border-amber-400 rounded font-mono font-extrabold text-amber-900 text-center"
                  />
                  <span className="text-amber-800 font-semibold">개 팀 환산</span>
                  <button
                    type="button"
                    onClick={() => handleRankTeamCountChange(Math.max(1, projects.length))}
                    className="px-2 py-1 rounded bg-amber-200/80 hover:bg-amber-300 text-amber-900 text-[11px] font-bold transition cursor-pointer"
                    title="현재 출품된 팀 수로 자동 설정"
                  >
                    현재 {projects.length}팀 맞춤
                  </button>
                  <span className="text-[11px] font-mono font-bold text-amber-700 bg-white/80 px-2 py-0.5 rounded border border-amber-200">
                    등수당 -{rankDeductionStep.toFixed(2)}점 차감 (1등 10점
                    {effectiveRankTeams >= 2 ? `, 2등 ${Number((10 - rankDeductionStep).toFixed(2))}점` : ""}
                    {effectiveRankTeams >= 3 ? `, 3등 ${Number((10 - rankDeductionStep * 2).toFixed(2))}점` : ""})
                  </span>
                </div>
              </div>
            </div>

            {/* Dynamic Leaderboard Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 text-center">순위</th>
                      <th className="py-3 px-4">팀명 (출품작)</th>
                      <th className="py-3 px-4">분야 / 형식</th>
                      <th className="py-3 px-4 text-right">누적 모의투자액</th>
                      <th className="py-3 px-4 text-right">서포터</th>
                      <th className="py-3 px-4 text-right font-mono font-extrabold text-amber-700 bg-amber-50/60">
                        등수 환산 점수 (10점 만점)
                      </th>
                      <th className="py-3 px-4 text-right font-mono font-bold text-blue-600">
                        토큰 환산 점수
                      </th>
                      <th className="py-3 px-4 text-center">노출 여부</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {leaderboardData.map((team, idx) => {
                      const rank = idx + 1;
                      let rankBadge = (
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-mono font-bold inline-flex items-center justify-center text-xs">
                          {rank}
                        </span>
                      );
                      if (rank === 1) {
                        rankBadge = (
                          <span className="w-7 h-6 rounded-full bg-amber-400 text-slate-950 font-mono font-extrabold inline-flex items-center justify-center text-xs shadow-2xs">
                            🥇 1
                          </span>
                        );
                      } else if (rank === 2) {
                        rankBadge = (
                          <span className="w-7 h-6 rounded-full bg-slate-300 text-slate-900 font-mono font-bold inline-flex items-center justify-center text-xs">
                            🥈 2
                          </span>
                        );
                      } else if (rank === 3) {
                        rankBadge = (
                          <span className="w-7 h-6 rounded-full bg-amber-700/80 text-white font-mono font-bold inline-flex items-center justify-center text-xs">
                            🥉 3
                          </span>
                        );
                      }

                      return (
                        <tr key={team.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 text-center">{rankBadge}</td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{team.title}</div>
                            <div className="text-[11px] text-slate-500 font-medium">
                              Team {String(team.teamNumber).padStart(2, "0")} · {team.teamName}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium mr-1">
                              {team.category || "AI/SaaS"}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold">
                              {team.landingFormat}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            {team.totalCredits.toLocaleString()} CR
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-600">
                            {team.investorCount}명
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-extrabold text-amber-700 text-sm bg-amber-50/40">
                            {team.rankScore10}{" "}
                            <span className="text-xs font-sans text-amber-600/80">/ 10점</span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-extrabold text-blue-700 text-sm">
                            {team.convertedPoints.toFixed(1)}{" "}
                            <span className="text-xs font-sans text-slate-400">점</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  !team.isHidden &&
                                  !confirm(`[${team.title}] 프로젝트를 갤러리에서 숨김 처리하시겠습니까?`)
                                ) {
                                  return;
                                }
                                toggleProjectVisibility(team.id);
                              }}
                              className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold cursor-pointer transition ${
                                team.isHidden
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              }`}
                            >
                              {team.isHidden ? "숨김 상태" : "정상 노출"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {leaderboardData.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400">
                          현재 과정에 출품된 프로젝트가 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: 아이디/비번 사전 배정 (팀별 자동 생성 / 개별 인원 생성 / 엑셀 다운로드) */}
      {/* ===================================================================== */}
      {activeAdminSubTab === "roster" && (
        <div className="space-y-6">
          {/* 3가지 아이디/비번 생성기 카드 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* 생성기 1: 팀 개수 & 팀마다 인원수 입력 자동 생성 */}
            <div className="bg-white rounded-2xl border-2 border-blue-200 p-5 shadow-2xs flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-extrabold">
                    방식 1 · 팀 번호 & 팀별 인원수 자동 생성
                  </span>
                </div>
                <h3 className="font-extrabold text-slate-900 text-sm">
                  몇 개 팀인지 누르고 팀별 인원수로 아이디/비번 일괄 생성
                </h3>
                <p className="text-xs text-slate-500">
                  팀 개수를 선택하면 팀별로 몇 명인지 입력칸이 나타나며, 팀별·인원별 아이디/비밀번호가 자동 생성됩니다.
                </p>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">총 팀 수 (개)</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={genTeamCount}
                      onChange={(e) => handleGenTeamCountChange(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono font-bold text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">아이디 접두어</label>
                    <input
                      type="text"
                      value={teamIdPrefix}
                      onChange={(e) => setTeamIdPrefix(e.target.value.trim() || "team")}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono font-bold text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">공통 비밀번호</label>
                    <input
                      type="text"
                      disabled={useRandomPwForTeam}
                      value={teamDefaultPw}
                      onChange={(e) => setTeamDefaultPw(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono font-bold text-xs text-slate-900 disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useRandomPwForTeam}
                    onChange={(e) => setUseRandomPwForTeam(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600"
                  />
                  <span>인원마다 6자리 랜덤 비밀번호로 각각 다르게 생성</span>
                </label>

                {/* 팀별 인원수 설정 그리드 */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-48 overflow-y-auto space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-600">팀별 인원수 입력 (명)</span>
                    <button
                      type="button"
                      onClick={() => {
                        const first = teamMemberCounts[0] || 4;
                        setTeamMemberCounts(Array(genTeamCount).fill(first));
                      }}
                      className="text-[11px] text-blue-600 font-semibold hover:underline cursor-pointer"
                    >
                      1팀 인원수로 전체 통일
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {teamMemberCounts.map((cnt, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-2 py-1"
                      >
                        <span className="text-[11px] font-bold text-slate-700">{idx + 1}팀</span>
                        <div className="flex items-center gap-0.5">
                          <input
                            type="number"
                            min={1}
                            max={30}
                            value={cnt}
                            onChange={(e) => {
                              const next = [...teamMemberCounts];
                              next[idx] = Math.max(1, Number(e.target.value));
                              setTeamMemberCounts(next);
                            }}
                            className="w-9 text-right font-mono font-bold text-xs text-blue-600 focus:outline-none"
                          />
                          <span className="text-[10px] text-slate-400">명</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 bg-blue-50/60 px-3 py-2 rounded-lg border border-blue-100">
                  생성 예시: <code className="font-mono font-bold text-blue-700">{teamIdPrefix}1_1</code>,{" "}
                  <code className="font-mono font-bold text-blue-700">{teamIdPrefix}1_2</code> ... 총{" "}
                  <strong className="text-slate-900">{teamMemberCounts.reduce((a, b) => a + b, 0)}명</strong> 생성
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerateTeamAccounts}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                {genTeamCount}개 팀 ({teamMemberCounts.reduce((a, b) => a + b, 0)}명) 아이디/비번 자동 생성
              </button>
            </div>

            {/* 생성기 2: 불특정 다수 개별 인원 아이디/비번 일괄 생성 */}
            <div className="bg-white rounded-2xl border-2 border-emerald-200 p-5 shadow-2xs flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-extrabold">
                    방식 2 · 불특정 다수 개별 아이디 생성
                  </span>
                </div>
                <h3 className="font-extrabold text-slate-900 text-sm">
                  팀과 별개로 개별 참가자 / 심사위원 인원수 기준 생성
                </h3>
                <p className="text-xs text-slate-500">
                  소속 팀 없이 투표에 참여하는 불특정 다수 일반 참가자나 심사위원 아이디를 몇 명인지 입력하여 한 번에 만듭니다.
                </p>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">계정 구분</label>
                    <select
                      value={indivRole}
                      onChange={(e) => {
                        const r = e.target.value as UserRole;
                        setIndivRole(r);
                        setIndivPrefix(r === "JUDGE" ? "judge" : "user");
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-semibold text-xs text-slate-900"
                    >
                      <option value="STUDENT">개별 일반 참가자</option>
                      <option value="JUDGE">심사위원 (JUDGE)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">생성할 인원수 (명)</label>
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={indivCount}
                      onChange={(e) => setIndivCount(Math.max(1, Number(e.target.value)))}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono font-bold text-xs text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">아이디 접두어</label>
                    <input
                      type="text"
                      value={indivPrefix}
                      onChange={(e) => setIndivPrefix(e.target.value.trim() || "user")}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono font-bold text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">공통 비밀번호</label>
                    <input
                      type="text"
                      disabled={useRandomPwForIndiv}
                      value={indivDefaultPw}
                      onChange={(e) => setIndivDefaultPw(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono font-bold text-xs text-slate-900 disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useRandomPwForIndiv}
                    onChange={(e) => setUseRandomPwForIndiv(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600"
                  />
                  <span>인원마다 6자리 랜덤 비밀번호로 각각 다르게 생성</span>
                </label>

                <div className="text-[11px] text-slate-500 bg-emerald-50/60 px-3 py-2 rounded-lg border border-emerald-100">
                  생성 예시: <code className="font-mono font-bold text-emerald-700">{indivPrefix}1</code> ~{" "}
                  <code className="font-mono font-bold text-emerald-700">
                    {indivPrefix}
                    {indivCount}
                  </code>{" "}
                  (총 <strong className="text-slate-900">{indivCount}명</strong> 일괄 발급)
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerateIndividualAccounts}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                개별 아이디 {indivCount}명 일괄 생성
              </button>
            </div>

            {/* 생성기 3: 관리자가 임의로 아이디/비밀번호 직접 지정 생성 */}
            <div className="bg-white rounded-2xl border-2 border-amber-200 p-5 shadow-2xs flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-extrabold">
                    방식 3 · 임의 아이디/비밀번호 직접 만들기
                  </span>
                </div>
                <h3 className="font-extrabold text-slate-900 text-sm">
                  관리자가 원하는 아이디 · 비밀번호 직접 지정 발급
                </h3>
                <p className="text-xs text-slate-500">
                  특정 팀장이나 심사위원, 추가 인원에게 부여할 아이디와 비밀번호를 직접 입력하여 즉시 생성합니다.
                </p>

                <form id="custom-user-form" onSubmit={handleCreateCustomAccount} className="space-y-2.5 pt-1">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">아이디 *</label>
                      <input
                        type="text"
                        required
                        placeholder="예: team1_leader"
                        value={customId}
                        onChange={(e) => setCustomId(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">비밀번호 *</label>
                      <input
                        type="text"
                        required
                        placeholder="예: 123456"
                        value={customPw}
                        onChange={(e) => setCustomPw(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono text-xs text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">표시 이름</label>
                      <input
                        type="text"
                        placeholder="예: 홍길동"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">역할</label>
                      <select
                        value={customRole}
                        onChange={(e) => setCustomRole(e.target.value as UserRole)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-900"
                      >
                        <option value="STUDENT">학생 / 참가자</option>
                        <option value="JUDGE">심사위원</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      소속 팀 번호 (선택 입력 시 해당 팀 소속으로 묶임)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      placeholder="미입력 시 무소속 개별 참가자"
                      value={customTeamNo}
                      onChange={(e) => setCustomTeamNo(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono text-xs text-slate-900"
                    />
                  </div>
                </form>
              </div>

              <button
                type="submit"
                form="custom-user-form"
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                임의 아이디/비번 즉시 추가
              </button>
            </div>
          </div>

          {/* 참가자 명단 및 비밀번호 테이블 + 엑셀 다운로드 */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  현재 과정({event.name}) 등록 계정 및 비밀번호 목록 ({users.length}명)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  생성된 모든 아이디와 비밀번호를 엑셀 파일(.xlsx)로 다운로드하여 참가자들에게 안내할 수 있습니다.
                </p>
              </div>

              <button
                type="button"
                onClick={handleExportAccountsExcel}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer shrink-0"
              >
                <FileSpreadsheet className="w-4 h-4" />
                아이디/비밀번호 전체 명단 엑셀(.xlsx) 다운로드
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">역할</th>
                      <th className="py-3 px-4">소속팀</th>
                      <th className="py-3 px-4">이름</th>
                      <th className="py-3 px-4">로그인 아이디</th>
                      <th className="py-3 px-4">비밀번호</th>
                      <th className="py-3 px-4 text-center">관리 조치</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              u.role === "ADMIN"
                                ? "bg-amber-100 text-amber-800"
                                : u.role === "JUDGE"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {u.role === "ADMIN" ? "관리자" : u.role === "JUDGE" ? "심사위원" : "학생/참가자"}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-700">
                          {u.teamName || u.department || "-"}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">{u.name}</td>
                        <td className="py-3 px-4 font-mono font-bold text-blue-700">{u.email}</td>
                        <td className="py-3 px-4 font-mono font-bold text-amber-700">
                          {u.password || "123456"}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleResetUserPassword(u)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition cursor-pointer flex items-center gap-1"
                            >
                              <KeyRound className="w-3 h-3 text-slate-500" />
                              <span>비번 초기화</span>
                            </button>
                            {u.role !== "ADMIN" && (
                              <button
                                type="button"
                                onClick={async () => {
                                  if (confirm(`[${u.name} (${u.email})] 계정을 삭제하시겠습니까?`)) {
                                    const res = await deleteUserAccount(u.id);
                                    showToast(`🗑️ ${res.message}`);
                                  }
                                }}
                                className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                                title="계정 삭제"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: 과정(Course) 단위 운영 & 과정별 초대코드 관리                     */}
      {/* ===================================================================== */}
      {activeAdminSubTab === "courses" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 좌측: 신규 과정 개설 + 현재 과정 수정 */}
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border-2 border-blue-200 p-5 shadow-2xs space-y-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-blue-600" />
                  새 교육 과정(Course) 개설
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  과정마다 고유한 <strong>초대코드 번호</strong>를 설정하면 참가자들이 해당 초대코드로 입장합니다.
                </p>
              </div>

              <form onSubmit={handleCreateCourseSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">과정명 *</label>
                  <input
                    type="text"
                    required
                    placeholder="예: 2026 AI 창업 부트캠프 2기"
                    value={newCourseName}
                    onChange={(e) => setNewCourseName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">기관/학교명</label>
                    <input
                      type="text"
                      value={newCourseInstitution}
                      onChange={(e) => setNewCourseInstitution(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">회차/세션</label>
                    <input
                      type="text"
                      value={newCourseSession}
                      onChange={(e) => setNewCourseSession(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-extrabold text-blue-700 mb-1">
                      과정 초대코드 번호 *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="예: 1002"
                      value={newCourseInviteCode}
                      onChange={(e) => setNewCourseInviteCode(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border-2 border-blue-400 bg-blue-50/40 font-mono font-extrabold text-xs text-blue-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">기본 지급 크레딧</label>
                    <input
                      type="number"
                      step={1000}
                      value={newCourseBaseCredit}
                      onChange={(e) => setNewCourseBaseCredit(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs text-slate-900"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer shadow-xs"
                >
                  새 과정 개설 및 전환
                </button>
              </form>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">현재 선택된 과정 명칭 및 초대코드 수정</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  여기서 수정한 <strong>과정명</strong>이 인터넷 브라우저 상단 탭 제목과 홈페이지 배너 제목으로 즉시 반영됩니다.
                </p>
              </div>
              <form onSubmit={handleUpdateCurrentCourse} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    과정명 (인터넷 탭 & 상단 배너 제목)
                  </label>
                  <input
                    type="text"
                    value={editCourseName}
                    onChange={(e) => setEditCourseName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">기관 / 학교명</label>
                  <input
                    type="text"
                    value={editCourseInstitution}
                    onChange={(e) => setEditCourseInstitution(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">세션 설명</label>
                  <input
                    type="text"
                    value={editCourseSession}
                    onChange={(e) => setEditCourseSession(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-amber-700 mb-1">과정 초대코드 번호</label>
                  <input
                    type="text"
                    value={editCourseInviteCode}
                    onChange={(e) => setEditCourseInviteCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border-2 border-amber-300 bg-amber-50/40 font-mono font-extrabold text-xs text-amber-900"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer"
                >
                  현재 과정 정보 저장
                </button>
              </form>
            </div>
          </div>

          {/* 우측 2칸: 개설된 전체 과정 카드 목록 */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                운영 중인 전체 과정 목록 ({events.length}개)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                각 과정은 고유한 초대코드 번호로 구분되며, 출품작·참가자·투표 내역·토글 스위치가 과정별로 독립 운영됩니다.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {events.map((ev) => {
                const isSelected = ev.id === event.id;
                return (
                  <div
                    key={ev.id}
                    className={`p-5 rounded-2xl border-2 transition-all flex flex-col justify-between gap-4 ${
                      isSelected
                        ? "border-blue-600 bg-blue-50/30 shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                            isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {isSelected ? "현재 선택된 과정" : "대기 과정"}
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(ev.inviteCode || "2026");
                            setCopiedCodeId(ev.id);
                            setTimeout(() => setCopiedCodeId(null), 1500);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 border border-amber-300 text-amber-900 font-mono text-xs font-extrabold hover:bg-amber-200 cursor-pointer"
                          title="초대코드 복사"
                        >
                          초대코드: {ev.inviteCode || "2026"}
                          {copiedCodeId === ev.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-700" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      <h4 className="font-extrabold text-slate-900 text-base">{ev.name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {ev.institution} · {ev.session}
                      </p>

                      <div className="flex flex-wrap gap-1.5 mt-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            ev.isRegistrationOpen
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          출품등록 {ev.isRegistrationOpen ? "ON" : "OFF"}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            ev.isFundingOpen ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          펀딩진행 {ev.isFundingOpen ? "ON" : "OFF"}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            ev.isRankingPublic ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          랭킹 {ev.isRankingPublic ? "공개" : "비공개"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-200/80">
                      {!isSelected ? (
                        <button
                          type="button"
                          onClick={() => {
                            selectCourse(ev.id);
                            showToast(`📂 [${ev.name}] 과정으로 전환되었습니다.`);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer"
                        >
                          이 과정으로 전환
                        </button>
                      ) : (
                        <span className="text-xs font-extrabold text-blue-700">● 현재 관제 중인 과정</span>
                      )}

                      {events.length > 1 && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (confirm(`[${ev.name}] 과정을 삭제하시겠습니까?`)) {
                              const res = await deleteCourse(ev.id);
                              showToast(res.message);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                          title="과정 삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModalData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">비밀번호 초기화 완료</h3>
              <button
                type="button"
                onClick={() => setResetModalData(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600">
              <strong>{resetModalData.userName}</strong> ({resetModalData.userEmail}) 님의 임시 비밀번호가 생성되었습니다:
            </p>
            <div className="p-3 bg-slate-100 rounded-xl flex items-center justify-between font-mono font-bold text-sm text-blue-600">
              <span>{resetModalData.tempPassword}</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(resetModalData.tempPassword);
                  setIsCopied(true);
                  setTimeout(() => setIsCopied(false), 2000);
                }}
                className="p-1 hover:text-slate-900 transition"
              >
                {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">참가자에게 복사하여 전달해 주세요.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
