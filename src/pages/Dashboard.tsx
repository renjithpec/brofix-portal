import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Inbox } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import ComplaintCard from '@/components/complaints/ComplaintCard';
import ComplaintFilters from '@/components/complaints/ComplaintFilters';
import NewComplaintDialog from '@/components/complaints/NewComplaintDialog';
import { Category, Status } from '@/lib/constants';

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
  updated_at: string;
  profiles: {
    full_name: string;
  } | null;
};

type Vote = {
  id: string;
  complaint_id: string;
  vote_type: 'like' | 'dislike';
};

const Dashboard = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const { user, profile } = useAuth();
  const location = useLocation();
  const isAdmin = profile?.role === 'admin';

  const fetchComplaints = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('complaints')
      .select('*, profiles(full_name)')
      .eq('branch', profile.branch)
      .order('score', { ascending: false })
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

    const channel = supabase
      .channel('dashboard-complaints-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'complaints'
        },
        () => {
          fetchComplaints();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  useEffect(() => {
    if (location.state?.scrollTo) {
      const complaintId = location.state.scrollTo;
      setHighlightedId(complaintId);
      
      setTimeout(() => {
        const element = document.getElementById(`complaint-${complaintId}`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      
      setTimeout(() => setHighlightedId(null), 3000);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const filteredComplaints = complaints.filter(complaint => {
    const matchesSearch = 
      complaint.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      complaint.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || complaint.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getUserVote = (complaintId: string) => {
    return votes.find(v => v.complaint_id === complaintId) || null;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{profile?.branch} Feed</h1>
          <p className="text-muted-foreground">Top reported issues ranked by the community.</p>
        </div>
        {!isAdmin && <NewComplaintDialog onComplaintCreated={fetchComplaints} />}
      </div>

      <ComplaintFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : filteredComplaints.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Inbox className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No issues found</h3>
          <p className="text-muted-foreground">
            The campus is quiet... too quiet. Be the first to report an issue.
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
              onStatusChange={fetchComplaints}
              isHighlighted={highlightedId === complaint.id}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
