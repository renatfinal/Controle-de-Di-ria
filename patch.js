const fs = require('fs');
const content = fs.readFileSync('lib/slidesApi.ts', 'utf8');
const newFunc = `export async function updateGlobalSlide(id: string, slide: any) {
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

export async function deleteGlobalSlide`;
fs.writeFileSync('lib/slidesApi.ts', content.replace('export async function deleteGlobalSlide', newFunc));
