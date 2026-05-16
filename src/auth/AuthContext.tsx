import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { AuthContext, type AuthContextValue, type Profile } from "./authStore";

type AuthProviderProps = {
  children: ReactNode;
};

async function getProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id,nome,role,medico_id")
    .eq("id", userId)
    .single<Profile>();

  if (error) {
    throw new Error("Perfil do usuario nao encontrado.");
  }

  return data;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));

  const user = session?.user ?? null;

  const refreshProfile = useCallback(async () => {
    if (!session?.user) {
      setProfile(null);
      return;
    }

    setProfile(await getProfile(session.user.id));
  }, [session]);

  useEffect(() => {
    if (!supabase) {
      return undefined;
    }

    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;

      setSession(data.session);
      if (data.session?.user) {
        setProfile(await getProfile(data.session.user.id));
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession?.user) {
        setProfile(null);
        return;
      }

      getProfile(nextSession.user.id)
        .then(setProfile)
        .catch(() => setProfile(null));
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      throw new Error("Supabase nao configurado.");
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      throw new Error("Email ou senha invalidos.");
    }

    if (data.session) {
      setSession(data.session);
      setProfile(await getProfile(data.session.user.id));
    }
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    if (!supabase) {
      throw new Error("Supabase nao configurado.");
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      throw new Error("Nao foi possivel alterar a senha.");
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;

    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      profile,
      loading,
      signIn,
      updatePassword,
      signOut,
      refreshProfile,
    }),
    [user, session, profile, loading, signIn, updatePassword, signOut, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
