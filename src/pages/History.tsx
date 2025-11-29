import { useState, useEffect } from 'react';
import { Inbox } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import ComplaintCard from '@/components/complaints/ComplaintCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Category, Status, STATUSES } from '@/lib/constants';

type Complaint = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: Category;
  status: Status;
  branch: string;
  image_url: string | null;
  score: number;
  rating: number | null;
  review_comment: string | null;
  admin_remark: string | null;
  created_at: string;
  profiles: {
    full_name: string;
  } | null;
};

type Vote = {
  id: string;
  complaint_id: string;
  vote_type: 'like' | 'dislike';
};

const History = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchComplaints = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('complaints')
      .select('*, profiles(full_name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setComplaints(data as Complaint[]);
    }
    setLoading(false);
  };

  const fetchVotes = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('votes')
      .select('id, complaint_id, vote_type')
      .eq('user_id', user.id);

    if (data) {
      setVotes(data as Vote[]);
    }
  };

  useEffect(() => {
    fetchComplaints();
    fetchVotes();
  }, [user]);

  const filteredComplaints = complaints.filter(complaint => {
    return statusFilter === 'all' || complaint.status === statusFilter;
  });

  const getUserVote = (complaintId: string) => {
    return votes.find(v => v.complaint_id === complaintId) || null;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My History</h1>
          <p className="text-muted-foreground">Track all your submitted complaints.</p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-secondary/50 border-border">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status === 'In_Progress' ? 'In Progress' : status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : filteredComplaints.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Inbox className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No complaints yet</h3>
          <p className="text-muted-foreground">
            You haven't submitted any complaints yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredComplaints.map((complaint) => (
            <ComplaintCard
              key={complaint.id}
              complaint={complaint}
              userVote={getUserVote(complaint.id)}
              onVoteChange={fetchVotes}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default History;
