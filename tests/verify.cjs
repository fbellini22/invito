/* Network requests are intercepted: no real email is sent. */
const fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const {chromium,webkit}=require(path.join(root,'.test-tools/playwright/driver/package'));
const endpoint='https://formspree.io/f/mbglenaa';
const strategies=['Giro completo','Operazione mirata','Prima si mangia'];
const meals=['Ovviamente','Vediamo',"Dritti all'obiettivo"];
const forbidden=['Una lampada','Una pianta','Altre candele','Non facciamo promesse'];
const sizes=[[320,568,'small'],[375,667,'se'],[390,844,'standard'],[393,852,'pro'],[430,932,'max'],[1440,900,'desktop']];
async function run(){
const results=[];
 const server=http.createServer(async(req,res)=>{try{const f=path.resolve(root,decodeURIComponent(req.url.split('?')[0]).replace(/^\/invito\/?/,'')||'index.html');if(!f.startsWith(root+path.sep))throw Error('path');res.setHeader('Content-Type',{'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml'}[path.extname(f)]||'text/plain');res.end(await fs.readFile(f));}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+server.address().port+'/invito/';
 const click=async(p,id)=>p.locator('#'+id).click();
 const chapter=async(p,id)=>{await p.locator('#'+id+'-chapter').waitFor({state:'visible'});assert.equal(await p.locator('.screen:visible').count(),1);assert.equal(await p.locator('.form-chapter:visible').count(),1);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),id+' overflow');};

 const start=async p=>{await p.goto(url);await click(p,'accept');await chapter(p,'strategy');};
 const choose=async(p,name,value,next)=>{await p.locator('input[name="'+name+'"]').evaluateAll((els,v)=>els.find(e=>e.value===v).click(),value);await p.clock.runFor(899);await chapter(p,name);await p.clock.runFor(1);await chapter(p,next);};
 try{
 for(const [engine,type,exe] of [['webkit',webkit,'webkit-2359/Playwright.exe'],['chromium',chromium,'chromium-1243/chrome-win64/chrome.exe']]){
 const browser=await type.launch({executablePath:path.join(root,'.test-browsers',exe)});
 try{
 for(let n=0;n<sizes.length;n++){
 const [width,height,name]=sizes[n],strategy=strategies[n%3],food=meals[n%3],risk=forbidden[n%4];
 const ctx=await browser.newContext({viewport:{width,height},isMobile:width<700,hasTouch:true,reducedMotion:'reduce',locale:'it-IT',timezoneId:'Europe/Rome'});
 await ctx.addInitScript(()=>{sessionStorage.setItem('dinner-sent','DIN-1234');sessionStorage.setItem('dinner-mission','DIN-1234');});
 const p=await ctx.newPage(),errors=[],posts=[];p.on('pageerror',e=>errors.push(String(e)));let mode='pending',pending;
 await p.route('https://formspree.io/**',async r=>{assert.equal(r.request().url(),endpoint);posts.push(r.request().postDataJSON());if(mode==='network')await r.abort();else if(mode==='http')await r.fulfill({status:503,json:{ok:true}});else if(mode==='false')await r.fulfill({json:{ok:false}});else if(mode==='string')await r.fulfill({json:{ok:'true'}});else if(mode==='invalid')await r.fulfill({body:'bad',contentType:'application/json'});else if(mode==='timeout'){}else pending=r;});
 await p.goto(url);assert(await p.locator('#access').isVisible());assert.match(await p.locator('body').innerText(),/OPERAZIONE/);
 if(n===2||n===5)await p.screenshot({path:path.join(root,'tests/screenshots/ikea-'+engine+'-'+name+'-opening.png'),fullPage:true});
 await click(p,'accept');await chapter(p,'strategy');await p.clock.install();await p.clock.pauseAt(new Date());
 assert(!/PROSEGUI|CONTINUA|AVANTI/.test(await p.locator('#mission-form').innerText()));
 await p.clock.runFor(60000);await chapter(p,'strategy');assert.equal(posts.length,0);
 await p.locator('input[name=strategy]').evaluateAll((els,v)=>els.find(e=>e.value===v).click(),strategy);
 assert.equal(await p.locator('#mission-form input:not(:disabled)').count(),0);
 await p.locator('input[name=strategy]').evaluateAll(els=>els.forEach(e=>e.click()));
 assert.equal(await p.locator('input[name=strategy]:checked').inputValue(),strategy);
 if(n===2||n===5)await p.screenshot({path:path.join(root,'tests/screenshots/ikea-'+engine+'-'+name+'-strategy.png'),fullPage:true});
 await p.clock.runFor(899);await chapter(p,'strategy');await p.clock.runFor(1);await chapter(p,'date');
 await p.locator('#date').fill('2020-01-01');await p.clock.runFor(60000);await chapter(p,'date');await p.locator('#date').fill('');await p.clock.runFor(60000);await chapter(p,'date');
 const date=await p.locator('#date').getAttribute('min');await p.locator('#date').fill(date);assert(await p.locator('#date-reaction').isVisible());assert(await p.locator('#date').isDisabled());await p.clock.runFor(900);await chapter(p,'foodStop');
 await p.clock.runFor(60000);await chapter(p,'foodStop');await choose(p,'foodStop',food,'forbiddenPurchase');await p.clock.runFor(60000);await chapter(p,'forbiddenPurchase');await choose(p,'forbiddenPurchase',risk,'arrival');
 const note=n===0?'   ':'Un obiettivo molto preciso.';await p.locator('#notes').fill(note);assert.equal(posts.length,0);
 assert.equal(await p.locator('#arrival-strategy').innerText(),strategy);assert.equal(await p.locator('#arrival-foodStop').innerText(),food);assert.equal(await p.locator('#arrival-forbiddenPurchase').innerText(),risk);
 if(n===2||n===5)await p.screenshot({path:path.join(root,'tests/screenshots/ikea-'+engine+'-'+name+'-receipt.png'),fullPage:true});
 for(const id of ['date','notes'])assert(await p.locator('#'+id).evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=16));
 for(const failure of n===0?['network','http','false','string','invalid','timeout']:['network']){
 mode=failure;await click(p,'submit');if(failure==='timeout')await p.clock.runFor(20000);await p.locator('#send-error').waitFor({state:'visible'});await chapter(p,'arrival');assert.equal(await p.locator('#notes').inputValue(),note);assert.equal(await p.locator('#submit').innerText(),'RIPROVA LA SPEDIZIONE');assert.equal(await p.evaluate(()=>sessionStorage.getItem('ikea-sent')),null);
 }
 mode='pending';const count=posts.length;await p.locator('#mission-form').evaluate(f=>{for(let i=0;i<4;i++)f.dispatchEvent(new Event('submit',{cancelable:true}));});await p.waitForTimeout(100);assert.equal(posts.length,count+1);await p.clock.runFor(3000);assert(await p.locator('#shipping').isVisible());assert(await p.locator('#success').isHidden());
 const mission=await p.evaluate(()=>sessionStorage.getItem('ikea-mission'));assert.match(mission,/^IKEA-[0-9]{4}$/);
 assert.deepEqual(posts.at(-1),{'Mission ID':mission,Missione:'Operazione IKEA',Data:date.split('-').reverse().join('/'),Strategia:strategy,'Sosta cibo':food,'Acquisto vietato':risk,Note:note.trim()||'Nessuna comunicazione aggiuntiva'});
 assert(posts.every(v=>JSON.stringify(v)===JSON.stringify(posts[0])));
 await pending.fulfill({json:{ok:true}});await p.locator('#success').waitFor({state:'visible'});assert.equal(await p.locator('#summary-forbiddenPurchase').innerText(),risk);
 assert.equal(await p.locator('#final-joke').innerText(),risk==='Non facciamo promesse'?'Limitare i danni.':'Uscire senza comprare '+risk.toLowerCase()+'.');
 if(n===2||n===5)await p.screenshot({path:path.join(root,'tests/screenshots/ikea-'+engine+'-'+name+'-success.png'),fullPage:true});
 await p.reload();assert(await p.locator('#success').isVisible());assert.equal(await p.locator('#summary-forbiddenPurchase').innerText(),risk);assert.equal(posts.length,count+1);assert.deepEqual(errors,[]);await ctx.close();
 results.push(engine+' '+name+': PASS all four decisions, idle waits, reaction delay, locks, invalid date, payload, errors/retry, double submit, shipping, receipt refresh, overflow');
 }
 for(const reduced of [false,true]){
 const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:reduced?'reduce':'no-preference'}),p=await ctx.newPage();await start(p);await p.clock.install();await p.clock.pauseAt(new Date());
 await p.evaluate(()=>{const set=window.setTimeout.bind(window),clear=window.clearTimeout.bind(window);window.questTimers=new Set();window.setTimeout=(fn,ms,...args)=>{let id;id=set(()=>{questTimers.delete(id);fn(...args);},ms);if(['finishReaction','finishWalk'].includes(fn.name))questTimers.add(id);return id;};window.clearTimeout=id=>{questTimers.delete(id);clear(id);};});
 await p.locator('input[value="Giro completo"]').check();assert.equal(await p.evaluate(()=>questTimers.size),1);await p.clock.runFor(reduced?899:1099);await chapter(p,'strategy');await p.clock.runFor(1);if(!reduced){await chapter(p,'travel');assert.equal(await p.evaluate(()=>questTimers.size),1);await p.clock.runFor(1200);}await chapter(p,'date');assert.equal(await p.evaluate(()=>questTimers.size),0);
 await p.locator('#date').fill(await p.locator('#date').getAttribute('min'));await p.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await p.evaluate(()=>window.dispatchEvent(new Event('pageshow')));await chapter(p,'foodStop');assert.equal(await p.evaluate(()=>questTimers.size),0);await p.clock.runFor(60000);await chapter(p,'foodStop');await ctx.close();results.push(engine+': PASS '+(reduced?'reduced':'normal')+' motion, single timer, lifecycle cleanup');
 }
 const ctx=await browser.newContext({reducedMotion:'reduce'}),p=await ctx.newPage();let outgoing=0;await p.route('https://formspree.io/**',r=>{outgoing++;return r.abort();});await p.goto(url);
 for(const message of ['Sei sicura?','Neanche per le polpette?','Posso aggiungere una sosta al reparto lampade.']){await click(p,'refuse');assert.equal(await p.locator('#refuse-message').innerText(),message);await p.waitForTimeout(310);}await click(p,'really-refuse');assert(await p.locator('#cancelled').isVisible());assert.equal(outgoing,0);await ctx.close();results.push(engine+': PASS real refusal, no request');
 const blocked=await browser.newContext({reducedMotion:'reduce'});await blocked.addInitScript(()=>Object.defineProperty(window,'sessionStorage',{get(){throw Error('denied');}}));const b=await blocked.newPage();await b.route('https://formspree.io/**',r=>r.fulfill({json:{ok:true}}));await start(b);await b.clock.install();await b.clock.pauseAt(new Date());await choose(b,'strategy','Giro completo','date');await b.locator('#date').fill(await b.locator('#date').getAttribute('min'));await b.clock.runFor(900);await choose(b,'foodStop','Ovviamente','forbiddenPurchase');await choose(b,'forbiddenPurchase','Una lampada','arrival');await click(b,'submit');await b.locator('#success').waitFor({state:'visible'});await blocked.close();results.push(engine+': PASS unavailable storage');
 }finally{await browser.close();}
 }
 }finally{server.close();await fs.writeFile(path.join(root,'tests/results.txt'),results.join('\n')+'\n');}
 return results;
}
module.exports={run};
if(require.main===module)run().then(r=>console.log(r.join('\n'))).catch(e=>{console.error(e);process.exitCode=1;});
