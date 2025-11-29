import { useState } from 'react';
import { Mail, Lock, ArrowRight, Loader2, User, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { BRANCHES } from '@/lib/constants';

interface SignupFormProps {
  onToggleLogin: () => void;
}

const SignupForm = ({ onToggleLogin }: SignupFormProps) => {
  const [fullName, setFullName] = useState('');
  const [branch, setBranch] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!branch) {
      toast({
        title: 'Branch required',
        description: 'Please select your branch',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    const { error } = await signUp(email, password, fullName, branch);

    if (error) {
      let message = error.message;
      if (message.includes('already registered')) {
        message = 'This email is already registered. Please login instead.';
      }
      toast({
        title: 'Signup failed',
        description: message,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Account created!',
        description: 'You can now login with your credentials.'
      });
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h2 className="text-2xl font-bold text-foreground">Create Account</h2>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
            Full Name
          </label>
          <div className="input-with-icon">
            <User />
            <input
              type="text"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
            Branch
          </label>
          <Select value={branch} onValueChange={setBranch}>
            <SelectTrigger className="bg-secondary/50 border-border h-12">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground" />
                <SelectValue placeholder="Select your branch" />
              </div>
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              {BRANCHES.map((b) => (
                <SelectItem key={b} value={b} className="hover:bg-muted">
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
            Email
          </label>
          <div className="input-with-icon">
            <Mail />
            <input
              type="email"
              placeholder="student@brototype.com"
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
              minLength={6}
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
            Sign Up <ArrowRight className="w-4 h-4 ml-2" />
          </>
        )}
      </Button>

      <p className="text-center text-muted-foreground text-sm">
        Already have an account?{' '}
        <button 
          type="button"
          onClick={onToggleLogin}
          className="text-foreground font-semibold hover:underline"
        >
          Log in
        </button>
      </p>
    </form>
  );
};

export default SignupForm;
