const fs = require('fs');
const content = fs.readFileSync('app/page.tsx', 'utf8');

const updated = content
  .replace(
    '<h3 className="text-xl font-bold text-slate-800">Add novo slide</h3>',
    '<h3 className="text-xl font-bold text-slate-800">{newSlideData.id ? "Editar Slide" : "Adicionar Slide"}</h3>'
  )
  .replace(
    'Salvar Slide\n                      </button>',
    '{newSlideData.id ? "Atualizar Slide" : "Salvar Slide"}\n                      </button>'
  );

fs.writeFileSync('app/page.tsx', updated);
