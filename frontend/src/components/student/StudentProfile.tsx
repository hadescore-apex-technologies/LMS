import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { User, Phone, Mail, Award, Save, Loader2 } from 'lucide-react';

interface ProfileData {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  categories: string[];
}

import { useQuery } from '@tanstack/react-query';

const StudentProfile: React.FC = () => {
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

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
      await api.post('users/profile/', {
        first_name: firstName,
        last_name: lastName,
        phone: phone,
      });
      toast.success('Profile updated successfully!');
      // Update local storage user name
      const stored = localStorage.getItem('user');
      if (stored) {
        const u = JSON.parse(stored);
        u.first_name = firstName;
        u.last_name = lastName;
        localStorage.setItem('user', JSON.stringify(u));
      }
      fetchProfile();
    } catch (err) {
      toast.error('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in text-xs">
      <div className="glass-panel p-6 rounded-2xl shadow-sm space-y-4">
        <h3 className="text-sm font-bold border-b border-border pb-3 flex items-center gap-2">
          <User className="text-primary" size={16} />
          <span>My Profile Credentials</span>
        </h3>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase">First Name</label>
              <div className="relative">
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full h-10 px-3.5 bg-background border border-border rounded-xl outline-none focus:border-primary/40 transition-all font-medium text-foreground"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase">Last Name</label>
              <div className="relative">
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full h-10 px-3.5 bg-background border border-border rounded-xl outline-none focus:border-primary/40 transition-all font-medium text-foreground"
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 text-muted-foreground/60" size={14} />
              <input
                type="email"
                value={profile?.email}
                disabled
                className="w-full h-10 pl-10 pr-3.5 bg-muted/40 border border-border rounded-xl outline-none text-muted-foreground font-semibold cursor-not-allowed"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-3 text-muted-foreground/60" size={14} />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 XXXXX XXXXX"
                className="w-full h-10 pl-10 pr-3.5 bg-background border border-border rounded-xl outline-none focus:border-primary/40 transition-all font-medium text-foreground"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 h-10 bg-primary text-primary-foreground font-semibold rounded-xl flex items-center gap-2 hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
              <span>Save Profile</span>
            </button>
          </div>
        </form>
      </div>

      {profile?.categories && profile.categories.length > 0 && (
        <div className="glass-panel p-6 rounded-2xl shadow-sm space-y-3">
          <h3 className="text-sm font-bold border-b border-border pb-3 flex items-center gap-2">
            <Award className="text-primary" size={16} />
            <span>Assigned Learning Domains</span>
          </h3>
          <div className="flex flex-wrap gap-2 pt-1">
            {profile.categories.map((cat) => (
              <span
                key={cat}
                className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 bg-primary/10 border border-primary/20 text-primary rounded-xl"
              >
                {cat}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentProfile;
