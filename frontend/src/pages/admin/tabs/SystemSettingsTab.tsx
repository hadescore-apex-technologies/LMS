import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { Save, Globe, Mail, ShieldCheck } from 'lucide-react';

export const SystemSettingsTab: React.FC = () => {
  const queryClient = useQueryClient();

  // Branding states
  const [title, setTitle] = useState('HADESCORE APEX & TECHNOLOGIES');
  const [subtitle, setSubtitle] = useState('Enterprise LMS Platform');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#7c3aed');

  // SMTP Email States
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpFromEmail, setSmtpFromEmail] = useState('');

  // Fetch Settings
  const { isLoading } = useQuery({
    queryKey: ['admin-system-settings'],
    queryFn: async () => {
      const res = await api.get('core/settings/');
      const list = res.data || [];

      const findVal = (key: string) => list.find((s: any) => s.key === key)?.value;

      if (findVal('branding_title')) setTitle(findVal('branding_title')!);
      if (findVal('branding_subtitle')) setSubtitle(findVal('branding_subtitle')!);
      if (findVal('logo_url')) setLogoUrl(findVal('logo_url')!);
      if (findVal('primary_color')) setPrimaryColor(findVal('primary_color')!);

      if (findVal('smtp_host')) setSmtpHost(findVal('smtp_host')!);
      if (findVal('smtp_port')) setSmtpPort(findVal('smtp_port')!);
      if (findVal('smtp_user')) setSmtpUser(findVal('smtp_user')!);
      if (findVal('smtp_password')) setSmtpPassword(findVal('smtp_password')!);
      if (findVal('smtp_from_email')) setSmtpFromEmail(findVal('smtp_from_email')!);

      return list;
    }
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      const currentRes = await api.get('core/settings/');
      const current = currentRes.data || [];

      const saveKey = async (key: string, val: string) => {
        const existing = current.find((s: any) => s.key === key);
        if (existing) {
          await api.put(`core/settings/${existing.id}/`, { key, value: val });
        } else {
          await api.post('core/settings/', { key, value: val });
        }
      };

      await Promise.all([
        saveKey('branding_title', title),
        saveKey('branding_subtitle', subtitle),
        saveKey('logo_url', logoUrl),
        saveKey('primary_color', primaryColor),
        saveKey('smtp_host', smtpHost),
        saveKey('smtp_port', smtpPort),
        saveKey('smtp_user', smtpUser),
        saveKey('smtp_password', smtpPassword),
        saveKey('smtp_from_email', smtpFromEmail)
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-system-settings'] });
      toast.success('System branding & SMTP configurations saved.');
    },
    onError: () => {
      toast.error('Failed to save settings.');
    }
  });

  return (
    <div className="space-y-6 text-xs max-w-2xl animate-fade-in">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Configure global branding variables, custom SMTP credentials, and portal templates.</p>
      </div>

      <form 
        onSubmit={(e) => { e.preventDefault(); saveSettingsMutation.mutate(); }}
        className="space-y-6"
      >
        {/* Branding preferences */}
        <div className="p-6 bg-card border border-border rounded-2xl space-y-4 shadow-sm">
          <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border/60 pb-3">
            <Globe size={15} className="text-primary" />
            <span>Branding & Platform Preferences</span>
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Portal Title Branding *</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none" />
            </div>

            <div>
              <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Sub-title Branding *</label>
              <input type="text" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} required className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Primary Theme Hex Color *</label>
                <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-full h-10 bg-transparent rounded cursor-pointer" />
              </div>
              <div>
                <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Branding Logo URL Link</label>
                <input type="url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic SMTP Configuration */}
        <div className="p-6 bg-card border border-border rounded-2xl space-y-4 shadow-sm">
          <h3 className="font-bold text-sm text-foreground flex items-center gap-2 border-b border-border/60 pb-3">
            <Mail size={15} className="text-primary" />
            <span>Outgoing SMTP Email Configuration</span>
          </h3>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">SMTP Server Host *</label>
                <input 
                  type="text" 
                  value={smtpHost} 
                  onChange={(e) => setSmtpHost(e.target.value)} 
                  placeholder="e.g. smtp.gmail.com or smtp.zoho.com" 
                  className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none font-mono text-xs" 
                />
              </div>
              <div>
                <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">SMTP Server Port *</label>
                <input 
                  type="number" 
                  value={smtpPort} 
                  onChange={(e) => setSmtpPort(e.target.value)} 
                  placeholder="587 or 465" 
                  className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none font-mono text-xs" 
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">SMTP User Email *</label>
                <input 
                  type="email" 
                  value={smtpUser} 
                  onChange={(e) => setSmtpUser(e.target.value)} 
                  placeholder="e.g. support@yourcompany.com" 
                  className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none font-mono text-xs" 
                />
              </div>
              <div>
                <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">SMTP Password / App Key *</label>
                <input 
                  type="password" 
                  value={smtpPassword} 
                  onChange={(e) => setSmtpPassword(e.target.value)} 
                  placeholder="16-character App Password" 
                  autoComplete="current-password"
                  className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none font-mono text-xs" 
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Default Sender Display Name & Email</label>
              <input 
                type="text" 
                value={smtpFromEmail} 
                onChange={(e) => setSmtpFromEmail(e.target.value)} 
                placeholder="e.g. Apex LMS Support <support@yourcompany.com>" 
                className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none font-mono text-xs" 
              />
              <span className="text-[10px] text-muted-foreground mt-1 block">
                * Gmail uses App Passwords (2-Step Verification required). Custom SMTP supports Hostinger, Zoho, SendGrid, Outlook, etc.
              </span>
            </div>
          </div>
        </div>

        <button type="submit" disabled={saveSettingsMutation.isPending} className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl shadow-md flex items-center justify-center gap-1.5 font-bold hover:brightness-110 transition-all">
          <Save size={14} />
          <span>Save All Configurations</span>
        </button>
      </form>
    </div>
  );
};
export default SystemSettingsTab;
