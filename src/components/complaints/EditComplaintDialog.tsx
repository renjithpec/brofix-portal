import { useState, useRef, useEffect } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
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
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { CATEGORIES, Category } from '@/lib/constants';

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
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(complaint.image_url);
  const [isImageRemoved, setIsImageRemoved] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Reset form when complaint changes or dialog opens
  useEffect(() => {
    if (open) {
      setTitle(complaint.title);
      setDescription(complaint.description);
      setCategory(complaint.category);
      setImagePreview(complaint.image_url);
      setImage(null);
      setIsImageRemoved(false);
    }
  }, [complaint, open]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
      setIsImageRemoved(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
      setIsImageRemoved(false);
    }
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
    setIsImageRemoved(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    let finalImageUrl = complaint.image_url;

    // Handle Image Removal
    if (isImageRemoved) {
      finalImageUrl = null;
    }

    // Handle New Image Upload
    if (image) {
      const fileExt = image.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('complaint-images')
        .upload(filePath, image);

      if (!uploadError && data) {
        const { data: { publicUrl } } = supabase.storage
          .from('complaint-images')
          .getPublicUrl(filePath);
        finalImageUrl = publicUrl;
      }
    }

    // Update Database
    const { error } = await supabase
      .from('complaints')
      .update({
        title,
        description,
        category,
        image_url: finalImageUrl
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
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
              Title
            </label>
            <Input
              placeholder="Brief description of the issue"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="bg-secondary/50 border-border"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
              Category
            </label>
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
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
              Description
            </label>
            <Textarea
              placeholder="Provide more details about the issue..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="bg-secondary/50 border-border min-h-[100px]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
              Image (Optional)
            </label>
            {imagePreview ? (
              <div className="relative inline-block">
                <img src={imagePreview} alt="Preview" className="w-32 h-32 object-cover rounded-lg border border-border" />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/90 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-muted-foreground transition-colors"
              >
                <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Drop an image here or click to upload
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 btn-glow"
            disabled={loading || !category}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Issue'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditComplaintDialog;
