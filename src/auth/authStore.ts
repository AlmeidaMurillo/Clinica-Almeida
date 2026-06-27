import { createContext, useContext } from "react";

export type UserRole = "recepcao" | "medico";

export type User = {
  id: string;
  email?: string | null;
};

export type Session = {
  access_token: string;
  user: User;
};

export type Profile = {
  id: string;
  nome: string;
  role: UserRole;
  medico_id: string | null;
};

export type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth precisa ser usado dentro de AuthProvider.");
  }

  return context;
}
