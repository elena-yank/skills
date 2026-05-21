import { ApiClient, User, PracticeLog, Story } from './types';

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
    listAllUsers: () => {
        return fetch(`${API_URL}/users`).then(res => res.json());
    }
  },
  users: {
    updateAvatar: async (id, avatarUrl) => {
      const res = await fetch(`${API_URL}/users/${id}/avatar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_url: avatarUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data as User;
    },
    updateProfile: async (id, profile) => {
      const res = await fetch(`${API_URL}/users/${id}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data as User;
    }
  },
  admin: {
    listUsers: async () => {
      const res = await fetch(`${API_URL}/admin/users`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data as User[];
    },
    createUser: async (user) => {
      const res = await fetch(`${API_URL}/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data as User;
    },
    updateUser: async (id, updates) => {
      const res = await fetch(`${API_URL}/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
    },
    deleteUser: async (id, actorUserId, mode = 'hide') => {
      const res = await fetch(`${API_URL}/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: actorUserId, mode }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
    },
    grantSkill: async (userId, skillName, reason, moderatorId) => {
      const res = await fetch(`${API_URL}/admin/skills/grant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, skill_name: skillName, reason, moderator_id: moderatorId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
    }
  },
  skills: {
    getMetadata: async () => {
      const res = await fetch(`${API_URL}/skills/metadata`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    updateMetadata: async (metadata) => {
      const res = await fetch(`${API_URL}/skills/metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metadata),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    }
  },
  logs: {
    pendingCounts: async (userId) => {
      const res = await fetch(`${API_URL}/admin/logs/pending-counts?user_id=${encodeURIComponent(userId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data as Record<string, number>;
    },
    approvedCounts: async (userId) => {
      const res = await fetch(`${API_URL}/admin/logs/approved-counts?user_id=${encodeURIComponent(userId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data as Record<string, number>;
    },
    updateContent: async (id, userId, content, wordCount) => {
      const res = await fetch(`${API_URL}/logs/${id}/content`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, content, word_count: wordCount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data as PracticeLog;
    },
    list: async (userId, skillName) => {
      const params = new URLSearchParams({ user_id: userId });
      if (skillName) params.append('skill_name', skillName);
      const res = await fetch(`${API_URL}/logs?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data as PracticeLog[];
    },
    listAll: async (skillName, status) => {
       const params = new URLSearchParams();
       if (skillName) params.append('skill_name', skillName);
       if (status) params.append('status', status);

       const res = await fetch(`${API_URL}/admin/logs?${params}`);
       const data = await res.json();
       if (!res.ok) throw new Error(data.error);
       return data as PracticeLog[];
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
    updateStatus: async (id, status, userId, rejectionReason) => {
        const res = await fetch(`${API_URL}/logs/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, user_id: userId, rejection_reason: rejectionReason }),
        });
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error);
        }
    }
  },
  notifications: {
      list: async (userId) => {
          const res = await fetch(`${API_URL}/notifications?user_id=${userId}`);
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          return data;
      },
      markAsRead: async (id) => {
          const res = await fetch(`${API_URL}/notifications/${id}/read`, {
              method: 'PATCH',
          });
          if (!res.ok) {
              const data = await res.json();
              throw new Error(data.error);
          }
      },
      markAllAsRead: async (userId) => {
          const res = await fetch(`${API_URL}/notifications/read-all`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_id: userId }),
          });
          if (!res.ok) {
              const data = await res.json();
              throw new Error(data.error);
          }
      },
      delete: async (id) => {
          const res = await fetch(`${API_URL}/notifications/${id}`, {
              method: 'DELETE',
          });
          if (!res.ok) {
              const data = await res.json();
              throw new Error(data.error);
          }
      }
  },
  raceRequests: {
      create: async (request) => {
          const res = await fetch(`${API_URL}/race-requests`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(request),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          return data;
      },
      list: async () => {
          const res = await fetch(`${API_URL}/race-requests`);
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          return data;
      },
      process: async (id, data) => {
          const res = await fetch(`${API_URL}/race-requests/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data),
          });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error);
          return result;
      }
  },
  stories: {
      list: async (userId) => {
          const params = new URLSearchParams({ user_id: userId });
          const res = await fetch(`${API_URL}/stories?${params}`);
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          return data as Story[];
      },
      get: async (id) => {
          const res = await fetch(`${API_URL}/stories/${id}`);
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          return data as Story;
      },
      create: async (payload) => {
          const res = await fetch(`${API_URL}/stories`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          return data as Story;
      },
      update: async (id, payload) => {
          const res = await fetch(`${API_URL}/stories/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          return data as Story;
      },
      appendSegments: async (id, userId, segments) => {
          const res = await fetch(`${API_URL}/stories/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_id: userId, segments }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          return data as Story;
      },
      delete: async (id, userId) => {
          const res = await fetch(`${API_URL}/stories/${id}`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_id: userId }),
          });
          if (!res.ok) {
              const data = await res.json();
              throw new Error(data.error);
          }
      }
  }
};
