import { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, Clock, User, Pencil, X, Star, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { getCategoryClass, getStatusClass, getStatusLabel, Status, Category } from '@/lib/constants';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import AdminActions from './AdminActions';
import EditComplaintDialog from './EditComplaintDialog';

type Complaint = {
  id: string; user_id: string; title: string; description: string; category: Category; status: Status; branch: string;
  image_url: string | null; score: number; rating: number | null; review_comment: string | null; admin_remark: string | null;
  created_at: string; updated_at: string; profiles?: { full_name: string; };
};
type Vote = { id: string; vote_type: 'like' | 'dislike'; };
interface ComplaintCardProps { complaint: Complaint; userVote: Vote | null; onVoteChange: () => void; onStatusChange?: () => void; isHighlighted?: boolean; }

const ComplaintCard = ({ complaint, userVote, onVoteChange, onStatusChange, isHighlighted }: ComplaintCardProps) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [optimisticScore, setScore] = useState(complaint.score);
  const [optimisticVote, setVote] = useState(userVote?.vote_type || null);
  const [voting, setVoting] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isImageModalOpen, setIsImageOpen] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [highlighted, setHighlighted] = useState(isHighlighted);

  const isAdmin = profile?.role === 'admin';
  const isOwner = user?.id === complaint.user_id;
  const isEditable = isOwner && complaint.status === 'Open';

  // Handle highlight animation
  useEffect(() => {
    if (isHighlighted) {
      setHighlighted(true);
      const timer = setTimeout(() => setHighlighted(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isHighlighted]);

  // Update optimistic state when props change
  useEffect(() => {
    setScore(complaint.score);
    setVote(userVote?.vote_type || null);
  }, [complaint.score, userVote]);

  const handleVote = async (e: React.MouseEvent, type: 'like' | 'dislike') => {
    e.preventDefault(); e.stopPropagation();
    if (!user || voting) return;
    setVoting(true);
    // Optimistic UI logic...
    const prevScore = optimisticScore; const prevVote = optimisticVote;
    let scoreDelta = 0;
    if (optimisticVote === type) { scoreDelta = type === 'like' ? -1 : 1; setVote(null); }
    else if (optimisticVote) { scoreDelta = type === 'like' ? 2 : -2; setVote(type); }
    else { scoreDelta = type === 'like' ? 1 : -1; setVote(type); }
    setScore(prev => prev + scoreDelta);

    try {
      if (userVote) {
        if (userVote.vote_type === type) await supabase.from('votes').delete().eq('id', userVote.id);
        else await supabase.from('votes').update({ vote_type: type }).eq('id', userVote.id);
      } else await supabase.from('votes').insert({ user_id: user.id, complaint_id: complaint.id, vote_type: type });
      await supabase.from('complaints').update({ score: optimisticScore + scoreDelta }).eq('id', complaint.id);
      onVoteChange();
    } catch { setScore(prevScore); setVote(prevVote); }
    setVoting(false);
  };

  const submitReview = async () => {
    if (rating === 0) return;
    setSubmittingReview(true);
    const { error } = await supabase.from('complaints').update({ rating, review_comment: reviewComment }).eq('id', complaint.id);
    if (!error) {
      const { data: admins } = await supabase.from('profiles').select('id').eq('branch', complaint.branch).eq('role', 'admin');
      if (admins) {
        const notifications = admins.map(a => ({ user_id: a.id, type: 'review_received', message: `⭐ Student rated "${complaint.title}": ${rating} Stars`, complaint_id: complaint.id }));
        await supabase.from('notifications').insert(notifications);
      }
      toast({ title: "Review Submitted", description: "Thank you!" });
      setIsReviewing(false); onStatusChange?.();
    }
    setSubmittingReview(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const wasEdited = complaint.updated_at && complaint.created_at !== complaint.updated_at;

  return (
    <>
      <div id={`complaint-${complaint.id}`} className={cn("glass-card p-6 space-y-4 animate-fade-in transition-all duration-500", complaint.status === 'In_Progress' && "border-blue-500/30", highlighted && "ring-2 ring-blue-500 bg-blue-500/10")}>
        <div className="flex justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2"><Badge className={getCategoryClass(complaint.category)}>{complaint.category}</Badge><Badge variant="outline" className={getStatusClass(complaint.status)}>{getStatusLabel(complaint.status)}</Badge></div>
            <h3 className="text-lg font-semibold text-white">{complaint.title}</h3>
            <p className="text-zinc-400 text-sm mt-1">{complaint.description}</p>
          </div>
          {complaint.image_url && <img src={complaint.image_url} onClick={() => setIsImageOpen(true)} className="w-20 h-20 rounded-lg object-cover border border-zinc-700 cursor-pointer hover:opacity-80" />}
        </div>

        {/* FEEDBACK SECTION */}
        {complaint.status === 'Resolved' && (
          <div className="space-y-3 pt-2">
            {complaint.admin_remark && <div className="bg-zinc-900/50 border border-green-900/30 rounded-lg p-3"><div className="text-xs font-bold text-green-500 mb-1 flex gap-2"><ShieldCheck className="w-3 h-3"/> ADMIN REMARK</div><p className="text-sm text-zinc-300">"{complaint.admin_remark}"</p></div>}
            {complaint.rating ? (
              <div className="bg-yellow-950/20 border border-yellow-700/30 rounded-lg p-3">
                <div className="flex justify-between mb-1"><div className="text-xs font-bold text-yellow-500 flex gap-2"><Star className="w-3 h-3"/> FEEDBACK</div><div className="flex gap-0.5">{[1,2,3,4,5].map(s => <Star key={s} className={cn("w-3 h-3", s <= complaint.rating! ? "text-yellow-400 fill-yellow-400" : "text-zinc-700")} />)}</div></div>
                {complaint.review_comment && <p className="text-sm text-zinc-300">"{complaint.review_comment}"</p>}
              </div>
            ) : isOwner && (
              <div className="bg-zinc-900/50 border border-zinc-700 border-dashed rounded-lg p-4">
                {!isReviewing ? (
                  <div className="flex justify-between items-center"><span className="text-sm text-zinc-400">Issue resolved? Rate service.</span><Button size="sm" variant="outline" onClick={() => setIsReviewing(true)}>Rate</Button></div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between"><span className="text-sm font-bold text-white">Rate Resolution</span><div className="flex gap-1">{[1,2,3,4,5].map(s => <Star key={s} onClick={() => setRating(s)} className={cn("w-6 h-6 cursor-pointer", s <= (hoverRating || rating) ? "text-yellow-400 fill-yellow-400" : "text-zinc-600")} onMouseEnter={() => setHoverRating(s)} onMouseLeave={() => setHoverRating(0)} />)}</div></div>
                    <Textarea placeholder="Comments..." value={reviewComment} onChange={e => setReviewComment(e.target.value)} className="bg-black border-zinc-700" />
                    <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setIsReviewing(false)}>Cancel</Button><Button onClick={submitReview} disabled={!rating || submittingReview} className="bg-white text-black hover:bg-zinc-200">Submit</Button></div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between pt-2 border-t border-zinc-800">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" type="button" onClick={e => handleVote(e, 'like')} className={cn(optimisticVote === 'like' && 'text-emerald-400')}><ThumbsUp className="w-4 h-4"/></Button>
            <span className={cn("text-sm font-medium w-8 text-center", optimisticScore > 0 ? "text-emerald-400" : optimisticScore < 0 ? "text-red-500" : "text-zinc-500")}>{optimisticScore}</span>
            <Button variant="ghost" size="sm" type="button" onClick={e => handleVote(e, 'dislike')} className={cn(optimisticVote === 'dislike' && 'text-red-500')}><ThumbsDown className="w-4 h-4"/></Button>
          </div>
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <span className="flex gap-1"><User className="w-3 h-3"/>{complaint.profiles?.full_name || 'Unknown'}</span>
            <span className="flex gap-1">
              <Clock className="w-3 h-3"/>
              {formatDate(complaint.created_at)}
              {wasEdited && <span className="text-zinc-600 ml-1">(edited)</span>}
            </span>
            {isEditable && <Button variant="ghost" size="sm" type="button" onClick={() => setIsEditOpen(true)}><Pencil className="w-3 h-3 mr-1"/> Edit</Button>}
          </div>
        </div>
        {isAdmin && complaint.status !== 'Resolved' && <AdminActions complaint={complaint} onStatusChange={onStatusChange} />}
      </div>
      {isEditable && <EditComplaintDialog complaint={complaint} open={isEditOpen} onOpenChange={setIsEditOpen} onComplaintUpdated={() => onStatusChange?.()} />}
      {isImageModalOpen && complaint.image_url && <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setIsImageOpen(false)}><img src={complaint.image_url} className="max-h-[90vh] rounded-lg" /><button className="absolute top-4 right-4 text-white"><X size={32} /></button></div>}
    </>
  );
};
export default ComplaintCard;
