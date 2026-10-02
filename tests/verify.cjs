/* All POSTs are intercepted. These tests never send real email. */
const fs = require('node:fs/promises'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const { chromium, webkit } = require(path.join(root, '.test-tools/playwright/driver/package'));
const endpoint = 'https://formspree.io/f/mbglenaa';
const foods = ['Pizza','Aperitivo','Carne','Italiano','Sorprendimi','Basta che si mangi'];
const destinations = ['La Via della Pizza','La Via dell’Aperitivo','La Locanda del Cacciatore','La Vecchia Osteria','Il Sentiero Sconosciuto','Qualsiasi Strada'];
const reactions = ['Difficile contestare questa decisione.','Una quest che inizia bene.','Messaggio ricevuto.','Si gioca in casa.','Questa è molta fiducia.','Finalmente dei requisiti chiari.'];
const refusals = ['Ah.','Questa non era prevista.','Neanche un’occhiata alla ricompensa?','Ok ok, ho capito.'];
const sizes = [[320,568,'small'],[375,667,'se'],[390,844,'standard'],[393,852,'pro'],[430,932,'max'],[1440,900,'desktop']];
async function run() {
 const results=[];
 const server=http.createServer(async(req,res)=>{try{const f=path.resolve(root,decodeURIComponent(req.url.split('?')[0]).replace(/^\/invito\/?/,'')||'index.html');if(!f.startsWith(root+path.sep))throw Error('path');res.setHeader('Content-Type',{'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml'}[path.extname(f)]||'text/plain');res.end(await fs.readFile(f));}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+server.address().port+'/invito/';
 const click=async(p,id)=>p.locator('#'+id).click();
 const chapter=async(p,id)=>{await p.locator('#'+id+'-chapter').waitFor({state:'visible'});assert.equal(await p.locator('.screen:visible').count(),1);assert.equal(await p.locator('.form-chapter:visible').count(),1);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),id+' overflow');};
 const start=async p=>{await p.goto(url);await click(p,'accept');await click(p,'continue');await click(p,'configure');await chapter(p,'food');};

 try {
  for(const [engine,type,exe] of [['webkit',webkit,'webkit-2359/Playwright.exe'],['chromium',chromium,'chromium-1243/chrome-win64/chrome.exe']]){
   const browser=await type.launch({executablePath:path.join(root,'.test-browsers',exe)});
   try {
    for(let n=0;n<sizes.length;n++){
     const [width,height,name]=sizes[n],confidence=['Molto','Il giusto','Quale piano?'][n%3];
     const ctx=await browser.newContext({viewport:{width,height},isMobile:width<700,hasTouch:true,reducedMotion:'reduce',locale:'it-IT',timezoneId:'Europe/Rome'});
     const p=await ctx.newPage(),errors=[],posts=[];p.on('pageerror',e=>errors.push(String(e)));let mode='network',pending;
     await p.route('https://formspree.io/**',async r=>{assert.equal(r.request().url(),endpoint);posts.push(r.request().postDataJSON());if(mode==='network')await r.abort();else if(mode==='http')await r.fulfill({status:503,json:{ok:true}});else if(mode==='false')await r.fulfill({json:{ok:false}});else if(mode==='invalid')await r.fulfill({body:'invalid',contentType:'application/json'});else if(mode==='timeout'){}else pending=r;});
     await start(p);await p.clock.install();await p.clock.pauseAt(new Date());
     assert.equal(await p.locator('#food-next,#date-next,#plan-next').count(),0);
     assert(!/PROSEGUI|AVANTI|CONTINUA|ENTRA NELLA TAVERNA/.test(await p.locator('#mission-form').innerText()));
     await p.clock.runFor(5000);await chapter(p,'food');
     await p.locator('input[name=preference][value="'+foods[n]+'"]').check();
     assert.equal(await p.locator('#food-reaction').innerText(),reactions[n]);
     assert.equal(await p.locator('#mission-form input:not(:disabled)').count(),0);
     await p.locator('input[name=preference]').evaluateAll(els=>els.forEach(el=>el.click()));
     assert.equal(await p.locator('input[name=preference]:checked').inputValue(),foods[n]);
     await p.clock.runFor(899);await chapter(p,'food');await p.clock.runFor(1);await chapter(p,'date');
     await p.locator('#date').fill('2020-01-01');await p.clock.runFor(5000);await chapter(p,'date');assert(await p.locator('#date').isEnabled());
     await p.locator('#date').fill('');await p.clock.runFor(5000);await chapter(p,'date');
     const date=await p.locator('#date').getAttribute('min');await p.locator('#date').fill(date);assert(await p.locator('#date-reaction').isVisible());assert(await p.locator('#date').isDisabled());
     await p.clock.runFor(899);await chapter(p,'date');await p.clock.runFor(1);await chapter(p,'plan');
     await p.locator('input[name=planConfidence][value="'+confidence+'"]').check();assert(await p.locator('#confidence-reaction').isVisible());await p.clock.runFor(899);await chapter(p,'plan');await p.clock.runFor(1);await chapter(p,'arrival');
     const note='Le scelte restano qui.';await p.locator('#notes').fill(note);assert.equal(posts.length,0);
     await p.locator('[data-back=plan]').click();await p.locator('label:has(input[name=planConfidence][value="'+confidence+'"])').click();await p.clock.runFor(900);await chapter(p,'arrival');assert.equal(await p.locator('#notes').inputValue(),note);
     for(const failure of n===0?['network','http','false','invalid','timeout']:['network']){
      mode=failure;await click(p,'submit');if(failure==='timeout')await p.clock.runFor(20000);
      await p.locator('#send-error').waitFor({state:'visible'});await chapter(p,'arrival');assert.equal(await p.locator('#notes').inputValue(),note);assert.equal(await p.locator('#submit').innerText(),'RIMANDALO');
     }
     mode='pending';const count=posts.length;await p.locator('#mission-form').evaluate(f=>{for(let i=0;i<4;i++)f.dispatchEvent(new Event('submit',{cancelable:true}));});await p.waitForTimeout(100);
     assert.equal(posts.length,count+1);await p.clock.runFor(3000);assert(await p.locator('#messenger').isVisible());assert(await p.locator('#success').isHidden());
     const mission=await p.evaluate(()=>sessionStorage.getItem('dinner-mission'));
     assert.deepEqual(posts.at(-1),{'Mission ID':mission,'Data proposta':date.split('-').reverse().join('/'),'Preferenza':foods[n],'Fiducia nel piano':confidence,Note:note});
     assert(posts.every(v=>JSON.stringify(v)===JSON.stringify(posts[0])));
     await pending.fulfill({json:{ok:true}});await p.locator('#success').waitFor({state:'visible'});assert.equal(await p.locator('#summary-plan').innerText(),confidence);
     await p.reload();assert(await p.locator('#success').isVisible());assert.equal(posts.length,count+1);assert.deepEqual(errors,[]);
     await ctx.close();results.push(engine+' '+name+': PASS automatic choices, 900ms reading, locking, invalid dates, reselection, exact payload, retry, double submit, messenger, refresh');
    }
    for(const reduced of [false,true]){
     const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:reduced?'reduce':'no-preference'}),p=await ctx.newPage();await start(p);await p.clock.install();await p.clock.pauseAt(new Date());
     await p.evaluate(()=>{const set=window.setTimeout.bind(window),clear=window.clearTimeout.bind(window);window.questTimers=new Set();window.setTimeout=(fn,ms,...args)=>{let id;id=set(()=>{questTimers.delete(id);fn(...args);},ms);if(['finishReaction','finishWalk'].includes(fn.name))questTimers.add(id);return id;};window.clearTimeout=id=>{questTimers.delete(id);clear(id);};});
     await p.locator('input[value="Aperitivo"]').check();assert.equal(await p.evaluate(()=>questTimers.size),1);await p.clock.runFor(reduced?899:1099);await chapter(p,'food');await p.clock.runFor(1);
     if(!reduced){await chapter(p,'travel');assert.equal(await p.evaluate(()=>questTimers.size),1);await p.clock.runFor(1200);}await chapter(p,'date');assert.equal(await p.evaluate(()=>questTimers.size),0);
     await p.locator('#date').fill(await p.locator('#date').getAttribute('min'));
     await p.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await p.evaluate(()=>window.dispatchEvent(new Event('pageshow')));await chapter(p,'plan');assert.equal(await p.evaluate(()=>questTimers.size),0);await p.clock.runFor(10000);await chapter(p,'plan');
     await p.locator('input[value="Quale piano?"]').check();await p.clock.runFor(reduced?900:1100);
     if(!reduced){await chapter(p,'travel');await p.evaluate(()=>window.dispatchEvent(new Event('pagehide')));}await chapter(p,'arrival');assert.equal(await p.evaluate(()=>questTimers.size),0);assert(await p.locator('#submit').isEnabled());
     await ctx.close();results.push(engine+': PASS '+(reduced?'reduced':'normal')+' motion, one timer, reaction delay, travel, pagehide/pageshow cleanup');
    }
    const ctx=await browser.newContext({reducedMotion:'reduce'}),p=await ctx.newPage();await p.goto(url);for(const message of refusals){await click(p,'refuse');assert.equal(await p.locator('#refuse-message').innerText(),message);await p.waitForTimeout(310);}await click(p,'really-refuse');await p.locator('#cancelled-aside').waitFor({state:'visible'});await ctx.close();results.push(engine+': PASS refusal unchanged');
   }finally{await browser.close();}
  }
 }finally{server.close();await fs.writeFile(path.join(root,'tests/results.txt'),results.join('\n')+'\n');}
 return results;
}
module.exports={run};
if(require.main===module)run().then(r=>console.log(r.join('\n'))).catch(e=>{console.error(e);process.exitCode=1;});
