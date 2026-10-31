"use client";

import React, { useState, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/Button";
import { 
  Lock, 
  Mail, 
  User as UserIcon, 
  ArrowRight, 
  AlertCircle, 
  Sparkles,
  GraduationCap,
  Award,
  Users,
  School,
  Hash,
  KeyRound,
  CheckCircle2
} from "lucide-react";
import { UserRole } from "@/types";

export const AuthScreen: React.FC = () => {
  const { login, register, event, findCourseByInviteCode } = useApp();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // 로그인 폼
  const [loginInviteCode, setLoginInviteCode] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // 회원가입 폼
  const [regInviteCode, setRegInviteCode] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regDepartment, setRegDepartment] = useState("");
  const [regStudentNumber, setRegStudentNumber] = useState("");
  const [regRole, setRegRole] = useState<UserRole>("STUDENT");
  const [regPrivacyAgreed, setRegPrivacyAgreed] = useState(true);

  const matchedLoginCourse = useMemo(() => {
    if (!loginInviteCode.trim()) return undefined;
    return findCourseByInviteCode(loginInviteCode);
  }, [loginInviteCode, findCourseByInviteCode]);

  const matchedRegCourse = useMemo(() => {
    if (!regInviteCode.trim()) return undefined;
    return findCourseByInviteCode(regInviteCode);
  }, [regInviteCode, findCourseByInviteCode]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    const res = await login(loginEmail, loginPassword, loginInviteCode);
    if (!res.success) {
      setErrorMessage(res.message);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!regInviteCode.trim()) {
      setErrorMessage("참여하실 과정의 초대코드 번호를 입력해 주세요.");
      return;
    }
    if (!regEmail.trim()) {
      setErrorMessage("사용하실 아이디(또는 이메일)를 입력해 주세요.");
      return;
    }
    if (!regPassword.trim()) {
      setErrorMessage("비밀번호를 입력해 주세요.");
      return;
    }
    if (!regName.trim()) {
      setErrorMessage("이름(실명)을 입력해 주세요.");
      return;
    }

    const res = await register({
      inviteCode: regInviteCode.trim(),
      email: regEmail.trim(),
      password: regPassword.trim(),
      name: regName.trim(),
      department: regDepartment.trim() || (regRole === "STUDENT" ? "창업학부" : "운영위원회"),
      studentNumber: regStudentNumber.trim(),
      institution: matchedRegCourse?.institution || event.institution,
      role: regRole,
      privacyAgreed: regPrivacyAgreed,
    });

    if (!res.success) {
      setErrorMessage(res.message);
    }
  };

  const displayCourse = matchedLoginCourse || matchedRegCourse || event;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col justify-between relative overflow-hidden py-10 px-4 sm:px-6">
      {/* 부드러운 배경 앰비언트 그라데이션 */}
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-blue-500/10 via-indigo-500/5 to-transparent rounded-full blur-[90px] pointer-events-none" />

      {/* 상단 브랜드 헤더 */}
      <header className="relative z-10 max-w-md w-full mx-auto text-center pt-2 sm:pt-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/25 mb-3">
          <Sparkles size={22} />
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          레디스타트업 V2
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
          클라우드펀딩 플랫폼 · {displayCourse.name}
        </p>

        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200/80 text-[11px] font-mono font-medium text-slate-600">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          {displayCourse.institution} · 시스템 가동 중
        </div>
      </header>

      {/* 메인 로그인 / 회원가입 카드 */}
      <main className="relative z-10 max-w-md w-full mx-auto my-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-100 p-6 sm:p-8 transition-all">
          
          {/* 로그인 / 회원가입 탭 */}
          <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 mb-6 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setErrorMessage("");
              }}
              className={`py-2.5 rounded-lg transition-all cursor-pointer text-center ${
                mode === "login"
                  ? "bg-white text-slate-900 shadow-sm font-bold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              로그인 (사전배정 계정)
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setErrorMessage("");
              }}
              className={`py-2.5 rounded-lg transition-all cursor-pointer text-center ${
                mode === "register"
                  ? "bg-white text-slate-900 shadow-sm font-bold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              초대코드 회원가입
            </button>
          </div>

          {/* 에러 메시지 알림 */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start gap-2.5">
              <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* 1. 로그인 폼 */}
          {mode === "login" && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* 과정 초대코드 번호 (선택 입력 - 입력 시 해당 과정 확인) */}
              <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200/80 space-y-2">
                <label className="block text-xs font-bold text-blue-900">
                  과정 초대코드 번호 <span className="text-[11px] font-normal text-blue-600">(사전 배정 아이디는 생략 가능)</span>
                </label>
                <div className="relative">
                  <KeyRound size={16} className="absolute left-3.5 top-3 text-blue-500" />
                  <input
                    type="text"
                    value={loginInviteCode}
                    onChange={(e) => setLoginInviteCode(e.target.value)}
                    placeholder="과정 초대코드 번호 입력 (예: 2026)"
                    className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-white border border-blue-200 text-sm font-mono font-bold text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                  />
                </div>
                {loginInviteCode.trim() && (
                  matchedLoginCourse ? (
                    <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                      <span>확인됨: {matchedLoginCourse.name} ({matchedLoginCourse.institution})</span>
                    </p>
                  ) : (
                    <p className="text-[11px] text-rose-600 font-medium">
                      일치하는 과정 초대코드가 없습니다. 번호를 다시 확인해 주세요.
                    </p>
                  )
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  아이디 (또는 이메일)
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="배정받은 아이디 또는 이메일 입력"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  비밀번호
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="비밀번호 입력"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit" variant="primary" isFullWidth size="lg">
                  과정 입장 및 로그인 <ArrowRight size={16} className="ml-2" />
                </Button>
              </div>

              <p className="text-center text-[11px] text-slate-400 pt-2">
                사전 배정받은 아이디가 없으신가요? 상단의 <strong>초대코드 회원가입</strong> 탭에서 초대코드 번호로 바로 가입하세요.
              </p>
            </form>
          )}

          {/* 2. 회원가입 폼 */}
          {mode === "register" && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              {/* 과정 초대코드 번호 필수 입력 */}
              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2">
                <label className="block text-xs font-bold text-blue-900">
                  과정 초대코드 번호 (필수) *
                </label>
                <div className="relative">
                  <KeyRound size={16} className="absolute left-3.5 top-3 text-blue-600" />
                  <input
                    type="text"
                    required
                    value={regInviteCode}
                    onChange={(e) => setRegInviteCode(e.target.value)}
                    placeholder="운영진에게 안내받은 초대코드 입력 (예: 2026)"
                    className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-white border border-blue-300 text-sm font-mono font-bold text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                  />
                </div>
                {regInviteCode.trim() ? (
                  matchedRegCourse ? (
                    <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                      <span>입장 과정: {matchedRegCourse.name} ({matchedRegCourse.baseCredit.toLocaleString()} CR 지급)</span>
                    </p>
                  ) : (
                    <p className="text-[11px] text-rose-600 font-medium">
                      유효하지 않은 초대코드입니다. 운영진에게 초대코드 번호를 확인해 주세요.
                    </p>
                  )
                ) : (
                  <p className="text-[11px] text-slate-500">
                    초대코드 번호를 입력하면 해당 교육/대회 과정으로 자동 연결됩니다.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  아이디 (또는 이메일) *
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="로그인에 사용할 아이디 또는 이메일"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  비밀번호 *
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="비밀번호 설정"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  이름 (실명) *
                </label>
                <div className="relative">
                  <UserIcon size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="홍길동"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                  />
                </div>
              </div>

              {/* 학과 및 학번 (조원 매칭 및 본인 확인용) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    학과 / 소속 {regRole === "STUDENT" && <span className="text-blue-600">*</span>}
                  </label>
                  <div className="relative">
                    <School size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={regDepartment}
                      onChange={(e) => setRegDepartment(e.target.value)}
                      placeholder="예: 컴퓨터공학과"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    학번 / 사번 {regRole === "STUDENT" && <span className="text-blue-600">*</span>}
                  </label>
                  <div className="relative">
                    <Hash size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={regStudentNumber}
                      onChange={(e) => setRegStudentNumber(e.target.value)}
                      placeholder="예: 20261234"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 역할/참가 구분 선택 */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  참가 구분 *
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setRegRole("STUDENT")}
                    className={`py-2 px-2 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      regRole === "STUDENT"
                        ? "border-blue-500 bg-blue-50/70 text-blue-700 font-bold shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <GraduationCap size={16} className={regRole === "STUDENT" ? "text-blue-600" : "text-slate-400"} />
                    <span>학생</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegRole("JUDGE")}
                    className={`py-2 px-2 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      regRole === "JUDGE"
                        ? "border-blue-500 bg-blue-50/70 text-blue-700 font-bold shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Award size={16} className={regRole === "JUDGE" ? "text-blue-600" : "text-slate-400"} />
                    <span>심사위원</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegRole("STUDENT")}
                    className={`py-2 px-2 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      regRole === "STUDENT"
                        ? "border-blue-500 bg-blue-50/70 text-blue-700 font-bold shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Users size={16} className={regRole === "STUDENT" ? "text-blue-600" : "text-slate-400"} />
                    <span>일반 참가</span>
                  </button>
                </div>
              </div>

              {/* 개인정보 수집 및 이용 동의 */}
              <div className="pt-1 flex items-start gap-2">
                <input
                  type="checkbox"
                  id="privacy-check"
                  required
                  checked={regPrivacyAgreed}
                  onChange={(e) => setRegPrivacyAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="privacy-check" className="text-xs text-slate-600 leading-snug cursor-pointer">
                  <span className="font-semibold text-slate-800">[필수] 동의</span>: 가상 크라우드펀딩 모의 투자 참여 및 가상 크레딧 지급에 동의합니다.
                </label>
              </div>

              <div className="pt-2">
                <Button type="submit" variant="primary" isFullWidth size="lg">
                  초대코드로 가입하고 입장하기 <ArrowRight size={16} className="ml-2" />
                </Button>
              </div>
            </form>
          )}

        </div>
      </main>

      {/* 하단 푸터 */}
      <footer className="relative z-10 max-w-md w-full mx-auto text-center py-4">
        <p className="text-[11px] font-mono text-slate-400">
          © 2026 {displayCourse.institution} · 모의 크라우드펀딩 평가 시스템 V2
        </p>
      </footer>
    </div>
  );
};
