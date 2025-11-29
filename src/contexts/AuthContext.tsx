import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type Profile = {
  id: string;
  email: string;
  role: 'student' | 'admin';
  full_name: string;
  avatar_url: string | null;
  branch: string;
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, branch: string, role?: 'student' | 'admin') => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isSuperAdmin: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (!error && data) {
      // --- FORCE ADMIN ROLE FIX (The "God Mode" Patch) ---
      // This forces your specific email to ALWAYS be an Admin, fixing the "Student" bug.
      const forcedAdminEmails = [
        'admin.kochi@brototype.com',
        'admin.blr@brototype.com',
        'admin.clt@brototype.com',
        'admin.chn@brototype.com',
        'admin.cbe@brototype.com',
        'admin.tvm@brototype.com'
      ];

      // Create a copy of the profile data
      const finalProfile = { ...data } as Profile;
      
      if (data.email && forcedAdminEmails.includes(data.email)) {
        console.log("Force-promoting user to Admin:", data.email); // Debug log
        finalProfile.role = 'admin';
        
        // Force correct branch for Super Admin
        if (data.email === 'admin.kochi@brototype.com') {
           finalProfile.branch = 'Kochi';
        }
      }
      // ---------------------------------------------------

      setProfile(finalProfile);
    }
  };

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Small delay to ensure DB trigger has finished writing the profile
        setTimeout(() => {
          fetchProfile(session.user.id);
        }, 500);
      } else {
        setProfile(null);
      }
      
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      
      setLoading(false);
    });
  }, []);

  const signUp = async (email: string, password: string, fullName: string, branch: string, role: 'student' | 'admin' = 'student') => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          branch: branch,
          role: role
        }
      }
    });

    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const isSuperAdmin = profile?.email === 'admin.kochi@brototype.com';

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile, 
      loading, 
      signUp, 
      signIn, 
      signOut,
      isSuperAdmin
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
