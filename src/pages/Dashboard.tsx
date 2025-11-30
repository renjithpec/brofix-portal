import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import ComplaintCard from '@/components/complaints/ComplaintCard';
import ComplaintFilters from '@/components/complaints/ComplaintFilters';
import NewComplaintDialog from '@/components/complaints/NewComplaintDialog';
import { Category, Status, Branch } from '@/lib/constants';

type Complaint = any; // Using explicit type in Card, here keeping simple

const Dashboard = () => {
  const { user, profile } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<Category | 'All'>('All');
  const [statusFilter, setStatusFilter] = useState<Status | 'All'>('All');
  const [newComplaintOpen, setNewComplaintOpen] = useState(false);
  const location = useLocation();

  const fetchComplaints = async () => {
    if (!profile) return;
    setLoading(true);

    let query = supabase
      .from('complaints')
      .select('*, profiles(full_name), votes(id, vote_type)')
      .eq('branch', profile.branch)
      .order('created_at', { ascending: false });

    if (categoryFilter !== 'All') {
      query = query.eq('category', categoryFilter);
    }
    if (statusFilter !== 'All') {
      query = query.eq('status', statusFilter);
    }
    if (searchQuery) {
      query = query.ilike('title', `%${searchQuery}%`);
    }

    const { data, error } = await query;

    if (!error && data) {
      const formattedComplaints = data.map((c: any) => {
        const userVote = c.votes.find((v: any) => v.user_id === user?.id) || null;
        return { ...c, userVote };
      });
      setComplaints(formattedComplaints);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchComplaints();
  }, [profile, categoryFilter, statusFilter, searchQuery]);

  // Scroll to complaint if redirected from notification
  useEffect(() => {
    if (location.state?.scrollTo && !loading) {
      const element = document.getElementById(`complaint-${location.state.scrollTo}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('ring-2', 'ring-blue-500');
        setTimeout(() => element.classList.remove('ring-2', 'ring-blue-500'), 3000);
      }
    }
  }, [location.state, loading]);

  const isAdmin = profile?.role === 'admin';

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            {profile?.branch ? profile.branch.split(' - ')[0] : 'Global'} Feed
          </h1>
          <p className="text-zinc-400 mt-1">Top reported issues ranked by the community.</p>
        </div>
        
        {!isAdmin && (
          <Button 
            onClick={() => setNewComplaintOpen(true)} 
            className="bg-white text-black hover:bg-zinc-200 font-bold shadow-[0_0_20px_rgba(255,255,255,0.2)]"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Issue
          </Button>
        )}
      </div>

      <ComplaintFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : complaints.length > 0 ? (
        <div className="grid gap-4">
          {complaints.map((complaint) => (
            <ComplaintCard
              key={complaint.id}
              complaint={complaint}
              userVote={complaint.votes.find((v: any) => v.user_id === user?.id) || null}
              onVoteChange={fetchComplaints}
              onStatusChange={fetchComplaints} // IMPORTANT: Re-fetches when status updates
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-24 bg-[#09090b] border border-dashed border-zinc-800 rounded-xl">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-900 text-zinc-600 mb-4">
            <Inbox className="w-8 h-8" />
          </div>
          <h3 className="text-white font-bold text-lg">No issues found</h3>
          <p className="text-zinc-500 text-sm mt-1">Try adjusting your filters or search terms.</p>
        </div>
      )}

      <NewComplaintDialog 
        open={newComplaintOpen} 
        onOpenChange={setNewComplaintOpen}
        onComplaintCreated={fetchComplaints}
      />
    </div>
  );
};

export default Dashboard;
