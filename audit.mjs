import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
const ROOT='/home/user/errorsfreedorse/dist', BASE='/errorsfree';
const MIME={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.xml':'application/xml','.txt':'text/plain'};
const server=createServer(async(req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);
 if(p.startsWith(BASE))p=p.slice(BASE.length)||'/';let f=normalize(join(ROOT,p));
 try{const s=await stat(f); if(s.isDirectory())f=join(f,'index.html');}catch{res.writeHead(404);return res.end();}
 try{res.writeHead(200,{'Content-Type':MIME[extname(f)]??'application/octet-stream'});res.end(await readFile(f));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(4602,r));
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const fail=[];
const ok=(c,m)=>{ if(!c) fail.push(m); console.log((c?'  PASS  ':'  FAIL  ')+m); };

// ---- Interaction: palette switcher --------------------------------
{
  const page=await b.newPage({viewport:{width:1440,height:950}});
  await page.goto('http://localhost:4602/errorsfree/',{waitUntil:'networkidle'});
  await page.waitForTimeout(1200);
  ok(await page.locator('[data-lab-panel]').isHidden(), 'palette panel starts closed');
  await page.click('[data-lab-toggle]');
  ok(await page.locator('[data-lab-panel]').isVisible(), 'palette panel opens on click');
  await page.click('[data-palette-set="dune"]');
  ok(await page.evaluate(()=>document.documentElement.dataset.palette)==='dune', 'clicking Dune sets data-palette');
  await page.click('[data-theme-set="light"]');
  ok(await page.evaluate(()=>document.documentElement.dataset.theme)==='light', 'clicking Light sets data-theme');
  await page.keyboard.press('Escape');
  ok(await page.locator('[data-lab-panel]').isHidden(), 'Escape closes the panel');
  // Persistence across navigation
  await page.goto('http://localhost:4602/errorsfree/about/',{waitUntil:'networkidle'});
  await page.waitForTimeout(400);
  const persisted = await page.evaluate(()=>[document.documentElement.dataset.palette, document.documentElement.dataset.theme]);
  ok(persisted[0]==='dune' && persisted[1]==='light', `choice persists across pages (got ${persisted})`);
  await page.close();
}

// ---- Interaction: mobile nav --------------------------------------
{
  const page=await b.newPage({viewport:{width:390,height:800}});
  await page.goto('http://localhost:4602/errorsfree/',{waitUntil:'networkidle'});
  await page.waitForTimeout(1000);
  ok(await page.locator('[data-mobile-nav]').isHidden(), 'mobile nav starts closed');
  await page.click('[data-nav-toggle]');
  ok(await page.locator('[data-mobile-nav]').isVisible(), 'mobile nav opens');
  ok(await page.getAttribute('[data-nav-toggle]','aria-expanded')==='true', 'burger reports aria-expanded=true');
  await page.close();
}

// ---- Interaction: contact form validation -------------------------
{
  const page=await b.newPage({viewport:{width:1280,height:900}});
  await page.goto('http://localhost:4602/errorsfree/contact/',{waitUntil:'networkidle'});
  await page.waitForTimeout(900);
  await page.click('[data-cf-submit]');
  await page.waitForTimeout(200);
  ok(((await page.textContent('[data-err-for="email"]')) || '').length>0, 'empty submit reports an email error');
  ok(await page.getAttribute('[name="email"]','aria-invalid')==='true', 'invalid field marked aria-invalid');
  await page.fill('[name="name"]','Test Person');
  await page.fill('[name="email"]','not-an-email');
  await page.fill('[name="message"]','We need an internal booking tool.');
  await page.click('[data-cf-submit]');
  await page.waitForTimeout(200);
  ok(((await page.textContent('[data-err-for="email"]')) || '').length>0, 'malformed email still rejected');
  await page.fill('[name="email"]','buyer@company.ae');
  await page.click('[data-cf-submit]');
  await page.waitForTimeout(1200);
  ok(await page.getAttribute('[data-cf-status]','data-state')==='ok', 'valid submit reaches success state');
  await page.close();
}

// ---- Interaction: blog category filter ----------------------------
{
  const page=await b.newPage({viewport:{width:1280,height:900}});
  await page.goto('http://localhost:4602/errorsfree/blog/',{waitUntil:'networkidle'});
  await page.waitForTimeout(900);
  const before=await page.locator('[data-blog-grid] > [data-cat]:visible').count();
  await page.click('[data-filter="Engineering"]');
  await page.waitForTimeout(200);
  const after=await page.locator('[data-blog-grid] > [data-cat]:visible').count();
  ok(before===6 && after===2, `category filter narrows results (${before} -> ${after})`);
  await page.close();
}

// ---- Structure & SEO ----------------------------------------------
const pages=['/','/about/','/services/','/services/ai-integration/','/work/','/blog/','/blog/what-ai-actually-costs-an-sme/','/contact/','/privacy/','/terms/'];
for (const path of pages) {
  const page=await b.newPage({viewport:{width:1280,height:900}});
  await page.goto(`http://localhost:4602/errorsfree${path}`,{waitUntil:'networkidle'});
  const r=await page.evaluate(()=>({
    h1: document.querySelectorAll('h1').length,
    title: document.title,
    desc: document.querySelector('meta[name=description]')?.getAttribute('content')?.length ?? 0,
    canonical: document.querySelector('link[rel=canonical]')?.getAttribute('href') ?? '',
    og: !!document.querySelector('meta[property="og:image"]'),
    imgNoAlt: [...document.images].filter(i=>!i.hasAttribute('alt')).length,
    landmarks: !!document.querySelector('main#main') && !!document.querySelector('header') && !!document.querySelector('footer'),
    // Heading order: no level skipped going down the document.
    headingSkips: (()=>{let last=0,skips=0;
      for(const h of document.querySelectorAll('h1,h2,h3,h4,h5,h6')){const l=+h.tagName[1];
        if(last && l>last+1) skips++; last=l;} return skips;})(),
    emptyLinks: [...document.querySelectorAll('a')].filter(a=>!a.textContent.trim() && !a.getAttribute('aria-label') && !a.querySelector('[aria-label],img[alt],svg[role=img]')).length,
  }));
  const p=path.padEnd(42);
  ok(r.h1===1, `${p} exactly one h1 (${r.h1})`);
  ok(r.title.length>10 && r.title.length<75, `${p} title length ${r.title.length}`);
  ok(r.desc>60 && r.desc<200, `${p} meta description length ${r.desc}`);
  ok(r.canonical.startsWith('https://errorsfree.com/errorsfree'), `${p} canonical set`);
  ok(r.og, `${p} og:image present`);
  ok(r.imgNoAlt===0, `${p} all images have alt (${r.imgNoAlt} missing)`);
  ok(r.landmarks, `${p} main/header/footer landmarks`);
  ok(r.headingSkips===0, `${p} no skipped heading levels (${r.headingSkips})`);
  ok(r.emptyLinks===0, `${p} no unlabelled links (${r.emptyLinks})`);
  await page.close();
}

await b.close(); server.close();
console.log(`\n${fail.length ? 'FAILURES:\n- '+fail.join('\n- ') : 'ALL CHECKS PASSED'}`);
process.exit(fail.length?1:0);
