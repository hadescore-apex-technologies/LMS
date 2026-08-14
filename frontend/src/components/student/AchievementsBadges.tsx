import React from 'react';
import api from '../../services/api';
import { Award, Flame, Calendar, BookOpen, FileCheck, CheckCircle2, Sparkles, Lock } from 'lucide-react';
import { motion, type Variants } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';

interface Badge {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  unlocked_at: string | null;
}

interface AchievementsData {
  streak: number;
  lessons_completed: number;
  quizzes_passed: number;
  assignments_submitted: number;
  badges: Badge[];
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } }
};

const AchievementsBadges: React.FC = () => {
  const { data } = useQuery<AchievementsData>({
    queryKey: ['student-achievements-tab'],
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const res = await api.get('users/profile/achievements/');
      return res.data;
    }
  });

  if (!data) return null;

  return (
    <div className="w-full space-y-3.5 animate-fade-in text-xs">
      {/* Clean Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-border/50 pb-2.5">
        <div>
          <h1 className="text-lg font-black tracking-tight text-foreground flex items-center gap-2">
            <Flame className="text-orange-400" size={18} />
            <span>Skill Badges & Milestones</span>
          </h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Unlock achievements by maintaining your study streak and passing evaluations.
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-card border border-border/80 text-[10px] font-extrabold text-orange-400">
          {data.badges.filter(b => b.unlocked).length} / {data.badges.length} Unlocked
        </span>
      </div>

      {/* Top row: Streak Widget & Stats Summary */}
      <div className="grid gap-3 md:grid-cols-3">
        {/* Streak Flame Tracker */}
        <div className="md:col-span-1 rounded-2xl cyber-glass-card border-orange-500/40 p-3.5 shadow-2xs flex items-center justify-between bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 shadow-[0_0_12px_rgba(249,115,22,0.3)]">
              <Flame className="animate-pulse" size={24} />
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Study Streak</span>
              <span className="text-2xl font-black text-white leading-tight">{data.streak} Days</span>
            </div>
          </div>
          <span className="text-[9px] font-black text-orange-400 bg-orange-500/15 px-2 py-0.5 rounded-full uppercase border border-orange-500/30">Active</span>
        </div>

        {/* Dynamic Study Metrics */}
        <div className="md:col-span-2 rounded-2xl cyber-glass-card p-3 shadow-2xs grid gap-2 grid-cols-3 items-center">
          <div className="text-center space-y-0.5">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Videos Done</span>
            <span className="text-lg font-black text-white">{data.lessons_completed}</span>
          </div>

          <div className="text-center space-y-0.5 border-x border-cyan-500/20">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Quizzes Passed</span>
            <span className="text-lg font-black text-white">{data.quizzes_passed}</span>
          </div>

          <div className="text-center space-y-0.5">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Deliverables</span>
            <span className="text-lg font-black text-white">{data.assignments_submitted}</span>
          </div>
        </div>
      </div>

      {/* Badges Milestones Gallery (Dense Grid) */}
      <div className="rounded-2xl cyber-glass-card p-4 shadow-2xs space-y-3">
        <h3 className="text-xs font-black text-white border-b border-cyan-500/20 pb-2 flex items-center gap-1.5">
          <Award className="text-cyan-400" size={14} />
          <span>Milestones & Achievement Badges</span>
        </h3>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {data.badges.map((badge) => {
            return (
              <motion.div
                variants={itemVariants}
                key={badge.id}
                whileHover={badge.unlocked ? { y: -2 } : {}}
                className={`p-3 rounded-xl border flex gap-3 transition-all duration-200 ${
                  badge.unlocked
                    ? 'cyber-glass-card border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.2)] hover:border-cyan-400'
                    : 'bg-slate-950/60 border-slate-800/80 opacity-40'
                }`}
              >
                <div
                  className={`h-9 w-9 rounded-xl flex items-center justify-center border shrink-0 shadow-2xs ${
                    badge.unlocked
                      ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                      : 'bg-slate-900 text-slate-500 border-slate-800'
                  }`}
                >
                  {badge.unlocked ? <Award size={16} /> : <Lock size={14} />}
                </div>
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="font-extrabold text-xs text-foreground truncate">{badge.title}</h4>
                    {badge.unlocked ? (
                      <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        Earned
                      </span>
                    ) : (
                      <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                        Locked
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground line-clamp-1 leading-snug">{badge.description}</p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
};

export default AchievementsBadges;
