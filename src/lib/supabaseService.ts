import { supabase, isSupabaseConfigured } from "./supabase";
import { User, Project, Investment, Event, EventStage } from "@/types";
const EXT_TAG_REGEX = /<!--PROJECT_EXT_DATA:([\s\S]*?)-->/;
const EXT_TAG_PREFIX = "\n\n<!--PROJECT_EXT_DATA:";
const EXT_TAG_SUFFIX = "-->";

/**
 * DB 컬럼 (snake_case) -> Project (camelCase) 변환
 * (신규 컬럼이 아직 DB에 없는 경우 description에 안전 임베드된 메타데이터 자동 복원)
 */
export function mapDbProjectToModel(row: any): Project {
  let description = row.description || "";
  let extData: any = {};

  if (typeof description === "string" && description.includes("<!--PROJECT_EXT_DATA:")) {
    const match = description.match(EXT_TAG_REGEX);
    if (match && match[1]) {
      try {
        extData = JSON.parse(match[1]);
        description = description.replace(EXT_TAG_REGEX, "").trim();
      } catch (e) {
        console.warn("[SupabaseService] Failed to parse embedded project ext data:", e);
      }
    }
  }

  return {
    id: String(row.id),
    eventId: row.event_id || "evt-2026-v2-01",
    teamId: row.team_id || "",
    teamName: row.team_name || "",
    teamNumber: row.team_number || 1,
    title: row.title || "",
    summary: row.summary || "",
    description,
    thumbnailUrl: row.thumbnail_url || "",
    landingFormat: row.landing_format || "IMAGE",
    landingUrl: row.landing_url || "",
    landingImages: Array.isArray(row.landing_images) ? row.landing_images : (row.landing_url ? [row.landing_url] : []),
    authorId: row.author_id,
    authorName: row.author_name,
    authorEmail: row.author_email,
    category: row.category || extData.category || "AI/SaaS",
    targetCredits: Number(row.target_credits) || Number(extData.targetCredits) || 20000,
    pitchHighlights: (Array.isArray(row.pitch_highlights) && row.pitch_highlights.length > 0)
      ? row.pitch_highlights 
      : (Array.isArray(extData.pitchHighlights) ? extData.pitchHighlights : []),
    teamMemberIds: (Array.isArray(row.team_member_ids) && row.team_member_ids.length > 0)
      ? row.team_member_ids 
      : (Array.isArray(extData.teamMemberIds) ? extData.teamMemberIds : []),
    teamMemberDetails: (Array.isArray(row.team_member_details) && row.team_member_details.length > 0)
      ? row.team_member_details 
      : (Array.isArray(extData.teamMemberDetails) ? extData.teamMemberDetails : []),
    mediaItems: (Array.isArray(row.media_items) && row.media_items.length > 0)
      ? row.media_items 
      : (Array.isArray(extData.mediaItems) ? extData.mediaItems : []),
    lastModifierName: row.last_modifier_name,
    lastModifiedAt: row.last_modified_at,
    isHidden: Boolean(row.is_hidden),
    totalCredits: Number(row.total_credits) || 0,
    investorCount: Number(row.investor_count) || 0,
  };
}

/**
 * Project (camelCase) -> DB 컬럼 (snake_case) 변환
 */
