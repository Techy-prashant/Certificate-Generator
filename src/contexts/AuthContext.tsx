import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { UserProfile, UserRole } from '../types';
import { mockCurrentUser } from '../services/mockData';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  isLoading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const configured = isSupabaseConfigured();

  const fetchProfile = async (userId: string, email: string): Promise<UserProfile | null> => {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        console.warn('Could not fetch user profile from profiles table:', error?.message);
        return {
          id: userId,
          email: email,
          displayName: email.split('@')[0],
          role: 'reviewer', // safe fallback
          isActive: true,
          createdAt: new Date().toISOString(),
        };
      }

      return {
        id: data.id,
        email: data.email || email,
        displayName: data.display_name,
        role: data.role as UserRole,
        isActive: data.is_active,
        createdAt: data.created_at,
      };
    } catch (err) {
      console.error('Error fetching profile:', err);
      return null;
    }
  };

  useEffect(() => {
    if (!configured || !supabase) {
      // In demo mode without configured Supabase, populate with mock profile
      setProfile(mockCurrentUser);
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    // Check active session on initial load
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const prof = await fetchProfile(session.user.id, session.user.email ?? '');
        if (isMounted) setProfile(prof);
      }
      if (isMounted) setIsLoading(false);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        const prof = await fetchProfile(newSession.user.id, newSession.user.email ?? '');
        if (isMounted) setProfile(prof);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [configured]);

  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    if (!configured || !supabase) {
      // Demo authentication simulation
      setProfile(mockCurrentUser);
      return { error: null };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) return { error };

      if (data.user) {
        const prof = await fetchProfile(data.user.id, data.user.email ?? email);
        setProfile(prof);
      }
      return { error: null };
    } catch (err: any) {
      return { error: err as Error };
    }
  };

  const signOut = async (): Promise<void> => {
    if (configured && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        isLoading,
        isConfigured: configured,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
