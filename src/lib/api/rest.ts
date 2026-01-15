import { ApiClient, User, PracticeLog } from './types';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const restApi: ApiClient = {
  auth: {
    signUp: async (name, password) => {
      const res = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sign up');
      return data as User;
    },
    signIn: async (name, password) => {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sign in');
      return data as User;
    },
    getUserByName: async (name) => {
      const res = await fetch(`${API_URL}/users/${encodeURIComponent(name.replace(/\s/g, '_'))}`);
      if (res.status === 404) return null;
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data as User;
    },
    listAllUsers: async () => {
        // Mock implementation or throw error if not needed for REST yet
        throw new Error('Not implemented');
    }
  },
  logs: {
    list: async (userId, skillName) => {
      const params = new URLSearchParams({ user_id: userId });
      if (skillName) params.append('skill_name', skillName);
      
      const res = await fetch(`${API_URL}/logs?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data as PracticeLog[];
    },
    listAll: async (skillName, status) => {
       // Not implemented for REST yet
       throw new Error('Not implemented');
    },
    create: async (log) => {
      const res = await fetch(`${API_URL}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data as PracticeLog;
    },
    delete: async (id, userId) => {
      const res = await fetch(`${API_URL}/logs/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }), // Pass user_id for ownership check
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
    },
    updateStatus: async (id, status) => {
        // Not implemented
        throw new Error('Not implemented');
    }
  }
};
