import { create } from 'zustand';
import { api } from '../lib/api';
import { calculateSkillProgress, calculateSpecialSkillStatus } from '../lib/skillUtils';

// Define our own simple User type
export interface Wizard {
  id: string;
  name: string;
  role: 'user' | 'admin' | 'moderator';
  avatar_url?: string;
  managed_skills?: string[];
  race?: string;
  age?: string;
  faculty?: string;
}

export interface Skill {
  id: string;
  name: string;
  progress: number; // 0-100
  pendingCount?: number;
  approvedCount?: number;
  isLocked?: boolean;
  level?: number;
  applicationStatus?: 'pending' | 'approved' | 'rejected' | 'none';
  completionStatus?: 'pending' | 'rejected' | 'none';
  hasExamPassed?: boolean;
}

import { Notification } from '../lib/api/types';

interface AppState {
  user: Wizard | null;
  skills: Skill[];
  notifications: Notification[];
  isLoading: boolean;
  setUser: (user: Wizard | null) => void;
  updateProfile: (race: string, age: string, faculty?: string) => Promise<void>;
  fetchSkills: (viewAsUser?: boolean) => Promise<void>;
  fetchNotifications: () => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  addPracticeLog: (skillName: string, content: string, wordCount: number, postLink: string, viewAsUser?: boolean, type?: 'practice' | 'exam' | 'application' | 'completion_request') => Promise<void>;
  deletePracticeLog: (logId: string) => Promise<void>;
  updateLogStatus: (logId: string, status: 'approved' | 'rejected' | 'exam_passed' | 'study_completed', rejectionReason?: string) => Promise<void>;
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
  notifications: [],
  isLoading: false,

