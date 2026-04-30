import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

// TODO: Import shared types when available
interface User {
  id: string;
  email: string;
  name: string;
  role: 'STUDENT' | 'ADMIN';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isSignedIn: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, name: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // TODO: Load stored auth state from async storage on app startup
    // TODO: Verify token validity with backend
    bootstrapAsync();
  }, []);

  const bootstrapAsync = async () => {
    try {
      // TODO: Retrieve stored JWT and user data
      // TODO: Validate token expiry
      setIsLoading(false);
    } catch (e) {
      // Restore state failed, user not logged in
      setIsLoading(false);
    }
  };

  const authContext: AuthContextType = {
    user,
    isLoading,
    isSignedIn: !!user,
    signIn: async (email: string, password: string) => {
      // TODO: Call POST /api/auth/login
      // TODO: Store JWT tokens (access + refresh)
      // TODO: Store user data
      // TODO: Set axios interceptor auth header
    },
    signUp: async (email: string, name: string, password: string) => {
      // TODO: Call POST /api/auth/register
      // TODO: Auto-login user after signup
    },
    signOut: async () => {
      // TODO: Call POST /api/auth/logout
      // TODO: Clear stored tokens
      // TODO: Clear axios auth header
      setUser(null);
    },
    refreshToken: async () => {
      // TODO: Call POST /api/auth/refresh
      // TODO: Update stored tokens
    },
  };

  return <AuthContext.Provider value={authContext}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
