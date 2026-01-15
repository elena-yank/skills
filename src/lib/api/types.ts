export interface User {
  id: string;
  name: string;
  role: 'user' | 'admin';
}

export interface PracticeLog {
  id: string;
  user_id: string;
  skill_name: string;
  content: string;
  word_count: number;
  post_link?: string;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
  wizards?: { name: string }; // Joined user data
}

export interface ApiClient {
  auth: {
    signUp: (name: string, pass: string) => Promise<User>;
    signIn: (name: string, pass: string) => Promise<User>;
    getUserByName: (name: string) => Promise<User | null>;
    listAllUsers: () => Promise<User[]>;
  };
  logs: {
    list: (userId: string, skillName?: string) => Promise<PracticeLog[]>;
    listAll: (skillName?: string, status?: string) => Promise<PracticeLog[]>; // For admin
    create: (log: Omit<PracticeLog, 'id' | 'created_at' | 'status'>) => Promise<PracticeLog>;
    delete: (id: string, userId: string) => Promise<void>;
    updateStatus: (id: string, status: 'approved' | 'rejected') => Promise<void>;
  };
}
