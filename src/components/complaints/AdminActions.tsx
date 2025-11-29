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
      // NOTIFY THE STUDENT
      await supabase.from('notifications').insert({
        user_id: complaint.user_id,
        type: 'status_change',
        message: `Your complaint "${complaint.title}" is now ${newStatus.replace('_', ' ')}`,
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

  return (
    <>
      <div className="flex gap-2 pt-2">
        {/* 1. Start Progress Button */}
        {complaint.status === 'Open' && (
          <Button
            type="button"
            onClick={() => updateStatus('In_Progress')}
            disabled={loading}
            className="flex-1 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-600/30"
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
        
        {/* 2. Resolve Button (Only appears after In_Progress) */}
        {complaint.status === 'In_Progress' && (
          <Button
            type="button"
            onClick={() => setShowRemarkDialog(true)}
            disabled={loading}
            className="flex-1 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-600/30"
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

      {/* Resolution Remark Modal */}
      <Dialog open={showRemarkDialog} onOpenChange={setShowRemarkDialog}>
        <DialogContent className="bg-[#09090b] border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>Resolution Remark</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Add a remark about how this issue was resolved.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter your remark..."
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            className="bg-[#18181b] border-zinc-800 text-white focus-visible:ring-zinc-700 min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowRemarkDialog(false)} className="text-zinc-400 hover:text-white">
              Cancel
            </Button>
            <Button onClick={() => updateStatus('Resolved', remark)} disabled={loading} className="bg-white text-black hover:bg-zinc-200">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminActions;
