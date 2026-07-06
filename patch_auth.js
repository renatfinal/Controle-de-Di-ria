const fs = require('fs');
const content = fs.readFileSync('app/page.tsx', 'utf8');
const oldBlock = `                    {(userProfile.role === 'admin' || userProfile.email === 'renatof.rcc@gmail.com' || authUserId) ? (`;
const newBlock = `                    {(userProfile.role === 'admin' || userProfile.email === 'renatof.rcc@gmail.com') ? (`;
fs.writeFileSync('app/page.tsx', content.replace(oldBlock, newBlock));
