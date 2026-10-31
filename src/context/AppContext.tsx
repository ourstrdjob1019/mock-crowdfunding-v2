"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from "react";
import { Event, Project, User, Investment, EventStage, RosterItem, UserRole, Comment } from "@/types";
import { INITIAL_EVENT, INITIAL_ROSTER, INITIAL_USERS } from "@/lib/mockData";
import {
  fetchAllFromSupabase,
  dbInsertUser,
  dbBulkInsertUsers,
  dbDeleteUser,
  dbResetPassword,
  dbInsertProject,
  dbUpdateProject,
  dbDeleteProject,
  dbSaveInvestment,
  dbDeleteInvestment,
  dbResetAllInvestments,
  dbUpdateEvent,
  dbDeleteEvent,
  mapDbUserToModel,
} from "@/lib/supabaseService";
import { supabase } from "@/lib/supabase";
import confetti from "canvas-confetti";

export interface RegisterFormData {
  email: string;
  password: string;
  name: string;
  inviteCode?: string;
  role?: UserRole;
  teamId?: string;
  teamName?: string;
  institution?: string;
  department?: string;
  studentNumber?: string;
  privacyAgreed: boolean;
}

interface AppContextType {
  event: Event;
  events: Event[];
  activeEventId: string;
  selectCourse: (eventId: string) => void;
  createCourse: (courseData: Omit<Event, "id">) => Promise<{ success: boolean; course?: Event; message: string }>;
  updateCourse: (updates: Partial<Event>) => Promise<{ success: boolean; message: string }>;
  deleteCourse: (eventId: string) => Promise<{ success: boolean; message: string }>;
  toggleCourseSwitch: (
    field: "isRegistrationOpen" | "isFundingOpen" | "isRankingPublic",
    value?: boolean
  ) => Promise<void>;
  findCourseByInviteCode: (code: string) => Event | undefined;
  canStudentEditProject: boolean;
  currentUser: User | null;
  isLoggedIn: boolean;
  users: User[];
  allUsers: User[];
  roster: RosterItem[];
  projects: Project[];
  investments: Investment[];
  remainingCredits: number;
  usedCredits: number;
  isLoading: boolean;
  isMutating: boolean;
  mutationMessage: string | null;
  login: (emailOrId: string, password: string, inviteCode?: string) => Promise<{ success: boolean; message: string }>;
  demoLogin: (userId: string) => void;
  register: (data: RegisterFormData) => Promise<{ success: boolean; message: string }>;
  bulkCreateAccounts: (newUsers: User[]) => Promise<{ success: boolean; count: number; message: string }>;
  deleteUserAccount: (userId: string) => Promise<{ success: boolean; message: string }>;
  resetPassword: (userId: string) => Promise<{ success: boolean; tempPassword?: string; message: string }>;
  logout: () => void;
  setCurrentUser: (user: User) => void;
  setStage: (stage: EventStage) => Promise<void>;
  toggleRankingPublic: () => Promise<void>;
  toggleProjectVisibility: (projectId: string) => Promise<void>;
  invest: (projectId: string, amount: number) => Promise<{ success: boolean; message: string }>;
  cancelInvestment: (investmentId: string) => Promise<{ success: boolean; message: string }>;
  addComment: (projectId: string, message: string) => Promise<{ success: boolean; message: string }>;
  resetCreditsToDefault: () => void;
  getUserInvestmentForProject: (projectId: string) => Investment | undefined;
  getUserTotalInvestments: () => Investment[];
  createProject: (
    data: Omit<Project, "id" | "totalCredits" | "investorCount" | "lastModifierName" | "lastModifiedAt" | "isHidden">
  ) => Promise<{ success: boolean; project?: Project; message: string }>;
  updateProject: (project: Partial<Project> & { id: string }) => Promise<{ success: boolean; message: string }>;
  deleteProject: (projectId: string) => Promise<{ success: boolean; message: string }>;
  resetAllInvestments: () => Promise<{ success: boolean; message: string }>;
  resetAllData: () => void;
  refreshFromSupabase: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [events, setEventsState] = useState<Event[]>([INITIAL_EVENT]);
  const [activeEventId, setActiveEventId] = useState<string>(INITIAL_EVENT.id);
  const [allUsers, setUsers] = useState<User[]>([]);
  const [roster] = useState<RosterItem[]>(INITIAL_ROSTER);
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [allProjects, setProjects] = useState<Project[]>([]);
  const [allInvestments, setInvestments] = useState<Investment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isMutating, setIsMutating] = useState<boolean>(false);
  const [mutationMessage, setMutationMessage] = useState<string | null>(null);
  const mutationLockRef = useRef<boolean>(false);

  // 현재 선택/접속된 과정(Event)
  const event: Event = useMemo(() => {
    return events.find((e) => e.id === activeEventId) || events[0] || INITIAL_EVENT;
  }, [events, activeEventId]);

  // 현재 과정(activeEventId)에 속한 프로젝트, 투자, 참가자 필터링
  const projects = useMemo(() => {
    return allProjects.filter((p) => (p.eventId || "evt-2026-v2-01") === event.id);
  }, [allProjects, event.id]);

  const investments = useMemo(() => {
    return allInvestments.filter((inv) => (inv.eventId || "evt-2026-v2-01") === event.id);
  }, [allInvestments, event.id]);

  const users = useMemo(() => {
    return allUsers.filter(
      (u) => u.role === "ADMIN" || (u.eventId || "evt-2026-v2-01") === event.id
    );
  }, [allUsers, event.id]);

  // 학생이 출품작을 수정/삭제할 수 있는지 여부:
  // "출품등록하는 시간에는 수정은 자유롭게 단, 펀딩 진행 중에는 수정을 못하게"
  const canStudentEditProject = Boolean(event.isRegistrationOpen && !event.isFundingOpen);

  // 동기 뮤텍스 잠금 래퍼
  const runWithMutationLock = async <T,>(
    message: string,
    task: () => Promise<T>,
    blockedReturn: T
  ): Promise<T> => {
    if (mutationLockRef.current) {
      return blockedReturn;
    }
    mutationLockRef.current = true;
    setIsMutating(true);
    setMutationMessage(message);
    try {
      return await task();
    } finally {
      mutationLockRef.current = false;
      setIsMutating(false);
      setMutationMessage(null);
    }
  };

  const STORAGE_VERSION = "v2_supabase_single_source_of_truth";

  const saveToStorage = (_newEvent: Event, _newProjects: Project[], _newInvestments: Investment[], _newUsers: User[]) => {
    try {
      localStorage.setItem("mc_v2_data_version", STORAGE_VERSION);
      localStorage.removeItem("mc_v2_projects");
      localStorage.removeItem("mc_v2_investments");
      localStorage.removeItem("mc_v2_users");
      localStorage.removeItem("mc_v2_event");
    } catch (e) {
      console.warn("Local storage cleanup warning:", e);
    }
  };

  // Supabase 실시간 데이터 로딩 함수 (오직 Supabase V2 DB 기준)
  const loadData = async (silent = false) => {
    if (!silent) setIsLoading(true);

    try {
      localStorage.removeItem("mc_v2_projects");
      localStorage.removeItem("mc_v2_investments");
      localStorage.removeItem("mc_v2_users");
      localStorage.removeItem("mc_v2_event");
      localStorage.setItem("mc_v2_data_version", STORAGE_VERSION);
    } catch {}

    try {
      const supaData = await fetchAllFromSupabase();
      if (!supaData.error) {
        if (supaData.events && supaData.events.length > 0) {
          setEventsState(supaData.events);
          const savedEventId = localStorage.getItem("mc_v2_active_event_id");
          if (savedEventId && supaData.events.some((e) => e.id === savedEventId)) {
            setActiveEventId(savedEventId);
          } else {
            setActiveEventId((prev) =>
              supaData.events.some((e) => e.id === prev) ? prev : supaData.events[0].id
            );
          }
        }
        if (supaData.projectsLoaded) {
          setProjects(supaData.projects);
        }
        if (supaData.investmentsLoaded) {
          setInvestments(supaData.investments);
        }
        if (supaData.usersLoaded) {
          const finalUsers = supaData.users.length > 0 ? supaData.users : INITIAL_USERS;
          setUsers(finalUsers);

          // 로그인 유지 유저 동기화
          const currentSavedId = localStorage.getItem("mc_v2_current_user_id");
          const currentIsLoggedOut = localStorage.getItem("mc_v2_logged_out") === "true";
          if (!currentIsLoggedOut && currentSavedId && finalUsers.length > 0) {
            const found = finalUsers.find((u: User) => u.id === currentSavedId);
            if (found) {
              setCurrentUserState(found);
              setIsLoggedIn(true);
              if (found.role !== "ADMIN" && found.eventId) {
                setActiveEventId(found.eventId);
              }
            } else {
              setCurrentUserState(null);
              setIsLoggedIn(false);
              localStorage.removeItem("mc_v2_current_user_id");
            }
          } else if (currentIsLoggedOut || !currentSavedId) {
            setCurrentUserState(null);
            setIsLoggedIn(false);
          }
        }
      }
    } catch (err) {
      console.warn("Supabase fetch failed:", err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(false);

    // 1. 탭 활성화(포커스) 시 Supabase 최신 데이터 즉시 동기화
    const handleFocus = () => {
      loadData(true);
    };
    window.addEventListener("focus", handleFocus);

    // 2. 10초 주기 백그라운드 무중단 폴링 (모바일 네트워크/방화벽 환경에서도 100% 실시간 동기화 보장)
    const pollInterval = setInterval(() => {
      loadData(true);
    }, 10000);

    // 3. Supabase Realtime WebSocket 구독 (투자, 프로젝트, 행사 단계 변경 시 즉시 반영)
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const triggerRealtimeSync = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadData(true);
      }, 400);
    };

    const channel = supabase
      ? supabase
          .channel("realtime-crowdfund-v2-sync")
          .on("postgres_changes", { event: "*", schema: "public", table: "v2_investments" }, triggerRealtimeSync)
          .on("postgres_changes", { event: "*", schema: "public", table: "v2_projects" }, triggerRealtimeSync)
          .on("postgres_changes", { event: "*", schema: "public", table: "v2_events" }, triggerRealtimeSync)
          .on("postgres_changes", { event: "*", schema: "public", table: "v2_users" }, triggerRealtimeSync)
          .subscribe()
      : null;

    return () => {
      window.removeEventListener("focus", handleFocus);
      clearInterval(pollInterval);
      if (debounceTimer) clearTimeout(debounceTimer);
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const refreshFromSupabase = async () => {
    await loadData(false);
  };

  // 과정 초대코드로 과정(Event) 찾기
  const findCourseByInviteCode = (code: string): Event | undefined => {
    const cleaned = code.trim().toLowerCase();
    if (!cleaned) return undefined;
    return events.find((e) => (e.inviteCode || "2026").trim().toLowerCase() === cleaned);
  };

  // 과정 전환
  const selectCourse = (eventId: string) => {
    if (events.some((e) => e.id === eventId)) {
      setActiveEventId(eventId);
      try {
        localStorage.setItem("mc_v2_active_event_id", eventId);
      } catch {}
    }
  };

  // 관리자 기능: 새 과정 개설
  const createCourse = async (
    courseData: Omit<Event, "id">
  ): Promise<{ success: boolean; course?: Event; message: string }> => {
    const trimmedCode = (courseData.inviteCode || "").trim();
    if (!trimmedCode) {
      return { success: false, message: "과정 초대코드 번호를 입력해 주세요." };
    }
    if (findCourseByInviteCode(trimmedCode)) {
      return { success: false, message: `이미 사용 중인 초대코드([${trimmedCode}])입니다. 다른 번호를 지정해 주세요.` };
    }

    const newCourse: Event = {
      ...courseData,
      id: `evt-v2-${Date.now().toString().slice(-6)}`,
      inviteCode: trimmedCode,
      isRegistrationOpen: courseData.isRegistrationOpen ?? true,
      isFundingOpen: courseData.isFundingOpen ?? false,
      isRankingPublic: courseData.isRankingPublic ?? false,
      rankScoreTeamCount: courseData.rankScoreTeamCount || 10,
      creditUnitForScore: courseData.creditUnitForScore || 1000,
      scorePerCreditUnit: courseData.scorePerCreditUnit || 10,
    };

    const res = await dbUpdateEvent(newCourse);
    if (!res.success) {
      return { success: false, message: `과정 생성 실패: ${res.error || "DB 오류"}` };
    }

    setEventsState((prev) => [...prev, newCourse]);
    setActiveEventId(newCourse.id);
    try {
      localStorage.setItem("mc_v2_active_event_id", newCourse.id);
    } catch {}

    return {
      success: true,
      course: newCourse,
      message: `[${newCourse.name}] 과정(초대코드: ${newCourse.inviteCode})이 개설되었습니다!`,
    };
  };

  // 관리자 기능: 현재 과정 정보 수정
  const updateCourse = async (updates: Partial<Event>): Promise<{ success: boolean; message: string }> => {
    if (updates.inviteCode !== undefined) {
      const trimmedCode = updates.inviteCode.trim();
      if (!trimmedCode) {
        return { success: false, message: "과정 초대코드 번호를 입력해 주세요." };
      }
      const dup = events.find(
        (e) => e.id !== event.id && (e.inviteCode || "2026").trim().toLowerCase() === trimmedCode.toLowerCase()
      );
      if (dup) {
        return { success: false, message: `다른 과정(${dup.name})에서 이미 사용 중인 초대코드입니다.` };
      }
    }

    const updatedEvent: Event = {
      ...event,
      ...updates,
    };

    const res = await dbUpdateEvent(updatedEvent);
    if (!res.success) {
      return { success: false, message: `과정 정보 저장 실패: ${res.error || "DB 오류"}` };
    }

    setEventsState((prev) => prev.map((e) => (e.id === updatedEvent.id ? updatedEvent : e)));
    return { success: true, message: "과정 설정이 저장되었습니다." };
  };

  // 관리자 기능: 과정 삭제
  const deleteCourse = async (eventId: string): Promise<{ success: boolean; message: string }> => {
    if (events.length <= 1) {
      return { success: false, message: "최소 1개의 기본 과정은 유지되어야 합니다." };
    }
    const target = events.find((e) => e.id === eventId);
    if (!target) {
      return { success: false, message: "삭제할 과정을 찾을 수 없습니다." };
    }

    const res = await dbDeleteEvent(eventId);
    if (!res.success) {
      return { success: false, message: `과정 삭제 실패: ${res.error || "DB 오류"}` };
    }

    const remaining = events.filter((e) => e.id !== eventId);
    setEventsState(remaining);
    setProjects((prev) => prev.filter((p) => p.eventId !== eventId));
    setInvestments((prev) => prev.filter((inv) => inv.eventId !== eventId));
    setUsers((prev) => prev.filter((u) => u.role === "ADMIN" || u.eventId !== eventId));

    if (activeEventId === eventId && remaining.length > 0) {
      setActiveEventId(remaining[0].id);
      try {
        localStorage.setItem("mc_v2_active_event_id", remaining[0].id);
      } catch {}
    }

    return { success: true, message: `[${target.name}] 과정이 삭제되었습니다.` };
  };

  // 관리자 기능: 출품등록 / 펀딩진행 / 랭킹공개 토글 스위치 제어
  const toggleCourseSwitch = async (
    field: "isRegistrationOpen" | "isFundingOpen" | "isRankingPublic",
    value?: boolean
  ) => {
    const nextVal = value !== undefined ? value : !event[field];
    const updated: Event = {
      ...event,
      [field]: nextVal,
    };

    // 토글 스위치 상태에 맞춰 currentStage도 동기화
    if (updated.isFundingOpen) {
      updated.currentStage = "FUNDING_OPEN";
    } else if (updated.isRegistrationOpen) {
      updated.currentStage = "REGISTRATION";
    } else if (updated.isRankingPublic) {
      updated.currentStage = "RANKING_PUBLISHED";
    } else {
      updated.currentStage = "FUNDING_CLOSED";
    }

    setEventsState((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    await dbUpdateEvent(updated);

    if (field === "isRankingPublic" && nextVal) {
      confetti({
        particleCount: 90,
        spread: 90,
        colors: ["#0052FF", "#4D7CFF", "#0F172A", "#FFFFFF"],
      });
    }
  };

  // 로그인 로직 (아이디 또는 이메일 + 선택적 과정 초대코드 지원)
  const login = async (
    emailOrId: string,
    password: string,
    inviteCode?: string
  ): Promise<{ success: boolean; message: string }> => {
    const trimmedInput = emailOrId.trim().toLowerCase();

    if (!trimmedInput) {
      return { success: false, message: "아이디(또는 이메일)를 입력해 주세요." };
    }
    if (!password) {
      return { success: false, message: "비밀번호를 입력해 주세요." };
    }

    // 초대코드가 함께 입력된 경우 유효한 과정인지 먼저 확인
    let targetCourse: Event | undefined;
    if (inviteCode && inviteCode.trim()) {
      targetCourse = findCourseByInviteCode(inviteCode.trim());
      if (!targetCourse) {
        return {
          success: false,
          message: `입력하신 초대코드([${inviteCode.trim()}])와 일치하는 과정이 없습니다. 초대코드 번호를 다시 확인해 주세요.`,
        };
      }
    }

    let targetUser: User | undefined;

    // 1. Supabase V2 DB 테이블에서 실시간 직접 검색 우선 수행
    if (supabase) {
      try {
        const { data: dbUsers } = await supabase
          .from("v2_users")
          .select("*")
          .ilike("email", trimmedInput);

        if (dbUsers && dbUsers.length > 0) {
          const mapped = dbUsers.map(mapDbUserToModel);
          if (targetCourse) {
            targetUser = mapped.find((u) => u.role === "ADMIN" || u.eventId === targetCourse!.id) || mapped[0];
          } else {
            targetUser = mapped[0];
          }
          setUsers((prev) => [...prev.filter((u) => u.id !== targetUser!.id), targetUser!]);
        }
      } catch (err) {
        console.warn("Supabase user search failed:", err);
      }
    }

    // 2. DB에서 못 찾았을 경우 현재 로드된 allUsers 목록에서 찾기
    if (!targetUser) {
      targetUser = allUsers.find((u) => u.email.toLowerCase() === trimmedInput);
    }

    if (!targetUser) {
      return {
        success: false,
        message: "등록되지 않은 계정입니다. 아이디와 비밀번호를 다시 확인해 주세요.",
      };
    }

    // 일반 참가자가 초대코드를 입력했는데 본인 소속 과정과 다른 경우
    if (
      targetCourse &&
      targetUser.role !== "ADMIN" &&
      targetUser.eventId &&
      targetUser.eventId !== targetCourse.id
    ) {
      return {
        success: false,
        message: `해당 계정은 [${targetCourse.name}] 과정 소속이 아닙니다. 초대코드를 다시 확인해 주세요.`,
      };
    }

    // 비밀번호 엄격 검증 (필수 일치)
    const expectedPassword = targetUser.password || "password123";
    if (expectedPassword !== password) {
      return {
        success: false,
        message: "비밀번호가 올바르지 않습니다. 다시 입력해 주세요.",
      };
    }

    // 로그인 성공 시 해당 유저의 소속 과정(또는 입력한 초대코드 과정)으로 자동 입장
    const nextEventId =
      targetCourse?.id ||
      (targetUser.role !== "ADMIN" && targetUser.eventId ? targetUser.eventId : activeEventId);

    if (nextEventId && events.some((e) => e.id === nextEventId)) {
      setActiveEventId(nextEventId);
      try {
        localStorage.setItem("mc_v2_active_event_id", nextEventId);
      } catch {}
    }

    setCurrentUserState(targetUser);
    setIsLoggedIn(true);
    localStorage.removeItem("mc_v2_logged_out");
    localStorage.setItem("mc_v2_current_user_id", targetUser.id);

    const enteredCourse = events.find((e) => e.id === nextEventId) || event;
    return {
      success: true,
      message: `${targetUser.name}님 환영합니다! [${enteredCourse.name}] 과정으로 입장했습니다.`,
    };
  };

  // 데모 간편 로그인 (비활성화)
  const demoLogin = (_userId: string) => {
    console.warn("보안 정책에 의해 간편 로그인 및 계정 전환이 차단되었습니다.");
  };

  // 회원가입 (과정 초대코드 검증 필수 + 해당 과정으로 자동 배정)
  const register = async (data: RegisterFormData): Promise<{ success: boolean; message: string }> => {
    const trimmedEmail = data.email.trim().toLowerCase();
    const trimmedCode = (data.inviteCode || "").trim();

    if (!trimmedCode) {
      return { success: false, message: "과정 초대코드 번호를 입력해 주세요." };
    }

    const matchedCourse = findCourseByInviteCode(trimmedCode);
    if (!matchedCourse) {
      return {
        success: false,
        message: `유효하지 않은 과정 초대코드([${trimmedCode}])입니다. 운영진에게 초대코드 번호를 확인해 주세요.`,
      };
    }

    if (!trimmedEmail) {
      return { success: false, message: "사용하실 아이디(또는 이메일)를 입력해 주세요." };
    }

    const alreadyRegistered = allUsers.find((u) => u.email.toLowerCase() === trimmedEmail);
    if (alreadyRegistered) {
      return { success: false, message: "이미 등록된 아이디(이메일)입니다. 다른 아이디를 입력하거나 로그인해 주세요." };
    }

    if (!data.privacyAgreed) {
      return { success: false, message: "개인정보 수집 및 이용 동의가 필요합니다." };
    }

    const newUser: User = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      email: trimmedEmail,
      password: data.password || "password123",
      name: data.name.trim() || trimmedEmail.split("@")[0],
      institution: data.institution || matchedCourse.institution,
      department: data.department || "자유 참가",
      studentNumber: data.studentNumber || "",
      role: data.role || "STUDENT",
      teamId: data.teamId || undefined,
      teamName: data.teamName || undefined,
      eventId: matchedCourse.id,
      privacyAgreed: true,
    };

    // 1. Supabase V2 DB에 저장
    const dbRes = await dbInsertUser(newUser);
    if (!dbRes.success) {
      return { success: false, message: `가입 저장 실패: ${dbRes.error || " 이미 존재하는 아이디입니다."}` };
    }

    // 2. 로컬 상태 업데이트 및 해당 과정으로 자동 입장
    const updatedUsers = [...allUsers, newUser];
    setUsers(updatedUsers);
    setActiveEventId(matchedCourse.id);
    setCurrentUserState(newUser);
    setIsLoggedIn(true);
    localStorage.removeItem("mc_v2_logged_out");
    localStorage.setItem("mc_v2_current_user_id", newUser.id);
    localStorage.setItem("mc_v2_active_event_id", matchedCourse.id);
    saveToStorage(matchedCourse, allProjects, allInvestments, updatedUsers);

    confetti({
      particleCount: 60,
      spread: 70,
      colors: ["#0052FF", "#4D7CFF", "#FFFFFF"],
    });

    return {
      success: true,
      message: `${newUser.name}님 환영합니다! [${matchedCourse.name}] 과정에 가입되어 ${matchedCourse.baseCredit.toLocaleString()} CR이 지급되었습니다.`,
    };
  };

  // 관리자 기능: 아이디/비밀번호 사전 배정 일괄 생성 (단건/팀별/개별 다건 모두 지원)
  const bulkCreateAccounts = async (
    newUsersList: User[]
  ): Promise<{ success: boolean; count: number; message: string }> => {
    if (newUsersList.length === 0) {
      return { success: false, count: 0, message: "생성할 계정 정보가 없습니다." };
    }

    return runWithMutationLock(
      `${newUsersList.length}개의 사전 배정 계정을 DB에 생성하고 있습니다...`,
      async () => {
        const res = await dbBulkInsertUsers(newUsersList);
        if (!res.success) {
          return {
            success: false,
            count: 0,
            message: `계정 생성 실패: ${res.error || "DB 오류"}`,
          };
        }

        const newEmails = new Set(newUsersList.map((u) => u.email.toLowerCase()));
        const merged = [
          ...allUsers.filter((u) => !newEmails.has(u.email.toLowerCase())),
          ...newUsersList,
        ];
        setUsers(merged);

        return {
          success: true,
          count: newUsersList.length,
          message: `총 ${newUsersList.length}개의 계정이 성공적으로 생성되었습니다!`,
        };
      },
      { success: false, count: 0, message: "현재 서버와 데이터 통신 중입니다. 잠시만 기다려 주세요." }
    );
  };

  // 관리자 기능: 계정 삭제
  const deleteUserAccount = async (userId: string): Promise<{ success: boolean; message: string }> => {
    const target = allUsers.find((u) => u.id === userId);
    if (!target) return { success: false, message: "해당 계정을 찾을 수 없습니다." };
    if (target.role === "ADMIN") {
      return { success: false, message: "총괄 관리자 계정은 삭제할 수 없습니다." };
    }
    await dbDeleteUser(userId);
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    return { success: true, message: `${target.name} (${target.email}) 계정이 삭제되었습니다.` };
  };

  // 관리자 기능: 비밀번호 리셋 (Supabase V2 DB + LocalStorage)
  const resetPassword = async (userId: string): Promise<{ success: boolean; tempPassword?: string; message: string }> => {
    const targetUser = allUsers.find((u) => u.id === userId);
    if (!targetUser) {
      return { success: false, message: "해당 사용자를 찾을 수 없습니다." };
    }

    const tempPassword = Math.floor(10000000 + Math.random() * 90000000).toString();

    await dbResetPassword(userId, tempPassword);

    const updatedUsers = allUsers.map((u) =>
      u.id === userId ? { ...u, password: tempPassword } : u
    );

    setUsers(updatedUsers);
    saveToStorage(event, allProjects, allInvestments, updatedUsers);

    return {
      success: true,
      tempPassword,
      message: `${targetUser.name} 참가자의 비밀번호가 8자리 임시 비밀번호 [${tempPassword}]로 리셋되었습니다.`,
    };
  };

  const logout = () => {
    setCurrentUserState(null);
    setIsLoggedIn(false);
    localStorage.removeItem("mc_v2_current_user_id");
    localStorage.setItem("mc_v2_logged_out", "true");
  };

  const setCurrentUser = (user: User) => {
    if (currentUser && currentUser.id === user.id) {
      setCurrentUserState(user);
    }
  };

  const userInvestments = currentUser
    ? investments.filter((inv) => inv.investorId === currentUser.id)
    : [];
  const usedCredits = userInvestments.reduce((sum, inv) => sum + inv.amount, 0);
  const remainingCredits = currentUser ? event.baseCredit - usedCredits : 0;

  const getUserInvestmentForProject = (projectId: string) => {
    if (!currentUser) return undefined;
    return investments.find((inv) => inv.investorId === currentUser.id && inv.projectId === projectId);
  };

  const getUserTotalInvestments = () => {
    return userInvestments;
  };

  const setStage = async (stage: EventStage) => {
    const isPublic = stage === "RANKING_PUBLISHED";
    const isReg = stage === "REGISTRATION" || stage === "PREPARING";
    const isFund = stage === "FUNDING_OPEN";
    const updated: Event = {
      ...event,
      currentStage: stage,
      isRegistrationOpen: isReg,
      isFundingOpen: isFund,
      isRankingPublic: isPublic,
    };
    setEventsState((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    await dbUpdateEvent(updated);

    if (isPublic) {
      confetti({
        particleCount: 90,
        spread: 90,
        colors: ["#0052FF", "#4D7CFF", "#0F172A", "#FFFFFF"],
      });
    }
  };

  const toggleRankingPublic = async () => {
    await toggleCourseSwitch("isRankingPublic");
  };

  const toggleProjectVisibility = async (projectId: string) => {
    const updatedAll = allProjects.map((p) =>
      p.id === projectId ? { ...p, isHidden: !p.isHidden } : p
    );
    const target = updatedAll.find((p) => p.id === projectId);
    setProjects(updatedAll);
    if (target) {
      await dbUpdateProject(projectId, { isHidden: target.isHidden });
    }
  };

  // 1. 새 프로젝트 등록 (출품 등록 토글 스위치 검증 + 중복 클릭 원천 잠금)
  const createProject = async (
    data: Omit<Project, "id" | "totalCredits" | "investorCount" | "lastModifierName" | "lastModifiedAt" | "isHidden">
  ): Promise<{ success: boolean; project?: Project; message: string }> => {
    if (!currentUser) {
      return { success: false, message: "로그인이 필요합니다." };
    }

    const isAdmin = currentUser.role === "ADMIN";
    if (!isAdmin && !event.isRegistrationOpen) {
      return {
        success: false,
        message: "현재 출품 등록이 마감(비활성화)된 상태입니다. 관리자에게 문의해 주세요.",
      };
    }

    return runWithMutationLock(
      "새 프로젝트 출품 정보를 서버에 등록하고 있습니다...",
      async () => {
        const newId = `proj-${Date.now().toString().slice(-6)}`;
        const teamId = data.teamId || currentUser.teamId || `team-${Date.now().toString().slice(-6)}`;
        const newProject: Project = {
          ...data,
          id: newId,
          eventId: event.id,
          teamId,
          teamNumber: data.teamNumber || projects.length + 1,
          totalCredits: 0,
          investorCount: 0,
          lastModifierName: currentUser.name,
          lastModifiedAt: new Date().toISOString().replace("T", " ").substring(0, 16),
          isHidden: false,
          authorId: currentUser.id,
          authorName: currentUser.name,
          authorEmail: currentUser.email,
        };

        const dbRes = await dbInsertProject(newProject);
        if (!dbRes.success) {
          console.error("[AppContext] Supabase DB insert failed:", dbRes.error);
          return {
            success: false,
            message: `프로젝트 DB 저장 실패: ${dbRes.error || "데이터베이스에 저장할 수 없습니다."}`,
          };
        }

        // 출품 등록자의 소속 팀 정보도 함께 갱신
        const updatedUser: User = {
          ...currentUser,
          teamId,
          teamName: data.teamName,
        };
        setCurrentUserState(updatedUser);
        const updatedUsers = allUsers.map((u) => (u.id === currentUser.id ? updatedUser : u));
        setUsers(updatedUsers);
        await dbInsertUser(updatedUser);

        const updatedProjects = [newProject, ...allProjects];
        setProjects(updatedProjects);
        saveToStorage(event, updatedProjects, allInvestments, updatedUsers);

        confetti({
          particleCount: 50,
          spread: 60,
          colors: ["#0052FF", "#4D7CFF", "#FFFFFF"],
        });

        return {
          success: true,
          project: newProject,
          message: "새 프로젝트가 성공적으로 출품 등록되었습니다!",
        };
      },
      { success: false, message: "현재 서버와 데이터 통신 중입니다. 잠시만 기다려 주세요." }
    );
  };

  // 2. 프로젝트 수정 (출품등록 토글이 열려있고 펀딩 진행 전일 때만 학생 수정 허용, 펀딩 진행 중에는 학생 수정 전면 차단!)
  const updateProject = async (updatedFields: Partial<Project> & { id: string }): Promise<{ success: boolean; message: string }> => {
    if (!currentUser) {
      return { success: false, message: "로그인이 필요합니다." };
    }

    const targetProject = allProjects.find((p) => p.id === updatedFields.id);
    if (!targetProject) {
      return { success: false, message: "해당 프로젝트를 찾을 수 없습니다." };
    }

    const isAuthor =
      targetProject.authorId === currentUser.id ||
      Boolean(currentUser.teamId && currentUser.teamId === targetProject.teamId);
    const isAdmin = currentUser.role === "ADMIN";
    if (!isAuthor && !isAdmin) {
      return { success: false, message: "본인 팀이 작성한 프로젝트만 수정할 수 있습니다." };
    }

    // [핵심 정책 4번] 펀딩 진행 중이거나 출품 등록 스위치가 닫혀있으면 학생은 수정 불가!
    if (!isAdmin && !canStudentEditProject) {
      return {
        success: false,
        message: event.isFundingOpen
          ? "⚠️ 현재 펀딩(모의투자)이 진행 중이므로 출품작을 수정할 수 없습니다."
          : "⚠️ 현재 출품 등록/수정 시간이 마감되어 출품작을 수정할 수 없습니다.",
      };
    }

    return runWithMutationLock(
      "프로젝트 수정 사항을 서버에 저장하고 있습니다...",
      async () => {
        const fullUpdates = {
          ...updatedFields,
          lastModifierName: currentUser.name,
          lastModifiedAt: new Date().toISOString().replace("T", " ").substring(0, 16),
        };

        const dbRes = await dbUpdateProject(updatedFields.id, fullUpdates);
        if (!dbRes.success) {
          return { success: false, message: `수정 저장 실패: ${dbRes.error || "DB 오류"}` };
        }

        const updatedProjects = allProjects.map((p) =>
          p.id === updatedFields.id
            ? {
                ...p,
                ...fullUpdates,
              }
            : p
        );

        setProjects(updatedProjects);
        saveToStorage(event, updatedProjects, allInvestments, allUsers);
        return { success: true, message: "프로젝트가 성공적으로 수정되었습니다." };
      },
      { success: false, message: "현재 서버와 데이터 통신 중입니다. 잠시만 기다려 주세요." }
    );
  };

  // 3. 프로젝트 삭제 (펀딩 진행 중이거나 출품 마감 시 학생 삭제 차단, 관리자는 항상 가능)
  const deleteProject = async (projectId: string): Promise<{ success: boolean; message: string }> => {
    if (!currentUser) {
      return { success: false, message: "로그인이 필요합니다." };
    }

    const targetProject = allProjects.find((p) => p.id === projectId);
    if (!targetProject) {
      return { success: false, message: "삭제할 프로젝트를 찾을 수 없습니다." };
    }

    const isAuthor =
      targetProject.authorId === currentUser.id ||
      Boolean(currentUser.teamId && currentUser.teamId === targetProject.teamId);
    const isAdmin = currentUser.role === "ADMIN";
    if (!isAuthor && !isAdmin) {
      return { success: false, message: "본인이 작성한 프로젝트만 삭제할 수 있습니다." };
    }

    if (!isAdmin && !canStudentEditProject) {
      return {
        success: false,
        message: "⚠️ 펀딩 진행 중이거나 출품 마감 상태에서는 출품작을 삭제할 수 없습니다.",
      };
    }

    return runWithMutationLock(
      "프로젝트를 서버에서 삭제하고 있습니다...",
      async () => {
        await dbDeleteProject(projectId, targetProject.teamId);

        const updatedProjects = allProjects.filter((p) => p.id !== projectId);
        const updatedInvestments = allInvestments.filter((inv) => inv.projectId !== projectId);

        setProjects(updatedProjects);
        setInvestments(updatedInvestments);
        saveToStorage(event, updatedProjects, updatedInvestments, allUsers);

        return { success: true, message: "프로젝트가 삭제되었습니다." };
      },
      { success: false, message: "현재 서버와 데이터 통신 중입니다. 잠시만 기다려 주세요." }
    );
  };

  // 4. 펀딩 투자 (펀딩 진행 토글 스위치 확인 + 고정 조합 ID + 동기 뮤텍스 잠금)
  const invest = async (projectId: string, amount: number): Promise<{ success: boolean; message: string }> => {
    if (!currentUser) {
      return { success: false, message: "로그인이 필요합니다." };
    }

    if (!event.isFundingOpen) {
      return {
        success: false,
        message: "현재는 펀딩(모의투자) 진행 시간이 아닙니다. 관리자가 펀딩 스위치를 열면 참여하실 수 있습니다.",
      };
    }

    const targetProject = projects.find((p) => p.id === projectId);
    if (!targetProject) {
      return { success: false, message: "해당 프로젝트를 찾을 수 없습니다." };
    }

    const isAuthor =
      targetProject.authorId === currentUser.id ||
      (Boolean(currentUser.email) && targetProject.authorEmail?.toLowerCase() === currentUser.email.toLowerCase());
    const isMyTeam = Boolean(
      (currentUser.teamId && currentUser.teamId === targetProject.teamId) ||
      (currentUser.teamName && targetProject.teamName && currentUser.teamName.trim() === targetProject.teamName.trim())
    );

    // 팀원 목록에 포함되어 있는지 확인
    const isTeamMember = Boolean(
      (targetProject.teamMemberIds && (
        targetProject.teamMemberIds.includes(currentUser.id) ||
        (currentUser.email && targetProject.teamMemberIds.map(s => s.toLowerCase()).includes(currentUser.email.toLowerCase())) ||
        (currentUser.studentNumber && targetProject.teamMemberIds.includes(currentUser.studentNumber))
      )) ||
      (targetProject.teamMemberDetails && targetProject.teamMemberDetails.some(m => 
        m.id === currentUser.id ||
        (currentUser.email && m.email?.toLowerCase() === currentUser.email.toLowerCase()) ||
        (currentUser.studentNumber && m.studentNumber === currentUser.studentNumber)
      ))
    );

    if (isAuthor || isMyTeam || isTeamMember) {
      return { success: false, message: "본인 또는 소속 팀원이 출품 등록한 프로젝트에는 투자할 수 없습니다." };
    }

    if (amount < event.minInvestment || amount > event.maxInvestment) {
      return {
        success: false,
        message: `투자 금액은 ${event.minInvestment.toLocaleString()} ~ ${event.maxInvestment.toLocaleString()} 크레딧 범위 내여야 합니다.`,
      };
    }

    if (amount % 100 !== 0) {
      return { success: false, message: "투자 금액은 100 크레딧 단위로 입력해야 합니다." };
    }

    return runWithMutationLock(
      "투자 내역을 서버에 안전하게 기록하고 있습니다...",
      async () => {
        const existingInvestment = getUserInvestmentForProject(projectId);
        const currentInvestmentAmount = existingInvestment ? existingInvestment.amount : 0;
        const availableCredit = remainingCredits + currentInvestmentAmount;

        if (amount > availableCredit) {
          return {
            success: false,
            message: `잔여 크레딧이 부족합니다. (투자 가능 한도: ${availableCredit.toLocaleString()} 크레딧)`,
          };
        }

        const deterministicId = `inv-${currentUser.id}__${projectId}`;
        const nowStr = new Date().toISOString().replace("T", " ").substring(0, 16);

        const targetInvestment: Investment = {
          id: deterministicId,
          eventId: event.id || "evt-2026-v2-01",
          investorId: currentUser.id,
          investorName: currentUser.name,
          projectId,
          teamId: targetProject.teamId,
          amount,
          createdAt: existingInvestment ? existingInvestment.createdAt : nowStr,
          updatedAt: nowStr,
        };

        const newAllInvestments = [
          ...allInvestments.filter(
            (inv) => !(inv.investorId === currentUser.id && inv.projectId === projectId)
          ),
          targetInvestment,
        ];

        const projInvestments = newAllInvestments.filter((inv) => inv.projectId === projectId);
        const projTotal = projInvestments.reduce((sum, inv) => sum + inv.amount, 0);
        const projInvestors = projInvestments.length;

        const dbRes = await dbSaveInvestment(targetInvestment, projTotal, projInvestors, event.baseCredit);
        if (!dbRes.success) {
          return {
            success: false,
            message: dbRes.error || "투자 저장 중 서버 오류가 발생했습니다. 다시 시도해 주세요.",
          };
        }

        const finalTotal = dbRes.verifiedTotal !== undefined ? dbRes.verifiedTotal : projTotal;
        const finalCount = dbRes.verifiedCount !== undefined ? dbRes.verifiedCount : projInvestors;

        const updatedAllProjects = allProjects.map((p) => {
          if (p.id === projectId) {
            return {
              ...p,
              totalCredits: finalTotal,
              investorCount: finalCount,
            };
          }
          return p;
        });

        setInvestments(newAllInvestments);
        setProjects(updatedAllProjects);
        saveToStorage(event, updatedAllProjects, newAllInvestments, allUsers);

        return {
          success: true,
          message: existingInvestment
            ? `${targetProject.teamName}에 대한 투자가 ${amount.toLocaleString()} 크레딧으로 수정되었습니다.`
            : `${targetProject.teamName}에 ${amount.toLocaleString()} 크레딧 투자가 완료되었습니다.`,
        };
      },
      { success: false, message: "현재 서버와 데이터 통신 중입니다. 잠시만 기다려 주세요." }
    );
  };

  // 5. 투자 취소 (펀딩 진행 중일 때만 허용 + 전액 환불)
  const cancelInvestment = async (investmentId: string): Promise<{ success: boolean; message: string }> => {
    if (!currentUser) return { success: false, message: "로그인이 필요합니다." };
    if (!event.isFundingOpen && currentUser.role !== "ADMIN") {
      return { success: false, message: "펀딩이 마감되어 투자를 취소할 수 없습니다." };
    }
    const targetInv = allInvestments.find((inv) => inv.id === investmentId);
    if (!targetInv) return { success: false, message: "투자 내역을 찾을 수 없습니다." };

    return runWithMutationLock(
      "투자 취소 및 크레딧 환불을 처리하고 있습니다...",
      async () => {
        let newProjectTotal = 0;
        let newInvestorCount = 0;

        const newAllInvestments = allInvestments.filter(
          (inv) =>
            inv.id !== investmentId &&
            !(inv.investorId === targetInv.investorId && inv.projectId === targetInv.projectId)
        );

        const projInvsAfter = newAllInvestments.filter((inv) => inv.projectId === targetInv.projectId);
        newProjectTotal = projInvsAfter.reduce((sum, inv) => sum + inv.amount, 0);
        newInvestorCount = projInvsAfter.length;

        const dbRes = await dbDeleteInvestment(
          investmentId,
          targetInv.projectId,
          newProjectTotal,
          newInvestorCount,
          targetInv.investorId
        );

        const finalTotal = dbRes.verifiedTotal !== undefined ? dbRes.verifiedTotal : newProjectTotal;
        const finalCount = dbRes.verifiedCount !== undefined ? dbRes.verifiedCount : newInvestorCount;

        const updatedAllProjects = allProjects.map((p) => {
          if (p.id === targetInv.projectId) {
            return {
              ...p,
              totalCredits: finalTotal,
              investorCount: finalCount,
            };
          }
          return p;
        });

        setInvestments(newAllInvestments);
        setProjects(updatedAllProjects);
        saveToStorage(event, updatedAllProjects, newAllInvestments, allUsers);

        return {
          success: true,
          message: `투자가 취소되어 ${targetInv.amount.toLocaleString()} CR이 지갑으로 전액 환불되었습니다.`,
        };
      },
      { success: false, message: "현재 서버와 데이터 통신 중입니다. 잠시만 기다려 주세요." }
    );
  };

  // 6. 응원 댓글 등록
  const addComment = async (projectId: string, message: string): Promise<{ success: boolean; message: string }> => {
    if (!currentUser) return { success: false, message: "로그인이 필요합니다." };
    if (!message.trim()) return { success: false, message: "댓글 내용을 입력해 주세요." };

    const newComment: Comment = {
      id: `c_${Date.now()}`,
      author: currentUser.name,
      team: currentUser.teamName || (currentUser.role === "ADMIN" ? "운영진" : "청중 평가단"),
      message: message.trim(),
      timestamp: "방금 전",
    };

    const updatedAllProjects = allProjects.map((p) => {
      if (p.id === projectId) {
        return {
          ...p,
          comments: [newComment, ...(p.comments || [])],
        };
      }
      return p;
    });

    setProjects(updatedAllProjects);
    saveToStorage(event, updatedAllProjects, allInvestments, allUsers);
    return { success: true, message: "응원 댓글이 등록되었습니다." };
  };

  // 7. 테스트 잔액 리필 / 초기화
  const resetCreditsToDefault = () => {
    if (!currentUser) return;
    const userInvestments = allInvestments.filter((inv) => inv.investorId === currentUser.id);
    const nonUserInvestments = allInvestments.filter((inv) => inv.investorId !== currentUser.id);

    const updatedAllProjects = allProjects.map((p) => {
      const myInv = userInvestments.find((inv) => inv.projectId === p.id);
      if (myInv) {
        return {
          ...p,
          totalCredits: Math.max(0, p.totalCredits - myInv.amount),
          investorCount: Math.max(0, p.investorCount - 1),
        };
      }
      return p;
    });

    setInvestments(nonUserInvestments);
    setProjects(updatedAllProjects);
    saveToStorage(event, updatedAllProjects, nonUserInvestments, allUsers);
  };

  // 8. 관리자 기능: 현재 과정의 투자 내역 0원 리셋
  const resetAllInvestments = async (): Promise<{ success: boolean; message: string }> => {
    await dbResetAllInvestments(event.id);
    const zeroedProjects = allProjects.map((p) =>
      (p.eventId || "evt-2026-v2-01") === event.id
        ? { ...p, totalCredits: 0, investorCount: 0 }
        : p
    );
    const remainingInvs = allInvestments.filter((inv) => (inv.eventId || "evt-2026-v2-01") !== event.id);
    setInvestments(remainingInvs);
    setProjects(zeroedProjects);
    localStorage.removeItem("mc_v2_investments");
    saveToStorage(event, zeroedProjects, remainingInvs, allUsers);
    return {
      success: true,
      message: `[${event.name}] 과정의 모든 투자 내역과 누적 펀딩액이 0 CR로 초기화되었습니다.`,
    };
  };

  const resetAllData = () => {
    localStorage.removeItem("mc_v2_event");
    localStorage.removeItem("mc_v2_projects");
    localStorage.removeItem("mc_v2_investments");
    localStorage.removeItem("mc_v2_users");
    localStorage.removeItem("mc_v2_current_user_id");
    setEventsState([INITIAL_EVENT]);
    setActiveEventId(INITIAL_EVENT.id);
    setProjects([]);
    setInvestments([]);
    setUsers(INITIAL_USERS);
    setCurrentUserState(null);
    setIsLoggedIn(false);
  };

  return (
    <AppContext.Provider
      value={{
        event,
        events,
        activeEventId,
        selectCourse,
        createCourse,
        updateCourse,
        deleteCourse,
        toggleCourseSwitch,
        findCourseByInviteCode,
        canStudentEditProject,
        currentUser,
        isLoggedIn,
        users,
        allUsers,
        roster,
        projects,
        investments,
        remainingCredits,
        usedCredits,
        isLoading,
        isMutating,
        mutationMessage,
        login,
        demoLogin,
        register,
        bulkCreateAccounts,
        deleteUserAccount,
        resetPassword,
        logout,
        setCurrentUser,
        setStage,
        toggleRankingPublic,
        toggleProjectVisibility,
        invest,
        cancelInvestment,
        addComment,
        resetCreditsToDefault,
        getUserInvestmentForProject,
        getUserTotalInvestments,
        createProject,
        updateProject,
        deleteProject,
        resetAllInvestments,
        resetAllData,
        refreshFromSupabase,
      }}
    >
      {children}

      {/* 글로벌 서버 통신 잠금 모달 팝업 (광클릭 원천 차단) */}
      {isMutating && (
        <div
          className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 select-none cursor-wait"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-200 flex flex-col items-center text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center">
              <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-extrabold text-slate-900">
                서버와 데이터 통신 중입니다
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {mutationMessage || "안전하게 데이터를 처리하고 있습니다. 잠시만 기다려 주세요..."}
              </p>
            </div>
            <div className="w-full py-2 px-3 rounded-xl bg-amber-50 border border-amber-200/80 text-[11px] font-semibold text-amber-800">
              ⚠️ 중복 처리 방지를 위해 완료될 때까지 버튼 클릭이 잠깁니다.
            </div>
          </div>
        </div>
      )}
    </AppContext.Provider>
  );
}


export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
