"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { Sparkles, X, Eye, EyeOff } from "lucide-react";
import confetti from "canvas-confetti";

interface RankingBoardProps {
  onClose: () => void;
}

export const RankingBoard: React.FC<RankingBoardProps> = ({ onClose }) => {
  const { event, projects, toggleRankingPublic, currentUser } = useApp();

  const [ratio, setRatio] = useState({
    creditUnit: event.creditUnitForScore || 1000,
    scorePerUnit: event.scorePerCreditUnit || 10,
    rankTeamCount: event.rankScoreTeamCount || Math.max(projects.length, 5),
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem("mc_v2_score_ratio");
      if (saved) {
        const parsed = JSON.parse(saved);
        setRatio({
          creditUnit: parsed.creditUnit || event.creditUnitForScore || 1000,
          scorePerUnit: parsed.scorePerUnit || event.scorePerCreditUnit || 10,
          rankTeamCount: parsed.rankTeamCount || event.rankScoreTeamCount || Math.max(projects.length, 5),
        });
      }
    } catch {}
  }, [event, projects.length]);

  if (currentUser?.role !== "ADMIN") {
    return (
      <div className="fixed inset-0 z-50 bg-[#0B0F19] text-white flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl max-w-sm space-y-3 shadow-2xl">
          <p className="text-base font-bold text-amber-400">⚠️ 관리자 전용 화면</p>
          <p className="text-xs text-slate-300">실시간 종합 순위 전광판은 총괄 관리자만 열람할 수 있습니다.</p>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 transition cursor-pointer"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  const fireGrandConfetti = () => {
    const end = Date.now() + 3 * 1000;
    const colors = ["#F59E0B", "#FBBF24", "#06B6D4", "#3B82F6", "#8B5CF6", "#EC4899"];
    (function frame() {
      confetti({
        particleCount: 8,
        angle: 60,
        spread: 70,
        origin: { x: 0 },
        colors: colors,
      });
      confetti({
        particleCount: 8,
        angle: 120,
        spread: 70,
        origin: { x: 1 },
        colors: colors,
      });
      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  };

  const effectiveTeamCount = Math.max(1, ratio.rankTeamCount || projects.length || 1);
  const deductionStep = 10 / effectiveTeamCount;

  const leaderboardData = useMemo(() => {
    const sorted = [...projects]
      .filter((p) => !p.isHidden)
      .sort((a, b) => b.totalCredits - a.totalCredits);

    return sorted.map((p, idx) => {
      const convertedPoints =
        ratio.creditUnit > 0 ? (p.totalCredits / ratio.creditUnit) * ratio.scorePerUnit : 0;
      const rawRankScore = idx < effectiveTeamCount ? 10 - idx * deductionStep : 0;
      const rankScore10 = Math.max(0, Number(rawRankScore.toFixed(2)));
      return {
        ...p,
        convertedPoints: Number(convertedPoints.toFixed(1)),
        rankScore10,
      };
    });
  }, [projects, ratio, effectiveTeamCount, deductionStep]);

  return (
    <div className="fixed inset-0 z-50 bg-[#0B0F19] text-white flex flex-col justify-between overflow-y-auto select-none">
      {/* Top Bar for Projector */}
      <div className="p-3 sm:p-6 flex items-center justify-between border-b border-white/10 bg-black/40 backdrop-blur-md gap-2">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 text-[11px] sm:text-xs font-mono font-bold">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="hidden xs:inline">LIVE 4K PROJECTOR</span>
            <span className="xs:hidden">LIVE</span>
          </div>
          <span className="text-xs sm:text-sm font-extrabold tracking-tight text-white hidden md:inline">
            {event.name} · 실시간 순위 전광판 (초대코드: {event.inviteCode || "2026"})
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {currentUser?.role === "ADMIN" && (
            <button
              type="button"
              onClick={toggleRankingPublic}
              className="px-2.5 sm:px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-[11px] sm:text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              {event.isRankingPublic ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-rose-400" /> <span className="hidden sm:inline">비공개</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-blue-400" /> <span className="hidden sm:inline">공개 전환</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={fireGrandConfetti}
            className="px-3 sm:px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-extrabold text-[11px] sm:text-xs shadow-lg shadow-amber-500/30 hover:scale-105 transition cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-950" />
            <span className="hidden sm:inline">축하 꽃가루 발사 (Confetti)</span>
            <span className="sm:hidden">🎉 꽃가루</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Stage Area: Top 3 3D-Podium Section */}
      <div className="flex-1 flex flex-col justify-center items-center px-2 sm:px-8 py-4 sm:py-8 relative">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center mb-4 sm:mb-6 space-y-1">
          <span className="text-amber-400 font-mono text-[10px] sm:text-xs tracking-widest uppercase">
            Official Real-time Leaderboard
          </span>
          <h1 className="text-xl sm:text-4xl font-extrabold tracking-tight text-white">
            실시간 종합 랭킹 & 10점 만점 등수 환산 스코어
          </h1>
        </div>

        {/* 3D-PODIUM (2nd - 1st - 3rd) */}
        <div className="w-full max-w-4xl grid grid-cols-3 gap-1.5 sm:gap-6 items-end">
          {/* 2ND PLACE (SILVER) */}
          {leaderboardData[1] && (
            <div className="flex flex-col items-center">
              <div className="w-full bg-gradient-to-b from-slate-800/80 to-slate-900/90 rounded-xl sm:rounded-2xl p-2 sm:p-5 border border-slate-500/30 backdrop-blur-md text-center space-y-1 sm:space-y-2 shadow-xl hover:-translate-y-1 transition duration-200">
                <span className="text-xl sm:text-2xl">🥈</span>
                <div>
                  <span className="text-[9px] sm:text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-700/80 text-slate-200 font-bold">
                    RANK 02
                  </span>
                </div>
                <h3 className="font-bold text-white text-xs sm:text-base line-clamp-1">
                  {leaderboardData[1].title}
                </h3>
                <div className="text-[10px] sm:text-xs text-slate-400 line-clamp-1">
                  T{String(leaderboardData[1].teamNumber).padStart(2, "0")} · {leaderboardData[1].teamName}
                </div>

                <div className="pt-1.5 sm:pt-2 border-t border-white/10 space-y-0.5">
                  <div className="text-xs sm:text-xl font-extrabold font-mono text-cyan-300">
                    {leaderboardData[1].totalCredits.toLocaleString()}{" "}
                    <span className="text-[10px] sm:text-xs text-slate-400">CR</span>
                  </div>
                  <div className="text-xs sm:text-base font-black font-mono text-amber-300">
                    등수환산 {leaderboardData[1].rankScore10}점{" "}
                    <span className="text-[10px] font-normal text-slate-400">/ 10점</span>
                  </div>
                  <div className="text-[10px] sm:text-xs font-bold font-mono text-slate-400">
                    (토큰환산 {leaderboardData[1].convertedPoints.toFixed(1)}점)
                  </div>
                </div>
              </div>
              <div className="w-full h-16 sm:h-32 bg-gradient-to-b from-slate-700 to-slate-800 rounded-b-xl sm:rounded-b-2xl border-x border-b border-slate-600/50 flex items-center justify-center font-mono font-bold text-slate-400 text-sm sm:text-lg">
                2nd
              </div>
            </div>
          )}

          {/* 1ST PLACE (GOLD) */}
          {leaderboardData[0] && (
            <div className="flex flex-col items-center -mt-4 sm:-mt-6">
              <div className="w-full bg-gradient-to-b from-amber-950/80 via-slate-900/90 to-slate-950 rounded-xl sm:rounded-2xl p-2.5 sm:p-6 border-2 border-amber-400/80 backdrop-blur-md text-center space-y-1 sm:space-y-2 shadow-2xl shadow-amber-500/20 relative">
                <div className="absolute -top-4 sm:-top-6 left-1/2 -translate-x-1/2 w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-base sm:text-2xl shadow-lg shadow-amber-400/50 font-bold">
                  👑
                </div>

                <div className="pt-2 sm:pt-3">
                  <span className="text-[9px] sm:text-xs font-mono px-2 py-0.5 sm:px-3 sm:py-1 rounded-full bg-amber-400 text-slate-950 font-black tracking-wide">
                    CHAMPION
                  </span>
                </div>

                <h3 className="font-extrabold text-white text-xs sm:text-lg line-clamp-1 pt-0.5 sm:pt-1">
                  {leaderboardData[0].title}
                </h3>
                <div className="text-[10px] sm:text-xs font-semibold text-amber-300 line-clamp-1">
                  T{String(leaderboardData[0].teamNumber).padStart(2, "0")} · {leaderboardData[0].teamName}
                </div>

                <div className="pt-1.5 sm:pt-2 border-t border-amber-400/20 space-y-0.5">
                  <div className="text-sm sm:text-2xl font-black font-mono text-amber-400">
                    {leaderboardData[0].totalCredits.toLocaleString()}{" "}
                    <span className="text-[10px] sm:text-xs text-amber-200">CR</span>
                  </div>
                  <div className="text-xs sm:text-lg font-black font-mono text-emerald-300">
                    등수환산 {leaderboardData[0].rankScore10}점{" "}
                    <span className="text-[10px] font-normal text-slate-300">/ 10점</span>
                  </div>
                  <div className="text-[10px] sm:text-xs font-bold font-mono text-cyan-300">
                    (토큰환산 {leaderboardData[0].convertedPoints.toFixed(1)}점)
                  </div>
                </div>
              </div>
              <div className="w-full h-24 sm:h-48 bg-gradient-to-b from-amber-600 to-amber-800 rounded-b-xl sm:rounded-b-2xl border-x border-b border-amber-400/60 flex items-center justify-center font-mono font-black text-amber-200 text-base sm:text-2xl shadow-lg">
                1st
              </div>
            </div>
          )}

          {/* 3RD PLACE (BRONZE) */}
          {leaderboardData[2] && (
            <div className="flex flex-col items-center">
              <div className="w-full bg-gradient-to-b from-slate-800/80 to-slate-900/90 rounded-xl sm:rounded-2xl p-2 sm:p-5 border border-amber-700/40 backdrop-blur-md text-center space-y-1 sm:space-y-2 shadow-xl hover:-translate-y-1 transition duration-200">
                <span className="text-xl sm:text-2xl">🥉</span>
                <div>
                  <span className="text-[9px] sm:text-[11px] font-mono px-1.5 py-0.5 rounded bg-amber-900/60 text-amber-200 font-bold">
                    RANK 03
                  </span>
                </div>
                <h3 className="font-bold text-white text-xs sm:text-base line-clamp-1">
                  {leaderboardData[2].title}
                </h3>
                <div className="text-[10px] sm:text-xs text-slate-400 line-clamp-1">
                  T{String(leaderboardData[2].teamNumber).padStart(2, "0")} · {leaderboardData[2].teamName}
                </div>

                <div className="pt-1.5 sm:pt-2 border-t border-white/10 space-y-0.5">
                  <div className="text-xs sm:text-xl font-extrabold font-mono text-cyan-300">
                    {leaderboardData[2].totalCredits.toLocaleString()}{" "}
                    <span className="text-[10px] sm:text-xs text-slate-400">CR</span>
                  </div>
                  <div className="text-xs sm:text-base font-black font-mono text-amber-300">
                    등수환산 {leaderboardData[2].rankScore10}점{" "}
                    <span className="text-[10px] font-normal text-slate-400">/ 10점</span>
                  </div>
                  <div className="text-[10px] sm:text-xs font-bold font-mono text-slate-400">
                    (토큰환산 {leaderboardData[2].convertedPoints.toFixed(1)}점)
                  </div>
                </div>
              </div>
              <div className="w-full h-12 sm:h-28 bg-gradient-to-b from-amber-800 to-slate-800 rounded-b-xl sm:rounded-b-2xl border-x border-b border-amber-700/50 flex items-center justify-center font-mono font-bold text-amber-300 text-sm sm:text-lg">
                3rd
              </div>
            </div>
          )}
        </div>

        {/* 4th ~ 9th Place Mini Score Strip */}
        {leaderboardData.length > 3 && (
          <div className="w-full max-w-4xl mt-6 grid grid-cols-1 sm:grid-cols-3 gap-2">
            {leaderboardData.slice(3, 9).map((t, i) => (
              <div
                key={t.id}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-400">{i + 4}위</span>
                  <span className="font-semibold text-slate-200 truncate max-w-32">{t.teamName}</span>
                </div>
                <div className="font-mono text-right">
                  <span className="text-amber-300 font-extrabold">{t.rankScore10}점</span>
                  <span className="text-slate-400 text-[11px] ml-1.5">({t.totalCredits.toLocaleString()} CR)</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Ticker: Current Conversion Formula Banner */}
      <div className="px-6 py-3 border-t border-white/10 bg-black/60 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono text-slate-400">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-amber-400">
            🏆 등수별 10점 만점 환산 ({effectiveTeamCount}개 팀 기준 · 등수당 -{deductionStep.toFixed(2)}점 차감)
          </span>
          <span className="text-slate-600">|</span>
          <span>
            📊 토큰 환산: 매 {ratio.creditUnit.toLocaleString()} CR 당 = {ratio.scorePerUnit}점
          </span>
        </div>
        <div className="text-cyan-400 font-semibold">
          ● REAL-TIME SYNC ACTIVATED · V2 DEMODAY SYSTEM
        </div>
      </div>
    </div>
  );
};
