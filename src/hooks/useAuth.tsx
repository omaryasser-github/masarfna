import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Role = "admin" | "viewer" | null;

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  role: Role;
  isAdmin: boolean;
  loading: boolean;
};

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  role: null,
  isAdmin: false,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) setRole(null);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    let cancelled = false;
    // Check role directly from Supabase on every login
    supabase
      .rpc("has_role", { _user_id: userId, _role: "admin" })
      .then(async ({ data: isAdmin, error }) => {
        if (cancelled) return;
        if (!error) {
          setRole(isAdmin ? "admin" : "viewer");
          return;
        }
        const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
        if (cancelled) return;
        const roles = (data ?? []).map((r) => r.role);
        setRole(roles.includes("admin") ? "admin" : "viewer");
      });
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        role,
        isAdmin: role === "admin",
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
