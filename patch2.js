const fs = require('fs');
const content = fs.readFileSync('app/page.tsx', 'utf8');

const oldFunc = `  const handleSaveSlide = async () => {
    if (!newSlideData.content?.trim() && newSlideData.type === 'text') return;
    if (!newSlideData.mediaUrl && newSlideData.mediaType === 'image' && newSlideData.type !== 'text') return;
    
    try {
      const { addGlobalSlide } = await import('../lib/slidesApi');
      const savedDbSlide = await addGlobalSlide(newSlideData);
      const updatedSlides = [...slides, savedDbSlide];
      setSlides(updatedSlides);
      setCurrentSlideIndex(updatedSlides.length - 1);
    } catch (e) {
      console.error('Failed to save slide globally. Ensure table global_slides is created.', e);
      // Fallback
      const newSlide: Slide = {
        id: Date.now().toString(),
        type: newSlideData.type as 'text' | 'media',
        content: newSlideData.content || '',
        mediaUrl: newSlideData.mediaUrl,
        mediaType: newSlideData.mediaType,
        bgColor: newSlideData.bgColor,
        textConfig: newSlideData.textConfig
      };
      const updatedSlides = [...slides, newSlide];
      setSlides(updatedSlides);
      if (authUserId) {
        localforage.setItem(\`slides_\${authUserId}\`, updatedSlides).catch(console.error);
      }
      setCurrentSlideIndex(updatedSlides.length - 1);
    }
    
    setShowSlideConfig(false);
    setNewSlideData({ 
      type: 'text', 
      content: '', 
      bgColor: '#6366f1',
      textConfig: { color: '#ffffff', fontFamily: 'Inter', isBold: true, isItalic: false, fontSize: 32 }
    });
  };`;

const newFunc = `  const handleSaveSlide = async () => {
    if (!newSlideData.content?.trim() && newSlideData.type === 'text') return;
    if (!newSlideData.mediaUrl && newSlideData.mediaType === 'image' && newSlideData.type !== 'text') return;
    
    try {
      if (newSlideData.id) {
        // Update existing
        const { updateGlobalSlide } = await import('../lib/slidesApi');
        const savedDbSlide = await updateGlobalSlide(newSlideData.id, newSlideData);
        const updatedSlides = slides.map(s => s.id === newSlideData.id ? savedDbSlide : s);
        setSlides(updatedSlides);
      } else {
        // Create new
        const { addGlobalSlide } = await import('../lib/slidesApi');
        const savedDbSlide = await addGlobalSlide(newSlideData);
        const updatedSlides = [...slides, savedDbSlide];
        setSlides(updatedSlides);
        setCurrentSlideIndex(updatedSlides.length - 1);
      }
    } catch (e) {
      console.error('Failed to save slide globally. Ensure table global_slides is created.', e);
      // Fallback
      if (newSlideData.id) {
        const updatedSlides = slides.map(s => s.id === newSlideData.id ? (newSlideData as Slide) : s);
        setSlides(updatedSlides);
        if (authUserId) {
          localforage.setItem(\`slides_\${authUserId}\`, updatedSlides).catch(console.error);
        }
      } else {
        const newSlide: Slide = {
          id: Date.now().toString(),
          type: newSlideData.type as 'text' | 'media',
          content: newSlideData.content || '',
          mediaUrl: newSlideData.mediaUrl,
          mediaType: newSlideData.mediaType,
          bgColor: newSlideData.bgColor,
          textConfig: newSlideData.textConfig
        };
        const updatedSlides = [...slides, newSlide];
        setSlides(updatedSlides);
        if (authUserId) {
          localforage.setItem(\`slides_\${authUserId}\`, updatedSlides).catch(console.error);
        }
        setCurrentSlideIndex(updatedSlides.length - 1);
      }
    }
    
    setShowSlideConfig(false);
    setNewSlideData({ 
      type: 'text', 
      content: '', 
      bgColor: '#6366f1',
      textConfig: { color: '#ffffff', fontFamily: 'Inter', isBold: true, isItalic: false, fontSize: 32 }
    });
  };`;

if (!content.includes(oldFunc)) {
  console.log("Could not find the old function!");
  process.exit(1);
}
fs.writeFileSync('app/page.tsx', content.replace(oldFunc, newFunc));
