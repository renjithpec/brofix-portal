import { Link, useLocation } from 'react-router-dom';
import { LayoutGrid, History, BarChart3, Users, Bell, User, LogOut, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import Logo from '@/components/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import NotificationBell from '@/components/notifications/NotificationBell';

const Header = () => {
  const location = useLocation();
  const { profile, signOut, isSuperAdmin } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const navItems = isAdmin ? [
    { path: '/dashboard', label: 'Feed', icon: LayoutGrid },
    { path: '/stats', label: 'Stats', icon: BarChart3 },
    ...(isSuperAdmin ? [{ path: '/team', label: 'Team', icon: Users }] : []),
  ] : [
    { path: '/dashboard', label: 'Feed', icon: LayoutGrid },
    { path: '/history', label: 'My History', icon: History },
  ];

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/dashboard" className="flex items-center gap-3">
            <Logo size="sm" />
            <span className="text-brofix-blue font-semibold text-sm">BroFix</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <NotificationBell />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-3 px-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-foreground">{profile?.full_name}</p>
                  <p className="text-xs text-muted-foreground uppercase">{profile?.role}</p>
                </div>
                <div className="w-9 h-9 rounded-full border border-border flex items-center justify-center bg-muted overflow-hidden">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-card border-border">
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                {profile?.branch}
              </div>
              <DropdownMenuSeparator className="bg-border" />
              
              {/* THIS IS THE MISSING LINK */}
              <Link to="/settings">
                <DropdownMenuItem className="cursor-pointer">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
              </Link>

              <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive cursor-pointer">
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;
