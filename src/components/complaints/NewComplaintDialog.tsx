import { useState, useRef } from 'react';
import { Plus, Loader2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { CATEGORIES, Category } from '@/lib/constants';
import { ImageUpload } from '@/components/ImageUpload';

interface NewComplaintDialogProps {
  onComplaintCreated: () => void;
}

const NewComplaintDialog = ({ onComplaintCreated }: NewComplaintDialogProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category | ''>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !category) return;

    setLoading(true);

    // 1. Create Complaint AND select the returned data (ID)
    const { data: newComplaint, error } = await supabase
      .from('complaints')
      .insert({
        user_id: user.id,
        title,
        description,
        category,
        branch: profile.branch,
        image_url: imageUrl || null
      })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to create complaint',
        variant: 'destructive'
      });
    } else if (newComplaint) {
      // 2. Notify Admins of that branch
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .eq('branch', profile.branch)
        .eq('role', 'admin');

      if (admins && admins.length > 0) {
        const notifications = admins.map(admin => ({
          user_id: admin.id,
          type: 'new_complaint' as const,
          message: `New ${category} complaint: "${title}"`,
          complaint_id: newComplaint.id // Link the ID here!
        }));

        await supabase.from('notifications').insert(notifications);
      }

      toast({
        title: 'Success',
        description: 'Complaint submitted successfully'
      });
      
      setOpen(false);
      setTitle('');
      setDescription('');
      setCategory('');
      setImageUrl('');
      onComplaintCreated();
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="btn-glow bg-white text-black hover:bg-zinc-200 font-bold">
          <Plus className="w-4 h-4 mr-2" />
          NEW ISSUE
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#09090b] border-zinc-800 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle>Report an Issue</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Title</label>
            <Input
              placeholder="Brief description"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="bg-[#18181b] border-zinc-800 text-white focus-visible:ring-zinc-700"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Category</label>
            <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
              <SelectTrigger className="bg-[#18181b] border-zinc-800 text-white focus:ring-zinc-700">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="bg-[#18181b] border-zinc-800 text-white">
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat} className="focus:bg-zinc-800 focus:text-white">{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Description</label>
            <Textarea
              placeholder="Provide more details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="bg-[#18181b] border-zinc-800 text-white focus-visible:ring-zinc-700 min-h-[100px]"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Proof (Image)</label>
            <ImageUpload onImageSelected={setImageUrl} />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-white text-black hover:bg-zinc-200 font-bold"
            disabled={loading || !category}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'SUBMIT ISSUE'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewComplaintDialog;
