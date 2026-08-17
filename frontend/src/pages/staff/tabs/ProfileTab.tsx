import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { updateUser } from '../../../features/authSlice';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { Users, Key, Save, Eye, EyeOff } from 'lucide-react';
import { getInitials } from '../../../utils/stringUtils';

interface UserProfile {
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  phone?: string;
  profile_photo?: string;
}

export const ProfileTab: React.FC = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  // Password reset inputs
  const [oldPassword, setOldPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Profile fields state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');

  // 1. Fetch Profile
  const { data: profile } = useQuery<UserProfile>({
    queryKey: ['staff-profile-data'],
    queryFn: async () => {
      const res = await api.get('users/profile/');
      const d = res.data;
      setFirstName(d.first_name || '');
      setLastName(d.last_name || '');
      setPhone(d.phone || '');
      setProfilePhoto(d.profile_photo || '');
      return d;
    }
  });

  // Profile Save Mutation
  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      await api.put('users/profile/', {
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        profile_photo: profilePhoto
      });
    },
    onSuccess: () => {
      dispatch(updateUser({
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        profile_photo: profilePhoto
      }));
      queryClient.invalidateQueries({ queryKey: ['staff-profile-data'] });
      toast.success('Operational profile updated.');
    },
    onError: () => {
      toast.error('Failed to update details.');
    }
  });

  // Password Update Mutation
  const updatePasswordMutation = useMutation({
    mutationFn: async () => {
      await api.post('users/profile/reset-password/', {
        old_password: oldPassword,
        password: newPassword
      });
    },
    onSuccess: () => {
      setOldPassword('');
      setNewPassword('');
      toast.success('Security password updated.');
    },
    onError: () => {
      toast.error('Old password mismatch or complexity check failed.');
    }
  });

  return (
    <div className="space-y-6 text-xs max-w-4xl">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Staff Account Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">Configure profile photos, personal coordinates, and reset access passwords.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Card */}
        <form 
          onSubmit={(e) => { e.preventDefault(); saveProfileMutation.mutate(); }}
          className="p-6 glass-card border border-border/50 rounded-2xl space-y-4 flex flex-col justify-between"
        >
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Users size={15} className="text-primary" />
              <span>Details coordinates</span>
            </h3>

            <div className="flex items-center gap-3.5 pb-2">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-primary-foreground font-extrabold text-lg shadow shadow-primary/10">
                {getInitials(profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}` : '', 'O')}
              </div>
              <div>
                <h4 className="font-extrabold text-foreground">{profile?.first_name} {profile?.last_name}</h4>
                <span className="text-[10px] uppercase font-bold text-primary tracking-wider">{profile?.role} account</span>
              </div>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <div>
                <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">First Name</label>
                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none" />
              </div>
              <div>
                <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Last Name</label>
                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Email (read-only)</label>
              <input type="email" value={profile?.email || ''} readOnly className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none text-muted-foreground cursor-not-allowed font-medium" />
            </div>

            <div>
              <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Phone Connection</label>
              <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 ..." className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none" />
            </div>
          </div>

          <button type="submit" disabled={saveProfileMutation.isPending} className="w-full py-2.5 mt-4 bg-primary text-primary-foreground font-bold rounded-xl shadow-md flex items-center justify-center gap-1.5">
            <Save size={12} />
            <span>Save Profile</span>
          </button>
        </form>

        {/* Security Reset password */}
        <form 
          onSubmit={(e) => { e.preventDefault(); updatePasswordMutation.mutate(); }}
          className="p-6 glass-card border border-border/50 rounded-2xl space-y-4 flex flex-col justify-between"
        >
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Key size={15} className="text-primary" />
              <span>Password Lock update</span>
            </h3>

            <div>
              <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Current Account Password</label>
              <div className="relative">
                <input 
                  type={showOldPassword ? "text" : "password"} 
                  value={oldPassword} 
                  onChange={(e) => setOldPassword(e.target.value)} 
                  required 
                  placeholder="••••••••" 
                  autoComplete="current-password" 
                  className="w-full h-10 pl-3 pr-10 bg-muted/40 border border-border rounded-xl outline-none" 
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                  title={showOldPassword ? "Hide password" : "Show password"}
                >
                  {showOldPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">New Security Password</label>
              <div className="relative">
                <input 
                  type={showNewPassword ? "text" : "password"} 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  required 
                  placeholder="••••••••" 
                  autoComplete="new-password" 
                  className="w-full h-10 pl-3 pr-10 bg-muted/40 border border-border rounded-xl outline-none" 
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                  title={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          </div>

          <button type="submit" disabled={updatePasswordMutation.isPending} className="w-full py-2.5 mt-4 bg-primary text-primary-foreground font-bold rounded-xl shadow-md flex items-center justify-center gap-1.5">
            <Save size={12} />
            <span>Update Password</span>
          </button>
        </form>
      </div>
    </div>
  );
};
export default ProfileTab;
