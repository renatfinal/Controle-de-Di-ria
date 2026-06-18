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
    .upsert({ id: userId, ...profile }, { onConflict: 'id' })
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
    .like('date_key', datePattern)
    .limit(10000);

  if (error) throw error;

  const records: Record<string, DailyEntry[]> = {};
  for (const row of data || []) {
    if (!records[row.date_key]) records[row.date_key] = [];
    
    const existingIndex = records[row.date_key].findIndex(e => e.label === row.label);
    const entry = {
      id: row.id,
      label: row.label,
      value: row.value
    };
    
    if (existingIndex >= 0) {
      records[row.date_key][existingIndex] = entry;
    } else {
      records[row.date_key].push(entry);
    }
  }

  return records;
}

export async function loadYearlyRecords(userId: string, year: number) {
  const datePattern = `${year}-%`;

  const { data, error } = await supabase
    .from('daily_entries')
    .select('*')
    .eq('user_id', userId)
    .like('date_key', datePattern)
    .limit(10000);

  if (error) throw error;

  const records: Record<string, DailyEntry[]> = {};
  for (const row of data || []) {
    if (!records[row.date_key]) records[row.date_key] = [];
    
    const existingIndex = records[row.date_key].findIndex(e => e.label === row.label);
    const entry = {
      id: row.id,
      label: row.label,
      value: row.value
    };
    
    if (existingIndex >= 0) {
      records[row.date_key][existingIndex] = entry;
    } else {
      records[row.date_key].push(entry);
    }
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
  const validEntries = entries.filter(e => {
    if (!e.label || !e.value || e.value === '0,00') return false;
    const parsed = parseFloat(e.value.replace(/\./g, '').replace(',', '.'));
    return !isNaN(parsed) && parsed > 0;
  });
  
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

export async function deleteUserProfile(userId: string) {
  // First delete all their entries
  await supabase.from('daily_entries').delete().eq('user_id', userId);
  
  // Then delete their profile
  const { error } = await supabase.from('profiles').delete().eq('id', userId);
  if (error) throw error;
}
