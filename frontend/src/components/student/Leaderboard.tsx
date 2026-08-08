import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Trophy, Star, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface LeaderboardUser {
  email: string;
  name: string;
  lessons_completed: number;
  quizzes_passed: number;
  assignments_submitted: number;
  score: number;
}

import { useQuery } from '@tanstack/react-query';

const Leaderboard: React.FC = () => {
  const { data: board = [], isLoading: loading } = useQuery<LeaderboardUser[]>({
    queryKey: ['student-leaderboard'],
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const res = await api.get('users/profile/leaderboard/');
      return res.data;
    }
  });

  // Extract top performers
  const top1 = board[0];
  const top2 = board[1];
  const top3 = board[2];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in text-xs">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-extrabold flex items-center justify-center gap-2">
          <Trophy className="text-amber-500 animate-bounce" size={26} />
          <span>Apex Student Leaderboard</span>
        </h2>
        <p className="text-muted-foreground text-xs">Study hard, clear checkpoint quizzes, and complete assignments to rank up!</p>
      </div>

      {/* 🏆 Podium Display */}
      {board.length > 0 && (
        <div className="grid gap-4 grid-cols-3 max-w-xl mx-auto items-end pt-8 pb-4">
          {/* 2nd place (Left) */}
          {top2 ? (
            <div className="glass-panel p-4 rounded-2xl shadow-sm text-center space-y-2 flex flex-col justify-end h-40 bg-gradient-to-tr from-slate-400/5 to-slate-400/10 border-slate-400/20 scale-[0.95]">
              <div className="h-10 w-10 bg-slate-400 text-white rounded-full flex items-center justify-center text-xs font-bold mx-auto border-2 border-white/20">
                2
              </div>
              <h4 className="font-extrabold text-[10px] truncate max-w-28 mx-auto">{top2.name}</h4>
              <span className="text-[10px] font-bold text-muted-foreground font-mono">{top2.score} pts</span>
            </div>
          ) : (
            <div className="h-40" />
          )}

          {/* 1st place (Center) */}
          {top1 ? (
            <div className="glass-panel p-5 rounded-2xl shadow-lg text-center space-y-2.5 flex flex-col justify-end h-48 bg-gradient-to-tr from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/40 relative scale-[1.05]">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                <Star className="text-amber-500 fill-amber-500 animate-pulse" size={24} />
              </div>
              <div className="h-12 w-12 bg-amber-500 text-white rounded-full flex items-center justify-center text-sm font-bold mx-auto border-2 border-white/20 shadow-md">
                1
              </div>
              <h4 className="font-extrabold text-xs truncate max-w-32 mx-auto">{top1.name}</h4>
              <span className="text-xs font-bold text-amber-500 font-mono">{top1.score} pts</span>
            </div>
          ) : (
            <div className="h-48" />
          )}

          {/* 3rd place (Right) */}
          {top3 ? (
            <div className="glass-panel p-4 rounded-2xl shadow-sm text-center space-y-2 flex flex-col justify-end h-36 bg-gradient-to-tr from-amber-700/5 to-amber-700/10 border-amber-700/20 scale-[0.9]">
              <div className="h-10 w-10 bg-amber-700 text-white rounded-full flex items-center justify-center text-xs font-bold mx-auto border-2 border-white/20">
                3
              </div>
              <h4 className="font-extrabold text-[10px] truncate max-w-28 mx-auto">{top3.name}</h4>
              <span className="text-[10px] font-bold text-muted-foreground font-mono">{top3.score} pts</span>
            </div>
          ) : (
            <div className="h-36" />
          )}
        </div>
      )}

      {/* Rankings list table */}
      <div className="glass-panel p-6 rounded-2xl shadow-sm space-y-3">
        <h3 className="text-xs font-bold border-b border-border pb-3">Rank Directory</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border text-muted-foreground uppercase font-semibold">
                <th className="py-2.5 px-4 w-12">Rank</th>
                <th className="py-2.5 px-4">Student Profile</th>
                <th className="py-2.5 px-4 text-center">Lessons</th>
                <th className="py-2.5 px-4 text-center">Quizzes</th>
                <th className="py-2.5 px-4 text-center">Assignments</th>
                <th className="py-2.5 px-4 text-right">Aggregate Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {board.map((student, index) => {
                const rank = index + 1;
                return (
                  <tr key={student.email} className={`hover:bg-muted/30 transition-colors ${rank <= 3 ? 'font-semibold' : ''}`}>
                    <td className="py-3 px-4 font-mono text-muted-foreground">{rank}</td>
                    <td className="py-3 px-4">
                      <div>
                        <h4 className="text-xs text-foreground">{student.name}</h4>
                        <span className="text-[10px] text-muted-foreground">{student.email}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center text-muted-foreground">{student.lessons_completed}</td>
                    <td className="py-3 px-4 text-center text-muted-foreground">{student.quizzes_passed}</td>
                    <td className="py-3 px-4 text-center text-muted-foreground">{student.assignments_submitted}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-primary">{student.score} pts</td>
                  </tr>
                );
              })}
              {board.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground font-medium italic">
                    Leaderboard is currently empty.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
