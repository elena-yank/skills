import { create } from 'zustand';
import { supabase } from '../lib/supabase';

// Define our own simple User type
export interface Wizard {
  id: string;
  name: string;
}

export interface Skill {
  id: string;
  name: string;
  progress: number; // 0-100
}

interface AppState {
  user: Wizard | null;
  skills: Skill[];
  isLoading: boolean;
  setUser: (user: Wizard | null) => void;
  fetchSkills: () => Promise<void>;
  addPracticeLog: (skillName: string, content: string, wordCount: number, postLink: string) => Promise<void>;
  deletePracticeLog: (logId: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const DEFAULT_SKILLS = [
  "Беспалочковая магия",
  "Невербальная магия",
  "Трансгрессия",
  "Анимагия",
  "Мортимагия"
];

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

  fetchSkills: async () => {
    const { user } = get();
    if (!user) return;

    set({ isLoading: true });
    try {
      // Get all logs for the user
      const data = await api.logs.list(user.id);

      // Calculate progress: 1 log = 1%
      const progressMap = new Map<string, number>();
      data?.forEach(log => {
        const current = progressMap.get(log.skill_name) || 0;
        progressMap.set(log.skill_name, current + 1);
      });

      const updatedSkills = DEFAULT_SKILLS.map(name => ({
        id: name,
        name,
        progress: Math.min(progressMap.get(name) || 0, 100) // Cap at 100%
      })).sort((a, b) => b.progress - a.progress);

      set({ skills: updatedSkills });
    } catch (error) {
      console.error('Error fetching skills:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  addPracticeLog: async (skillName, content, wordCount, postLink) => {
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
      await fetchSkills();
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

  signOut: async () => {
    // Just clear local state
    localStorage.removeItem(STORAGE_KEY);
    set({ user: null, skills: DEFAULT_SKILLS.map(name => ({ id: name, name, progress: 0 })) });
  }
}));
