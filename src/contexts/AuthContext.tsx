import React, { createContext, useState, useContext, ReactNode } from 'react';
import { User, Role } from '../types';

interface AuthContextType {
  user: User;
  login: (user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const OBSERVER_USER: User = { id: '0', name: 'Observer', role: Role.Observer };

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>(OBSERVER_USER);

  const login = (userData: User) => {
    setUser(userData);
  };

  const logout = () => {
    setUser(OBSERVER_USER);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};