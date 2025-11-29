import { useState } from 'react';
import { Loader2, Play, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Status } from '@/lib/constants';

interface AdminActionsProps {
  complaint: {
    id: string;
    user_id: string;
    title: string;
    status: Status;
  };
  onStatusChange?: () => void;
}

const AdminActions = ({ complaint, onStatusChange }: AdminActionsProps) => {
  const [loading, setLoading] = useState(false);
  const [showRemarkDialog, setShowRemarkDialog] = useState(false);
  const [remark, setRemark] = useState('');
  const { toast } = useToast();

  const updateStatus = async (newStatus: Status, adminRemark?: string) => {
    setLoading(true);

    const updateData: { status: Status; admin_remark?: string } = { status: newStatus };
    if (adminRemark) {
      updateData.admin_remark = adminRemark;
    }

    const { error } = await supabase
      .from('complaints')
      .update(updateData)
      .eq('id', complaint.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive'
      });
    } else {
      // Create notification for user
      await supabase.from('notifications').insert({
        user_id: complaint.user_id,
        type: 'status_change',
        message: `Your complaint "${complaint.title}" has been ${newStatus === 'In_Progress' ? 'picked up and is in progress' : 'resolved'}`,
        complaint_id: complaint.id
      });

      toast({
        title: 'Status updated',
        description: `Complaint is now ${newStatus === 'In_Progress' ? 'in progress' : 'resolved'}`
      });
      
      onStatusChange?.();
    }

    setLoading(false);
    setShowRemarkDialog(false);
    setRemark('');
  };

  const handleStartProgress = () => {
    updateStatus('In_Progress');
  };

  const handleMarkResolved = () => {
    setShowRemarkDialog(true);
  };

  const handleSubmitResolution = () => {
    updateStatus('Resolved', remark || undefined);
  };

  return (
    <>
      <div className="flex gap-2 pt-2">
        {complaint.status === 'Open' && (
          <Button
            type="button"
            onClick={handleStartProgress}
            disabled={loading}
            className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Start Progress
              </>
            )}
          </Button>
        )}
        
        {complaint.status === 'In_Progress' && (
          <Button
            type="button"
            onClick={handleMarkResolved}
            disabled={loading}
            className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark Resolved
              </>
            )}
          </Button>
        )}
      </div>

      <Dialog open={showRemarkDialog} onOpenChange={setShowRemarkDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Resolution Remark</DialogTitle>
            <DialogDescription>
              Add a remark about how this issue was resolved (optional)
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter your remark..."
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            className="bg-secondary/50 border-border"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowRemarkDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitResolution} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminActions;
