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
  status: 'pending' | 'approved' | 'rejected' | 'exam_passed';
  type?: 'practice' | 'exam' | 'application';
  wizards?: { name: string; avatar_url?: string }; // Joined user data
  moderator_approval_id?: string;
  moderator_approved_at?: string;
  moderator_name?: string; // Joined moderator name
  moderator_avatar?: string; // Joined moderator avatar
  assigned_moderators?: string; // Names of assigned moderators
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
    updateStatus: (id: string, status: 'approved' | 'rejected' | 'exam_passed', userId: string) => Promise<void>;
  };
}
