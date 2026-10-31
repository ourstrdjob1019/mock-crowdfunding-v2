import { Event, Project, User, Investment, RosterItem } from "@/types";

export const INITIAL_EVENT: Event = {
  id: "evt-2026-v2-01",
  name: "2026 서원대학교 SPARK 창업챌린지(모의 크라우드펀딩 대회)",
  institution: "서원대학교",
  session: "2026 SPARK 창업챌린지",
  eventDate: "2026-10-27",
  baseCredit: 10000,
  minInvestment: 2000,
  maxInvestment: 5000,
  currentStage: "FUNDING_OPEN",
  isRankingPublic: false,
  inviteCode: "2026",
  isRegistrationOpen: true,
  isFundingOpen: true,
  rankScoreTeamCount: 10,
  creditUnitForScore: 1000,
  scorePerCreditUnit: 10,
};

export const INITIAL_ROSTER: RosterItem[] = [
  {
    email: "student@demoday2026.ac.kr",
    name: "김서연",
    role: "STUDENT",
    teamId: "team-01",
    teamName: "넥스트웨이브",
    institution: "서원대학교",
    department: "바이오메디컬공학과",
    studentNumber: "2022145021",
  },
  {
    email: "judge@demoday2026.ac.kr",
    name: "한동훈",
    role: "JUDGE",
    institution: "한국청년엔젤투자클럽",
    department: "심사평가단",
    studentNumber: "J2026-001",
  },
  {
    email: "admin@gmail.com",
    name: "총괄 관리자",
    role: "ADMIN",
    institution: "서원대학교",
    department: "창업지원단",
    studentNumber: "ADMIN-00",
  },
];

export const INITIAL_USERS: User[] = [
  {
    id: "user-01",
    email: "student@demoday2026.ac.kr",
    name: "김서연",
    role: "STUDENT",
    teamId: "team-01",
    teamName: "넥스트웨이브",
    institution: "서원대학교",
    department: "바이오메디컬공학과",
    studentNumber: "2022145021",
    eventId: "evt-2026-v2-01",
    privacyAgreed: true,
    password: "password123",
  },
  {
    id: "user-judge",
    email: "judge@demoday2026.ac.kr",
    name: "한동훈",
    role: "JUDGE",
    institution: "한국청년엔젤투자클럽",
    department: "심사평가단",
    studentNumber: "J2026-001",
    eventId: "evt-2026-v2-01",
    privacyAgreed: true,
    password: "password123",
  },
  {
    id: "user-admin-1",
    email: "admin@gmail.com",
    name: "총괄 관리자",
    role: "ADMIN",
    institution: "서원대학교",
    department: "창업지원단",
    studentNumber: "ADMIN-00",
    eventId: "evt-2026-v2-01",
    privacyAgreed: true,
    password: "password123",
  },
];

// 실전 운영용 초기값 (Supabase DB와 실시간 연동되며, 등록된 프로젝트가 없을 시 빈 배열 유지)
export const INITIAL_PROJECTS: Project[] = [];

export const INITIAL_INVESTMENTS: Investment[] = [];
