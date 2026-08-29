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
await new Promise(r=>server.listen(4613,r));
const SHOTS='/tmp/claude-0/-home-user-catalyst/3059f786-4368-5c0a-9ff8-b1efbfc9d752/scratchpad/shots';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const fail=[];
const ok=(c,m)=>{ if(!c) fail.push(m); console.log((c?'  PASS  ':'  FAIL  ')+m); };

// --- Reduced motion -------------------------------------------------
{
  const ctx=await b.newContext({viewport:{width:1400,height:900}, reducedMotion:'reduce'});
  const page=await ctx.newPage();
  await page.goto('http://localhost:4613/errorsfree/',{waitUntil:'networkidle'});
  await page.waitForTimeout(1200);
  const r=await page.evaluate(()=>{
    const lv=[...document.querySelectorAll('.dhero .dz__level')];
    const t=document.querySelector('[data-process-tunnel]');
    return {
      levels: lv.length,
      distinctScales: new Set(lv.map(n=>getComputedStyle(n).getPropertyValue('--s').trim())).size,
      visible: lv.filter(n=>getComputedStyle(n).visibility!=='hidden').length,
      pinHeight: t.offsetHeight,
      viewport: window.innerHeight,
      stepsOn: document.querySelectorAll('.tunnel__step[data-on]').length,
      introGone: !document.querySelector('[data-droste-intro]'),
    };
  });
  ok(r.levels>=5, `reduced motion: nesting still rendered (${r.levels} frames)`);
  ok(r.distinctScales>=5, `reduced motion: frames keep distinct scales (${r.distinctScales})`);
  ok(r.pinHeight < r.viewport*1.6, `reduced motion: pin collapsed (${r.pinHeight}px vs ${r.viewport}px viewport)`);
  ok(r.stepsOn===4, `reduced motion: all 4 steps legible (${r.stepsOn})`);
  ok(r.introGone, 'reduced motion: intro animation removed');
  // Nothing should move.
  const a=await page.evaluate(()=>getComputedStyle(document.querySelector('.dhero .dz__level')).getPropertyValue('--s'));
  await page.waitForTimeout(2200);
  const c=await page.evaluate(()=>getComputedStyle(document.querySelector('.dhero .dz__level')).getPropertyValue('--s'));
  ok(a===c, `reduced motion: tunnel is static (${a.trim()} == ${c.trim()})`);
  await page.screenshot({path:`${SHOTS}/reduced-motion.png`});
  await ctx.close();
}

// --- Mobile ---------------------------------------------------------
{
  const ctx=await b.newContext({viewport:{width:390,height:800}, isMobile:true, hasTouch:true, deviceScaleFactor:2});
  const page=await ctx.newPage();
  await page.goto('http://localhost:4613/errorsfree/',{waitUntil:'networkidle'});
  await page.waitForTimeout(1400);
  const r=await page.evaluate(()=>{
    const t=document.querySelector('[data-process-tunnel]');
    return {
      heroLevels: document.querySelectorAll('.dhero .dz__level').length,
      pinHeight: t.offsetHeight,
      viewport: window.innerHeight,
      stepsOn: document.querySelectorAll('.tunnel__step[data-on]').length,
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  });
  ok(r.heroLevels===5, `mobile: hero depth reduced to 5 (${r.heroLevels})`);
  ok(r.pinHeight < r.viewport*1.6, `mobile: no pin (${r.pinHeight}px)`);
  ok(r.stepsOn===4, `mobile: all steps legible (${r.stepsOn})`);
  ok(!r.overflowX, 'mobile: no horizontal overflow');
  await page.evaluate(()=>scrollTo({top:300,behavior:'instant'}));
  await page.waitForTimeout(600);
  await page.screenshot({path:`${SHOTS}/mobile-zoom.png`});
  await ctx.close();
}

// --- rAF stops when off-screen ---------------------------------------
{
  const ctx=await b.newContext({viewport:{width:1400,height:900}});
  const page=await ctx.newPage();
  await page.goto('http://localhost:4613/errorsfree/',{waitUntil:'networkidle'});
  await page.waitForTimeout(1000);
  await page.evaluate(()=>scrollTo({top:document.body.scrollHeight,behavior:'instant'}));
  await page.waitForTimeout(900);
  const a=await page.evaluate(()=>getComputedStyle(document.querySelector('.dhero .dz__level')).getPropertyValue('--s'));
  await page.waitForTimeout(2200);
  const c=await page.evaluate(()=>getComputedStyle(document.querySelector('.dhero .dz__level')).getPropertyValue('--s'));
  ok(a===c, `hero loop stops when scrolled out of view (${a.trim()} == ${c.trim()})`);
  await ctx.close();
}

await b.close(); server.close();
console.log(fail.length?`\nFAILURES:\n- ${fail.join('\n- ')}`:'\nALL MOTION CHECKS PASSED');
process.exit(fail.length?1:0);
