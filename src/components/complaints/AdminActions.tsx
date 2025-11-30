import { useState, useEffect } from 'react';
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
  onStatusChange?: (newStatus: Status) => void; // Updated signature
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
      const statusMsg = newStatus === 'In_Progress' ? 'In Progress' : 'Resolved';
      
      await supabase.from('notifications').insert({
        user_id: complaint.user_id,
        type: 'status_change',
        message: `Update: Your complaint "${complaint.title}" is now ${statusMsg}.`,
        complaint_id: complaint.id
      });

      toast({
        title: 'Status Updated',
        description: `Complaint marked as ${statusMsg}`
      });
      
      // Update parent instantly with new status
      onStatusChange?.(newStatus);
    }

    setLoading(false);
    setShowRemarkDialog(false);
    setRemark('');
  };

  return (
    <>
      <div className="flex gap-2 pt-2">
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

      <Dialog open={showRemarkDialog} onOpenChange={setShowRemarkDialog}>
        <DialogContent className="bg-[#09090b] border-zinc-800 text-white sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Resolution Message</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Send a message to the student explaining the solution.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="e.g., Technician visited and replaced the router."
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            className="bg-[#18181b] border-zinc-800 text-white focus-visible:ring-zinc-700 min-h-[120px]"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowRemarkDialog(false)} className="text-zinc-400 hover:text-white">
              Cancel
            </Button>
            <Button onClick={() => updateStatus('Resolved', remark)} disabled={loading} className="bg-white text-black hover:bg-zinc-200 font-bold">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'MARK RESOLVED'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminActions;
