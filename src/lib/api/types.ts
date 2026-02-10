export interface User {
  id: string;
  name: string;
  role: 'user' | 'admin' | 'moderator';
  created_at?: string; // Optional for list display
  password?: string; // Only for admin display/edit, be careful
  avatar_url?: string;
  managed_skills?: string[]; // For moderators
}

export interface PracticeLog {
  id: string;
  user_id: string;
  skill_name: string;
  content: string;
  word_count: number;
  post_link?: string;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected' | 'exam_passed' | 'study_completed';
  type?: 'practice' | 'exam' | 'application' | 'completion_request';
  wizards?: { name: string; avatar_url?: string }; // Joined user data
  moderator_approval_id?: string;
  moderator_approved_at?: string;
  moderator_proposed_status?: 'approved' | 'exam_passed' | 'study_completed';
  moderator_name?: string; // Joined moderator name
  moderator_avatar?: string; // Joined moderator avatar
  assigned_moderators?: string; // Names of assigned moderators
  user_approved_count?: number; // From admin listAll
  has_completed_status?: boolean; // From admin listAll
  rejection_reason?: string;
}

export interface Notification {
    id: string;
    user_id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'warning';
    read: boolean;
    link?: string;
    created_at: string;
}

export interface SkillMetadata {
  skill_name: string;
  responsible_person_name?: string;
  responsible_person_link?: string;
  description?: string;
  updated_at?: string;
}

export interface ApiClient {
  auth: {
    signUp: (name: string, pass: string) => Promise<User>;
    signIn: (name: string, pass: string) => Promise<User>;
    getUserByName: (name: string) => Promise<User | null>;
    listAllUsers: () => Promise<User[]>;
  };
  users: {
    updateAvatar: (id: string, avatarUrl: string) => Promise<User>;
  };
  admin: {
    listUsers: () => Promise<User[]>;
    createUser: (user: Pick<User, 'name' | 'role'> & { password: string }) => Promise<User>;
    updateUser: (id: string, updates: Partial<Pick<User, 'role' | 'password' | 'name' | 'managed_skills'>>) => Promise<void>;
    deleteUser: (id: string) => Promise<void>;
    grantSkill: (userId: string, skillName: string, reason: string, moderatorId: string) => Promise<void>;
  };
  skills: {
    getMetadata: () => Promise<SkillMetadata[]>;
    updateMetadata: (data: SkillMetadata) => Promise<SkillMetadata>;
  };
  logs: {
    list: (userId: string, skillName?: string) => Promise<PracticeLog[]>;
    listAll: (skillName?: string, status?: string) => Promise<PracticeLog[]>; // For admin
    create: (log: Omit<PracticeLog, 'id' | 'created_at' | 'status'>) => Promise<PracticeLog>;
    delete: (id: string, userId: string) => Promise<void>;
    updateStatus: (id: string, status: 'approved' | 'rejected' | 'exam_passed' | 'study_completed', userId: string, rejectionReason?: string) => Promise<void>;
  };
  notifications: {
      list: (userId: string) => Promise<Notification[]>;
      markAsRead: (id: string) => Promise<void>;
      markAllAsRead: (userId: string) => Promise<void>;
      delete: (id: string) => Promise<void>;
  };
}
