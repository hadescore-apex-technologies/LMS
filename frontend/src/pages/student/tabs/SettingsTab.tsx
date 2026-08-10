import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';
import { 
  Shield, Bell, Settings, Smartphone, 
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
  // Notification States
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [pushAlerts, setPushAlerts] = useState(true);
  const [forumAlerts, setForumAlerts] = useState(false);
  
  // Password States
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

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

  const handleUpdatePassword = async () => {
    if (!newPassword.trim()) {
      toast.error('Password cannot be empty');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    try {
      setIsUpdatingPassword(true);
      await api.put('users/profile/', { password: newPassword });
      toast.success('Password updated successfully');
      setNewPassword('');
    } catch (err: any) {
      toast.error('Failed to update password');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-8 text-xs max-w-4xl">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Security & Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Configure notification rules and monitor active security sessions.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Side: Preferences */}
        <div className="space-y-6">
          {/* Appearance card */}
          <div className="p-6 glass-card rounded-2xl border border-border/50 space-y-4">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Settings size={15} className="text-primary" />
              <span>Appearance</span>
            </h3>
            
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-semibold">Active Theme: <span className="text-foreground capitalize">Light mode</span></span>
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
                { label: 'Queries Mentions', desc: 'Recieve updates when staff reply to your queries.', value: forumAlerts, setter: setForumAlerts }
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

        {/* Right Side: Security sessions & Password */}
        <div className="space-y-6">
          {/* Change Password Card */}
          <div className="p-6 glass-card rounded-2xl border border-border/50 space-y-4">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Shield size={15} className="text-primary" />
              <span>Update Password</span>
            </h3>
            <p className="text-[10px] text-muted-foreground leading-normal">
              Ensure your account is using a long, random password to stay secure.
            </p>
            <div className="space-y-3">
              <input 
                type="password" 
                placeholder="New Password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-xs text-foreground focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              />
              <button 
                onClick={handleUpdatePassword}
                disabled={isUpdatingPassword}
                className="w-full py-2 bg-primary text-primary-foreground font-bold rounded-xl shadow-md hover:brightness-110 transition-all text-xs disabled:opacity-50"
              >
                {isUpdatingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </div>

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
    </div>
  );
};