export function mapModelProjectToDb(proj: Partial<Project>): Record<string, any> {
  const dbData: Record<string, any> = {};
  if (proj.id !== undefined) dbData.id = proj.id;
  if (proj.eventId !== undefined) dbData.event_id = proj.eventId;
  if (proj.teamId !== undefined) dbData.team_id = proj.teamId;
  if (proj.teamName !== undefined) dbData.team_name = proj.teamName;
  if (proj.teamNumber !== undefined) dbData.team_number = proj.teamNumber;
  if (proj.title !== undefined) dbData.title = proj.title;
  if (proj.summary !== undefined) dbData.summary = proj.summary;
  if (proj.description !== undefined) dbData.description = proj.description;
  if (proj.thumbnailUrl !== undefined) dbData.thumbnail_url = proj.thumbnailUrl;
  if (proj.landingFormat !== undefined) dbData.landing_format = proj.landingFormat;
  if (proj.landingUrl !== undefined) dbData.landing_url = proj.landingUrl;
  if (proj.landingImages !== undefined) dbData.landing_images = proj.landingImages;
  if (proj.authorId !== undefined) dbData.author_id = proj.authorId;
  if (proj.authorName !== undefined) dbData.author_name = proj.authorName;
  if (proj.authorEmail !== undefined) dbData.author_email = proj.authorEmail;
  if (proj.category !== undefined) dbData.category = proj.category;
  if (proj.targetCredits !== undefined) dbData.target_credits = proj.targetCredits;
  if (proj.pitchHighlights !== undefined) dbData.pitch_highlights = proj.pitchHighlights;
  if (proj.teamMemberIds !== undefined) dbData.team_member_ids = proj.teamMemberIds;
  if (proj.teamMemberDetails !== undefined) dbData.team_member_details = proj.teamMemberDetails;
  if (proj.mediaItems !== undefined) {
    // Storage URL이 이미 존재하는 HTML 미디어는 대용량 htmlContent 문자열을 DB 컬럼에서 제외하여 DB 조회 속도(46KB 경량 유지) 보장
    dbData.media_items = proj.mediaItems.map((item) => {
      if (item.type === "HTML" && item.url && item.htmlContent) {
        const { htmlContent: _omitted, ...rest } = item;
        return rest;
      }
      return item;
    });
  }
  if (proj.lastModifierName !== undefined) dbData.last_modifier_name = proj.lastModifierName;
  if (proj.lastModifiedAt !== undefined) dbData.last_modified_at = proj.lastModifiedAt;
  if (proj.isHidden !== undefined) dbData.is_hidden = proj.isHidden;
  if (proj.totalCredits !== undefined) dbData.total_credits = proj.totalCredits;
  if (proj.investorCount !== undefined) dbData.investor_count = proj.investorCount;
  return dbData;
}

/**
 * DB 컬럼 -> User 변환
 */
export function mapDbUserToModel(row: any): User {
  return {
    id: String(row.id),
    eventId: row.event_id || "evt-2026-v2-01",
    email: row.email || "",
    password: row.password || row.password_hash || "password123",
    name: row.name || "",
    institution: row.institution || "",
    department: row.department || "",
    studentNumber: row.student_number || "",
    teamId: row.team_id,
    teamName: row.team_name,
    role: row.role || "STUDENT",
    privacyAgreed: Boolean(row.privacy_agreed || row.privacy_agreed_at),
  };
}

/**
 * User -> DB 변환
 */
export function mapModelUserToDb(user: User): Record<string, any> {
  return {
    id: user.id,
    event_id: user.eventId || "evt-2026-v2-01",
    email: user.email.toLowerCase().trim(),
    password: user.password || "password123",
    name: user.name,
    institution: user.institution || "",
    department: user.department || "",
    student_number: user.studentNumber || "",
    team_id: user.teamId || null,
    team_name: user.teamName || null,
    role: user.role,
    privacy_agreed: Boolean(user.privacyAgreed),
  };
}

/**
 * DB 컬럼 -> Investment 변환
 */
export function mapDbInvestmentToModel(row: any): Investment {
  return {
    id: String(row.id),
    eventId: row.event_id || "evt-2026-v2-01",
    investorId: row.investor_id || "",
    investorName: row.investor_name || "",
    projectId: row.project_id || "",
    teamId: row.team_id || "",
    amount: Number(row.amount) || 0,
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
  };
}

/**
 * Investment -> DB 변환
 */
export function mapModelInvestmentToDb(inv: Investment): Record<string, any> {
  return {
    id: inv.id,
    event_id: inv.eventId || "evt-2026-v2-01",
    investor_id: inv.investorId,
    investor_name: inv.investorName,
    project_id: inv.projectId,
    team_id: inv.teamId || null,
    amount: inv.amount,
    created_at: inv.createdAt,
    updated_at: inv.updatedAt,
  };
}

const EVENT_META_REGEX = /<!--EVENT_META:([\s\S]*?)-->/;
const EVENT_META_PREFIX = "<!--EVENT_META:";
const EVENT_META_SUFFIX = "-->";

/**
 * DB 컬럼 -> Event(과정) 모델 변환 (추가 SQL 없이도 초대코드, 토글 스위치, 등수 환산 설정 복원)
 */
