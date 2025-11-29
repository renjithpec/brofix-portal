import { useState, useEffect } from 'react';
import { Plus, MapPin, Mail, Pencil, Trash2, Shield, Phone, Loader2, Lock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { BRANCHES, Branch } from '@/lib/constants';

type Admin = {
  id: string;
  email: string;
  full_name: string;
  branch: string;
  contact_number?: string;
};

const Team = () => {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  
  const [formData, setFormData] = useState({ fullName: '', email: '', branch: '' as Branch | '', contactNumber: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchAdmins = async () => {
    const { data, error } = await supabase.from('profiles').select('id, email, full_name, branch, contact_number').eq('role', 'admin').order('branch');
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
        data: { full_name: formData.fullName, branch: formData.branch, contact_number: formData.contactNumber, role: 'admin' }
      }
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Admin created', description: 'New admin has been added successfully' });
      setShowAddDialog(false);
      resetForm();
      setTimeout(fetchAdmins, 1500); // Wait for trigger
    }
    setSubmitting(false);
  };

  const handleEditAdmin = async () => {
    if (!selectedAdmin) return;
    setSubmitting(true);
    const updates: { full_name?: string; branch?: string; contact_number?: string } = {};
    if (formData.fullName) updates.full_name = formData.fullName;
    if (formData.branch) updates.branch = formData.branch;
    if (formData.contactNumber) updates.contact_number = formData.contactNumber;

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
    if (admin.email === 'admin.kochi@brototype.com') return;
    const { error } = await supabase.from('profiles').delete().eq('id', admin.id);
    if (!error) {
      toast({ title: 'Admin deleted', description: 'Admin removed successfully' });
      fetchAdmins();
    }
  };

  const resetForm = () => { setFormData({ fullName: '', email: '', branch: '', contactNumber: '', password: '' }); setSelectedAdmin(null); };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800 pb-6">
        <div><h1 className="text-3xl font-bold text-white">Team Management</h1><p className="text-zinc-400 mt-1">Manage branch admins.</p></div>
        <Button onClick={() => { resetForm(); setShowAddDialog(true); }} className="bg-white text-black hover:bg-zinc-200 font-bold"><Plus className="w-4 h-4 mr-2" />ALLOCATE ADMIN</Button>
      </div>

      {loading ? <Loader2 className="w-8 h-8 animate-spin text-white mx-auto" /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {admins.map((admin) => (
            <div key={admin.id} className="bg-[#18181b] border border-[#27272a] rounded-xl p-6 flex flex-col gap-6 shadow-lg hover:border-zinc-600 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-black border border-[#27272a] flex items-center justify-center shrink-0"><Shield className="w-5 h-5 text-zinc-400" /></div>
                <div><h3 className="font-bold text-white text-lg">{admin.full_name}</h3><p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mt-1">{admin.email === 'admin.kochi@brototype.com' ? 'MAIN ADMIN' : 'BRANCH ADMIN'}</p></div>
              </div>
              <div className="space-y-3 text-sm text-zinc-400">
                <div className="flex items-center gap-3"><MapPin className="w-4 h-4 text-zinc-600" />{admin.branch}</div>
                <div className="flex items-center gap-3"><Mail className="w-4 h-4 text-zinc-600" /><span className="truncate">{admin.email}</span></div>
                <div className="flex items-center gap-3"><Phone className="w-4 h-4 text-zinc-600" />{admin.contact_number || 'N/A'}</div>
              </div>
              {admin.email !== 'admin.kochi@brototype.com' && (
                <div className="flex gap-2 mt-auto pt-2">
                  <Button variant="secondary" className="flex-1 bg-zinc-800 hover:bg-zinc-700" onClick={() => { setSelectedAdmin(admin); setFormData({ fullName: admin.full_name, email: admin.email, branch: admin.branch as Branch, contactNumber: admin.contact_number || '', password: '' }); setShowEditDialog(true); }}><Pencil className="w-3 h-3 mr-2" />Edit</Button>
                  <Button variant="destructive" size="icon" className="bg-red-900/20 text-red-500 hover:bg-red-900/40" onClick={() => handleDeleteAdmin(admin)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Dialogs logic... (kept consistent with your provided file structure, ensure imports match) */}
      <Dialog open={showAddDialog || showEditDialog} onOpenChange={(open) => { if (!open) { setShowAddDialog(false); setShowEditDialog(false); resetForm(); }}}>
        <DialogContent className="bg-[#09090b] border-[#27272a] text-white sm:max-w-[500px]">
          <DialogHeader><DialogTitle>{showEditDialog ? 'Edit Admin' : 'Allocate Admin'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
             <div className="space-y-2"><label className="text-[10px] font-bold text-zinc-500 uppercase">Branch</label>
             <Select value={formData.branch} onValueChange={(v) => setFormData(p => ({...p, branch: v as Branch}))}><SelectTrigger className="bg-[#18181b] border-[#27272a] text-white"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent className="bg-[#18181b] border-[#27272a] text-white">{BRANCHES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select></div>
             
             <div className="space-y-2"><label className="text-[10px] font-bold text-zinc-500 uppercase">Full Name</label><Input value={formData.fullName} onChange={e => setFormData(p => ({...p, fullName: e.target.value}))} className="bg-[#18181b] border-[#27272a] text-white" /></div>
             
             <div className="space-y-2"><label className="text-[10px] font-bold text-zinc-500 uppercase">Email</label><Input value={formData.email} onChange={e => setFormData(p => ({...p, email: e.target.value}))} disabled={showEditDialog} className="bg-[#18181b] border-[#27272a] text-white" /></div>
             
             <div className="space-y-2"><label className="text-[10px] font-bold text-zinc-500 uppercase">Contact Number</label><Input value={formData.contactNumber} onChange={e => setFormData(p => ({...p, contactNumber: e.target.value}))} className="bg-[#18181b] border-[#27272a] text-white" placeholder="+91..." /></div>
             
             <div className="space-y-2"><label className="text-[10px] font-bold text-zinc-500 uppercase">{showEditDialog ? 'New Password (Optional)' : 'Password'}</label><Input type="password" value={formData.password} onChange={e => setFormData(p => ({...p, password: e.target.value}))} className="bg-[#18181b] border-[#27272a] text-white" /></div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => { setShowAddDialog(false); setShowEditDialog(false); }} className="text-zinc-400">Cancel</Button><Button onClick={showEditDialog ? handleEditAdmin : handleAddAdmin} disabled={submitting} className="bg-white text-black font-bold">{submitting ? <Loader2 className="animate-spin" /> : (showEditDialog ? 'UPDATE' : 'ALLOCATE')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default Team;
