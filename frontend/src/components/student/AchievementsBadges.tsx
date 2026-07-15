import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Award, Flame, Calendar, BookOpen, FileCheck, CheckCircle2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

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

const AchievementsBadges: React.FC = () => {
  const [data, setData] = useState<AchievementsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAchievements = async () => {
    try {
      setLoading(true);
      const res = await api.get('users/profile/achievements/');
      setData(res.data);
    } catch (err) {
      toast.error('Failed to load achievements.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAchievements();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in text-xs">
      {/* Top row: Streak Widget & Stats Summary */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Streak Flame Tracker */}
        <div className="md:col-span-1 glass-panel p-6 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center space-y-3 bg-gradient-to-br from-amber-500/5 to-orange-500/10">
          <div className="relative">
            <Flame className="text-orange-500 animate-pulse" size={50} style={{ filter: 'drop-shadow(0 4px 6px rgba(251,146,60,0.4))' }} />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Active Daily Streak</h4>
            <span className="text-3xl font-extrabold block text-foreground leading-none">{data.streak} Days</span>
            <p className="text-[10px] text-muted-foreground mt-1">Study consecutive days to grow your flame!</p>
          </div>
        </div>

        {/* Dynamic Study Metrics */}
        <div className="md:col-span-2 glass-panel p-6 rounded-2xl shadow-sm grid gap-4 grid-cols-3 items-center">
          <div className="text-center space-y-1">
            <div className="h-10 w-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center mx-auto mb-1.5 border border-primary/20">
              <BookOpen size={18} />
            </div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Videos Watched</span>
            <span className="text-base font-extrabold">{data.lessons_completed}</span>
          </div>

          <div className="text-center space-y-1">
            <div className="h-10 w-10 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-1.5 border border-emerald-500/20">
              <CheckCircle2 size={18} />
            </div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Quizzes Cleared</span>
            <span className="text-base font-extrabold">{data.quizzes_passed}</span>
          </div>

          <div className="text-center space-y-1">
            <div className="h-10 w-10 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center mx-auto mb-1.5 border border-amber-500/20">
              <FileCheck size={18} />
            </div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Homework Sent</span>
            <span className="text-base font-extrabold">{data.assignments_submitted}</span>
          </div>
        </div>
      </div>

      {/* Badges Milestones Gallery */}
      <div className="glass-panel p-6 rounded-2xl shadow-sm space-y-4">
        <h3 className="text-sm font-bold border-b border-border pb-3 flex items-center gap-2">
          <Award className="text-primary" size={16} />
          <span>Milestones & Achievement Badges</span>
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          {data.badges.map((badge) => {
            return (
              <div
                key={badge.id}
                className={`p-4 rounded-xl border flex gap-4 transition-all duration-300 ${
                  badge.unlocked
                    ? 'bg-gradient-to-tr from-primary/5 to-transparent border-primary/30 shadow-sm hover:shadow-md'
                    : 'bg-muted/10 border-border/40 opacity-55'
                }`}
              >
                <div
                  className={`h-12 w-12 rounded-xl flex items-center justify-center border shrink-0 ${
                    badge.unlocked
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-muted text-muted-foreground border-border/80'
                  }`}
                >
                  <Award size={22} />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-xs text-foreground truncate">{badge.title}</h4>
                    {badge.unlocked ? (
                      <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        Unlocked
                      </span>
                    ) : (
                      <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        Locked
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-normal">{badge.description}</p>
                  {badge.unlocked && badge.unlocked_at && (
                    <span className="text-[9px] text-muted-foreground/80 block pt-1 font-semibold flex items-center gap-1">
                      <Calendar size={8} /> Unlocked on: {new Date(badge.unlocked_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AchievementsBadges;
