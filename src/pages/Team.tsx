import { useState, useEffect } from 'react';
import { Plus, MapPin, Mail, Pencil, Trash2, User, Loader2 } from 'lucide-react';
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
    password: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const { profile } = useAuth();
  const { toast } = useToast();

  const fetchAdmins = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, branch')
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
        description: 'Please fill in all fields',
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

    const updates: { full_name?: string; branch?: string } = {};
    if (formData.fullName) updates.full_name = formData.fullName;
    if (formData.branch) updates.branch = formData.branch;

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', selectedAdmin.id);

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
    setFormData({ fullName: '', email: '', branch: '', password: '' });
    setSelectedAdmin(null);
  };

  const openEditDialog = (admin: Admin) => {
    setSelectedAdmin(admin);
    setFormData({
      fullName: admin.full_name,
      email: admin.email,
      branch: admin.branch as Branch,
      password: ''
    });
    setShowEditDialog(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Team Management</h1>
          <p className="text-muted-foreground">Allocate and manage admins for other branches.</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="btn-glow bg-primary text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" />
          Allocate Admin
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {admins.map((admin) => {
            const isCurrentUser = admin.id === profile?.id;
            const isSuperAdmin = admin.email === 'admin.kochi@brototype.com';

            return (
              <div key={admin.id} className="glass-card p-6 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center bg-muted">
                    <User className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{admin.full_name}</h3>
                    <p className="text-xs text-muted-foreground uppercase">
                      {isSuperAdmin ? 'Main Admin (You)' : 'Branch Admin'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{admin.branch}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span>{admin.email}</span>
                  </div>
                </div>

                {!isSuperAdmin && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="secondary"
                      className="flex-1"
                      onClick={() => openEditDialog(admin)}
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDeleteAdmin(admin)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Admin Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Add New Admin</DialogTitle>
            <DialogDescription>Create a new branch administrator account.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                Branch
              </label>
              <Select value={formData.branch} onValueChange={(v) => setFormData(p => ({ ...p, branch: v as Branch }))}>
                <SelectTrigger className="bg-secondary/50 border-border">
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {BRANCHES.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                Full Name
              </label>
              <Input
                value={formData.fullName}
                onChange={(e) => setFormData(p => ({ ...p, fullName: e.target.value }))}
                placeholder="Admin Name"
                className="bg-secondary/50 border-border"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                Email
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                placeholder="admin@brototype.com"
                className="bg-secondary/50 border-border"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                Password
              </label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))}
                placeholder="••••••••"
                className="bg-secondary/50 border-border"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddAdmin} disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Admin'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Admin Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => { setShowEditDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Edit Admin</DialogTitle>
            <DialogDescription>Update credentials for this branch manager.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                Branch
              </label>
              <Select value={formData.branch} onValueChange={(v) => setFormData(p => ({ ...p, branch: v as Branch }))}>
                <SelectTrigger className="bg-secondary/50 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {BRANCHES.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                Full Name
              </label>
              <Input
                value={formData.fullName}
                onChange={(e) => setFormData(p => ({ ...p, fullName: e.target.value }))}
                className="bg-secondary/50 border-border"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                Email (Username)
              </label>
              <Input
                value={formData.email}
                disabled
                className="bg-secondary/50 border-border opacity-50"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                New Password (Optional)
              </label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))}
                placeholder="Leave blank to keep current"
                className="bg-secondary/50 border-border"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={handleEditAdmin} disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Admin'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Team;
