import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FluidBackground from '@/components/FluidBackground';
import Logo from '@/components/Logo';
import LoginForm from '@/components/auth/LoginForm';
import SignupForm from '@/components/auth/SignupForm';
import { useAuth } from '@/contexts/AuthContext';

const Auth = () => {
  const [isSignup, setIsSignup] = useState(false);
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <FluidBackground />
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <FluidBackground />
      
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        <Logo showSubtitle showPortal size="lg" />

        <div className="glass-card p-8 space-y-6">
          {/* Removed AuthTabs to hide Admin Access tab */}
          
          {isSignup ? (
            <SignupForm onToggleLogin={() => setIsSignup(false)} />
          ) : (
            <LoginForm 
              isAdmin={false} // Default to standard login view
              onToggleSignup={() => setIsSignup(true)} 
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
