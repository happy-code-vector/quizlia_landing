import puppeteer from 'puppeteer-core'; import fs from 'fs';
const key=process.argv[2]; fs.mkdirSync('f_'+key,{recursive:true});
const b=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',args:['--no-sandbox','--allow-file-access-from-files']});
const p=await b.newPage(); await p.setViewport({width:720,height:900});
await p.goto('file://'+process.cwd()+'/scene.html?bear=../../public/mascot'); await p.evaluate(()=>document.fonts.ready);
for(let n=0;n<240;n++){await p.evaluate((k,t)=>draw(k,t),key,n/24);
 await p.evaluate(()=>Promise.all([...document.images].map(i=>i.complete?1:new Promise(r=>i.onload=r))));
 await p.screenshot({path:`f_${key}/${String(n).padStart(3,'0')}.png`});}
await b.close();
