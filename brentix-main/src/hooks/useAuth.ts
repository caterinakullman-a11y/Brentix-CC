import { useState, useEffect, useRef, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type UserStatus = "pending" | "approved" | "rejected" | null;
export type UserRole = "admin" | "user" | null;

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  status: UserStatus;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  rejection_reason: string | null;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  // Track if component is mounted to prevent state updates after unmount
  const isMounted = useRef(true);
  // Track if initial session has been loaded to prevent race condition
  const initialSessionLoaded = useRef(false);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (!error && data && isMounted.current) {
      setProfile(data as Profile);
    }
  }, []);

  const fetchRole = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    if (!error && data && isMounted.current) {
      setRole(data.role as UserRole);
    }
  }, []);

  const handleSession = useCallback((session: Session | null) => {
    if (!isMounted.current) return;

    setSession(session);
    setUser(session?.user ?? null);
    setLoading(false);

    if (session?.user) {
      fetchProfile(session.user.id);
      fetchRole(session.user.id);
    } else {
      setProfile(null);
      setRole(null);
    }
  }, [fetchProfile, fetchRole]);

  useEffect(() => {
    isMounted.current = true;

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Only handle auth changes after initial session is loaded
        // This prevents race condition between getSession and onAuthStateChange
        if (initialSessionLoaded.current) {
          handleSession(session);
        }
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      initialSessionLoaded.current = true;
      handleSession(session);
    });

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
    };
  }, [handleSession]);

  const signIn = async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error, data };
  };

  const signOut = async () => {
    setProfile(null);
    setRole(null);
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const isApproved = profile?.status === "approved";
  const isPending = profile?.status === "pending";
  const isRejected = profile?.status === "rejected";
  const isAdmin = role === "admin";

  return {
    user,
    session,
    profile,
    role,
    loading,
    signIn,
    signOut,
    isApproved,
    isPending,
    isRejected,
    isAdmin,
  };
}