export function mapDbEventToModel(row: any): Event {
  let rawSession = row.session || "2026 SPARK 창업챌린지";
  let meta: any = {};

  if (typeof rawSession === "string" && rawSession.includes(EVENT_META_PREFIX)) {
    const match = rawSession.match(EVENT_META_REGEX);
    if (match && match[1]) {
      try {
        meta = JSON.parse(match[1]);
        rawSession = rawSession.replace(EVENT_META_REGEX, "").trim();
      } catch (e) {
        console.warn("[SupabaseService] Failed to parse embedded event meta:", e);
      }
    }
  }

  const stage: EventStage = row.current_stage || "FUNDING_OPEN";
  const defaultRegOpen = stage === "REGISTRATION" || stage === "PREPARING";
  const defaultFundOpen = stage === "FUNDING_OPEN";

  return {
    id: String(row.id),
    name: row.name || "2026 서원대학교 SPARK 창업챌린지(모의 크라우드펀딩 대회)",
    institution: row.institution || "서원대학교",
    session: rawSession,
    eventDate: row.event_date || new Date().toISOString().slice(0, 10),
    baseCredit: Number(row.base_credit) || 10000,
    minInvestment: Number(row.min_investment) || 2000,
    maxInvestment: Number(row.max_investment) || 5000,
    currentStage: stage,
    isRankingPublic: Boolean(row.is_ranking_public),
    inviteCode: meta.inviteCode !== undefined ? String(meta.inviteCode) : "2026",
    isRegistrationOpen: meta.isRegistrationOpen !== undefined ? Boolean(meta.isRegistrationOpen) : defaultRegOpen,
    isFundingOpen: meta.isFundingOpen !== undefined ? Boolean(meta.isFundingOpen) : defaultFundOpen,
    rankScoreTeamCount: Number(meta.rankScoreTeamCount) || 10,
    creditUnitForScore: Number(meta.creditUnitForScore) || 1000,
    scorePerCreditUnit: Number(meta.scorePerCreditUnit) || 10,
  };
}

/**
 * Event(과정) 모델 -> DB 컬럼 변환
 */
export function mapModelEventToDb(event: Event): Record<string, any> {
  const cleanSession = (event.session || "2026 SPARK 창업챌린지").replace(EVENT_META_REGEX, "").trim();
  const meta = {
    inviteCode: (event.inviteCode || "2026").trim(),
    isRegistrationOpen: Boolean(event.isRegistrationOpen),
    isFundingOpen: Boolean(event.isFundingOpen),
    rankScoreTeamCount: Number(event.rankScoreTeamCount) || 10,
    creditUnitForScore: Number(event.creditUnitForScore) || 1000,
    scorePerCreditUnit: Number(event.scorePerCreditUnit) || 10,
  };

  // 토글 스위치 상태에 맞춰 currentStage도 호환 유지
  let derivedStage: EventStage = event.currentStage || "FUNDING_OPEN";
  if (event.isFundingOpen) {
    derivedStage = "FUNDING_OPEN";
  } else if (event.isRegistrationOpen) {
    derivedStage = "REGISTRATION";
  } else if (event.isRankingPublic) {
    derivedStage = "RANKING_PUBLISHED";
  } else {
    derivedStage = "FUNDING_CLOSED";
  }

  return {
    id: event.id || "evt-2026-v2-01",
    name: event.name,
    institution: event.institution,
    session: `${cleanSession}${EVENT_META_PREFIX}${JSON.stringify(meta)}${EVENT_META_SUFFIX}`,
    event_date: event.eventDate || new Date().toISOString().slice(0, 10),
    base_credit: event.baseCredit,
    min_investment: event.minInvestment,
    max_investment: event.maxInvestment,
    current_stage: derivedStage,
    is_ranking_public: Boolean(event.isRankingPublic),
  };
}

/**
 * 네트워크 순단 시 자동 재시도 래퍼 (최대 3회)
 */
async function withRetry<T extends { data: any; error: any }>(
  fn: () => PromiseLike<T>,
  retries = 3,
  delayMs = 500
): Promise<T> {
  let lastRes: T | null = null;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fn();
      if (!res.error) return res;
      lastRes = res;
    } catch (err: any) {
      lastRes = { data: null, error: err } as T;
    }
    if (i < retries - 1) {
      await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
    }
  }
  return lastRes!;
}

/**
 * Supabase V2 DB에서 모든 데이터 가져오기 (다중 과정 events 포함)
 */
