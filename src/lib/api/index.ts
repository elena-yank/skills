import { supabaseApi } from './supabase';
import { restApi } from './rest';
import { ApiClient } from './types';

// Check environment variable to switch implementation
const useRest = import.meta.env.VITE_USE_REST_API === 'true';

export const api: ApiClient = useRest ? restApi : supabaseApi;
