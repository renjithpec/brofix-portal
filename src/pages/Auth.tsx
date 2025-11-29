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

          {/* Logic updated to allow signup for BOTH students and admins */}
          {isSignup ? (
            <SignupForm 
              onToggleLogin={() => setIsSignup(false)} 
              isAdmin={activeTab === 'admin'} // Pass true if on Admin tab
            />
          ) : (
            <LoginForm 
              isAdmin={activeTab === 'admin'} 
              onToggleSignup={() => setIsSignup(true)} 
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
