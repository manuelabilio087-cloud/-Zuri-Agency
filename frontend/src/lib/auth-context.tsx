"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { AuthUser } from "@/lib/api";

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  setSession: (user: AuthUser, accessToken: string) => void;
  clearSession: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  function setSession(nextUser: AuthUser, nextToken: string) {
    setUser(nextUser);
    setAccessToken(nextToken);
  }

  function clearSession() {
    setUser(null);
    setAccessToken(null);
  }

  return (
    <AuthContext.Provider value={{ user, accessToken, setSession, clearSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  return ctx;
}
