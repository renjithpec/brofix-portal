import { useState } from 'react';
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface LoginFormProps {
  isAdmin: boolean;
  onToggleSignup?: () => void;
}

const LoginForm = ({ isAdmin, onToggleSignup }: LoginFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast({
        title: 'Login failed',
        description: error.message,
        variant: 'destructive'
      });
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h2 className="text-2xl font-bold text-foreground">
        {isAdmin ? 'Admin Access' : 'Student Login'}
      </h2>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
            Email
          </label>
          <div className="input-with-icon">
            <Mail />
            <input
              type="email"
              placeholder={isAdmin ? 'admin@brototype.com' : 'student@brototype.com'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
            Password
          </label>
          <div className="input-with-icon">
            <Lock />
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>
      </div>

      <Button 
        type="submit" 
        className="w-full btn-glow bg-primary text-primary-foreground hover:bg-primary/90 font-semibold uppercase tracking-wider"
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            Login <ArrowRight className="w-4 h-4 ml-2" />
          </>
        )}
      </Button>

      {/* Removed the !isAdmin check so Admins can also see the Signup link */}
      {onToggleSignup && (
        <p className="text-center text-muted-foreground text-sm">
          Don't have an account?{' '}
          <button 
            type="button"
            onClick={onToggleSignup}
            className="text-foreground font-semibold hover:underline"
          >
            Sign up
          </button>
        </p>
      )}
    </form>
  );
};

export default LoginForm;
