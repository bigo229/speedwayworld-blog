const fs = require('fs');
const raw = fs.readFileSync(process.env.TEMP + '/post_urls.txt', 'utf-8');
const lines = raw.split('\n').filter(Boolean);
console.log('total lines:', lines.length);
console.log('first line repr:', JSON.stringify(lines[0]));
const mapped = lines.map(u => u.replace(/"$/, '').trim());
console.log('after replace:', JSON.stringify(mapped[0]));
const filtered = mapped.filter(u => u.startsWith('/blog/'));
console.log('after filter:', filtered.length);
