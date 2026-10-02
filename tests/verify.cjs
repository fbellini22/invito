/* Local browser regressions. All submissions are intercepted; no email is sent. */
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const { chromium, webkit } = require(path.join(root, '.test-tools/playwright/driver/package'));
const endpoint = 'https://formspree.io/f/mbglenaa';
const sizes = [[320,568,'small'],[375,667,'se'],[390,844,'standard'],[393,852,'pro'],[430,932,'max'],[1440,900,'desktop']];
const foods = ['Pizza','Sushi','Carne','Italiano','Sorprendimi','Basta che si mangi'];
const reactions = ['Difficile sbagliare.','Scelta rispettabile.','Messaggio ricevuto.','Si gioca in casa.','Questa è molta fiducia.','La risposta più concreta finora.'];
const messages = ['Ah.','Questa non era prevista.','Posso offrirti la possibilità di ripensarci?','Ok ok, ho capito.'];
async function run() {
 const results = [];
 const server = http.createServer(async(req,res) => {
  try {const name = decodeURIComponent(req.url.split('?')[0]).replace(/^\/invito\/?/,'') || 'index.html';
   const target = path.resolve(root,name); if (!target.startsWith(root+path.sep)) throw Error('path');
   res.setHeader('Content-Type', {'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml'}[path.extname(target)] || 'text/plain');
   res.end(await fs.readFile(target));
  } catch {res.writeHead(404);res.end();}
 });
 await new Promise(r => server.listen(0,'127.0.0.1',r));
 const url = 'http://127.0.0.1:'+server.address().port+'/invito/';
 const screen = async(p,id) => {await p.locator('#'+id).waitFor({state:'visible'});assert.equal(await p.locator('.screen:visible').count(),1);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),id+' overflow');};
 const click = async(p,id) => p.locator('#'+id).click();
 const proposal = async p => {await p.locator('#start').evaluate(b=>{b.click();b.click();});await p.locator('#continue').waitFor({state:'visible'});assert.equal(await p.locator('.evening-card:visible').count(),4);await click(p,'continue');await screen(p,'briefing');};
 const form = async p => {await proposal(p);await p.locator('#accept').evaluate(b=>{b.click();b.click();});await screen(p,'accepted');await click(p,'configure');await screen(p,'configuration');};
 const fill = async p => {await p.locator('#date').fill(await p.locator('#date').getAttribute('min'));await p.locator('#time').fill('20:30');await click(p,'date-next');await p.locator('input[value="Italiano"]').check();await click(p,'food-next');};
 const shot = async(p,name) => {await p.screenshot({path:path.join(root,'tests/screenshots/rpg-'+name+'.png'),fullPage:true});};
 try {
  await fs.mkdir(path.join(root,'tests/screenshots'),{recursive:true});
  for (const [engine,type,exe] of [['webkit',webkit,'webkit-2359/Playwright.exe'],['chromium',chromium,'chromium-1243/chrome-win64/chrome.exe']]) {
   const browser = await type.launch({executablePath:path.join(root,'.test-browsers',exe)});
   try {
    for (const [width,height,name] of sizes) {
     const ctx = await browser.newContext({viewport:{width,height},isMobile:width<700,hasTouch:true,reducedMotion:'reduce',locale:'it-IT',timezoneId:'Europe/Rome'});
     const p = await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(String(e)));
     const posts=[];let mode='network';let pending;
     await p.route('https://formspree.io/**',async r=>{assert.equal(r.request().url(),endpoint);posts.push(r.request().postDataJSON());if(mode==='network')await r.abort('failed');else pending=r;});
     await p.goto(url);await screen(p,'access');
     assert(!/Formspree|FormSubmit|endpoint|servizio email/i.test(await p.locator('body').innerText()));
     const mission=await p.evaluate(()=>sessionStorage.getItem('dinner-mission'));assert.match(mission,/^DIN-\d{4}$/);
     await shot(p,engine+'-'+name+'-prologue');await p.reload();assert.equal(await p.evaluate(()=>sessionStorage.getItem('dinner-mission')),mission);
     await proposal(p);
     for(const message of messages){await click(p,'refuse');assert.equal(await p.locator('#refuse-message').innerText(),message);await p.waitForTimeout(310);const box=await p.locator('#refuse').boundingBox();const yes=await p.locator('#accept').boundingBox();assert(box.x>=0&&box.x+box.width<=width);assert(box.y>=yes.y+yes.height);}
     assert(await p.locator('#really-refuse').isVisible());if(name==='pro')await shot(p,engine+'-proposal');
     await click(p,'accept');await screen(p,'accepted');if(name==='pro')await shot(p,engine+'-accepted');await click(p,'configure');
     await click(p,'date-next');assert.match(await p.locator('#form-error').innerText(),/giorno/);
     await p.locator('#date').fill('2020-01-01');await click(p,'date-next');assert.match(await p.locator('#form-error').innerText(),/futura/);
     await p.locator('#date').fill(await p.locator('#date').getAttribute('min'));await click(p,'date-next');assert.match(await p.locator('#form-error').innerText(),/orario/);
     await p.locator('#time').fill('20:30');await shot(p,engine+'-'+name+'-date');await click(p,'date-next');assert(await p.locator('#food-chapter').isVisible());
     await click(p,'food-next');assert.match(await p.locator('#form-error').innerText(),/mangiare/);
     for(let i=0;i<foods.length;i++){await p.locator('input[value="'+foods[i]+'"]').check();assert.equal(await p.locator('#food-reaction').innerText(),reactions[i]);assert.equal(await p.locator('input[name=preference]:checked').count(),1);}
     await p.locator('input[value="Italiano"]').check();await shot(p,engine+'-'+name+'-food');await click(p,'food-next');
     await p.locator('#notes').fill('Un tavolo tranquillo, grazie.');await p.locator('[data-back=food]').click();assert(await p.locator('input[value="Italiano"]').isChecked());await p.locator('[data-back=date]').click();assert.equal(await p.locator('#time').inputValue(),'20:30');await click(p,'date-next');await click(p,'food-next');assert.equal(await p.locator('#notes').inputValue(),'Un tavolo tranquillo, grazie.');
     for(const id of ['date','time','notes'])assert(await p.locator('#'+id).evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=16));
     await shot(p,engine+'-'+name+'-notes');await p.setViewportSize({width,height:400});await p.locator('#notes').focus();await click(p,'submit');await p.locator('#send-error').waitFor({state:'visible'});
     assert.equal(await p.locator('#notes').inputValue(),'Un tavolo tranquillo, grazie.');assert.equal(await p.locator('#submit').innerText(),'RIPROVA');assert(await p.locator('#submit').isEnabled());assert.equal(await p.evaluate(()=>sessionStorage.getItem('dinner-sent')),null);
     mode='pending';const count=posts.length;await p.locator('#mission-form').evaluate(f=>{for(let i=0;i<4;i++)f.dispatchEvent(new Event('submit',{cancelable:true}));});await p.waitForTimeout(100);assert.equal(posts.length,count+1);assert(await p.locator('#success').isHidden());assert(await p.locator('[data-back=food]').isDisabled());assert(await p.locator('#submit').isDisabled());await pending.fulfill({json:{ok:true}});await screen(p,'success');
     assert.deepEqual(Object.keys(posts.at(-1)),['Mission ID','Data proposta','Ora proposta','Preferenza culinaria','Note']);assert.equal(posts.at(-1)['Mission ID'],mission);assert.equal(posts.at(-1)['Preferenza culinaria'],'Italiano');assert.equal(posts.at(-1).Note,'Un tavolo tranquillo, grazie.');assert.equal(await p.locator('#summary-time').innerText(),'20:30');assert.equal(await p.locator('#summary-food').innerText(),'Italiano');assert(await p.locator('#summary-date').innerText());assert.equal(await p.locator('.confetto').count(),0);
     await p.setViewportSize({width,height});await shot(p,engine+'-'+name+'-success');await p.reload();await screen(p,'success');assert.equal(posts.length,count+1);assert.deepEqual(errors,[]);
     results.push(engine+' '+name+' '+width+'x'+height+': PASS chapters, validation, 4 refusals, six foods, back, notes, reduced viewport, retry, double submit, payload, summary, refresh, overflow');await ctx.close();
    }
    const ctx=await browser.newContext({viewport:{width:393,height:852},hasTouch:true,isMobile:true,reducedMotion:'reduce'});const p=await ctx.newPage();let mode='http';const requests=[];
    await p.route('https://formspree.io/**',async r=>{requests.push(r.request().postDataJSON());if(mode==='http')await r.fulfill({status:503,json:{ok:true}});else if(mode==='invalid')await r.fulfill({body:'invalid JSON',contentType:'application/json'});else if(mode==='timeout'){}else await r.fulfill({json:mode==='null'?null:mode==='false'?{ok:false}:mode==='string'?{ok:'true'}:mode==='legacy'?{success:'true'}:mode==='success'?{ok:true}:{}});});
    await p.goto(url);await form(p);await fill(p);
    for(const failure of ['http','invalid','null','false','string','legacy','missing','timeout']){mode=failure;await click(p,'submit');await p.locator('#send-error').waitFor({state:'visible',timeout:25000});assert(await p.locator('#success').isHidden());assert(await p.locator('#submit').isEnabled());assert.equal(await p.evaluate(()=>sessionStorage.getItem('dinner-sent')),null);}
    mode='success';await click(p,'submit');await screen(p,'success');assert.equal(requests.at(-1).Note,'Nessuna comunicazione aggiuntiva');results.push(engine+': PASS HTTP/JSON/negative/unexpected/timeout responses, retry, empty notes');await ctx.close();
    const motion=await browser.newContext({viewport:{width:375,height:667},hasTouch:true,isMobile:true});const q=await motion.newPage();let outbound=0;await q.route('https://formspree.io/**',r=>{outbound++;return r.abort();});await q.goto(url);await proposal(q);for(const msg of messages){await click(q,'refuse');await q.waitForTimeout(330);}await click(q,'really-refuse');await screen(q,'cancelled');await q.locator('#cancelled-aside').waitFor({state:'visible'});assert.equal(outbound,0);await shot(q,engine+'-cancelled');await q.reload();await form(q);await q.waitForTimeout(2500);assert.equal(await q.locator('.confetto').count(),0);results.push(engine+': PASS normal animations, progressive cards, real refusal without POST, particle cleanup');await motion.close();
    const blocked=await browser.newContext({reducedMotion:'reduce'});await blocked.addInitScript(()=>{Object.defineProperty(window,'sessionStorage',{get(){throw Error('unavailable');}});});const b=await blocked.newPage();await b.route('https://formspree.io/**',r=>r.fulfill({json:{ok:true}}));await b.goto(url);await form(b);await fill(b);await click(b,'submit');await screen(b,'success');results.push(engine+': PASS storage unavailable fallback');await blocked.close();
   }finally{await browser.close();}
  }
 } finally {server.close();await fs.writeFile(path.join(root,'tests/results.txt'),results.join('\n')+'\n');}
 return results;
}
module.exports={run};
if(require.main===module)run().then(r=>console.log(r.join('\n'))).catch(e=>{console.error(e);process.exitCode=1;});
