import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

type Notification = {
  id: string;
  type: string;
  message: string;
  complaint_id: string | null;
  read: boolean;
  created_at: string;
};

const NotificationBell = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20); // Limit to last 20 notifications

    if (data) {
      setNotifications(data as Notification[]);
      setUnreadCount(data.filter(n => !n.read).length);
    }
  };

  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    // Real-time subscription for new notifications
    const channel = supabase
      .channel('realtime-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          // When a new notification arrives, add it to the list and increment count
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAsRead = async (id: string, complaintId: string | null) => {
    // 1. Update database
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);

    // 2. Update local state
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    // 3. Navigate to the complaint
    if (complaintId) {
      navigate('/dashboard', { state: { scrollTo: complaintId } });
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative hover:bg-zinc-800">
          <Bell className="w-5 h-5 text-muted-foreground hover:text-white transition-colors" />
          
          {/* RED BADGE WITH NUMBER */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 bg-red-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold px-1 border-2 border-black animate-in zoom-in duration-300">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 bg-[#18181b] border-zinc-800 text-white shadow-xl">
        <div className="p-4 border-b border-zinc-800">
          <h3 className="font-semibold text-sm">Notifications</h3>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-sm">
              No notifications yet
            </div>
          ) : (
            notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => markAsRead(notification.id, notification.complaint_id)}
                className={cn(
                  'w-full p-4 text-left transition-colors border-b border-zinc-800 last:border-0 hover:bg-zinc-800/50',
                  !notification.read ? 'bg-blue-500/10' : 'bg-transparent'
                )}
              >
                <div className="flex gap-3 items-start">
                  {!notification.read && (
                    <span className="w-2 h-2 mt-1.5 rounded-full bg-blue-500 shrink-0" />
                  )}
                  <div className="flex-1 space-y-1">
                    <p className={cn("text-sm leading-snug", !notification.read ? "text-white font-medium" : "text-zinc-400")}>
                      {notification.message}
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
