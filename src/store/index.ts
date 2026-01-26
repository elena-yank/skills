import { create } from 'zustand';
import { api } from '../lib/api';

// Define our own simple User type
export interface Wizard {
  id: string;
  name: string;
  role: 'user' | 'admin';
}

export interface Skill {
  id: string;
  name: string;
  progress: number; // 0-100
  pendingCount?: number;
  approvedCount?: number;
}

interface AppState {
  user: Wizard | null;
  skills: Skill[];
  isLoading: boolean;
  setUser: (user: Wizard | null) => void;
  fetchSkills: (viewAsUser?: boolean) => Promise<void>;
  addPracticeLog: (skillName: string, content: string, wordCount: number, postLink: string, viewAsUser?: boolean) => Promise<void>;
  deletePracticeLog: (logId: string) => Promise<void>;
  updateLogStatus: (logId: string, status: 'approved' | 'rejected') => Promise<void>;
  signOut: () => Promise<void>;
}

export const SKILL_CATEGORIES = [
  {
    name: "Базовые навыки",
    skills: [
      "Анимагия",
      "Мортимагия",
      "Беспалочковая магия",
      "Невербальная магия",
      "Телесный патронус",
      "Трансгрессия"
    ]
  },
  {
    name: "Продвинутые навыки",
    skills: [
      "Легилименция",
      "Окклюменция",
      "Артефакторика",
      "Магия пространства",
      "Самостоятельная левитация",
      "Некромантия"
    ]
  },
  {
    name: "Врождённые навыки",
    skills: [
      "Метаморфомагия",
      "Провидение"
    ]
  }
];

const DEFAULT_SKILLS = Array.from(new Set(SKILL_CATEGORIES.flatMap(c => c.skills)));

// Simple persistence key
const STORAGE_KEY = 'hogwarts_wizard_session';

const getInitialUser = (): Wizard | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export const useStore = create<AppState>((set, get) => ({
  user: getInitialUser(),
  skills: DEFAULT_SKILLS.map(name => ({ id: name, name, progress: 0 })),
  isLoading: false,

  setUser: (user) => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    set({ user });
  },

  fetchSkills: async (viewAsUser?: boolean) => {
    const { user } = get();
    if (!user) return;

    set({ isLoading: true });
    try {
      if (user.role === 'admin' && !viewAsUser) {
         // Admin logic
         const data = await api.logs.listAll(); 
         
         const approvedMap = new Map<string, number>();
         const pendingMap = new Map<string, number>();
         
         data?.forEach(log => {
             if (log.status === 'approved') {
                 approvedMap.set(log.skill_name, (approvedMap.get(log.skill_name) || 0) + 1);
             } else if (log.status === 'pending') {
                 pendingMap.set(log.skill_name, (pendingMap.get(log.skill_name) || 0) + 1);
             }
         });
         
         const updatedSkills = DEFAULT_SKILLS.map(name => ({
             id: name,
             name,
             progress: 0, 
             approvedCount: approvedMap.get(name) || 0,
             pendingCount: pendingMap.get(name) || 0
         }));
         set({ skills: updatedSkills });
      } else {
         // Regular user logic
         const data = await api.logs.list(user.id);
         
         const progressMap = new Map<string, number>();
         data?.forEach(log => {
             if (log.status === 'approved') {
                const current = progressMap.get(log.skill_name) || 0;
                progressMap.set(log.skill_name, current + 1);
             }
         });

         const updatedSkills = DEFAULT_SKILLS.map(name => ({
            id: name,
            name,
            progress: Math.min(progressMap.get(name) || 0, 100)
         })).sort((a, b) => b.progress - a.progress);

         set({ skills: updatedSkills });
      }
    } catch (error) {
      console.error('Error fetching skills:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  addPracticeLog: async (skillName, content, wordCount, postLink, viewAsUser?: boolean) => {
    const { user, fetchSkills } = get();
    if (!user) return;

    try {
      await api.logs.create({
        user_id: user.id,
        skill_name: skillName,
        content,
        word_count: wordCount,
        post_link: postLink
      });

      // Refresh skills to update progress
      await fetchSkills(viewAsUser);
    } catch (error) {
      console.error('Error adding log:', error);
      throw error;
    }
  },

  deletePracticeLog: async (logId: string) => {
    const { user, fetchSkills } = get();
    if (!user) return;

    try {
      await api.logs.delete(logId, user.id);
      await fetchSkills();
    } catch (error) {
      console.error('Error deleting log:', error);
      throw error;
    }
  },

  updateLogStatus: async (logId: string, status: 'approved' | 'rejected') => {
      const { user, fetchSkills } = get();
      if (!user || user.role !== 'admin') return;

      try {
          await api.logs.updateStatus(logId, status);
          await fetchSkills();
      } catch (error) {
          console.error('Error updating log status:', error);
          throw error;
      }
  },

  signOut: async () => {
    // Just clear local state
    localStorage.removeItem(STORAGE_KEY);
    set({ user: null, skills: DEFAULT_SKILLS.map(name => ({ id: name, name, progress: 0 })) });
  }
}));
