"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { AuthUser, api } from "@/lib/api";

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  setSession: (user: AuthUser, accessToken: string) => void;
  clearSession: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Ao carregar/recarregar a página, tenta restaurar a sessão a partir do
  // cookie httpOnly de refresh — sem isto, um F5 no dashboard "desligava" o utilizador.
  useEffect(() => {
    api
      .refresh()
      .then(({ user, accessToken }) => {
        setUser(user);
        setAccessToken(accessToken);
      })
      .catch(() => {
        // Sem sessão válida — segue para login, tratado pelas páginas protegidas.
      })
      .finally(() => setIsLoading(false));
  }, []);

  function setSession(nextUser: AuthUser, nextToken: string) {
    setUser(nextUser);
    setAccessToken(nextToken);
  }

  function clearSession() {
    setUser(null);
    setAccessToken(null);
  }

  return (
    <AuthContext.Provider value={{ user, accessToken, isLoading, setSession, clearSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  return ctx;
}
