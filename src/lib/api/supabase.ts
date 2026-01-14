import { ApiClient, User, PracticeLog } from './types';
import { supabase } from '../supabase';

export const supabaseApi: ApiClient = {
  auth: {
    signUp: async (name, password) => {
      // Check if wizard exists
      const { data: existingUser } = await supabase
        .from('wizards')
        .select('id')
        .eq('name', name)
        .single();

      if (existingUser) {
        throw new Error('Такой волшебник уже числится в Хогвартсе.');
      }

      // Create new wizard
      const { data, error } = await supabase
        .from('wizards')
        .insert({ name, password })
        .select()
        .single();
      
      if (error) throw error;
      return data as User;
    },
    signIn: async (name, password) => {
      const { data, error } = await supabase
        .from('wizards')
        .select('*')
        .eq('name', name)
        .eq('password', password)
        .single();

      if (error || !data) {
         throw new Error('Неверное имя или пароль');
      }
      return data as User;
    },
    getUserByName: async (name) => {
      const { data, error } = await supabase
        .from('wizards')
        .select('id, name')
        .ilike('name', name)
        .single();
      
      if (error) return null;
      return data as User;
    }
  },
  logs: {
    list: async (userId, skillName) => {
      let query = supabase
        .from('practice_logs')
        .select('*')
        .eq('user_id', userId);

      if (skillName) {
        query = query.eq('skill_name', skillName);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data as PracticeLog[];
    },
    create: async (log) => {
      const { data, error } = await supabase
        .from('practice_logs')
        .insert(log)
        .select()
        .single();
      
      if (error) throw error;
      return data as PracticeLog;
    },
    delete: async (id, userId) => {
      const { error } = await supabase
        .from('practice_logs')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      
      if (error) throw error;
    }
  }
};
