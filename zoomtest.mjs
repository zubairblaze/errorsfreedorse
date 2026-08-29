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
await new Promise(r=>server.listen(4610,r));
const SHOTS='/tmp/claude-0/-home-user-catalyst/3059f786-4368-5c0a-9ff8-b1efbfc9d752/scratchpad/shots';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const page=await b.newPage({viewport:{width:1400,height:900}});
const errs=[]; page.on('pageerror',e=>errs.push(e.message)); page.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
await page.goto('http://localhost:4610/errorsfree/',{waitUntil:'networkidle'});
await page.waitForTimeout(1500);

// Read the actual scale of each hero frame at several scroll offsets.
const readScales = () => page.evaluate(()=>{
  const lv=[...document.querySelectorAll('.dhero .dz__level')];
  return lv.map(n=>({s:+getComputedStyle(n).getPropertyValue('--s'), o:+getComputedStyle(n).getPropertyValue('--o')}));
});

const rows=[];
for (const y of [0, 200, 400, 700]) {
  await page.evaluate(v=>window.scrollTo({top:v,behavior:'instant'}), y);
  await page.waitForTimeout(500);
  rows.push({y, scales:(await readScales()).map(x=>x.s.toFixed(3)).join(' ')});
  await page.screenshot({path:`${SHOTS}/zoom-hero-${y}.png`});
}
console.log('HERO — frame scales as the page scrolls (must change):');
for (const r of rows) console.log(`  scrollY ${String(r.y).padStart(4)} :  ${r.scales}`);
const moved = rows[0].scales !== rows[3].scales;
console.log(moved ? '  -> zoom IS scroll-driven' : '  -> NOT MOVING');

// Idle drift with no scrolling at all.
await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
await page.waitForTimeout(300);
const a=(await readScales())[2].s;
await page.waitForTimeout(2500);
const c=(await readScales())[2].s;
console.log(`\nIDLE DRIFT (no scroll): level-2 scale ${a.toFixed(4)} -> ${c.toFixed(4)}  ${a!==c?'moving':'STATIC'}`);

// Pinned process tunnel.
const pin=await page.evaluate(()=>{const t=document.querySelector('[data-process-tunnel]');
  return {top:t.getBoundingClientRect().top+window.scrollY, h:t.offsetHeight};});
console.log(`\nPROCESS TUNNEL — pinned over ${pin.h}px of scroll`);
for (const f of [0,0.25,0.5,0.75,0.95]) {
  const y=Math.round(pin.top+(pin.h-900)*f);
  await page.evaluate(v=>window.scrollTo({top:v,behavior:'instant'}),y);
  await page.waitForTimeout(500);
  const st=await page.evaluate(()=>{
    const on=document.querySelector('.tunnel__step[data-on] .tunnel__title')?.textContent;
    const foc=document.querySelector('.dz--steps .dz__level[data-focus] .dz__step-name')?.textContent;
    const sc=[...document.querySelectorAll('.dz--steps .dz__level')].map(n=>+getComputedStyle(n).getPropertyValue('--s'));
    return {on,foc,first:sc[0]};
  });
  console.log(`  ${(f*100).toFixed(0).padStart(3)}%  step="${st.on}"  frame-in-focus="${st.foc}"  outer-scale=${st.first.toFixed(3)}`);
  if (f===0.5) await page.screenshot({path:`${SHOTS}/zoom-tunnel-mid.png`});
}
await b.close(); server.close();
console.log(errs.length?'\nERRORS:\n'+errs.join('\n'):'\nno console errors');
