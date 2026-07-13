const fs = require('fs');
const content = fs.readFileSync('app/page.tsx', 'utf8');

const oldBlock = `                    {(userProfile.role === 'admin' || userProfile.email === 'renatof.rcc@gmail.com') ? (
                      <button 
                        onClick={() => handleDeleteSlide(slides[currentSlideIndex].id)}
                        className="w-10 h-10 rounded-full bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center backdrop-blur transition-colors"
                        title="Excluir Slide"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    ) : (`;

const newBlock = `                    {(userProfile.role === 'admin' || userProfile.email === 'renatof.rcc@gmail.com') ? (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setNewSlideData(slides[currentSlideIndex]);
                            setShowSlideConfig(true);
                          }}
                          className="w-10 h-10 rounded-full bg-blue-500/80 hover:bg-blue-500 text-white flex items-center justify-center backdrop-blur transition-colors"
                          title="Editar Slide"
                        >
                          <Pencil className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteSlide(slides[currentSlideIndex].id)}
                          className="w-10 h-10 rounded-full bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center backdrop-blur transition-colors"
                          title="Excluir Slide"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (`;

if (!content.includes(oldBlock)) {
  console.log("Could not find the old block!");
  process.exit(1);
}
fs.writeFileSync('app/page.tsx', content.replace(oldBlock, newBlock));
