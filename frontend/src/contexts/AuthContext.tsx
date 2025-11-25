import React, { createContext, useContext, useState, useEffect } from "react";
// 1. Import fetchApi (API_URL is handled inside it)
import { fetchApi } from "@/lib/api"; 

interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

// Helper type to match the specific shape of auth responses: { user: User }
interface AuthResponse {
  user: User;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  verifyGoogleToken: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = user !== null;

  const checkAuthStatus = async () => {
    try {
      // 2. Use fetchApi. It throws an error if not logged in, which we catch below.
      // We pass { credentials: 'include' } to send cookies.
      const data = await fetchApi<AuthResponse>('/auth/user', {
        credentials: "include",
      });
      
      // fetchApi returns "json.data", which looks like { user: {...} }
      setUser(data.user);
    } catch (error) {
      // If fetchApi fails (401 Unauthorized), we know no one is logged in
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyGoogleToken = async (credential: string) => {
    try {
      setIsLoading(true);
      const data = await fetchApi<AuthResponse>('/auth/google/verify', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ credential }),
      });

      setUser(data.user);
    } catch (error) {
      console.error("Token verification failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetchApi('/auth/logout', {
        method: "POST",
        credentials: "include",
      });
      setUser(null);
    } catch (error) {
      console.error("Logout failed:", error);
      setUser(null);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    verifyGoogleToken,
    logout,
    checkAuthStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};