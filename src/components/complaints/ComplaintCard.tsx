import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Clock, User, Pencil, ZoomIn, X, Star, ShieldCheck } from 'lucide-react';
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
  profiles?: {
    full_name: string;
  };
};

type Vote = {
  id: string;
  vote_type: 'like' | 'dislike';
};

interface ComplaintCardProps {
  complaint: Complaint;
  userVote: Vote | null;
  onVoteChange: () => void;
  onStatusChange?: () => void;
}

const ComplaintCard = ({ complaint, userVote, onVoteChange, onStatusChange }: ComplaintCardProps) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const [optimisticScore, setOptimisticScore] = useState(complaint.score);
  const [optimisticVote, setOptimisticVote] = useState(userVote?.vote_type || null);
  const [voting, setVoting] = useState(false);
  
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  // Rating State
  const [isReviewing, setIsReviewing] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  
  const isAdmin = profile?.role === 'admin';
  const isOwner = user?.id === complaint.user_id;
  const isEditable = isOwner && complaint.status === 'Open';
  const wasEdited = complaint.updated_at && complaint.updated_at !== complaint.created_at;

  const handleVote = async (e: React.MouseEvent, voteType: 'like' | 'dislike') => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user || voting) return;
    setVoting(true);

    const previousScore = optimisticScore;
    const previousVote = optimisticVote;
    let scoreDelta = 0;

    if (optimisticVote === voteType) {
      scoreDelta = voteType === 'like' ? -1 : 1;
      setOptimisticVote(null);
    } else if (optimisticVote) {
      scoreDelta = voteType === 'like' ? 2 : -2;
      setOptimisticVote(voteType);
    } else {
      scoreDelta = voteType === 'like' ? 1 : -1;
      setOptimisticVote(voteType);
    }
    setOptimisticScore(prev => prev + scoreDelta);

    try {
      if (userVote) {
        if (userVote.vote_type === voteType) {
          await supabase.from('votes').delete().eq('id', userVote.id);
        } else {
          await supabase.from('votes').update({ vote_type: voteType }).eq('id', userVote.id);
        }
      } else {
        await supabase.from('votes').insert({
          user_id: user.id,
          complaint_id: complaint.id,
          vote_type: voteType
        });
      }

      await supabase
        .from('complaints')
        .update({ score: optimisticScore + scoreDelta })
        .eq('id', complaint.id);

      onVoteChange();
    } catch (error) {
      setOptimisticScore(previousScore);
      setOptimisticVote(previousVote);
    }

    setVoting(false);
  };

  const handleSubmitReview = async () => {
    if (rating === 0) return;
    setSubmittingReview(true);

    const { error } = await supabase
      .from('complaints')
      .update({
        rating,
        review_comment: reviewComment
      })
      .eq('id', complaint.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to submit review.",
        variant: "destructive"
      });
    } else {
      // Notify Branch Admins
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .eq('branch', complaint.branch)
        .eq('role', 'admin');

      if (admins) {
        const notifications = admins.map(admin => ({
          user_id: admin.id,
          type: 'review_received',
          message: `⭐ New ${rating}-star rating for "${complaint.title}"`,
          complaint_id: complaint.id
        }));
        await supabase.from('notifications').insert(notifications);
      }

      toast({ title: "Review Submitted", description: "Thank you for your feedback!" });
      setIsReviewing(false);
      onStatusChange?.();
    }
    setSubmittingReview(false);
  };

  return (
    <>
      <div 
        id={`complaint-${complaint.id}`}
        className={cn(
          "glass-card p-6 space-y-4 animate-fade-in transition-all duration-500",
          complaint.status === 'In_Progress' && "border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.1)]"
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge className={cn('text-xs', getCategoryClass(complaint.category))}>
                {complaint.category}
              </Badge>
              <Badge variant="outline" className={cn('text-xs', getStatusClass(complaint.status))}>
                {getStatusLabel(complaint.status)}
              </Badge>
              {wasEdited && (
                <span className="text-[10px] text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded flex items-center gap-1">
                  <Pencil className="w-3 h-3" /> Edited
                </span>
              )}
            </div>
            <h3 className="text-lg font-semibold text-foreground">{complaint.title}</h3>
            <p className="text-muted-foreground text-sm mt-1 line-clamp-2">{complaint.description}</p>
          </div>
          
          {complaint.image_url && (
            <div 
              className="relative group cursor-pointer shrink-0"
              onClick={() => setIsImageModalOpen(true)}
            >
              <img 
                src={complaint.image_url} 
                alt="Complaint" 
                className="w-20 h-20 rounded-lg object-cover border border-border transition-all group-hover:opacity-80"
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-lg">
                <ZoomIn className="w-6 h-6 text-white" />
              </div>
            </div>
          )}
        </div>

        {/* --- FEEDBACK LOOP SECTION --- */}
        {complaint.status === 'Resolved' && (
          <div className="space-y-3 pt-2 animate-in slide-in-from-top-2">
            
            {/* 1. Admin Remark */}
            {complaint.admin_remark && (
              <div className="bg-zinc-900/50 border border-green-900/30 rounded-lg p-3">
                <div className="flex items-center gap-2 text-xs font-bold text-green-500 uppercase tracking-wider mb-1">
                  <ShieldCheck className="w-3 h-3" /> Admin Message
                </div>
                <p className="text-sm text-zinc-300 italic">"{complaint.admin_remark}"</p>
              </div>
            )}

            {/* 2. Show Rating (if exists) OR Show Rating Form (if owner) */}
            {complaint.rating ? (
              <div className="bg-yellow-950/20 border border-yellow-700/30 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-yellow-500 uppercase tracking-wider">
                    <Star className="w-3 h-3 fill-yellow-500" /> Your Feedback
                  </div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star} 
                        className={cn("w-3 h-3", star <= (complaint.rating || 0) ? "text-yellow-400 fill-yellow-400" : "text-zinc-700")} 
                      />
                    ))}
                  </div>
                </div>
                {complaint.review_comment && (
                  <p className="text-sm text-zinc-300">"{complaint.review_comment}"</p>
                )}
              </div>
            ) : (
              isOwner && (
                <div className="bg-zinc-900/50 border border-dashed border-zinc-700 rounded-lg p-4 transition-all">
                  {!isReviewing ? (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">Is this resolved? Rate the service.</span>
                      <Button size="sm" variant="outline" onClick={() => setIsReviewing(true)} className="h-8 text-xs border-zinc-600">
                        Rate & Reply
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3 animate-in slide-in-from-top-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-white">How was the service?</span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onMouseEnter={() => setHoverRating(star)}
                              onMouseLeave={() => setHoverRating(0)}
                              onClick={() => setRating(star)}
                              className="focus:outline-none transition-transform hover:scale-110"
                            >
                              <Star 
                                className={cn("w-6 h-6", star <= (hoverRating || rating) ? "text-yellow-400 fill-yellow-400" : "text-zinc-600")} 
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <Textarea
                        className="bg-black border-zinc-700 text-sm min-h-[60px] text-white"
                        placeholder="Reply to admin... (Optional)"
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                      />

                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => setIsReviewing(false)} className="text-zinc-400">Cancel</Button>
                        <Button 
                          size="sm" 
                          disabled={rating === 0 || submittingReview} 
                          onClick={handleSubmitReview}
                          className="bg-white text-black hover:bg-zinc-200 font-bold"
                        >
                          {submittingReview ? "Sending..." : "Submit Feedback"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Button 
                type="button"
                variant="ghost" 
                size="sm" 
                className={cn(
                  'h-8 px-2',
                  optimisticVote === 'like' && 'text-emerald-400 bg-emerald-400/10'
                )}
                onClick={(e) => handleVote(e, 'like')}
                disabled={voting}
              >
                <ThumbsUp className="w-4 h-4" />
              </Button>
              <span className={cn(
                'text-sm font-medium min-w-[2rem] text-center',
                optimisticScore > 0 ? 'text-emerald-400' : optimisticScore < 0 ? 'text-destructive' : 'text-muted-foreground'
              )}>
                {optimisticScore}
              </span>
              <Button 
                type="button"
                variant="ghost" 
                size="sm" 
                className={cn(
                  'h-8 px-2',
                  optimisticVote === 'dislike' && 'text-destructive bg-destructive/10'
                )}
                onClick={(e) => handleVote(e, 'dislike')}
                disabled={voting}
              >
                <ThumbsDown className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {complaint.profiles?.full_name || 'Anonymous'}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(complaint.created_at).toLocaleDateString()}
            </span>
            
            {isEditable && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditOpen(true)}
                className="h-7 px-2 text-xs hover:bg-secondary transition-colors"
              >
                <Pencil className="w-3 h-3 mr-1.5" />
                Edit
              </Button>
            )}
          </div>
        </div>

        {isAdmin && complaint.status !== 'Resolved' && (
          <AdminActions complaint={complaint} onStatusChange={onStatusChange} />
        )}
      </div>

      {isEditable && (
        <EditComplaintDialog 
          complaint={complaint}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          onComplaintUpdated={() => onStatusChange?.()} 
        />
      )}

      {isImageModalOpen && complaint.image_url && (
        <div 
          className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsImageModalOpen(false)}
        >
          <button 
            onClick={() => setIsImageModalOpen(false)}
            className="absolute top-4 right-4 p-2 bg-secondary/50 rounded-full text-foreground hover:bg-secondary transition-colors"
          >
            <X size={24} />
          </button>
          <img 
            src={complaint.image_url} 
            alt="Full Evidence" 
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" 
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};

export default ComplaintCard;
