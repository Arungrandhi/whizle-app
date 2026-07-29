import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const API_URL = `http://${window.location.hostname}:5000/api`;

// Create custom axios instance
export const api = axios.create({
  baseURL: API_URL
});

// Interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkLoggedIn = async () => {
      const token = sessionStorage.getItem('token');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          if (res.data.success) {
            setUser(res.data.user);
          } else {
            sessionStorage.removeItem('token');
            setUser(null);
          }
        } catch (err) {
          console.error('Error fetching user profile', err);
          sessionStorage.removeItem('token');
          setUser(null);
        }
      }
      setLoading(false);
    };

    checkLoggedIn();
  }, []);

  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success) {
        sessionStorage.setItem('token', res.data.token);
        // Immediately fetch user details to populate businessId
        const meRes = await api.get('/auth/me');
        if (meRes.data.success) {
          setUser(meRes.data.user);
          return { success: true, user: meRes.data.user };
        }
      }
      return { success: false, message: 'Failed to retrieve profile' };
    } catch (err) {
      console.error('Login request error', err);
      return {
        success: false,
        message: err.response?.data?.message || 'Login failed. Please check credentials.'
      };
    }
  };

  const registerAdmin = async (signupData) => {
    try {
      const res = await api.post('/auth/register', signupData);
      if (res.data.success) {
        sessionStorage.setItem('token', res.data.token);
        // Fetch full profile details
        const meRes = await api.get('/auth/me');
        if (meRes.data.success) {
          setUser(meRes.data.user);
          return { success: true, user: meRes.data.user };
        }
      }
      return { success: false, message: 'Onboarding completed but profile load failed' };
    } catch (err) {
      console.error('Registration request error', err);
      return {
        success: false,
        message: err.response?.data?.message || 'Registration failed'
      };
    }
  };

  const logout = () => {
    sessionStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        registerAdmin,
        logout,
        setUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
