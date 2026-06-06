import { create } from 'zustand';
import type { User } from '../../shared/types';
import { authApi } from '../lib/apiServices';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  isLoading: true,

  login: async (email: string, password: string) => {
    const response = await authApi.login({ email, password });

    if (response.success && response.data) {
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      });
      return { success: true };
    }

    return { success: false, message: response.message };
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    authApi.logout();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }

    const response = await authApi.getCurrentUser();
    if (response.success && response.data) {
      set({
        user: response.data,
        token,
        isAuthenticated: true,
        isLoading: false,
      });
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  setUser: (user: User) => {
    set({ user });
    localStorage.setItem('user', JSON.stringify(user));
  },
}));
