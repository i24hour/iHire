import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for iTime
export interface ITimeTask {
    id: string;
    user_id: string;
    title: string;
    description: string;
    start_time: number;
    paused_elapsed: number;
    enabled: boolean;
    completed: boolean;
    milestones: Array<{
        text: string;
        timestamp: number;
    }>;
    target_time?: number;
    created_at?: string;
    updated_at?: string;
}

// Helper functions
export const itimeDb = {
    // Fetch all tasks for current user
    async getTasks(userId: string) {
        const { data, error } = await supabase
            .from('itime_tasks')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data as ITimeTask[];
    },

    // Create new task
    async createTask(userId: string, task: Omit<ITimeTask, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
        const { data, error } = await supabase
            .from('itime_tasks')
            .insert([{ ...task, user_id: userId }])
            .select()
            .single();
        
        if (error) throw error;
        return data as ITimeTask;
    },

    // Update task
    async updateTask(taskId: string, updates: Partial<ITimeTask>) {
        const { data, error } = await supabase
            .from('itime_tasks')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', taskId)
            .select()
            .single();
        
        if (error) throw error;
        return data as ITimeTask;
    },

    // Delete task
    async deleteTask(taskId: string) {
        const { error } = await supabase
            .from('itime_tasks')
            .delete()
            .eq('id', taskId);
        
        if (error) throw error;
    }
};
