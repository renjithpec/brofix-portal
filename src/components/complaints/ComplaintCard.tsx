import { useState } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare, Clock, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getCategoryClass, getStatusClass, getStatusLabel, Status, Category } from '@/lib/constants';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AdminActions from './AdminActions';

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
  const [optimisticScore, setOptimisticScore] = useState(complaint.score);
  const [optimisticVote, setOptimisticVote] = useState(userVote?.vote_type || null);
  const [voting, setVoting] = useState(false);
  const isAdmin = profile?.role === 'admin';

  const handleVote = async (e: React.MouseEvent, voteType: 'like' | 'dislike') => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user || voting) return;
    setVoting(true);

    const previousScore = optimisticScore;
    const previousVote = optimisticVote;

    // Calculate new score optimistically
    let scoreDelta = 0;
    if (optimisticVote === voteType) {
      // Removing vote
      scoreDelta = voteType === 'like' ? -1 : 1;
      setOptimisticVote(null);
    } else if (optimisticVote) {
      // Changing vote
      scoreDelta = voteType === 'like' ? 2 : -2;
      setOptimisticVote(voteType);
    } else {
      // New vote
      scoreDelta = voteType === 'like' ? 1 : -1;
      setOptimisticVote(voteType);
    }
    setOptimisticScore(prev => prev + scoreDelta);

    try {
      if (userVote) {
        if (userVote.vote_type === voteType) {
          // Remove vote
          await supabase.from('votes').delete().eq('id', userVote.id);
        } else {
          // Update vote
          await supabase.from('votes').update({ vote_type: voteType }).eq('id', userVote.id);
        }
      } else {
        // Create new vote
        await supabase.from('votes').insert({
          user_id: user.id,
          complaint_id: complaint.id,
          vote_type: voteType
        });
      }

      // Update complaint score
      await supabase
        .from('complaints')
        .update({ score: optimisticScore + scoreDelta })
        .eq('id', complaint.id);

      onVoteChange();
    } catch (error) {
      // Revert on error
      setOptimisticScore(previousScore);
      setOptimisticVote(previousVote);
    }

    setVoting(false);
  };

  return (
    <div 
      id={`complaint-${complaint.id}`}
      className="glass-card p-6 space-y-4 animate-fade-in"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge className={cn('text-xs', getCategoryClass(complaint.category))}>
              {complaint.category}
            </Badge>
            <Badge variant="outline" className={cn('text-xs', getStatusClass(complaint.status))}>
              {getStatusLabel(complaint.status)}
            </Badge>
          </div>
          <h3 className="text-lg font-semibold text-foreground">{complaint.title}</h3>
          <p className="text-muted-foreground text-sm mt-1 line-clamp-2">{complaint.description}</p>
        </div>
        
        {complaint.image_url && (
          <img 
            src={complaint.image_url} 
            alt="Complaint" 
            className="w-20 h-20 rounded-lg object-cover"
          />
        )}
      </div>

      {complaint.admin_remark && (
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">Admin Remark:</p>
          <p className="text-sm text-foreground">{complaint.admin_remark}</p>
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
        </div>
      </div>

      {isAdmin && complaint.status !== 'Resolved' && (
        <AdminActions complaint={complaint} onStatusChange={onStatusChange} />
      )}
    </div>
  );
};

export default ComplaintCard;
