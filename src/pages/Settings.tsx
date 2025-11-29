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
  
  // Initialize with empty strings
  const [fullName, setFullName] = useState('');
  const [branch, setBranch] = useState<Branch | string>('');
  
  // Password State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Sync state when profile data loads
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setBranch(profile.branch || '');
    }
  }, [profile]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        branch: branch
      })
      .eq('id', user.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update profile.',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: 'Profile updated successfully.'
      });
    }
    setLoading(false);
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: 'Password updated successfully.'
      });
      setNewPassword('');
      setConfirmPassword('');
    }
    setLoading(false);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setAvatarLoading(true);
    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast({
        title: 'Error',
        description: 'Failed to upload avatar.',
        variant: 'destructive'
      });
      setAvatarLoading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);
    
    const publicUrlWithCache = `${publicUrl}?t=${new Date().getTime()}`;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrlWithCache })
      .eq('id', user.id);

    if (updateError) {
      toast({
        title: 'Error',
        description: 'Failed to update profile with new avatar.',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: 'Avatar updated successfully.'
      });
      setTimeout(() => window.location.reload(), 1000);
    }
    setAvatarLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in pb-10">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Account Settings</h1>
        <p className="text-muted-foreground">Manage your profile and security preferences.</p>
      </div>

      {/* Avatar Section */}
      <div className="glass-card p-6 flex items-center gap-6">
        <div 
          className="relative group cursor-pointer" 
          onClick={() => !avatarLoading && fileInputRef.current?.click()}
        >
          <div className="w-20 h-20 rounded-full bg-secondary border-2 border-border overflow-hidden relative">
            {avatarLoading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                 <Loader2 className="animate-spin text-white" />
              </div>
            ) : profile?.avatar_url ? (
               <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
               <User className="w-full h-full p-4 text-muted-foreground" />
            )}
          </div>
          <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="text-white w-6 h-6" />
          </div>
        </div>
        <div>
          <h3 className="font-medium text-foreground">Profile Photo</h3>
          <p className="text-sm text-muted-foreground mb-3">Click the image to upload a new avatar.</p>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*"
            onChange={handleAvatarChange}
            disabled={avatarLoading}
          />
        </div>
      </div>

      {/* Profile Form */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
          <User className="w-5 h-5" /> Personal Information
        </h3>
        <form onSubmit={handleProfileUpdate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Full Name</label>
              <Input 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="bg-secondary/50 border-border" 
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Email</label>
              <div className="relative">
                 <Mail className="absolute left-3 top-2.5 text-muted-foreground w-4 h-4" />
                 <Input 
                   value={profile?.email || ''}
                   disabled
                   className="pl-10 bg-secondary/50 border-border opacity-70" 
                 />
              </div>
            </div>
            
            <div className="md:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Branch</label>
              <Select value={branch} onValueChange={setBranch}>
                <SelectTrigger className="bg-secondary/50 border-border">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <SelectValue placeholder="Select branch" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {BRANCHES.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end pt-2">
             <Button type="submit" disabled={loading}>
               {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
               Save Changes
             </Button>
          </div>
        </form>
      </div>

      {/* Password Form */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5" /> Security
        </h3>
        <form onSubmit={handlePasswordUpdate} className="space-y-4">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">New Password</label>
                <Input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                  className="bg-secondary/50 border-border" 
                />
             </div>
             <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Confirm Password</label>
                <Input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={6}
                  className="bg-secondary/50 border-border" 
                />
             </div>
           </div>
           <div className="flex justify-end pt-2">
             <Button type="submit" disabled={loading || !newPassword}>
               {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
               Update Password
             </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;
