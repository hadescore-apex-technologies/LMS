import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import {
  Shield, Plus, Trash2, UserCheck, UserX,
  Crown, Copy, Eye, EyeOff, Lock, CheckCircle, AlertTriangle, X, KeyRound
} from 'lucide-react';
import toast from 'react-hot-toast';

const ROOT_EMAIL = 'hadescore.apex.technologies@gmail.com';

interface AdminUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  date_joined: string;
  is_root: boolean;
}

export const AdminManagerTab: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = React.useState(false);
  const [showPass, setShowPass] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState<AdminUser | null>(null);
  const [resetTarget, setResetTarget] = React.useState<AdminUser | null>(null);
  const [resetPassword, setResetPassword] = React.useState('');
  const [showResetPass, setShowResetPass] = React.useState(false);
  const [form, setForm] = React.useState({ first_name: '', last_name: '', email: '', password: '' });

  const { data: admins = [], isLoading } = useQuery<AdminUser[]>({
    queryKey: ['admin-manager'],
    queryFn: async () => { const res = await api.get('users/admin-manager/'); return res.data; },
    enabled: user?.email === ROOT_EMAIL,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await api.post('users/admin-manager/', data);
      return res.data;
    },
    onSuccess: (newAdmin: AdminUser) => {
      queryClient.setQueryData<AdminUser[]>(['admin-manager'], (old = []) => [...old, newAdmin]);
      toast.success('Admin account created for ' + newAdmin.email);
      setForm({ first_name: '', last_name: '', email: '', password: '' });
      setShowForm(false);
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to create admin.'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete('users/admin-manager/', { data: { id } });
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData<AdminUser[]>(['admin-manager'], (old = []) => old.filter(a => a.id !== id));
      toast.success('Admin account deleted.');
      setConfirmDelete(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to delete admin.'),
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.patch('users/admin-manager/', { id });
      return { id, is_active: res.data.is_active };
    },
    onSuccess: ({ id, is_active }) => {
      queryClient.setQueryData<AdminUser[]>(['admin-manager'], (old = []) =>
        old.map(a => a.id === id ? { ...a, is_active } : a)
      );
      toast.success(is_active ? 'Admin activated.' : 'Admin deactivated.');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to update admin.'),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ id, password }: { id: number; password: string }) => {
      const res = await api.put('users/admin-manager/', { id, password });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Password updated successfully!');
      setResetTarget(null);
      setResetPassword('');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to update password.'),
  });

  const generatePassword = (setter: (p: string) => void) => {
    const chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefghjkmnpqrstwxyz23456789@#!';
    setter(Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied!');
  };

  if (user?.email?.toLowerCase().trim() !== ROOT_EMAIL) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <Lock size={40} className="text-destructive opacity-60" />
        <div>
          <h2 className="text-lg font-bold text-foreground">Access Restricted</h2>
          <p className="text-sm text-muted-foreground mt-1">Only the root administrator can manage admin accounts.</p>
        </div>
      </div>
    );
  }

  const rootAdmin = admins.find(a => a.is_root);
  const subAdmins = admins.filter(a => !a.is_root);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Crown size={22} className="text-amber-500" />
            Admin Manager
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">Root-only - Create and manage administrator accounts</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold shadow-md hover:bg-primary/90 transition-all active:scale-95"
        >
          <Plus size={14} /> New Admin
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="rounded-2xl border border-primary/30 bg-card shadow-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
              <Shield size={14} className="text-primary" />Create New Admin Account
            </h3>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">First Name</label>
              <input className="w-full h-9 px-3 bg-background border border-border rounded-xl text-xs focus:outline-none focus:border-primary/50"
                placeholder="e.g. Arjun" value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Last Name</label>
              <input className="w-full h-9 px-3 bg-background border border-border rounded-xl text-xs focus:outline-none focus:border-primary/50"
                placeholder="e.g. Kumar" value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Email Address</label>
              <input className="w-full h-9 px-3 bg-background border border-border rounded-xl text-xs focus:outline-none focus:border-primary/50"
                placeholder="manager@yourcompany.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Password</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input type={showPass ? 'text' : 'password'}
                    className="w-full h-9 pl-3 pr-8 bg-background border border-border rounded-xl text-xs focus:outline-none focus:border-primary/50"
                    placeholder="Leave blank for auto-generated" value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                  <button onClick={() => setShowPass(v => !v)} type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPass ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                </div>
                <button onClick={() => generatePassword(p => setForm(f => ({ ...f, password: p })))} type="button"
                  className="px-3 h-9 border border-border bg-muted rounded-xl text-[10px] font-bold hover:bg-muted/80 whitespace-nowrap">Auto-generate</button>
                <button onClick={() => copyToClipboard(form.password)} type="button"
                  className="px-3 h-9 border border-border bg-muted rounded-xl hover:bg-muted/80"><Copy size={12} /></button>
              </div>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.email}
              className="flex-1 h-9 bg-primary text-primary-foreground font-bold rounded-xl text-xs hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">
              {createMutation.isPending ? 'Creating...' : 'Create Admin Account'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 h-9 border border-border rounded-xl text-xs font-semibold hover:bg-muted">Cancel</button>
          </div>
        </div>
      )}

      {/* Root Admin Card */}
      {rootAdmin && (
        <div className="rounded-2xl border border-amber-400/40 bg-amber-50/5 p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
              <Crown size={18} className="text-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-foreground">{rootAdmin.first_name} {rootAdmin.last_name}</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">Root Admin</span>
              </div>
              <span className="text-[11px] text-muted-foreground font-mono">{rootAdmin.email}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setResetTarget(rootAdmin!); setResetPassword(''); }}
              title="Reset Root Password"
              className="w-8 h-8 rounded-xl flex items-center justify-center border border-indigo-200 dark:border-indigo-800/40 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all hover:scale-105"
            >
              <KeyRound size={13} />
            </button>
            <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle size={14} />Always Active
            </div>
          </div>
        </div>
      )}

      {/* Sub-admins List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Manager Admins ({subAdmins.length})</h3>
        {isLoading ? (
          <div className="text-center py-10 text-muted-foreground text-sm">Loading...</div>
        ) : subAdmins.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <Shield size={32} className="mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm font-semibold text-muted-foreground">No manager admins yet</p>
            <p className="text-[11px] text-muted-foreground/70 mt-1">Click "New Admin" to create an admin account for your managers.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {subAdmins.map(admin => (
              <div key={admin.id} className={`rounded-2xl border p-4 flex items-center justify-between gap-4 transition-all ${admin.is_active ? 'border-border bg-card' : 'border-border/50 bg-muted/20 opacity-60'}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-black ${admin.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {(admin.first_name?.[0] || admin.email[0]).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-foreground">{admin.first_name} {admin.last_name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide ${admin.is_active ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                        {admin.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-mono truncate block">{admin.email}</span>
                    <span className="text-[10px] text-muted-foreground/60">
                      Created: {new Date(admin.date_joined).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => { setResetTarget(admin); setResetPassword(''); }}
                    title="Reset Password"
                    className="w-8 h-8 rounded-xl flex items-center justify-center border border-indigo-200 dark:border-indigo-800/40 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all hover:scale-105"
                  >
                    <KeyRound size={13} />
                  </button>
                  <button
                    onClick={() => toggleMutation.mutate(admin.id)}
                    disabled={toggleMutation.isPending}
                    title={admin.is_active ? 'Deactivate' : 'Activate'}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all hover:scale-105 ${admin.is_active ? 'border-amber-200 dark:border-amber-800/40 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20' : 'border-emerald-200 dark:border-emerald-800/40 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'}`}
                  >
                    {admin.is_active ? <UserX size={13} /> : <UserCheck size={13} />}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(admin)}
                    title="Delete admin"
                    className="w-8 h-8 rounded-xl flex items-center justify-center border border-rose-200 dark:border-rose-800/40 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all hover:scale-105"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reset Password Modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <KeyRound size={18} className="text-indigo-500" />
              </div>
              <div>
                <h3 className="font-extrabold text-foreground text-sm">Reset Password</h3>
                <p className="text-[11px] text-muted-foreground font-mono">{resetTarget.email}</p>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">New Password</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showResetPass ? 'text' : 'password'}
                    className="w-full h-9 pl-3 pr-8 bg-background border border-border rounded-xl text-xs focus:outline-none focus:border-primary/50"
                    placeholder="Enter new password"
                    value={resetPassword}
                    onChange={e => setResetPassword(e.target.value)}
                  />
                  <button onClick={() => setShowResetPass(v => !v)} type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showResetPass ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                </div>
                <button onClick={() => generatePassword(setResetPassword)} type="button"
                  className="px-2 h-9 border border-border bg-muted rounded-xl text-[9px] font-bold hover:bg-muted/80 whitespace-nowrap">Generate</button>
                <button onClick={() => copyToClipboard(resetPassword)} type="button"
                  className="px-2 h-9 border border-border bg-muted rounded-xl hover:bg-muted/80"><Copy size={12} /></button>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => resetPasswordMutation.mutate({ id: resetTarget.id, password: resetPassword })}
                disabled={resetPasswordMutation.isPending || !resetPassword}
                className="flex-1 h-9 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-indigo-700 transition-all disabled:opacity-50"
              >
                {resetPasswordMutation.isPending ? 'Updating...' : 'Update Password'}
              </button>
              <button
                onClick={() => { setResetTarget(null); setResetPassword(''); }}
                className="flex-1 h-9 border border-border rounded-xl text-xs font-semibold hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                <AlertTriangle size={18} className="text-rose-500" />
              </div>
              <div>
                <h3 className="font-extrabold text-foreground text-sm">Delete Admin Account?</h3>
                <p className="text-[11px] text-muted-foreground">This action cannot be undone.</p>
              </div>
            </div>
            <div className="bg-muted/40 rounded-xl p-3">
              <p className="text-xs font-bold text-foreground">{confirmDelete.first_name} {confirmDelete.last_name}</p>
              <p className="text-[11px] font-mono text-muted-foreground">{confirmDelete.email}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => deleteMutation.mutate(confirmDelete.id)} disabled={deleteMutation.isPending}
                className="flex-1 h-9 bg-rose-500 text-white font-bold rounded-xl text-xs hover:bg-rose-600 disabled:opacity-50">
                {deleteMutation.isPending ? 'Deleting...' : 'Yes, Delete'}
              </button>
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 h-9 border border-border rounded-xl text-xs font-semibold hover:bg-muted">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
