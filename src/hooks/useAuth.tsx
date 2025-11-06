import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  userRole: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener with token refresh handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event);
        
        // Handle token refresh
        if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed, updating session');
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user role after auth state changes
          setTimeout(async () => {
          // Use RPC function to get highest role (handles multiple roles)
          const { data: roleData } = await supabase
            .rpc("get_user_highest_role", { _user_id: session.user.id });
          
          setUserRole(roleData || "employee");
          }, 0);
        } else {
          setUserRole(null);
        }
      }
    );

    // Check for existing session and refresh if needed
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      // If session exists but token is close to expiry, refresh it
      if (session) {
        const expiresAt = session.expires_at;
        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = expiresAt ? expiresAt - now : 0;
        
        // Refresh if token expires in less than 5 minutes
        if (timeUntilExpiry < 300) {
          console.log('Token close to expiry, refreshing...');
          const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
          setSession(refreshedSession);
          setUser(refreshedSession?.user ?? null);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }
      }
      
      if (session?.user) {
        setTimeout(async () => {
          // Use RPC function to get highest role (handles multiple roles)
          const { data: roleData } = await supabase
            .rpc("get_user_highest_role", { _user_id: session.user.id });
          
          setUserRole(roleData || "employee");
          setLoading(false);
        }, 0);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      setLoading(true);
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) throw error;
      
      if (data.user) {
        toast.success("Account created successfully!");
        // User can now log in from auth page
        navigate("/auth");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to sign up");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Check if user has an organization
        const { data: profile } = await supabase
          .from("profiles")
          .select("organization_id")
          .eq("id", data.user.id)
          .single();

        if (!profile?.organization_id) {
          // No organization - check if a pending join request exists
          const { data: pending } = await supabase
            .from("join_requests")
            .select("id")
            .eq("employee_id", data.user.id)
            .eq("status", "pending")
            .maybeSingle();

          if (pending) {
            toast.info("Join request pending approval.");
            navigate("/pending-request");
            return;
          }

          toast.success("Welcome! Please create or join an organization.");
          navigate("/auth");
          return;
        }

        toast.success("Logged in successfully!");
        
        // Fetch user role and redirect using RPC function
        const { data: roleData } = await supabase
          .rpc("get_user_highest_role", { _user_id: data.user.id });

        const role = roleData || "employee";

        if (role === "admin") {
          navigate("/admin");
          return;
        }

        // Fallback: if user is org admin by ownership, treat as admin
        const { data: orgExists } = await supabase
          .from("organizations")
          .select("id")
          .eq("admin_user_id", data.user.id)
          .maybeSingle();

        if (orgExists) {
          navigate("/admin");
          return;
        }
        
        if (role === "manager" || role === "finance") {
          navigate("/organization");
        } else {
          navigate("/employee");
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to sign in");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error && !`${error.message}`.toLowerCase().includes('session')) {
        throw error;
      }
    } catch (_) {
      // Ignore "session not found" or similar errors and proceed
    } finally {
      toast.success("Logged out successfully");
      setUser(null);
      setSession(null);
      navigate("/auth");
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut, userRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
