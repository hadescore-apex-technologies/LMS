import React, { useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { User, Phone, Mail, Award, Save, Loader2, Sparkles, Shield, KeyRound, Eye, EyeOff } from 'lucide-react';
import { getInitials } from '../../utils/stringUtils';
import { motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface ProfileData {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  categories: string[];
}

const StudentProfile: React.FC = () => {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { data: profile } = useQuery<ProfileData>({
    queryKey: ['student-profile-tab'],
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const res = await api.get('users/profile/');
      setFirstName(res.data.first_name || '');
      setLastName(res.data.last_name || '');
      setPhone(res.data.phone || '');
      return res.data;
    }
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload: any = {
        first_name: firstName,
        last_name: lastName,
        phone: phone,
      };
      if (password.trim().length >= 6) {
        payload.password = password.trim();
      } else if (password.trim().length > 0 && password.trim().length < 6) {
        toast.error('Password must be at least 6 characters');
        setSaving(false);
        return;
      }

      await api.post('users/profile/', payload);
      toast.success('Profile updated successfully!');
      // Update local storage user name
      const stored = localStorage.getItem('user');
      if (stored) {
        const u = JSON.parse(stored);
        u.first_name = firstName;
        u.last_name = lastName;
        localStorage.setItem('user', JSON.stringify(u));
      }
      
      setPassword('');
      queryClient.invalidateQueries({ queryKey: ['student-profile-tab'] });
    } catch (err) {
      toast.error('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-4xl space-y-5 animate-fade-in text-xs">
      {/* Clean Header */}
      <div className="flex items-center gap-4 border-b border-border/50 pb-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-black text-lg shadow-md border border-cyan-400">
          {getInitials(profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}` : '', 'S')}
        </div>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-foreground">
            {profile?.first_name} {profile?.last_name || ''}
          </h1>
          <p className="text-xs text-muted-foreground">{profile?.email}</p>
        </div>
      </div>

      {/* Profile Form Card */}
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-3xl cyber-glass-card p-6 md:p-8 shadow-sm space-y-5"
      >
        <h3 className="text-sm font-extrabold text-white border-b border-cyan-500/20 pb-3 flex items-center gap-2">
          <User className="text-cyan-400" size={16} />
          <span>Account Settings & Credentials</span>
        </h3>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full h-11 px-4 bg-muted/30 border border-border/80 rounded-2xl outline-none focus:border-cyan-500 font-semibold text-foreground transition-all"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full h-11 px-4 bg-muted/30 border border-border/80 rounded-2xl outline-none focus:border-cyan-500 font-semibold text-foreground transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Email Address (Read-only)</label>
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 text-muted-foreground/60" size={15} />
              <input
                type="email"
                value={profile?.email}
                disabled
                className="w-full h-11 pl-11 pr-4 bg-muted/50 border border-border/60 rounded-2xl outline-none text-muted-foreground font-bold cursor-not-allowed"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-4 top-3.5 text-muted-foreground/60" size={15} />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 XXXXX XXXXX"
                className="w-full h-11 pl-11 pr-4 bg-muted/30 border border-border/80 rounded-2xl outline-none focus:border-cyan-500 font-semibold text-foreground transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Update Password (Optional)</label>
            <div className="relative">
              <KeyRound className="absolute left-4 top-3.5 text-muted-foreground/60" size={15} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password to update"
                className="w-full h-11 pl-11 pr-11 bg-muted/30 border border-border/80 rounded-2xl outline-none focus:border-cyan-500 font-semibold text-foreground transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-border/60">
            <button
              type="submit"
              disabled={saving}
              className="px-6 h-11 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-extrabold rounded-2xl flex items-center gap-2 shadow-lg shadow-cyan-500/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              {saving ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />}
              <span>Save Profile Changes</span>
            </button>
          </div>
        </form>
      </motion.div>

      {profile?.categories && profile.categories.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm space-y-3"
        >
          <h3 className="text-sm font-extrabold text-foreground border-b border-border/60 pb-3 flex items-center gap-2">
            <Award className="text-cyan-600" size={16} />
            <span>Assigned Learning Domains</span>
          </h3>
          <div className="flex flex-wrap gap-2 pt-1">
            {profile.categories.map((cat) => (
              <span
                key={cat}
                className="text-[10px] font-black uppercase tracking-wider px-3.5 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-700 rounded-full"
              >
                {cat}
              </span>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default StudentProfile;