  setUser: (user) => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    set({ user });
  },

  updateProfile: async (race, age, faculty) => {
    const { user } = get();
    if (!user) return;
    try {
        const updatedUser = await api.users.updateProfile(user.id, { race, age, faculty });
        get().setUser({ ...user, race: updatedUser.race, age: updatedUser.age, faculty: updatedUser.faculty });
    } catch (error) {
        console.error('Failed to update profile:', error);
        throw error;
    }
  },

  fetchNotifications: async () => {
    const { user } = get();
    if (!user) return;
    try {
        const notifications = await api.notifications.list(user.id);
        set({ notifications });
    } catch (error) {
        console.error('Error fetching notifications:', error);
    }
  },

  markNotificationAsRead: async (id) => {
    try {
        await api.notifications.markAsRead(id);
        const { notifications } = get();
        set({ 
            notifications: notifications.map(n => 
                n.id === id ? { ...n, read: true } : n
            ) 
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
  },

  markAllNotificationsAsRead: async () => {
      const { user } = get();
      if (!user) return;
      try {
          await api.notifications.markAllAsRead(user.id);
          const { notifications } = get();
          set({
              notifications: notifications.map(n => ({ ...n, read: true }))
          });
      } catch (error) {
          console.error('Error marking all notifications as read:', error);
      }
  },

  deleteNotification: async (id) => {
      try {
          await api.notifications.delete(id);
          const { notifications } = get();
          set({
              notifications: notifications.filter(n => n.id !== id)
          });
      } catch (error) {
          console.error('Error deleting notification:', error);
      }
  },

  fetchSkills: async (viewAsUser?: boolean) => {
    const { user } = get();
    if (!user) return;

    set({ isLoading: true });
    try {
      if ((user.role === 'admin' || user.role === 'moderator') && !viewAsUser) {
         // Admin/Moderator logic: Combine Global Stats (for Dashboard) + Personal Stats (for Progress)
         const data = await api.logs.listAll(); 
         
         // 1. Dashboard Stats (Pending/Approved Global)
         const globalApprovedMap = new Map<string, number>();
         const globalPendingMap = new Map<string, number>();
         
         // 2. Personal Stats
         const personalApprovedMap = new Map<string, number>();
         const personalExamPassedMap = new Map<string, boolean>();
         const personalSpecialSkillAppStatus = new Map<string, 'pending' | 'approved' | 'rejected'>();
         const personalCompletionStatus = new Map<string, 'pending' | 'rejected'>();

         data?.forEach(log => {
             // --- Dashboard Stats Logic ---
             // For moderators, only count logs for managed skills
             const isManaged = user.role === 'admin' || (user.role === 'moderator' && user.managed_skills?.includes(log.skill_name));
             
             if (isManaged) {
                 if (log.status === 'approved') {
                     globalApprovedMap.set(log.skill_name, (globalApprovedMap.get(log.skill_name) || 0) + 1);
                 } else if (log.status === 'pending') {
                     globalPendingMap.set(log.skill_name, (globalPendingMap.get(log.skill_name) || 0) + 1);
                 }
             }

             // --- Personal Stats Logic ---
             if (log.user_id === user.id) {
                 if (log.type === 'completion_request') {
                 if (log.status === 'pending') {
                     personalCompletionStatus.set(log.skill_name, 'pending');
                 } else if (log.status === 'rejected') {
                     personalCompletionStatus.set(log.skill_name, 'rejected');
                 } else if (log.status === 'study_completed') {
                     personalExamPassedMap.set(log.skill_name, true);
                 }
                 return;
             }

                 // Handle application logs
                 if (log.type === 'application') {
                     if (['Метаморфомагия', 'Провидение'].includes(log.skill_name)) {
                         const current = personalSpecialSkillAppStatus.get(log.skill_name);
                         if (current === 'approved') return; // Already approved
                         
                         if (log.status === 'approved') {
                             personalSpecialSkillAppStatus.set(log.skill_name, 'approved');
                         } else if (log.status === 'pending') {
                             personalSpecialSkillAppStatus.set(log.skill_name, 'pending');
                         } else if (log.status === 'rejected' && current !== 'pending') {
                             personalSpecialSkillAppStatus.set(log.skill_name, 'rejected');
                         }
                     }
                     return; // Don't count application logs for progress
                 }

                 if (log.status === 'approved') {
                    const current = personalApprovedMap.get(log.skill_name) || 0;
                    personalApprovedMap.set(log.skill_name, current + 1);
                 }
                 if (log.status === 'exam_passed' || log.status === 'study_completed') {
                     personalExamPassedMap.set(log.skill_name, true);
                     const current = personalApprovedMap.get(log.skill_name) || 0;
                     personalApprovedMap.set(log.skill_name, current + 1);
                 }
             }
         });
         
         const updatedSkills = DEFAULT_SKILLS.map(name => {
             // Calculate Personal Progress
             const personalCount = personalApprovedMap.get(name) || 0;
             const hasExamPassed = personalExamPassedMap.get(name) || false;
             
             let progress = 0;
             let level = undefined;
             let isLocked = false;
             let applicationStatus = undefined;

             if (['Метаморфомагия', 'Провидение'].includes(name)) {
                const appStatus = (personalSpecialSkillAppStatus.get(name) || 'none') as 'pending' | 'approved' | 'rejected' | 'none';
                const isUnlocked = appStatus === 'approved';
                applicationStatus = appStatus;
                
                if (!isUnlocked) {
                    isLocked = true;
                    level = 1;
                } else {
                    const status = calculateSpecialSkillStatus(personalCount);
                    level = status.level;
                    progress = status.progress;
                }
             } else {
                 progress = calculateSkillProgress(name, personalCount, hasExamPassed);
             }

             return {
                 id: name,
                 name,
                 progress, // Personal Progress
                 isLocked,
                 level,
                 applicationStatus,
                 completionStatus: personalCompletionStatus.get(name),
                 hasExamPassed,
                 
                 // Dashboard Stats
                 approvedCount: personalCount, // Use PERSONAL count for display logic (e.g. "15 posts left")
                 pendingCount: globalPendingMap.get(name) || 0, // Pending tasks for admin
                 globalApprovedCount: globalApprovedMap.get(name) || 0 // Optional: if needed
             };
         }).sort((a, b) => b.progress - a.progress); 
         
         set({ skills: updatedSkills });
      } else {
         // Regular user logic
         const data = await api.logs.list(user.id);
         
         const progressMap = new Map<string, number>();
         const examPassedMap = new Map<string, boolean>();
         const specialSkillAppStatus = new Map<string, 'pending' | 'approved' | 'rejected'>();
         const completionStatusMap = new Map<string, 'pending' | 'rejected'>();

         data?.forEach(log => {
             if (log.type === 'completion_request') {
                 if (log.status === 'pending') {
                     completionStatusMap.set(log.skill_name, 'pending');
                 } else if (log.status === 'rejected') {
                     completionStatusMap.set(log.skill_name, 'rejected');
                 } else if (log.status === 'study_completed') {
                     examPassedMap.set(log.skill_name, true);
                 }
                 return;
             }

             // Handle application logs
             if (log.type === 'application') {
                 if (['Метаморфомагия', 'Провидение'].includes(log.skill_name)) {
                     const current = specialSkillAppStatus.get(log.skill_name);
                     if (current === 'approved') return; // Already approved
                     
                     if (log.status === 'approved') {
                         specialSkillAppStatus.set(log.skill_name, 'approved');
                     } else if (log.status === 'pending') {
                         specialSkillAppStatus.set(log.skill_name, 'pending');
                     } else if (log.status === 'rejected' && current !== 'pending') {
                         specialSkillAppStatus.set(log.skill_name, 'rejected');
                     }
                 }
                     return; // Don't count application logs for progress
             }

             if (log.status === 'approved') {
                const current = progressMap.get(log.skill_name) || 0;
                progressMap.set(log.skill_name, current + 1);
             }
             if (log.status === 'exam_passed' || log.status === 'study_completed') {
                 examPassedMap.set(log.skill_name, true);
                 const current = progressMap.get(log.skill_name) || 0;
                 progressMap.set(log.skill_name, current + 1);
             }
         });

         const updatedSkills = DEFAULT_SKILLS.map(name => {
            const count = progressMap.get(name) || 0;
            const hasExamPassed = examPassedMap.get(name) || false;

            if (['Метаморфомагия', 'Провидение'].includes(name)) {
                const appStatus = (specialSkillAppStatus.get(name) || 'none') as 'pending' | 'approved' | 'rejected' | 'none';
                const isUnlocked = appStatus === 'approved';
                
                if (!isUnlocked) {
                    return { 
                        id: name, 
                        name, 
                        progress: 0, 
                        isLocked: true, 
                        level: 1,
                        applicationStatus: appStatus
                    };
                }
                const { level, progress } = calculateSpecialSkillStatus(count);
                return { id: name, name, progress, isLocked: false, level };
            }

            const progress = calculateSkillProgress(name, count, hasExamPassed);

            return {
                id: name,
                name,
                progress,
                approvedCount: count,
                hasExamPassed,
                completionStatus: completionStatusMap.get(name)
            };
         }).sort((a, b) => b.progress - a.progress);

         set({ skills: updatedSkills });
      }
    } catch (error) {
      console.error('Error fetching skills:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  addPracticeLog: async (skillName, content, wordCount, postLink, viewAsUser?: boolean, type: 'practice' | 'exam' | 'application' | 'completion_request' = 'practice') => {
    const { user, fetchSkills } = get();
    if (!user) return;

    try {
      await api.logs.create({
        user_id: user.id,
        skill_name: skillName,
        content,
        word_count: wordCount,
        post_link: postLink,
        type
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

  updateLogStatus: async (logId: string, status: 'approved' | 'rejected' | 'exam_passed' | 'study_completed', rejectionReason?: string) => {
      const { user, fetchSkills } = get();
      if (!user || (user.role !== 'admin' && user.role !== 'moderator')) return;

      try {
          await api.logs.updateStatus(logId, status, user.id, rejectionReason);
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
