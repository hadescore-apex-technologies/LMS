import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { Save, Globe, Loader2 } from 'lucide-react';

export const SystemSettingsTab: React.FC = () => {
  const queryClient = useQueryClient();

  // Branding states
  const [title, setTitle] = useState('HADESCORE APEX & TECHNOLOGIES');
  const [subtitle, setSubtitle] = useState('Enterprise LMS Platform');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#7c3aed');

  // Fetch Settings
  const { isLoading } = useQuery({
    queryKey: ['admin-system-settings'],
    queryFn: async () => {
      const res = await api.get('core/settings/');
      const list = res.data || [];
      const titleSetting = list.find((s: any) => s.key === 'branding_title');
      const subtitleSetting = list.find((s: any) => s.key === 'branding_subtitle');
      const logoSetting = list.find((s: any) => s.key === 'logo_url');
      const colorSetting = list.find((s: any) => s.key === 'primary_color');

      if (titleSetting) setTitle(titleSetting.value);
      if (subtitleSetting) setSubtitle(subtitleSetting.value);
      if (logoSetting) setLogoUrl(logoSetting.value);
      if (colorSetting) setPrimaryColor(colorSetting.value);

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
        saveKey('primary_color', primaryColor)
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-system-settings'] });
      toast.success('System branding configurations saved.');
    },
    onError: () => {
      toast.error('Failed to save settings.');
    }
  });

  if (isLoading) {
    return (
      <div className="py-20 text-center text-muted-foreground animate-spin">
        <Loader2 className="mx-auto" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-xs max-w-2xl animate-fade-in">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Configure global branding variables, logos, and portal templates.</p>
      </div>

      <form 
        onSubmit={(e) => { e.preventDefault(); saveSettingsMutation.mutate(); }}
        className="p-6 bg-card border border-border rounded-2xl space-y-4 shadow-sm"
      >
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

        <button type="submit" disabled={saveSettingsMutation.isPending} className="w-full py-2.5 mt-4 bg-primary text-primary-foreground font-bold rounded-xl shadow-md flex items-center justify-center gap-1.5 font-bold">
          <Save size={12} />
          <span>Save Configurations</span>
        </button>
      </form>
    </div>
  );
};
export default SystemSettingsTab;