export async function fetchAllFromSupabase(): Promise<{
  event: Event | null;
  events: Event[];
  users: User[];
  projects: Project[];
  investments: Investment[];
  projectsLoaded: boolean;
  usersLoaded: boolean;
  investmentsLoaded: boolean;
  error?: string;
}> {
  if (!supabase || !isSupabaseConfigured) {
    return {
      event: null,
      events: [],
      users: [],
      projects: [],
      investments: [],
      projectsLoaded: false,
      usersLoaded: false,
      investmentsLoaded: false,
      error: "Supabase not configured",
    };
  }

  try {
    const [eventsRes, usersRes, projectsRes, investmentsRes] = await Promise.all([
      withRetry(() => supabase.from("v2_events").select("*").order("created_at", { ascending: true })),
      withRetry(() => supabase.from("v2_users").select("*")),
      withRetry(() => supabase.from("v2_projects").select("*").order("team_number", { ascending: true })),
      withRetry(() => supabase.from("v2_investments").select("*")),
    ]);

    const events: Event[] =
      !eventsRes.error && Array.isArray(eventsRes.data)
        ? eventsRes.data.map(mapDbEventToModel)
        : [];
    const event: Event | null = events.length > 0 ? events[0] : null;

    const usersLoaded = !usersRes.error && Array.isArray(usersRes.data);
    const projectsLoaded = !projectsRes.error && Array.isArray(projectsRes.data);
    const investmentsLoaded = !investmentsRes.error && Array.isArray(investmentsRes.data);

    const users = usersLoaded ? (usersRes.data || []).map(mapDbUserToModel) : [];
    const rawInvestments = investmentsLoaded ? (investmentsRes.data || []).map(mapDbInvestmentToModel) : [];

    // [중복 데이터 자동 정화 (Deduplication)]
    const dedupMap = new Map<string, Investment>();
    const duplicateIdsToDelete: string[] = [];

    for (const inv of rawInvestments) {
      const pairKey = `${inv.investorId}__${inv.projectId}`;
      const existing = dedupMap.get(pairKey);
      if (existing) {
        const preferCurrent =
          inv.id === `inv-${pairKey}` ||
          (inv.updatedAt || inv.createdAt) >= (existing.updatedAt || existing.createdAt);
        if (preferCurrent) {
          duplicateIdsToDelete.push(existing.id);
          dedupMap.set(pairKey, inv);
        } else {
          duplicateIdsToDelete.push(inv.id);
        }
      } else {
        dedupMap.set(pairKey, inv);
      }
    }

    if (duplicateIdsToDelete.length > 0 && supabase) {
      supabase
        .from("v2_investments")
        .delete()
        .in("id", duplicateIdsToDelete)
        .then(() => {});
    }

    const investments = Array.from(dedupMap.values());

    const projects = projectsLoaded
      ? (projectsRes.data || []).map((row) => {
          const proj = mapDbProjectToModel(row);
          if (investmentsLoaded) {
            const projInvs = investments.filter((inv) => inv.projectId === proj.id);
            return {
              ...proj,
              totalCredits: projInvs.reduce((sum, inv) => sum + inv.amount, 0),
              investorCount: projInvs.length,
            };
          }
          return proj;
        })
      : [];

    const anyError = projectsRes.error || usersRes.error || investmentsRes.error;

    return {
      event,
      events,
      users,
      projects,
      investments,
      projectsLoaded,
      usersLoaded,
      investmentsLoaded,
      error: anyError && !projectsLoaded && !usersLoaded ? anyError.message : undefined,
    };
  } catch (err: any) {
    console.error("[SupabaseService] Fetch error:", err);
    return {
      event: null,
      events: [],
      users: [],
      projects: [],
      investments: [],
      projectsLoaded: false,
      usersLoaded: false,
      investmentsLoaded: false,
      error: err.message,
    };
  }
}

/**
 * 유저 단건 등록 (Supabase V2 DB)
 */
