import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import { toggleTheme } from '../../../features/themeSlice';
import api from '../../../services/api';
import { 
  Shield, Bell, Moon, Sun, Smartphone, 
  MapPin, Clock 
} from 'lucide-react';
import toast from 'react-hot-toast';

interface LoginRecord {
  id: number;
  timestamp: string;
  ip_address: string;
  user_agent: string;
}

export const SettingsTab: React.FC = () => {
  const dispatch = useDispatch();
  const { mode } = useSelector((state: RootState) => state.theme);
  
  // Notification States
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [pushAlerts, setPushAlerts] = useState(true);
  const [forumAlerts, setForumAlerts] = useState(false);

  // 1. Fetch Login History
  const { data: sessions = [], isLoading } = useQuery<LoginRecord[]>({
    queryKey: ['login-history'],
    queryFn: async () => {
      const res = await api.get('users/profile/login-history/');
      return res.data;
    }
  });

  const handleSavePreferences = () => {
    toast.success('Notification preferences updated!');
  };

  return (
    <div className="space-y-8 text-xs max-w-4xl">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Security & Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Configure layout themes, toggle email notification rules, and monitor active security sessions.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Side: Preferences */}
        <div className="space-y-6">
          {/* Theme card */}
          <div className="p-6 glass-card rounded-2xl border border-border/50 space-y-4">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Sun size={15} className="text-primary" />
              <span>Theme Preferences</span>
            </h3>
            
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-semibold">Active Theme: <span className="text-foreground capitalize">{mode} mode</span></span>
              
              <button 
                onClick={() => dispatch(toggleTheme())}
                className="flex items-center gap-2 px-3 py-1.5 bg-muted hover:bg-muted/80 border border-border rounded-xl font-bold transition-all text-[11px]"
              >
                {mode === 'dark' ? <Sun size={12} className="text-yellow-500" /> : <Moon size={12} />}
                <span>Toggle Theme</span>
              </button>
            </div>
          </div>

          {/* Notifications config */}
          <div className="p-6 glass-card rounded-2xl border border-border/50 space-y-4">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Bell size={15} className="text-primary" />
              <span>Notification Rules</span>
            </h3>

            <div className="space-y-3.5">
              {[
                { label: 'Academic Email Reports', desc: 'Recieve course outlines, grades, and certificates directly on your email.', value: emailAlerts, setter: setEmailAlerts },
                { label: 'Push Notifications', desc: 'Recieve alerts about upcoming live webinars and task deadlines.', value: pushAlerts, setter: setPushAlerts },
                { label: 'Forum Mentions', desc: 'Recieve updates when peers reply to your discussion posts.', value: forumAlerts, setter: setForumAlerts }
              ].map((opt, i) => (
                <div key={i} className="flex items-start justify-between gap-4">
                  <div className="space-y-0.5">
                    <h5 className="font-bold text-foreground">{opt.label}</h5>
                    <p className="text-[10px] text-muted-foreground leading-normal">{opt.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={opt.value}
                    onChange={(e) => opt.setter(e.target.checked)}
                    className="accent-primary h-4 w-4 shrink-0 mt-0.5"
                  />
                </div>
              ))}

              <button 
                onClick={handleSavePreferences}
                className="w-full py-2 bg-primary text-primary-foreground font-bold rounded-xl shadow-md hover:brightness-110 transition-all text-xs"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Security sessions */}
        <div className="p-6 glass-card rounded-2xl border border-border/50 flex flex-col justify-between space-y-4">
          <div className="space-y-1 border-b border-border/50 pb-3">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Shield size={15} className="text-primary" />
              <span>Active Security Sessions</span>
            </h3>
            <p className="text-[10px] text-muted-foreground">Monitor log IPs and devices linked to your account credentials.</p>
          </div>

          <div className="divide-y divide-border overflow-y-auto max-h-80 pr-1">
            {isLoading ? (
              <div className="py-12 text-center text-muted-foreground">
                <span>Loading sessions...</span>
              </div>
            ) : sessions.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <span>No session history registered.</span>
              </div>
            ) : (
              sessions.map(sess => (
                <div key={sess.id} className="py-3 flex items-start gap-3 text-[11px]">
                  <div className="p-2 bg-muted/40 border border-border rounded-lg text-primary shrink-0 mt-0.5">
                    <Smartphone size={13} />
                  </div>
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-foreground truncate flex items-center gap-1">
                        <MapPin size={10} className="text-muted-foreground" />
                        <span>IP: {sess.ip_address || 'Localhost'}</span>
                      </span>
                      <span className="text-[9px] text-muted-foreground flex items-center gap-0.5 shrink-0">
                        <Clock size={9} />
                        <span>{new Date(sess.timestamp).toLocaleDateString()}</span>
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">{sess.user_agent || 'Unknown browser / user-agent details'}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
