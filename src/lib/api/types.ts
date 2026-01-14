export interface User {
  id: string;
  name: string;
}

export interface PracticeLog {
  id: string;
  user_id: string;
  skill_name: string;
  content: string;
  word_count: number;
  post_link?: string;
  created_at: string;
}

export interface ApiClient {
  auth: {
    signUp: (name: string, pass: string) => Promise<User>;
    signIn: (name: string, pass: string) => Promise<User>;
    getUserByName: (name: string) => Promise<User | null>;
  };
  logs: {
    list: (userId: string, skillName?: string) => Promise<PracticeLog[]>;
    create: (log: Omit<PracticeLog, 'id' | 'created_at'>) => Promise<PracticeLog>;
    delete: (id: string, userId: string) => Promise<void>;
  };
}
