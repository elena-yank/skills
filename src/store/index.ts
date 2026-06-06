import { create } from 'zustand';
import { api } from '../lib/api';
import { calculateSkillProgress, calculateSpecialSkillStatus, applyAgeRestrictions } from '../lib/skillUtils';

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
  is_school_admin?: boolean;
  is_visible?: boolean;
  is_minister?: boolean;
}

export interface Skill {
  id: string;
  name: string;
  progress: number; // 0-100
  pendingCount?: number;
  approvedCount?: number;
  globalApprovedCount?: number;
  totalPosts?: number;
  isLocked?: boolean;
  level?: number;
  applicationStatus?: 'pending' | 'approved' | 'rejected' | 'none';
  completionStatus?: 'pending' | 'rejected' | 'none';
  hasExamPassed?: boolean;
  ageCapMessage?: string;
}

import { Notification } from '../lib/api/types';

interface AppState {
  user: Wizard | null;
  skills: Skill[];
  notifications: Notification[];
  isLoading: boolean;
  setUser: (user: Wizard | null) => void;
  refreshUser: () => Promise<void>;
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

const STORAGE_KEY = 'hogwarts_wizard_session';
const SKILLS_STORAGE_KEY = 'hogwarts_skills_cache';

const getInitialUser = (): Wizard | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const getInitialSkills = (): Skill[] => {
  try {
    const stored = localStorage.getItem(SKILLS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    
  }
  return DEFAULT_SKILLS.map(name => ({ id: name, name, progress: 0 }));
};

export const useStore = create<AppState>((set, get) => ({
  user: getInitialUser(),
  skills: getInitialSkills(),
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

  refreshUser: async () => {
    const { user } = get();
    if (!user) return;
    try {
      const latest = await api.auth.getUserByName(user.name);
      if (!latest) return;
      get().setUser({ ...user, ...latest });
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
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
      // For admins/moderators, we ALWAYS use the full logic because it includes personal stats
      // except if explicitly viewing as user AND we want to save bandwidth (not needed here)
      if (user.role === 'admin' || user.role === 'moderator') {
         const { skills: previousSkills } = get();
         const previousSkillByName = new Map(previousSkills.map(s => [s.name, s]));

         const pendingCountsPromise = api.logs.pendingCounts(user.id).catch(() => null);
         const approvedCountsPromise = api.logs.approvedCounts(user.id).catch(() => null);
         const personalLogsPromise = viewAsUser ? api.logs.list(user.id).catch(() => null) : Promise.resolve(null);

         let pendingCounts: Record<string, number> | null = null;
         let approvedCounts: Record<string, number> | null = null;

         pendingCountsPromise.then(result => {
           if (!result) return;
           pendingCounts = result;
           const quickSkills = DEFAULT_SKILLS.map(name => {
             const existing = previousSkillByName.get(name);
             return {
               id: name,
               name,
               progress: existing?.progress || 0,
               isLocked: existing?.isLocked,
               level: existing?.level,
               applicationStatus: existing?.applicationStatus,
               completionStatus: existing?.completionStatus,
               hasExamPassed: existing?.hasExamPassed,
               approvedCount: existing?.approvedCount,
               globalApprovedCount: existing?.globalApprovedCount,
               pendingCount: result[name] || 0,
             } as Skill;
           });
           set({ skills: quickSkills });
         });

         approvedCountsPromise.then(result => {
           if (!result) return;
           approvedCounts = result;
           set({
             skills: get().skills.map(s => ({
               ...s,
               globalApprovedCount: result[s.name] ?? s.globalApprovedCount ?? 0
             }))
           });
         });

         const personalLogs = await personalLogsPromise;

         if (!viewAsUser) {
           const finalPendingCounts = pendingCounts ?? (await pendingCountsPromise);
           const finalApprovedCounts = approvedCounts ?? (await approvedCountsPromise);
           const updatedSkills = DEFAULT_SKILLS.map(name => {
             const prev = previousSkillByName.get(name);
             return {
               id: name,
               name,
               progress: prev?.progress || 0,
               isLocked: prev?.isLocked,
               level: prev?.level,
               applicationStatus: prev?.applicationStatus,
               completionStatus: prev?.completionStatus,
               hasExamPassed: prev?.hasExamPassed,
               ageCapMessage: prev?.ageCapMessage,
               totalPosts: prev?.totalPosts || 0,
               approvedCount: prev?.approvedCount || 0,
               pendingCount: finalPendingCounts?.[name] ?? prev?.pendingCount ?? 0,
               globalApprovedCount: finalApprovedCounts?.[name] ?? prev?.globalApprovedCount ?? 0,
             } as Skill;
           });
           set({ skills: updatedSkills });
           try {
             localStorage.setItem(SKILLS_STORAGE_KEY, JSON.stringify(updatedSkills));
           } catch {
             
           }
           return;
         }

         const personalApprovedMap = new Map<string, number>();
         const personalExamPassedMap = new Map<string, boolean>();
         const personalSpecialSkillAppStatus = new Map<string, 'pending' | 'approved' | 'rejected'>();
         const personalCompletionStatus = new Map<string, 'pending' | 'rejected'>();
         const personalTotalPostsMap = new Map<string, number>();

         personalLogs?.forEach(log => {
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

           if (log.type === 'application') {
             if (['Метаморфомагия', 'Провидение'].includes(log.skill_name)) {
               const current = personalSpecialSkillAppStatus.get(log.skill_name);
               if (current === 'approved') return;

               if (log.status === 'approved') {
                 personalSpecialSkillAppStatus.set(log.skill_name, 'approved');
               } else if (log.status === 'pending') {
                 personalSpecialSkillAppStatus.set(log.skill_name, 'pending');
               } else if (log.status === 'rejected' && current !== 'pending') {
                 personalSpecialSkillAppStatus.set(log.skill_name, 'rejected');
               }
             }
             return;
           }

           if (log.status !== 'rejected') {
             const totalCurrent = personalTotalPostsMap.get(log.skill_name) || 0;
             personalTotalPostsMap.set(log.skill_name, totalCurrent + 1);
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
         });
         
        const finalPendingCounts = pendingCounts ?? (await pendingCountsPromise) ?? null;
        const finalApprovedCounts = approvedCounts ?? (await approvedCountsPromise) ?? null;

        const updatedSkills = DEFAULT_SKILLS.map(name => {
             const prev = previousSkillByName.get(name);
             // Calculate Personal Progress
             const personalCount = personalApprovedMap.get(name) || 0;
             const hasExamPassed = personalExamPassedMap.get(name) || false;
             
             let progress = 0;
             let level = undefined;
             let isLocked = false;
             let applicationStatus = undefined;
             let ageCapMessage = undefined as string | undefined;

             if (['Метаморфомагия', 'Провидение'].includes(name)) {
                const appStatus = (personalSpecialSkillAppStatus.get(name) || 'none') as 'pending' | 'approved' | 'rejected' | 'none';
                const isUnlocked = appStatus === 'approved' || hasExamPassed;
                applicationStatus = hasExamPassed ? 'approved' : appStatus;
                
                if (!isUnlocked) {
                    isLocked = true;
                    level = 1;
                } else if (hasExamPassed) {
                    level = 3;
                    progress = 100;
                } else {
                    const status = calculateSpecialSkillStatus(personalCount);
                    level = status.level;
                    progress = status.progress;
                    if (name === 'Метаморфомагия') {
                        const adjusted = applyAgeRestrictions(name, user.age, personalCount, progress, level, user.role === 'admin');
                        progress = adjusted.progress;
                        level = adjusted.level;
                        ageCapMessage = adjusted.ageCapMessage;
                    }
                }
             } else {
                progress = calculateSkillProgress(name, personalCount, hasExamPassed, user.age, user.role === 'admin');
                const adjusted = applyAgeRestrictions(name, user.age, personalCount, progress, undefined, user.role === 'admin');
                progress = adjusted.progress;
                ageCapMessage = adjusted.ageCapMessage;
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
                 ageCapMessage,
                 
                 // Dashboard Stats
                 approvedCount: personalCount, // Use PERSONAL count for display logic (e.g. "15 posts left")
                 pendingCount: finalPendingCounts?.[name] ?? prev?.pendingCount ?? 0, // Pending tasks for admin
                 globalApprovedCount: finalApprovedCounts?.[name] ?? prev?.globalApprovedCount ?? 0, // Global count for admin interface
                 totalPosts: personalTotalPostsMap.get(name) || 0
             };
         }).sort((a, b) => b.progress - a.progress); 
         
         set({ skills: updatedSkills });
         try {
           localStorage.setItem(SKILLS_STORAGE_KEY, JSON.stringify(updatedSkills));
         } catch {
           
         }
      } else {
         // Regular user logic
         const data = await api.logs.list(user.id);
         
         const progressMap = new Map<string, number>();
         const examPassedMap = new Map<string, boolean>();
         const specialSkillAppStatus = new Map<string, 'pending' | 'approved' | 'rejected'>();
         const completionStatusMap = new Map<string, 'pending' | 'rejected'>();
         const totalPostsMap = new Map<string, number>();

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

             if (log.status !== 'rejected') {
                 const totalCurrent = totalPostsMap.get(log.skill_name) || 0;
                 totalPostsMap.set(log.skill_name, totalCurrent + 1);
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
                const isUnlocked = appStatus === 'approved' || hasExamPassed;
                
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
                if (hasExamPassed) {
                    return {
                        id: name,
                        name,
                        progress: 100,
                        isLocked: false,
                        level: 3,
                        applicationStatus: 'approved' as const,
                        approvedCount: count,
                        hasExamPassed,
                        totalPosts: totalPostsMap.get(name) || 0
                    };
                }
                const base = calculateSpecialSkillStatus(count);
                const adjusted = applyAgeRestrictions(name, user.age, count, base.progress, base.level, user.role === 'admin');
                return { id: name, name, progress: adjusted.progress, isLocked: false, level: adjusted.level, applicationStatus: appStatus, approvedCount: count, hasExamPassed, ageCapMessage: adjusted.ageCapMessage, totalPosts: totalPostsMap.get(name) || 0 };
            }

            const baseProgress = calculateSkillProgress(name, count, hasExamPassed, user.age, user.role === 'admin');
            const adjusted = applyAgeRestrictions(name, user.age, count, baseProgress, undefined, user.role === 'admin');

            return {
                id: name,
                name,
                progress: adjusted.progress,
                approvedCount: count,
                hasExamPassed,
                completionStatus: completionStatusMap.get(name),
                ageCapMessage: adjusted.ageCapMessage,
                totalPosts: totalPostsMap.get(name) || 0
            };
         }).sort((a, b) => b.progress - a.progress);

         set({ skills: updatedSkills });
         try {
           localStorage.setItem(SKILLS_STORAGE_KEY, JSON.stringify(updatedSkills));
         } catch {
           
         }
      }
    } catch (error) {
      console.error('Error fetching skills:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  addPracticeLog: async (skillName, content, wordCount, postLink, viewAsUser?: boolean, type: 'practice' | 'exam' | 'application' | 'completion_request' = 'practice') => {
    const { user, fetchSkills, skills } = get();
    if (!user) return;

    try {
      if (type !== 'application' && type !== 'completion_request') {
        set({
          skills: skills.map(skill =>
            skill.name === skillName
              ? { ...skill, totalPosts: (skill.totalPosts || 0) + 1 }
              : skill
          )
        });
      }

      await api.logs.create({
        user_id: user.id,
        skill_name: skillName,
        content,
        word_count: wordCount,
        post_link: postLink,
        type
      });

      await fetchSkills(viewAsUser);
    } catch (error) {
      console.error('Error adding log:', error);
      try {
        await fetchSkills(viewAsUser);
      } catch (e) {
        console.error('Error rolling back skills after failed log add:', e);
      }
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
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SKILLS_STORAGE_KEY);
    set({ user: null, skills: DEFAULT_SKILLS.map(name => ({ id: name, name, progress: 0 })) });
  }
}));
