import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize and check authenticated user on load
  useEffect(() => {
    async function loadUser() {
      const token = api.getToken();
      if (token) {
        try {
          const res = await api.get('/auth/me');
          const userData = res.data?.user || res.user;
          if (res.success && userData) {
            setUser(userData);
          } else {
            api.setToken(null);
            setUser(null);
          }
        } catch (err) {
          console.warn('Initial session check failed:', err.message);
          api.setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    }
    loadUser();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const accessToken = res.data?.accessToken || res.accessToken;
    const userData = res.data?.user || res.user;
    if (res.success && accessToken) {
      api.setToken(accessToken);
      setUser(userData);
      return userData;
    }
    throw new Error(res.message || res.error || 'Login failed');
  };

  const register = async (userData) => {
    const res = await api.post('/auth/register', userData);
    const accessToken = res.data?.accessToken || res.accessToken;
    const newUser = res.data?.user || res.user;
    if (res.success && accessToken) {
      api.setToken(accessToken);
      setUser(newUser);
      return newUser;
    }
    throw new Error(res.message || res.error || 'Registration failed');
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    }
    api.setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      const userData = res.data?.user || res.user;
      if (res.success && userData) {
        setUser(userData);
      }
    } catch (err) {
      console.warn('Refresh user error:', err.message);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
