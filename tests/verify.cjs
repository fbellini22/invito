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
 const fill=async(p,food='Italiano')=>{await p.locator('input[name=preference][value="'+food+'"]').check();await click(p,'food-next');await chapter(p,'date');await p.locator('#date').fill(await p.locator('#date').getAttribute('min'));await click(p,'date-next');await chapter(p,'plan');await p.locator('input[name=plan][value="Cena + qualcosa dopo"]').check();await chapter(p,'arrival');};
 const shot=async(p,name)=>p.screenshot({path:path.join(root,'tests/screenshots/decisions-'+name+'.png'),fullPage:true});
 try {
  for(const [engine,type,exe] of [['webkit',webkit,'webkit-2359/Playwright.exe'],['chromium',chromium,'chromium-1243/chrome-win64/chrome.exe']]){
   const browser=await type.launch({executablePath:path.join(root,'.test-browsers',exe)});
   try {
    for(let n=0;n<sizes.length;n++){
     const [width,height,name]=sizes[n];
     const ctx=await browser.newContext({viewport:{width,height},isMobile:width<700,hasTouch:true,reducedMotion:'reduce',locale:'it-IT',timezoneId:'Europe/Rome'});
     const p=await ctx.newPage(),errors=[],posts=[];p.on('pageerror',e=>errors.push(String(e)));let mode='network',pending;
     await p.route('https://formspree.io/**',async r=>{assert.equal(r.request().url(),endpoint);assert.equal(r.request().headers()['content-type'],'application/json');assert.equal(r.request().headers().accept,'application/json');posts.push(r.request().postDataJSON());if(mode==='network')await r.abort();else pending=r;});
     await p.goto(url);assert(!/cena/i.test(await p.locator('body').innerText()));const mission=await p.evaluate(()=>sessionStorage.getItem('dinner-mission'));assert.match(mission,/^DIN-\d{4}$/);await p.reload();assert.equal(await p.evaluate(()=>sessionStorage.getItem('dinner-mission')),mission);
     await click(p,'accept');await click(p,'continue');await p.locator('#configure').evaluate(b=>{b.click();b.click();});await chapter(p,'food');
     assert.equal(await p.locator('#skip-journey,[data-item],.journey-inventory').count(),0);
     assert(await p.locator('#food-next').isDisabled());assert.equal(posts.length,0);
     await p.locator('#mission-form').evaluate(f=>f.dispatchEvent(new Event('submit',{cancelable:true})));await chapter(p,'food');assert.match(await p.locator('#form-error').innerText(),/serata/);
     for(let i=0;i<foods.length;i++){await p.locator('input[name=preference][value="'+foods[i]+'"]').check();assert.equal(await p.locator('#food-reaction').innerText(),reactions[i]);assert.equal(await p.locator('input[name=preference]:checked').count(),1);assert(await p.locator('#route-marker').isVisible());await chapter(p,'food');}
     await p.locator('input[name=preference][value="'+foods[n]+'"]').check();await shot(p,engine+'-'+name+'-bivio');
     await p.locator('#food-next').evaluate(b=>{b.click();b.click();});await chapter(p,'date');assert(await p.locator('#date-next').isDisabled());
     await p.locator('#date').fill('2020-01-01');assert(await p.locator('#date-next').isDisabled());await p.locator('#mission-form').evaluate(f=>f.dispatchEvent(new Event('submit',{cancelable:true})));await chapter(p,'date');assert.match(await p.locator('#form-error').innerText(),/futura/);
     const date=await p.locator('#date').getAttribute('min');await p.locator('#date').fill(date);assert(await p.locator('#date-next').isEnabled());assert(await p.locator('#date-reaction').isVisible());await shot(p,engine+'-'+name+'-calendario');
     await p.locator('#date-next').evaluate(b=>{b.click();b.click();});await chapter(p,'plan');assert.equal(await p.locator('input[name=plan]:checked').count(),0);await p.locator('#mission-form').evaluate(f=>f.dispatchEvent(new Event('submit',{cancelable:true})));await chapter(p,'plan');
     await shot(p,engine+'-'+name+'-oste');await p.locator('input[name=plan][value="Cena + qualcosa dopo"]').check();await chapter(p,'arrival');
     assert.equal(posts.length,0);assert.equal(await p.locator('#arrival-food').innerText(),destinations[n]);assert.equal(await p.locator('#arrival-plan').innerText(),'Cena + qualcosa dopo');assert.equal(await p.locator('input:visible').count(),0);
     const note=n===0?'   ':'Un tavolo tranquillo, grazie.';await p.locator('#notes').fill(note);
     await p.locator('[data-back=plan]').click();await chapter(p,'plan');await p.locator('[data-back=date]').click();await chapter(p,'date');assert.equal(await p.locator('#date').inputValue(),date);await p.locator('[data-back=food]').click();assert(await p.locator('input[name=preference][value="'+foods[n]+'"]').isChecked());await click(p,'food-next');await click(p,'date-next');await p.locator('input[name=plan][value="Cena + qualcosa dopo"]').click();assert.equal(await p.locator('#notes').inputValue(),note);
     for(const id of ['date','notes'])assert(await p.locator('#'+id).evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=16));
     await shot(p,engine+'-'+name+'-taverna');await p.setViewportSize({width,height:400});await p.locator('#notes').focus();await click(p,'submit');await p.locator('#send-error').waitFor({state:'visible'});await chapter(p,'arrival');assert.equal(await p.locator('#notes').inputValue(),note);assert.equal(await p.locator('#submit').innerText(),'RIPROVA');assert.equal(await p.evaluate(()=>sessionStorage.getItem('dinner-sent')),null);
     mode='pending';const count=posts.length;await p.locator('#mission-form').evaluate(f=>{for(let i=0;i<4;i++)f.dispatchEvent(new Event('submit',{cancelable:true}));});await p.waitForTimeout(100);assert.equal(posts.length,count+1);assert(await p.locator('#success').isHidden());assert(await p.locator('[data-back=plan]').isDisabled());assert(await p.locator('#submit').isDisabled());
     assert.deepEqual(posts.at(-1),{'Mission ID':mission,'Data proposta':date.split('-').reverse().join('/'),'Preferenza':foods[n],'Tipo di serata':'Cena + qualcosa dopo',Note:note.trim()||'Nessuna comunicazione aggiuntiva'});
     await pending.fulfill({json:{ok:true}});await p.locator('#success').waitFor({state:'visible'});assert.equal(await p.locator('#summary-food').innerText(),destinations[n]);assert.equal(await p.locator('#summary-plan').innerText(),'Cena + qualcosa dopo');assert.match(await p.locator('#success').innerText(),/Finalmente un problema non tuo/);await p.setViewportSize({width,height});await shot(p,engine+'-'+name+'-success');await p.reload();assert(await p.locator('#success').isVisible());assert.equal(posts.length,count+1);assert.deepEqual(errors,[]);await ctx.close();
     results.push(engine+' '+name+': PASS mandatory decisions, six routes, native pickers, back, recap, no duplicate form, retry preserves state, exact payload, double submit, refresh, overflow');
    }
    for(const reduced of [false,true]){
     const ctx=await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,reducedMotion:reduced?'reduce':'no-preference'});const p=await ctx.newPage();await p.goto(url);await click(p,'accept');await click(p,'continue');await p.clock.install();await p.clock.pauseAt(new Date());
     await p.evaluate(()=>{const set=window.setTimeout.bind(window),clear=window.clearTimeout.bind(window);window.walkTimers=new Set();window.setTimeout=(fn,ms,...args)=>{let id;id=set(()=>{walkTimers.delete(id);fn(...args);},ms);if(fn.name==='finishWalk')walkTimers.add(id);return id;};window.clearTimeout=id=>{walkTimers.delete(id);clear(id);};});
     const step=async(id,target)=>{await p.locator('#'+id).evaluate(b=>{b.click();b.click();});if(!reduced){await chapter(p,'travel');assert.equal(await p.evaluate(()=>walkTimers.size),1);await p.clock.runFor(1200);}await chapter(p,target);assert.equal(await p.evaluate(()=>walkTimers.size),0);await p.clock.runFor(60000);await chapter(p,target);};
     await step('configure','food');await p.locator('input[name=preference][value="Pizza"]').check();await p.clock.runFor(60000);await chapter(p,'food');await step('food-next','date');assert(await p.locator('#date-next').isDisabled());await p.locator('#date').fill(await p.locator('#date').getAttribute('min'));await p.clock.runFor(60000);await chapter(p,'date');await step('date-next','plan');assert.equal(await p.locator('input[name=plan]:checked').count(),0);await p.locator('input[name=plan][value="Cena + qualcosa dopo"]').check();if(!reduced){await chapter(p,'travel');await p.clock.runFor(1200);}await chapter(p,'arrival');await p.clock.runFor(60000);await chapter(p,'arrival');await ctx.close();
     results.push(engine+': PASS '+(reduced?'reduced':'normal')+' motion; no automatic advance before/after choices; 1.2s walks only; no idle timers');
    }
    const ctx=await browser.newContext({reducedMotion:'reduce'}),p=await ctx.newPage();let mode='http';const posts=[];
    await p.route('https://formspree.io/**',async r=>{posts.push(r.request().postDataJSON());if(mode==='http')await r.fulfill({status:503,json:{ok:true}});else if(mode==='invalid')await r.fulfill({body:'bad JSON',contentType:'application/json'});else if(mode==='timeout'){}else await r.fulfill({json:mode==='null'?null:mode==='false'?{ok:false}:mode==='string'?{ok:'true'}:mode==='success'?{ok:true}:{}});});
    await start(p);await fill(p);await p.locator('#notes').fill('Conserva questa nota');await p.clock.install();await p.clock.pauseAt(new Date());
    for(const failure of ['http','invalid','null','false','string','missing','timeout']){mode=failure;await p.locator('#submit').evaluate(b=>b.click());if(failure==='timeout')await p.clock.runFor(20000);await p.locator('#send-error').waitFor({state:'visible'});await chapter(p,'arrival');assert.equal(await p.locator('#notes').inputValue(),'Conserva questa nota');assert(await p.locator('#submit').isEnabled());assert.equal(await p.evaluate(()=>sessionStorage.getItem('dinner-sent')),null);}
    mode='success';await p.locator('#submit').evaluate(b=>b.click());await p.locator('#success').waitFor({state:'visible'});assert(posts.every(v=>JSON.stringify(v)===JSON.stringify(posts[0])));await ctx.close();results.push(engine+': PASS HTTP/invalid JSON/null/false/string/missing/timeout, identical state on every retry');
    const refusal=await browser.newContext({viewport:{width:375,height:667},hasTouch:true,isMobile:true});const q=await refusal.newPage();let outbound=0;await q.route('https://formspree.io/**',r=>{outbound++;return r.abort();});await q.goto(url);
    for(const message of refusals){await click(q,'refuse');assert.equal(await q.locator('#refuse-message').innerText(),message);await q.waitForTimeout(310);}await click(q,'really-refuse');await q.locator('#cancelled-aside').waitFor({state:'visible'});assert.equal(outbound,0);await shot(q,engine+'-refusal');await refusal.close();results.push(engine+': PASS four refusals and real decline, no POST');
    const blocked=await browser.newContext({reducedMotion:'reduce'});await blocked.addInitScript(()=>Object.defineProperty(window,'sessionStorage',{get(){throw Error('denied');}}));const b=await blocked.newPage();await b.route('https://formspree.io/**',r=>r.fulfill({json:{ok:true}}));await start(b);await fill(b);await click(b,'submit');await b.locator('#success').waitFor({state:'visible'});await blocked.close();results.push(engine+': PASS unavailable storage fallback');
   }finally{await browser.close();}
  }
 }finally{server.close();await fs.writeFile(path.join(root,'tests/results.txt'),results.join('\n')+'\n');}
 return results;
}
module.exports={run};
if(require.main===module)run().then(r=>console.log(r.join('\n'))).catch(e=>{console.error(e);process.exitCode=1;});
