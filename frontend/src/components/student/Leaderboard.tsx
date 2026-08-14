import React from 'react';
import api from '../../services/api';
import { Trophy, Star, Crown, Medal, Award, Flame, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';

interface LeaderboardUser {
  email: string;
  name: string;
  lessons_completed: number;
  quizzes_passed: number;
  assignments_submitted: number;
  score: number;
}

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
    <div className="w-full space-y-3.5 text-xs animate-fade-in">
      {/* Clean Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-border/50 pb-2.5">
        <div>
          <h1 className="text-lg font-black tracking-tight text-foreground flex items-center gap-2">
            <Trophy className="text-amber-400" size={18} />
            <span>Apex Hall of Fame Leaderboard</span>
          </h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Complete lesson modules, pass checkpoint quizzes, and submit deliverables to climb the rankings.
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-card border border-border/80 text-[10px] font-extrabold text-amber-400">
          {board.length} Ranked Students
        </span>
      </div>

      {/* 2-Column Responsive Workspace: Podium on Left, Directory on Right */}
      <div className="grid gap-3.5 lg:grid-cols-12 items-start">
        {/* 🏆 3D Animated Podium Display (4 Columns) */}
        {board.length > 0 && (
          <div className="lg:col-span-5 p-4 rounded-2xl cyber-glass-card shadow-2xs space-y-3">
            <h3 className="font-extrabold text-xs text-white flex items-center gap-1.5 border-b border-cyan-500/20 pb-2">
              <Crown size={14} className="text-amber-400" />
              <span>Top 3 Champions</span>
            </h3>

            <div className="grid gap-2 grid-cols-3 items-end pt-5 pb-1">
              {/* 2nd place (Left) */}
              {top2 ? (
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="p-3 rounded-2xl text-center space-y-1.5 flex flex-col justify-end h-36 bg-gradient-to-t from-slate-500/20 via-slate-500/5 to-transparent border border-slate-400/30 shadow-md"
                >
                  <div className="h-9 w-9 bg-gradient-to-br from-slate-400 to-slate-600 text-white rounded-xl flex items-center justify-center text-xs font-black mx-auto border border-white/40 shadow-sm">
                    2
                  </div>
                  <div>
                    <h4 className="font-black text-[11px] text-foreground truncate">{top2.name}</h4>
                    <span className="text-[9px] font-extrabold text-slate-400 font-mono">{top2.score} pts</span>
                  </div>
                </motion.div>
              ) : <div className="h-36" />}

              {/* 1st place (Center) */}
              {top1 ? (
                <motion.div 
                  initial={{ y: 25, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="p-3.5 rounded-2xl text-center space-y-2 flex flex-col justify-end h-44 bg-gradient-to-t from-amber-500/25 via-amber-400/10 to-transparent border-2 border-amber-400 shadow-xl shadow-amber-500/15 relative -translate-y-1.5"
                >
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Crown className="text-amber-400 animate-bounce" size={18} />
                  </div>
                  <div className="h-11 w-11 bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-xl flex items-center justify-center text-sm font-black mx-auto border border-white/60 shadow-md">
                    1
                  </div>
                  <div>
                    <h4 className="font-black text-xs text-foreground truncate">{top1.name}</h4>
                    <span className="text-[10px] font-black text-amber-400 font-mono">{top1.score} pts</span>
                  </div>
                </motion.div>
              ) : <div className="h-44" />}

              {/* 3rd place (Right) */}
              {top3 ? (
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="p-3 rounded-2xl text-center space-y-1.5 flex flex-col justify-end h-32 bg-gradient-to-t from-amber-700/20 via-amber-600/5 to-transparent border border-amber-700/30 shadow-md"
                >
                  <div className="h-8 w-8 bg-gradient-to-br from-amber-600 to-amber-800 text-white rounded-xl flex items-center justify-center text-[11px] font-black mx-auto border border-white/40 shadow-sm">
                    3
                  </div>
                  <div>
                    <h4 className="font-black text-[11px] text-foreground truncate">{top3.name}</h4>
                    <span className="text-[9px] font-extrabold text-amber-600 font-mono">{top3.score} pts</span>
                  </div>
                </motion.div>
              ) : <div className="h-32" />}
            </div>
          </div>
        )}

        {/* Rankings list table (7 Columns) */}
        <div className={`${board.length > 0 ? 'lg:col-span-7' : 'lg:col-span-12'} rounded-2xl cyber-glass-card p-4 shadow-2xs space-y-2.5`}>
          <h3 className="text-xs font-black text-white border-b border-cyan-500/20 pb-2 flex items-center gap-1.5">
            <Medal size={14} className="text-cyan-400" />
            <span>Global Rankings Directory</span>
          </h3>
          
          <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground uppercase font-bold text-[9px] tracking-wider">
                  <th className="py-2 px-2.5 w-12">Rank</th>
                  <th className="py-2 px-2.5">Student</th>
                  <th className="py-2 px-2.5 text-center">Lessons</th>
                  <th className="py-2 px-2.5 text-center">Quizzes</th>
                  <th className="py-2 px-2.5 text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {board.map((student, index) => {
                  const rank = index + 1;
                  return (
                    <tr key={student.email} className={`hover:bg-muted/30 transition-colors ${rank <= 3 ? 'font-bold bg-cyan-500/5' : ''}`}>
                      <td className="py-2 px-2.5 font-mono font-bold text-[11px]">
                        {rank === 1 ? '🥇 1' : rank === 2 ? '🥈 2' : rank === 3 ? '🥉 3' : `#${rank}`}
                      </td>
                      <td className="py-2 px-2.5">
                        <div>
                          <h4 className="text-xs font-bold text-foreground truncate max-w-[140px]">{student.name}</h4>
                          <span className="text-[9px] text-muted-foreground truncate block max-w-[140px]">{student.email}</span>
                        </div>
                      </td>
                      <td className="py-2 px-2.5 text-center font-medium text-muted-foreground">{student.lessons_completed}</td>
                      <td className="py-2 px-2.5 text-center font-medium text-muted-foreground">{student.quizzes_passed}</td>
                      <td className="py-2 px-2.5 text-right font-mono font-black text-cyan-400">{student.score} pts</td>
                    </tr>
                  );
                })}
                {board.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground font-medium italic">
                      Leaderboard is currently empty.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
