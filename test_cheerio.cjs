const cheerio = require('cheerio');
const $ = cheerio.load('<div class="notices">test</div><p>hello</p>');
console.log('notices:', $('div.notices').text());
console.log('p:', $('p').text());
const noticesDiv = $('div').filter((i, el) => /notices/.test($(el).attr('class') || ''));
console.log('filter match:', noticesDiv.length);
