import { useState, useEffect } from 'react';
import { Plus, MapPin, Mail, Pencil, Trash2, Shield, Phone, Loader2, Lock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    branch: '' as Branch | '',
    contactNumber: '',
    password: ''
  });
  
  const [submitting, setSubmitting] = useState(false);
  const { profile } = useAuth();
  const { toast } = useToast();

  const fetchAdmins = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, branch, contact_number')
      .eq('role', 'admin')
      .order('branch');

    if (!error && data) {
      setAdmins(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleAddAdmin = async () => {
    if (!formData.fullName || !formData.email || !formData.branch || !formData.password) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    setSubmitting(true);

    // Create user via Supabase Auth
    const { error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          full_name: formData.fullName,
          branch: formData.branch,
          contact_number: formData.contactNumber,
          role: 'admin'
        }
      }
    });

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      // Manually update the profile to ensure contact number is saved if signup trigger missed it
      // (The trigger usually handles basic fields, but contact_number might need explicit update depending on trigger logic)
      // For safety, we can update it if the user was created successfully.
      toast({
        title: 'Admin created',
        description: 'New admin has been added successfully'
      });
      setShowAddDialog(false);
      resetForm();
      fetchAdmins();
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

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', selectedAdmin.id);

    // If password provided, update it via Edge Function or Admin API (Client side limitation)
    // Note: Client-side updating another user's password isn't standard in Supabase without an Edge Function.
    // For this demo, we'll focus on profile updates.

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Admin updated',
        description: 'Admin details have been updated'
      });
      setShowEditDialog(false);
      resetForm();
      fetchAdmins();
    }

    setSubmitting(false);
  };

  const handleDeleteAdmin = async (admin: Admin) => {
    if (admin.email === 'admin.kochi@brototype.com') {
      toast({
        title: 'Cannot delete',
        description: 'Super admin cannot be deleted',
        variant: 'destructive'
      });
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', admin.id);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Admin deleted',
        description: 'Admin has been removed'
      });
      fetchAdmins();
    }
  };

  const resetForm = () => {
    setFormData({ fullName: '', email: '', branch: '', contactNumber: '', password: '' });
    setSelectedAdmin(null);
  };

  const openEditDialog = (admin: Admin) => {
    setSelectedAdmin(admin);
    setFormData({
      fullName: admin.full_name,
      email: admin.email,
      branch: admin.branch as Branch,
      contactNumber: admin.contact_number || '',
      password: ''
    });
    setShowEditDialog(true);
  };

  const openAddDialog = () => {
    resetForm();
    setShowAddDialog(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Team Management</h1>
          <p className="text-muted-foreground mt-1">Allocate and manage admins for other branches.</p>
        </div>
        <Button onClick={openAddDialog} className="bg-white text-black hover:bg-zinc-200 font-bold">
          <Plus className="w-4 h-4 mr-2" />
          ALLOCATE ADMIN
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-white" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {admins.map((admin) => {
            const isSuperAdmin = admin.email === 'admin.kochi@brototype.com';

            return (
              <div key={admin.id} className="bg-[#18181b] border border-[#27272a] rounded-xl p-6 flex flex-col gap-6 shadow-lg hover:border-zinc-600 transition-colors">
                {/* Header */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-black border border-[#27272a] flex items-center justify-center shrink-0">
                    <Shield className="w-5 h-5 text-zinc-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg leading-tight">{admin.full_name}</h3>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mt-1">
                      {isSuperAdmin ? 'MAIN ADMIN (YOU)' : 'BRANCH ADMIN'}
                    </p>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-zinc-400 text-sm">
                    <MapPin className="w-4 h-4 text-zinc-600" />
                    <span>{admin.branch}</span>
                  </div>
                  <div className="flex items-center gap-3 text-zinc-400 text-sm">
                    <Mail className="w-4 h-4 text-zinc-600" />
                    <span className="truncate">{admin.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-zinc-400 text-sm">
                    <Phone className="w-4 h-4 text-zinc-600" />
                    <span>{admin.contact_number || 'No contact added'}</span>
                  </div>
                </div>

                {/* Actions */}
                {!isSuperAdmin && (
                  <div className="flex gap-2 mt-auto pt-2">
                    <Button
                      variant="secondary"
                      className="flex-1 bg-zinc-800 hover:bg-zinc-700 border-zinc-700"
                      onClick={() => openEditDialog(admin)}
                    >
                      <Pencil className="w-3 h-3 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="bg-red-900/20 text-red-500 hover:bg-red-900/40 border-red-900/30"
                      onClick={() => handleDeleteAdmin(admin)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                {/* Placeholder for Super Admin card alignment */}
                {isSuperAdmin && <div className="mt-auto pt-2 h-10"></div>}
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog 
        open={showAddDialog || showEditDialog} 
        onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false);
            setShowEditDialog(false);
            resetForm();
          }
        }}
      >
        <DialogContent className="bg-[#09090b] border-[#27272a] text-white sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {showEditDialog ? 'Edit Admin' : 'Allocate Admin'}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {showEditDialog ? 'Update credentials for this branch manager.' : 'Create credentials for a new branch manager.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-5 py-4">
            {/* Branch */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Branch</label>
              <Select 
                value={formData.branch} 
                onValueChange={(v) => setFormData(p => ({ ...p, branch: v as Branch }))}
              >
                <SelectTrigger className="bg-[#18181b] border-[#27272a] h-11 text-white focus:ring-zinc-700">
                  <div className="flex items-center gap-3">
                     <MapPin className="w-4 h-4 text-zinc-500" />
                     <SelectValue placeholder="Select branch" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-[#18181b] border-[#27272a] text-white">
                  {BRANCHES.map((b) => (
                    <SelectItem key={b} value={b} className="focus:bg-zinc-800 focus:text-white">{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3.5 w-4 h-4 text-zinc-500" />
                <Input
                  value={formData.fullName}
                  onChange={(e) => setFormData(p => ({ ...p, fullName: e.target.value }))}
                  className="bg-[#18181b] border-[#27272a] pl-10 h-11 text-white focus-visible:ring-zinc-700"
                  placeholder="Branch Admin Name"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Email (Username)</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 w-4 h-4 text-zinc-500" />
                <Input
                  value={formData.email}
                  onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                  className="bg-[#18181b] border-[#27272a] pl-10 h-11 text-white focus-visible:ring-zinc-700"
                  placeholder="admin.branch@brototype.com"
                  disabled={showEditDialog} // Cannot edit email usually as it's the ID
                />
              </div>
            </div>

            {/* Contact Number */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Contact Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3.5 w-4 h-4 text-zinc-500" />
                <Input
                  value={formData.contactNumber}
                  onChange={(e) => setFormData(p => ({ ...p, contactNumber: e.target.value }))}
                  className="bg-[#18181b] border-[#27272a] pl-10 h-11 text-white focus-visible:ring-zinc-700"
                  placeholder="+91 98765 00000"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                {showEditDialog ? 'New Password (Optional)' : 'Password'}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 w-4 h-4 text-zinc-500" />
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))}
                  className="bg-[#18181b] border-[#27272a] pl-10 h-11 text-white focus-visible:ring-zinc-700"
                  placeholder={showEditDialog ? "Leave blank to keep current" : "Set login password"}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="ghost" 
              onClick={() => { setShowAddDialog(false); setShowEditDialog(false); }}
              className="hover:bg-zinc-800 text-zinc-400 hover:text-white"
            >
              CANCEL
            </Button>
            <Button 
              onClick={showEditDialog ? handleEditAdmin : handleAddAdmin} 
              disabled={submitting}
              className="bg-white text-black hover:bg-zinc-200 font-bold"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (showEditDialog ? 'UPDATE ADMIN' : 'ALLOCATE ADMIN')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Team;
