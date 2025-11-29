import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CATEGORIES, Category } from '@/lib/constants';
import { ImageUpload } from '@/components/ImageUpload';

interface EditComplaintDialogProps {
  complaint: {
    id: string;
    title: string;
    description: string;
    category: Category;
    image_url: string | null;
    branch: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplaintUpdated: () => void;
}

const EditComplaintDialog = ({ 
  complaint, 
  open, 
  onOpenChange, 
  onComplaintUpdated 
}: EditComplaintDialogProps) => {
  const [title, setTitle] = useState(complaint.title);
  const [description, setDescription] = useState(complaint.description);
  const [category, setCategory] = useState<Category>(complaint.category);
  const [imageUrl, setImageUrl] = useState<string | null>(complaint.image_url);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setTitle(complaint.title);
      setDescription(complaint.description);
      setCategory(complaint.category);
      setImageUrl(complaint.image_url);
    }
  }, [complaint, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from('complaints')
      .update({
        title,
        description,
        category,
        image_url: imageUrl
      })
      .eq('id', complaint.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update complaint',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: 'Complaint updated successfully'
      });
      onComplaintUpdated();
      onOpenChange(false);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Issue</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="bg-secondary/50 border-border"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Category</label>
            <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
              <SelectTrigger className="bg-secondary/50 border-border">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="bg-secondary/50 border-border min-h-[100px]"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Proof (Image)</label>
            <ImageUpload onImageSelected={(url) => setImageUrl(url || null)} initialImage={imageUrl} />
          </div>
          <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 btn-glow" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Issue'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditComplaintDialog;
