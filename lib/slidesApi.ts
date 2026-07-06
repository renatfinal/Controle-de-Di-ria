import { supabase } from './supabase';

export async function fetchGlobalSlides() {
  const { data, error } = await supabase
    .from('global_slides')
    .select('*')
    .order('created_at', { ascending: true });
    
  if (error) {
    if (error.code === '42P01') { // table does not exist
       return null; 
    }
    throw error;
  }
  
  // Transform back to slide shapes
  return data.map(row => ({
    ...row,
    id: row.id,
    type: row.type,
    content: row.content,
    mediaUrl: row.media_url,
    mediaType: row.media_type,
    bgColor: row.bg_color,
    textConfig: row.text_config
  }));
}

export async function addGlobalSlide(slide: any) {
  const { data, error } = await supabase
    .from('global_slides')
    .insert([{
      type: slide.type,
      content: slide.content,
      media_url: slide.mediaUrl,
      media_type: slide.mediaType,
      bg_color: slide.bgColor,
      text_config: slide.textConfig
    }])
    .select()
    .single();
    
  if (error) throw error;
  
  return {
    ...data,
    id: data.id,
    type: data.type,
    content: data.content,
    mediaUrl: data.media_url,
    mediaType: data.media_type,
    bgColor: data.bg_color,
    textConfig: data.text_config
  };
}

export async function updateGlobalSlide(id: string, slide: any) {
  const { data, error } = await supabase
    .from('global_slides')
    .update({
      type: slide.type,
      content: slide.content,
      media_url: slide.mediaUrl,
      media_type: slide.mediaType,
      bg_color: slide.bgColor,
      text_config: slide.textConfig
    })
    .eq('id', id)
    .select()
    .single();
    
  if (error) throw error;
  
  return {
    ...data,
    id: data.id,
    type: data.type,
    content: data.content,
    mediaUrl: data.media_url,
    mediaType: data.media_type,
    bgColor: data.bg_color,
    textConfig: data.text_config
  };
}

export async function deleteGlobalSlide(id: string) {
  const { error } = await supabase
    .from('global_slides')
    .delete()
    .eq('id', id);
    
  if (error) throw error;
}
