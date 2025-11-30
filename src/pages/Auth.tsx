import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FluidBackground from '@/components/FluidBackground';
import Logo from '@/components/Logo';
import AuthTabs from '@/components/auth/AuthTabs';
import LoginForm from '@/components/auth/LoginForm';
import SignupForm from '@/components/auth/SignupForm';
import { useAuth } from '@/contexts/AuthContext';

const Auth = () => {
  const [activeTab, setActiveTab] = useState<'student' | 'admin'>('student');
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
          <AuthTabs activeTab={activeTab} onTabChange={(tab) => {
            setActiveTab(tab);
            setIsSignup(false);
          }} />

          {activeTab === 'student' ? (
            isSignup ? (
              <SignupForm onToggleLogin={() => setIsSignup(false)} />
            ) : (
              <LoginForm 
                isAdmin={false} 
                onToggleSignup={() => setIsSignup(true)} 
              />
            )
          ) : (
            // Admin Tab - No Signup Option
            <LoginForm isAdmin={true} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
