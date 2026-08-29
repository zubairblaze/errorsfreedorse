import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
const ROOT='/home/user/errorsfreedorse/dist', BASE='/errorsfree';
const MIME={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);
 if(p.startsWith(BASE))p=p.slice(BASE.length)||'/';let f=normalize(join(ROOT,p));
 try{const s=await stat(f); if(s.isDirectory())f=join(f,'index.html');}catch{res.writeHead(404);return res.end();}
 try{res.writeHead(200,{'Content-Type':MIME[extname(f)]??'application/octet-stream'});res.end(await readFile(f));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(4612,r));
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const page=await b.newPage({viewport:{width:1400,height:900}});
const errs=[]; page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://localhost:4612/errorsfree/',{waitUntil:'networkidle'});
await page.waitForTimeout(1200);
const pin=await page.evaluate(()=>{const t=document.querySelector('[data-process-tunnel]');return {top:t.getBoundingClientRect().top+scrollY,h:t.offsetHeight};});
const travel=pin.h-900;
let bad=0, checked=0, smear=0;
for (let k=0;k<=40;k++){
  const y=Math.round(pin.top+travel*(k/40));
  await page.evaluate(v=>scrollTo({top:v,behavior:'instant'}),y);
  await page.waitForTimeout(120);
  const st=await page.evaluate(()=>{
    const on=document.querySelector('.tunnel__step[data-on] .tunnel__title')?.textContent?.trim();
    const foc=document.querySelector('.dz--steps .dz__level[data-focus] .dz__step-name')?.textContent?.trim();
    // How many frames are carrying substantially readable content at once?
    const legible=[...document.querySelectorAll('.dz--steps .dz__level')]
      .filter(n=>+getComputedStyle(n).getPropertyValue('--co')>0.55 && +getComputedStyle(n).getPropertyValue('--o')>0.3).length;
    return {on,foc,legible};
  });
  checked++;
  if(st.on!==st.foc){bad++; console.log(`  MISMATCH at ${(k/40*100).toFixed(0)}%: list="${st.on}" frame="${st.foc}"`);}
  if(st.legible>1){smear++;}
}
await b.close(); server.close();
console.log(`\nStep label vs focused frame: ${checked-bad}/${checked} in sync`);
console.log(`Positions with more than one legible frame at once: ${smear}/${checked}`);
console.log(errs.length?'ERRORS: '+errs.join('; '):'no page errors');
process.exit(bad?1:0);
