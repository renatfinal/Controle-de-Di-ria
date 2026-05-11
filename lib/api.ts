import { supabase } from './supabase';

export type DailyEntry = {
  id: string;
  label: string;
  value: string;
};

export async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveProfile(userId: string, profile: any) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...profile })
    .select();
  if (error) throw error;
  return data;
}

export async function loadMonthlyRecords(userId: string, year: number, month: number) {
  // Pad month indicator to ensure YYYY-MM format matching
  const monthStr = month.toString().padStart(2, '0');
  const datePattern = `${year}-${monthStr}-%`;

  const { data, error } = await supabase
    .from('daily_entries')
    .select('*')
    .eq('user_id', userId)
    .like('date_key', datePattern);

  if (error) throw error;

  const records: Record<string, DailyEntry[]> = {};
  for (const row of data || []) {
    if (!records[row.date_key]) records[row.date_key] = [];
    records[row.date_key].push({
      id: row.id,
      label: row.label,
      value: row.value
    });
  }
  return records;
}

export async function saveDailyRecords(userId: string, dateKey: string, entries: DailyEntry[]) {
  // First delete existing records for this user and date
  await supabase
    .from('daily_entries')
    .delete()
    .eq('user_id', userId)
    .eq('date_key', dateKey);

  // Then insert new if there are any that have values
  const validEntries = entries.filter(e => e.label && e.value && e.value !== '0,00' && parseFloat(e.value) > 0);
  
  if (validEntries.length > 0) {
    const rows = validEntries.map(e => ({
      user_id: userId,
      date_key: dateKey,
      label: e.label,
      value: e.value
    }));

    const { error } = await supabase.from('daily_entries').insert(rows);
    if (error) throw error;
  }
}

// === ADMIN FUNCTIONS ===

export async function fetchAllUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  return data;
}

export async function toggleBlockUser(userId: string, isBlocked: boolean) {
  const { error } = await supabase
    .from('profiles')
    .update({ is_blocked: isBlocked })
    .eq('id', userId);
    
  if (error) throw error;
}

// Real delete might require a secure backend API with service role, 
// but we can do a soft-delete or delete profile if RLS permits.
// Usually, users cannot delete other users' auth accounts from the client unless using Edge Functions with service role.
// We will just do what we can on the profile level.
export async function deleteUserProfile(userId: string) {
  // First delete all their entries
  await supabase.from('daily_entries').delete().eq('user_id', userId);
  
  // Then delete their profile
  const { error } = await supabase.from('profiles').delete().eq('id', userId);
  if (error) throw error;
}
