import { useState, useRef, useEffect } from 'react';
import { User, Lock, Mail, Camera, Loader2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BRANCHES, Branch } from '@/lib/constants';

const Settings = () => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [uploadProgress, setProgress] = useState(0);
  const [fullName, setFullName] = useState('');
  const [branch, setBranch] = useState<Branch | string>('');
  const [pass, setPass] = useState({ current: '', new: '', confirm: '' });
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => { if (profile) { setFullName(profile.full_name || ''); setBranch(profile.branch || ''); } }, [profile]);

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    const { error } = await supabase.from('profiles').update({ full_name: fullName, branch }).eq('id', user?.id);
    toast({ title: error ? 'Error' : 'Success', description: error ? error.message : 'Profile updated.', variant: error ? 'destructive' : 'default' });
    setLoading(false);
  };

  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pass.new !== pass.confirm) return toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' });
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: user?.email || '', password: pass.current });
    if (signInError) { setLoading(false); return toast({ title: 'Error', description: 'Incorrect current password', variant: 'destructive' }); }
    
    const { error } = await supabase.auth.updateUser({ password: pass.new });
    toast({ title: error ? 'Error' : 'Success', description: error ? error.message : 'Password updated.', variant: error ? 'destructive' : 'default' });
    if (!error) setPass({ current: '', new: '', confirm: '' });
    setLoading(false);
  };

  const updateAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file || !user) return;
    setAvatarLoading(true); setProgress(10);
    const interval = setInterval(() => setProgress(p => p >= 90 ? 90 : p + 10), 100);
    
    const path = `${user.id}/avatar.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    
    if (!error) {
      clearInterval(interval); setProgress(100);
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      await supabase.from('profiles').update({ avatar_url: `${publicUrl}?t=${Date.now()}` }).eq('id', user.id);
      toast({ title: 'Success', description: 'Avatar updated.' });
      setTimeout(() => window.location.reload(), 500);
    } else {
      toast({ title: 'Error', description: 'Upload failed.', variant: 'destructive' });
    }
    setAvatarLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in pb-10">
      <div><h1 className="text-3xl font-bold text-white">Account Settings</h1><p className="text-zinc-400">Manage profile & security.</p></div>
      
      {/* Avatar */}
      <div className="glass-card p-6 flex items-center gap-6">
        <div className="relative group cursor-pointer" onClick={() => !avatarLoading && fileRef.current?.click()}>
          <div className="w-24 h-24 rounded-full bg-zinc-800 border-2 border-zinc-700 overflow-hidden relative">
            {avatarLoading ? (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10"><div className="w-16 h-1 bg-zinc-700 rounded full"><div className="h-full bg-white transition-all" style={{width: `${uploadProgress}%`}}/></div><span className="text-[10px] text-white mt-1">{uploadProgress}%</span></div>
            ) : profile?.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" /> : <User className="w-full h-full p-6 text-zinc-500" />}
          </div>
          {!avatarLoading && <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100"><Camera className="text-white w-8 h-8"/></div>}
        </div>
        <div><h3 className="font-medium text-white">Profile Photo</h3><p className="text-sm text-zinc-400 mb-3">Click to upload.</p><input type="file" ref={fileRef} className="hidden" onChange={updateAvatar} /></div>
      </div>

      {/* Details */}
      <div className="glass-card p-6"><form onSubmit={updateProfile} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="text-xs font-bold text-zinc-500 uppercase">Full Name</label><Input value={fullName} onChange={e => setFullName(e.target.value)} className="bg-zinc-900/50 border-zinc-700 text-white" /></div>
          <div><label className="text-xs font-bold text-zinc-500 uppercase">Email</label><Input value={profile?.email || ''} disabled className="bg-zinc-900/50 border-zinc-700 text-white opacity-50" /></div>
          <div className="md:col-span-2"><label className="text-xs font-bold text-zinc-500 uppercase">Branch</label><Select value={branch} onValueChange={v => setBranch(v)}><SelectTrigger className="bg-zinc-900/50 border-zinc-700 text-white"><SelectValue/></SelectTrigger><SelectContent className="bg-zinc-900 border-zinc-700 text-white">{BRANCHES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select></div>
        </div>
        <div className="flex justify-end"><Button type="submit" disabled={loading} className="bg-white text-black hover:bg-zinc-200">Save Changes</Button></div>
      </form></div>

      {/* Password */}
      <div className="glass-card p-6"><form onSubmit={updatePassword} className="space-y-4">
        <div><label className="text-xs font-bold text-zinc-500 uppercase">Current Password</label><Input type="password" value={pass.current} onChange={e => setPass(p => ({...p, current: e.target.value}))} className="bg-zinc-900/50 border-zinc-700 text-white" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-xs font-bold text-zinc-500 uppercase">New Password</label><Input type="password" value={pass.new} onChange={e => setPass(p => ({...p, new: e.target.value}))} className="bg-zinc-900/50 border-zinc-700 text-white" /></div>
          <div><label className="text-xs font-bold text-zinc-500 uppercase">Confirm</label><Input type="password" value={pass.confirm} onChange={e => setPass(p => ({...p, confirm: e.target.value}))} className="bg-zinc-900/50 border-zinc-700 text-white" /></div>
        </div>
        <div className="flex justify-end"><Button type="submit" disabled={loading || !pass.new} className="bg-white text-black hover:bg-zinc-200">Update Password</Button></div>
      </form></div>
    </div>
  );
};
export default Settings;
