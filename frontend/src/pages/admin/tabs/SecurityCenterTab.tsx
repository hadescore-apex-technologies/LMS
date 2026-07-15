import React, { useState } from 'react';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { Lock, ShieldAlert } from 'lucide-react';

export const SecurityCenterTab: React.FC = () => {
  const [revoking, setRevoking] = useState(false);
  const [mfaReady, setMfaReady] = useState(true);

  const handleRevokeAllSessions = async () => {
    if (!window.confirm("WARNING: This will instantly log out all active user sessions across the entire platform. You will be forced to log in again. Proceed?")) return;
    setRevoking(true);
    try {
      await api.post('auth/revoke-all/');
      toast.success("All active JWT sessions successfully revoked.");
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch {
      toast.error("Failed to revoke active sessions.");
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div className="space-y-6 text-xs max-w-2xl animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Security & Firewalls</h1>
        <p className="text-muted-foreground text-sm mt-1 font-medium">Manage security policies, active user tokens, and revoke JWT access coordinates.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Revoke Sessions */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-500/10 text-red-500 rounded-xl"><ShieldAlert size={18} /></div>
              <h3 className="font-semibold text-base text-red-500">Revoke Active Sessions</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">Invalidate all user tokens database lists. Forces login checks.</p>
          </div>

          <button onClick={handleRevokeAllSessions} disabled={revoking}
            className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white disabled:opacity-50 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2">
            {revoking ? 'Revoking sessions...' : 'Revoke All Access Tokens'}
          </button>
        </div>

        {/* 2FA configuration */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 text-primary rounded-xl"><Lock size={18} /></div>
              <h3 className="font-semibold text-base">Two-Factor Authentication</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">Toggle mandatory 2FA OTP codes validation guidelines for staff login.</p>
          </div>

          <div className="flex items-center justify-between border-t border-border/40 pt-3">
            <span className="font-bold text-muted-foreground uppercase">Enable MFA OTP:</span>
            <input type="checkbox" checked={mfaReady} onChange={(e) => setMfaReady(e.target.checked)} className="accent-primary h-4.5 w-4.5 cursor-pointer" />
          </div>
        </div>
      </div>
    </div>
  );
};
export default SecurityCenterTab;