export async function dbInsertUser(user: User): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: "Supabase not configured" };
  try {
    const dbUser = mapModelUserToDb(user);
    const { error } = await supabase.from("v2_users").upsert([dbUser], { onConflict: "email" });
    if (error) {
      console.error("[SupabaseService] dbInsertUser error:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 유저 다건 일괄 등록 (팀별/인원수별/개별 사전 배정 계정 일괄 생성)
 */
export async function dbBulkInsertUsers(usersList: User[]): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: "Supabase not configured" };
  if (usersList.length === 0) return { success: true };
  try {
    const dbUsers = usersList.map(mapModelUserToDb);
    const { error } = await supabase.from("v2_users").upsert(dbUsers, { onConflict: "email" });
    if (error) {
      console.error("[SupabaseService] dbBulkInsertUsers error:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 유저 삭제 (Supabase V2 DB)
 */
export async function dbDeleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: "Supabase not configured" };
  try {
    const { error } = await supabase.from("v2_users").delete().eq("id", userId);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 비밀번호 리셋 (Supabase V2 DB)
 */
export async function dbResetPassword(userId: string, tempPassword: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: "Supabase not configured" };
  try {
    const { error } = await supabase.from("v2_users").update({ password: tempPassword }).eq("id", userId);
    if (error) {
      console.error("[SupabaseService] dbResetPassword error:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 팀 정보 등록/동기화 헬퍼 (v2_teams 테이블 지원)
 */
async function syncTeamToDb(teamId: string, teamName: string, teamNumber: number, eventId: string = "evt-2026-v2-01") {
  if (!supabase) return;

  const teamData = {
    id: teamId,
    event_id: eventId,
    team_number: teamNumber || 1,
    name: teamName,
  };

  // 1차: v2_teams 테이블 시도
  const { error } = await supabase.from("v2_teams").upsert(teamData, { onConflict: "id" });

  if (error) {
    // 외래키 제약조건 위반인 경우 event_id 제외하고 시도
    if (error.message?.toLowerCase().includes("foreign key")) {
      const fallbackData = {
        id: teamId,
        team_number: teamNumber || 1,
        name: teamName,
      };
      await supabase.from("v2_teams").upsert(fallbackData, { onConflict: "id" });
    } else {
      console.warn("[SupabaseService] v2_teams upsert warning:", error.message);
    }
  }
}

/**
 * 구버전 DB 스키마(신규 컬럼 누락 시) 호환을 위해 메타데이터를 description에 안전하게 임베드하는 헬퍼
 */
function buildEmbeddedPayload(proj: Partial<Project>, isUpdate = false): Record<string, any> {
  const dbProj = mapModelProjectToDb(proj);
  if (isUpdate) delete dbProj.id;

  const extData: Record<string, any> = {};
  if (proj.category !== undefined) extData.category = proj.category;
  if (proj.targetCredits !== undefined) extData.targetCredits = proj.targetCredits;
  if (proj.pitchHighlights !== undefined) extData.pitchHighlights = proj.pitchHighlights;
  if (proj.teamMemberIds !== undefined) extData.teamMemberIds = proj.teamMemberIds;
  if (proj.teamMemberDetails !== undefined) extData.teamMemberDetails = proj.teamMemberDetails;
  if (proj.mediaItems !== undefined) extData.mediaItems = proj.mediaItems;

  delete dbProj.category;
  delete dbProj.target_credits;
  delete dbProj.pitch_highlights;
  delete dbProj.team_member_ids;
  delete dbProj.team_member_details;
  delete dbProj.media_items;

  let baseDesc = (proj.description || "").replace(EXT_TAG_REGEX, "").trim();
  if (Object.keys(extData).length > 0) {
    baseDesc = `${baseDesc}${EXT_TAG_PREFIX}${JSON.stringify(extData)}${EXT_TAG_SUFFIX}`;
  }
  dbProj.description = baseDesc;

  return dbProj;
}

/**
 * 새 프로젝트 등록 (Supabase V2 DB: v2_teams 테이블과 v2_projects 테이블 동시 등록)
 */
export async function dbInsertProject(project: Project): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: "Supabase not configured" };
  try {
    // 1. v2_teams 테이블에 팀 정보 자동 등록/동기화
    if (project.teamName) {
      const teamId = project.teamId || `team-${Date.now().toString().slice(-6)}`;
      await syncTeamToDb(teamId, project.teamName, project.teamNumber || 1, project.eventId);
    }

    // 2. v2_projects 테이블에 프로젝트 등록
    // 1차: 신규 컬럼 포함 전체 insert 시도
    const dbProj = mapModelProjectToDb(project);
    let { error } = await supabase.from("v2_projects").insert([dbProj]);

    // 2차: 신규 컬럼 미존재(PGRST204 등) 시 description에 메타데이터를 임베드하여 100% 안전 저장
    if (error && (error.message?.includes("column") || error.code === "PGRST204" || error.code === "42703")) {
      console.warn("[SupabaseService] DB schema missing new columns, inserting with embedded metadata fallback...", error.message);
      const fallbackPayload = buildEmbeddedPayload(project, false);
      const retryRes = await supabase.from("v2_projects").insert([fallbackPayload]);
      error = retryRes.error;
    }

    if (error) {
      console.error("[SupabaseService] dbInsertProject error:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 프로젝트 수정 (Supabase V2 DB: v2_teams 테이블도 함께 동기화)
 */
export async function dbUpdateProject(projectId: string, updates: Partial<Project>): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: "Supabase not configured" };
  try {
    // 팀명 변경 시 v2_teams 테이블 동기화
    if (updates.teamName && updates.teamId) {
      await supabase.from("v2_teams").update({ name: updates.teamName }).eq("id", updates.teamId);
    }

    // 1차: 신규 컬럼 포함 전체 update 시도
    const dbUpdates = mapModelProjectToDb(updates);
    delete dbUpdates.id;
    let { error } = await supabase.from("v2_projects").update(dbUpdates).eq("id", projectId);

    // 2차: 신규 컬럼 미존재 시 description에 임베드하여 안전 수정
    if (error && (error.message?.includes("column") || error.code === "PGRST204" || error.code === "42703")) {
      console.warn("[SupabaseService] DB schema missing new columns, updating with embedded metadata fallback...", error.message);
      const fallbackUpdates = buildEmbeddedPayload(updates, true);
      const retryRes = await supabase.from("v2_projects").update(fallbackUpdates).eq("id", projectId);
      error = retryRes.error;
    }

    if (error) {
      console.error("[SupabaseService] dbUpdateProject error:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 프로젝트 삭제 (Supabase V2 DB: 투자 및 프로젝트 삭제)
 */
export async function dbDeleteProject(projectId: string, teamId?: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: "Supabase not configured" };
  try {
    // 프로젝트 삭제 및 연관된 투자 삭제
    await supabase.from("v2_investments").delete().eq("project_id", projectId);
    const { error } = await supabase.from("v2_projects").delete().eq("id", projectId);
    if (teamId) {
      await supabase.from("v2_teams").delete().eq("id", teamId);
    }
    if (error) {
      console.error("[SupabaseService] dbDeleteProject error:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 투자 등록 또는 금액 수정 (고정 ID 병합 + 중복 행 제거 + 1인 한도 서버 검증 + 누적액 정확히 집계)
 */
export async function dbSaveInvestment(
  investment: Investment,
  newProjectTotal: number,
  newInvestorCount: number,
  maxBaseCredit: number = 10000
): Promise<{ success: boolean; error?: string; verifiedTotal?: number; verifiedCount?: number }> {
  if (!supabase) return { success: false, error: "Supabase not configured" };
  try {
    // 1. 해당 투자자의 현재 DB 투자 내역 조회 (한도 초과 검증 및 동일 프로젝트 구버전 중복 행 탐색)
    const { data: userInvs } = await supabase
      .from("v2_investments")
      .select("id, project_id, amount")
      .eq("investor_id", investment.investorId);

    if (userInvs && userInvs.length > 0) {
      // 다른 프로젝트에 투자한 금액 합산 (프로젝트당 1건 기준)
      const otherProjMap = new Map<string, number>();
      const sameProjOldIds: string[] = [];

      for (const row of userInvs) {
        if (row.project_id === investment.projectId) {
          if (row.id !== investment.id) {
            sameProjOldIds.push(row.id);
          }
        } else {
          otherProjMap.set(row.project_id, Number(row.amount) || 0);
        }
      }

      const usedInOtherProjects = Array.from(otherProjMap.values()).reduce((a, b) => a + b, 0);
      if (usedInOtherProjects + investment.amount > maxBaseCredit) {
        return {
          success: false,
          error: `잔여 크레딧 한도(${(maxBaseCredit - usedInOtherProjects).toLocaleString()} CR)를 초과하여 투자할 수 없습니다.`,
        };
      }

      // 동일 (investor_id, project_id)에 옛날 타임스탬프 ID로 들어간 중복 행이 있다면 즉시 삭제
      if (sameProjOldIds.length > 0) {
        await supabase.from("v2_investments").delete().in("id", sameProjOldIds);
      }
    }

    // 2. 고정 ID (inv-투자자ID__프로젝트ID) 기반 단일 행 Upsert
    const dbInv = mapModelInvestmentToDb(investment);
    const { error: invErr } = await supabase.from("v2_investments").upsert([dbInv], { onConflict: "id" });
    if (invErr) {
      console.error("[SupabaseService] dbSaveInvestment error:", invErr);
      return { success: false, error: invErr.message };
    }

    // 3. Supabase DB의 실제 v2_investments 테이블에서 해당 프로젝트의 총합(투자자별 중복 제거)을 직접 조회하여 업데이트
    const { data: realInvs } = await supabase
      .from("v2_investments")
      .select("investor_id, amount")
      .eq("project_id", investment.projectId);

    let verifiedTotal = newProjectTotal;
    let verifiedCount = newInvestorCount;

    if (realInvs) {
      const uniqueByInvestor = new Map<string, number>();
      for (const r of realInvs) {
        uniqueByInvestor.set(String(r.investor_id), Number(r.amount) || 0);
      }
      verifiedTotal = Array.from(uniqueByInvestor.values()).reduce((sum, amt) => sum + amt, 0);
      verifiedCount = uniqueByInvestor.size;
    }

    await supabase.from("v2_projects").update({
      total_credits: verifiedTotal,
      investor_count: verifiedCount,
    }).eq("id", investment.projectId);

    return { success: true, verifiedTotal, verifiedCount };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 과정(Event) 생성/수정 및 토글 스위치/초대코드 저장 (Supabase V2 DB)
 */
export async function dbUpdateEvent(event: Event): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: "Supabase not configured" };
  try {
    const dbRow = mapModelEventToDb(event);
    const { error } = await supabase.from("v2_events").upsert([dbRow], { onConflict: "id" });
    if (error) {
      console.error("[SupabaseService] dbUpdateEvent error:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 과정(Event) 삭제 (연관된 출품작, 투자 내역, 팀, 일반 참가자 계정 정리)
 */
export async function dbDeleteEvent(eventId: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: "Supabase not configured" };
  try {
    await supabase.from("v2_investments").delete().eq("event_id", eventId);
    await supabase.from("v2_projects").delete().eq("event_id", eventId);
    await supabase.from("v2_teams").delete().eq("event_id", eventId);
    await supabase.from("v2_users").delete().eq("event_id", eventId).neq("role", "ADMIN");
    const { error } = await supabase.from("v2_events").delete().eq("id", eventId);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 투자 삭제 / 취소 및 프로젝트 누적액 복구 (동일 투자자+프로젝트 중복 행까지 일괄 제거 후 재집계)
 */
export async function dbDeleteInvestment(
  investmentId: string,
  projectId: string,
  newProjectTotal: number,
  newInvestorCount: number,
  investorId?: string
): Promise<{ success: boolean; error?: string; verifiedTotal?: number; verifiedCount?: number }> {
  if (!supabase) return { success: false, error: "Supabase not configured" };
  try {
    await supabase.from("v2_investments").delete().eq("id", investmentId);
    if (investorId) {
      await supabase
        .from("v2_investments")
        .delete()
        .eq("investor_id", investorId)
        .eq("project_id", projectId);
    }

    const { data: realInvs } = await supabase
      .from("v2_investments")
      .select("investor_id, amount")
      .eq("project_id", projectId);

    let verifiedTotal = newProjectTotal;
    let verifiedCount = newInvestorCount;

    if (realInvs) {
      const uniqueByInvestor = new Map<string, number>();
      for (const r of realInvs) {
        uniqueByInvestor.set(String(r.investor_id), Number(r.amount) || 0);
      }
      verifiedTotal = Array.from(uniqueByInvestor.values()).reduce((sum, amt) => sum + amt, 0);
      verifiedCount = uniqueByInvestor.size;
    }

    await supabase.from("v2_projects").update({
      total_credits: verifiedTotal,
      investor_count: verifiedCount,
    }).eq("id", projectId);
    return { success: true, verifiedTotal, verifiedCount };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 과정별(또는 전체) 투자 내역 일괄 초기화 (Supabase V2 DB)
 */
export async function dbResetAllInvestments(eventId?: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: "Supabase not configured" };
  try {
    if (eventId) {
      await supabase.from("v2_investments").delete().eq("event_id", eventId);
      await supabase.from("v2_projects").update({
        total_credits: 0,
        investor_count: 0,
      }).eq("event_id", eventId);
    } else {
      await supabase.from("v2_investments").delete().neq("id", "");
      await supabase.from("v2_projects").update({
        total_credits: 0,
        investor_count: 0,
      }).neq("id", "");
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

