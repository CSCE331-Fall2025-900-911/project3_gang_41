import React, { createContext, useContext, useState, useEffect } from "react";
import { API_URL } from "@/lib/api";

interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
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

  // Check authentication status on mount
  const checkAuthStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/user`, {
        credentials: "include",
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Failed to check auth status:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Verify Google token and create session
  const verifyGoogleToken = async (credential: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/auth/google/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ credential }),
      });

      if (!response.ok) {
        throw new Error("Failed to verify token");
      }

      const data = await response.json();
      setUser(data.user);
    } catch (error) {
      console.error("Token verification failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout user
  const logout = async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      setUser(null);
    } catch (error) {
      console.error("Logout failed:", error);
      // Clear user even if request fails
      setUser(null);
    }
  };

  // Check auth status on component mount
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

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
