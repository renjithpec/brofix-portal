import { useState, useEffect } from 'react';
import { Plus, MapPin, Mail, Pencil, Trash2, Shield, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { BRANCHES, Branch, SUPER_ADMIN_EMAIL } from '@/lib/constants';

type Admin = {
  id: string;
  email: string;
  full_name: string;
  branch: string;
};

const Team = () => {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  
  const [formData, setFormData] = useState({ fullName: '', email: '', branch: '' as Branch | '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { isSuperAdmin, profile } = useAuth();

  // Get branches that are already assigned to other admins
  const assignedBranches = admins
    .filter(a => a.email !== SUPER_ADMIN_EMAIL)
    .map(a => a.branch);

  // For super admin, allow all branches except those already assigned
  // Super admin is always locked to Kochi
  const getAvailableBranches = (isEdit: boolean = false) => {
    if (!isSuperAdmin) return [];
    
    return BRANCHES.filter(branch => {
      // Don't allow Kochi for new admins (reserved for super admin)
      if (branch === 'Kochi' && !isEdit) return false;
      
      // Don't allow already assigned branches (unless editing that same admin)
      if (isEdit && selectedAdmin?.branch === branch) return true;
      return !assignedBranches.includes(branch);
    });
  };

  const fetchAdmins = async () => {
    const { data, error } = await supabase.from('profiles').select('id, email, full_name, branch').eq('role', 'admin').order('branch');
    if (!error && data) setAdmins(data);
    setLoading(false);
  };

  useEffect(() => { fetchAdmins(); }, []);

  const handleAddAdmin = async () => {
    if (!formData.fullName || !formData.email || !formData.branch || !formData.password) {
      toast({ title: 'Missing fields', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: { full_name: formData.fullName, branch: formData.branch, role: 'admin' }
      }
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Admin created', description: 'New admin has been added successfully' });
      setShowAddDialog(false);
      resetForm();
      setTimeout(fetchAdmins, 1500);
    }
    setSubmitting(false);
  };

  const handleEditAdmin = async () => {
    if (!selectedAdmin) return;
    setSubmitting(true);
    const updates: { full_name?: string; branch?: string } = {};
    if (formData.fullName) updates.full_name = formData.fullName;
    if (formData.branch) updates.branch = formData.branch;

    const { error } = await supabase.from('profiles').update(updates).eq('id', selectedAdmin.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Admin updated', description: 'Details updated successfully' });
      setShowEditDialog(false);
      resetForm();
      fetchAdmins();
    }
    setSubmitting(false);
  };

  const handleDeleteAdmin = async (admin: Admin) => {
    if (admin.email === SUPER_ADMIN_EMAIL) return;
    const { error } = await supabase.from('profiles').delete().eq('id', admin.id);
    if (!error) {
      toast({ title: 'Admin deleted', description: 'Admin removed successfully' });
      fetchAdmins();
    }
  };

  const resetForm = () => { setFormData({ fullName: '', email: '', branch: '', password: '' }); setSelectedAdmin(null); };

  const availableBranchesForAdd = getAvailableBranches(false);
  const availableBranchesForEdit = getAvailableBranches(true);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800 pb-6">
        <div><h1 className="text-3xl font-bold text-white">Team Management</h1><p className="text-zinc-400 mt-1">Manage branch admins.</p></div>
        <Button 
          onClick={() => { resetForm(); setShowAddDialog(true); }} 
          className="bg-white text-black hover:bg-zinc-200 font-bold"
          disabled={availableBranchesForAdd.length === 0}
        >
          <Plus className="w-4 h-4 mr-2" />ALLOCATE ADMIN
        </Button>
      </div>

      {loading ? <Loader2 className="w-8 h-8 animate-spin text-white mx-auto" /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {admins.map((admin) => (
            <div key={admin.id} className="bg-[#18181b] border border-[#27272a] rounded-xl p-6 flex flex-col gap-6 shadow-lg hover:border-zinc-600 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-black border border-[#27272a] flex items-center justify-center shrink-0"><Shield className="w-5 h-5 text-zinc-400" /></div>
                <div><h3 className="font-bold text-white text-lg">{admin.full_name}</h3><p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mt-1">{admin.email === SUPER_ADMIN_EMAIL ? 'MAIN ADMIN' : 'BRANCH ADMIN'}</p></div>
              </div>
              <div className="space-y-3 text-sm text-zinc-400">
                <div className="flex items-center gap-3"><MapPin className="w-4 h-4 text-zinc-600" />{admin.branch}</div>
                <div className="flex items-center gap-3"><Mail className="w-4 h-4 text-zinc-600" /><span className="truncate">{admin.email}</span></div>
              </div>
              {admin.email !== SUPER_ADMIN_EMAIL && (
                <div className="flex gap-2 mt-auto pt-2">
                  <Button variant="secondary" className="flex-1 bg-zinc-800 hover:bg-zinc-700" onClick={() => { setSelectedAdmin(admin); setFormData({ fullName: admin.full_name, email: admin.email, branch: admin.branch as Branch, password: '' }); setShowEditDialog(true); }}><Pencil className="w-3 h-3 mr-2" />Edit</Button>
                  <Button variant="destructive" size="icon" className="bg-red-900/20 text-red-500 hover:bg-red-900/40" onClick={() => handleDeleteAdmin(admin)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Add Admin Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { if (!open) { setShowAddDialog(false); resetForm(); }}}>
        <DialogContent className="bg-[#09090b] border-[#27272a] text-white sm:max-w-[500px]">
          <DialogHeader><DialogTitle>Allocate Admin</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase">Branch</label>
              <Select value={formData.branch} onValueChange={(v) => setFormData(p => ({...p, branch: v as Branch}))}>
                <SelectTrigger className="bg-[#18181b] border-[#27272a] text-white"><SelectValue placeholder="Select branch" /></SelectTrigger>
                <SelectContent className="bg-[#18181b] border-[#27272a] text-white">
                  {availableBranchesForAdd.map(b => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableBranchesForAdd.length === 0 && (
                <p className="text-xs text-yellow-500">All branches have admins assigned.</p>
              )}
            </div>
             
            <div className="space-y-2"><label className="text-[10px] font-bold text-zinc-500 uppercase">Full Name</label><Input value={formData.fullName} onChange={e => setFormData(p => ({...p, fullName: e.target.value}))} className="bg-[#18181b] border-[#27272a] text-white" /></div>
             
            <div className="space-y-2"><label className="text-[10px] font-bold text-zinc-500 uppercase">Email</label><Input value={formData.email} onChange={e => setFormData(p => ({...p, email: e.target.value}))} className="bg-[#18181b] border-[#27272a] text-white" /></div>
             
            <div className="space-y-2"><label className="text-[10px] font-bold text-zinc-500 uppercase">Password</label><Input type="password" value={formData.password} onChange={e => setFormData(p => ({...p, password: e.target.value}))} className="bg-[#18181b] border-[#27272a] text-white" /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAddDialog(false)} className="text-zinc-400">Cancel</Button>
            <Button onClick={handleAddAdmin} disabled={submitting || !formData.branch} className="bg-white text-black font-bold">{submitting ? <Loader2 className="animate-spin" /> : 'ALLOCATE'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Admin Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => { if (!open) { setShowEditDialog(false); resetForm(); }}}>
        <DialogContent className="bg-[#09090b] border-[#27272a] text-white sm:max-w-[500px]">
          <DialogHeader><DialogTitle>Edit Admin</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase">Branch</label>
              <Select value={formData.branch} onValueChange={(v) => setFormData(p => ({...p, branch: v as Branch}))}>
                <SelectTrigger className="bg-[#18181b] border-[#27272a] text-white"><SelectValue placeholder="Select branch" /></SelectTrigger>
                <SelectContent className="bg-[#18181b] border-[#27272a] text-white">
                  {availableBranchesForEdit.map(b => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
             
            <div className="space-y-2"><label className="text-[10px] font-bold text-zinc-500 uppercase">Full Name</label><Input value={formData.fullName} onChange={e => setFormData(p => ({...p, fullName: e.target.value}))} className="bg-[#18181b] border-[#27272a] text-white" /></div>
             
            <div className="space-y-2"><label className="text-[10px] font-bold text-zinc-500 uppercase">Email</label><Input value={formData.email} disabled className="bg-[#18181b] border-[#27272a] text-white opacity-50" /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowEditDialog(false)} className="text-zinc-400">Cancel</Button>
            <Button onClick={handleEditAdmin} disabled={submitting} className="bg-white text-black font-bold">{submitting ? <Loader2 className="animate-spin" /> : 'UPDATE'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default Team;