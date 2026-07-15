import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import { toggleTheme } from '../../../features/themeSlice';
import { Sun, Moon, Bell } from 'lucide-react';
import toast from 'react-hot-toast';

export const SettingsTab: React.FC = () => {
  const dispatch = useDispatch();
  const { mode } = useSelector((state: RootState) => state.theme);

  // States
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [pushAlerts, setPushAlerts] = useState(true);

  const handleSavePreferences = () => {
    toast.success('System preferences stored!');
  };

  return (
    <div className="space-y-6 text-xs max-w-2xl">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Security & Preferences</h1>
        <p className="text-muted-foreground text-sm mt-1">Configure layout appearance settings, toggle staff email warnings, and check security rules.</p>
      </div>

      <div className="space-y-6">
        {/* Theme Preferences */}
        <div className="p-6 glass-card rounded-2xl border border-border/50 space-y-4">
          <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
            <Sun size={15} className="text-primary" />
            <span>Theme Preferences</span>
          </h3>
          
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground font-semibold">Active Portal Theme: <span className="text-foreground capitalize font-bold">{mode} mode</span></span>
            
            <button 
              onClick={() => dispatch(toggleTheme())}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-muted/80 border border-border rounded-xl font-bold transition-all text-[11px]"
            >
              {mode === 'dark' ? <Sun size={12} className="text-yellow-500" /> : <Moon size={12} />}
              <span>Toggle Theme</span>
            </button>
          </div>
        </div>

        {/* Notifications preferences */}
        <div className="p-6 glass-card rounded-2xl border border-border/50 space-y-4">
          <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
            <Bell size={15} className="text-primary" />
            <span>Email Warn preferences</span>
          </h3>

          <div className="space-y-3.5">
            {[
              { label: 'Weekly submissions checklist digest', desc: 'Get updates on queued assignments awaiting grading evaluations.', value: emailAlerts, setter: setEmailAlerts },
              { label: 'System status warning alerts', desc: 'Recieve real-time logs alerts on core errors.', value: pushAlerts, setter: setPushAlerts }
            ].map((opt, idx) => (
              <div key={idx} className="flex items-start justify-between gap-4">
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
              className="w-full py-2 bg-primary text-primary-foreground font-bold rounded-xl shadow-md"
            >
              Save Preferences
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default SettingsTab;
