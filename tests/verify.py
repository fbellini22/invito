"""Local regression checks; FormSubmit is intercepted, no email is sent."""
from pathlib import Path
import os
import sys
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.test-tools'))
os.environ['PLAYWRIGHT_BROWSERS_PATH'] = str(ROOT / '.test-browsers')
from playwright.sync_api import sync_playwright, expect

class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(ROOT.parent)))
threading.Thread(target=server.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{server.server_port}/{ROOT.name}/'
SHOTS = ROOT / 'tests' / 'screenshots'
SHOTS.mkdir(exist_ok=True)
results = []

def visible(page, screen):
    expect(page.locator('#' + screen)).to_be_visible()
    assert page.locator('.screen:visible').count() == 1
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), screen

def proposal(page):
    page.locator('#start').evaluate('(b) => {b.click(); b.click()}')
    visible(page, 'analysis')
    expect(page.locator('#continue')).to_be_visible()
    assert page.locator('.evening-card:visible').count() == 4
    page.locator('#continue').tap()
    visible(page, 'briefing')

def form(page):
    proposal(page)
    page.locator('#accept').evaluate('(b) => {b.click(); b.click()}')
    visible(page, 'accepted')
    page.locator('#configure').tap()
    visible(page, 'configuration')

def fill(page, note=''):
    page.locator('#date').fill(page.locator('#date').get_attribute('min'))
    page.locator('#time').fill('20:30')
    page.locator('.food').filter(has_text='Italiano').tap()
    page.locator('#notes').fill(note)

def shot(page, name):
    page.screenshot(path=str(SHOTS / (name + '.png')), full_page=True)

try:
    with sync_playwright() as p:
        for engine in ['webkit', 'chromium']:
            browser = getattr(p, engine).launch()
            for width, height, name in [(320,568,'small'), (375,667,'se'), (393,852,'standard'), (430,932,'max'), (1440,900,'desktop')]:
                context = browser.new_context(viewport={'width':width,'height':height},has_touch=True,is_mobile=width<700,reduced_motion='reduce',locale='it-IT',timezone_id='Europe/Rome')
                page = context.new_page()
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.route('https://formsubmit.co/**', lambda route: route.fulfill(status=200, json={'success':'false','message':'Please activate your form'}))
                page.goto(URL)
                visible(page, 'access')
                assert 'Formspree' not in page.locator('body').inner_text()
                assert 'FormSubmit' not in page.locator('body').inner_text()
                assert page.locator('progress, .terminal, .steps, .radar, #mission-id').count() == 0
                mission = page.evaluate('sessionStorage.getItem("dinner-mission")')
                shot(page, f'{engine}-{name}-access')
                page.reload()
                assert page.evaluate('sessionStorage.getItem("dinner-mission")') == mission
                proposal(page)
                for message in ['Ah.', 'Questa non era prevista.', 'Posso offrirti la possibilità di ripensarci?', 'Ok ok, ho capito 😂']:
                    page.locator('#refuse').tap()
                    expect(page.locator('#refuse-message')).to_have_text(message)
                    page.wait_for_timeout(310)
                    box = page.locator('#refuse').bounding_box()
                    yes = page.locator('#accept').bounding_box()
                    assert box['x'] >= 0 and box['x'] + box['width'] <= width
                    assert box['y'] >= 0 and box['y'] + box['height'] <= height
                    assert box['y'] >= yes['y'] + yes['height']
                expect(page.locator('#really-refuse')).to_be_visible()
                if name == 'standard':
                    shot(page, f'{engine}-proposal')
                page.locator('#accept').tap()
                visible(page, 'accepted')
                if name == 'standard':
                    shot(page, f'{engine}-accepted')
                page.locator('#configure').tap()
                visible(page, 'configuration')
                page.locator('#submit').tap()
                expect(page.locator('#form-error')).to_contain_text('giorno')
                page.locator('#date').fill('2020-01-01')
                page.locator('#submit').tap()
                expect(page.locator('#form-error')).to_contain_text('futura')
                page.locator('#date').fill(page.locator('#date').get_attribute('min'))
                page.locator('#submit').tap()
                expect(page.locator('#form-error')).to_contain_text('orario')
                page.locator('#time').fill('20:30')
                page.locator('#submit').tap()
                expect(page.locator('#form-error')).to_contain_text('mangiare')
                for food, reaction in [('Pizza','Difficile sbagliare.'), ('Sushi','Scelta rispettabile.'), ('Carne','Messaggio ricevuto.'), ('Italiano','Si gioca in casa.'), ('Sorprendimi','Questa è molta fiducia.'), ('Basta che si mangi','La risposta più concreta finora.')]:
                    page.locator('.food').filter(has_text=food).tap()
                    expect(page.locator('#food-reaction')).to_have_text(reaction)
                    assert page.locator('input[name=preference]:checked').count() == 1
                fill(page, 'Un tavolo tranquillo, grazie.')
                page.locator('#notes').blur()
                shot(page, f'{engine}-{name}-form')
                for selector in ['#date','#time','#notes']:
                    assert page.locator(selector).evaluate('(el) => parseFloat(getComputedStyle(el).fontSize)') >= 16
                page.set_viewport_size({'width':width,'height':400})
                page.locator('#notes').focus()
                page.locator('#submit').tap()
                expect(page.locator('#send-error')).to_be_visible()
                expect(page.locator('#send-detail')).to_contain_text('Non è stato possibile confermare')
                expect(page.locator('#notes')).to_have_value('Un tavolo tranquillo, grazie.')
                expect(page.locator('#submit')).to_be_enabled()
                assert not errors, errors
                results.append(f'{engine} {width}x{height}: responsive, hidden technical UI, session ID, cards, refusal bounds, acceptance, validation, six foods, input sizing, reduced viewport, activation pending preserves data PASS')
                context.close()

            context = browser.new_context(viewport={'width':393,'height':852},has_touch=True,is_mobile=True,reduced_motion='reduce')
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            source = (ROOT/'app.js').read_text(encoding='utf-8-sig')
            page.route('**/app.js', lambda route: route.fulfill(body=source,content_type='text/javascript'))
            requests = []
            mode = {'value':'error'}
            pending = []
            def respond(route):
                requests.append(route.request.post_data_json)
                if mode['value']=='error': route.fulfill(status=503,json={'error':'unavailable'})
                elif mode['value']=='network': route.abort('failed')
                elif mode['value']=='malformed': route.fulfill(status=200,json={'unexpected':True})
                elif mode['value']=='invalid-json': route.fulfill(status=200,body='not JSON',content_type='application/json')
                elif mode['value']=='null': route.fulfill(status=200,body='null',content_type='application/json')
                elif mode['value']=='activation': route.fulfill(status=200,json={'success':'false','message':'Please activate your form'})
                elif mode['value']=='false': route.fulfill(status=200,json={'success':False})
                elif mode['value']=='truthy': route.fulfill(status=200,json={'success':1})
                else: pending.append(route)
            page.route('https://formsubmit.co/**',respond)
            page.goto(URL)
            form(page)
            fill(page)
            for failure in ['error','network','malformed','invalid-json','null','activation','false','truthy']:
                mode['value'] = failure
                page.locator('#submit').tap()
                expect(page.locator('#send-error')).to_be_visible()
                expect(page.locator('#submit')).to_be_enabled()
                visible(page,'configuration')
                expect(page.locator('#time')).to_have_value('20:30')
                expect(page.locator('#submit')).to_have_text('RIPROVA')
                assert page.evaluate('sessionStorage.getItem("dinner-sent")') is None
            mode['value']='success'
            before = len(requests)
            page.locator('#mission-form').evaluate('(f) => {for(let i=0;i<4;i++) f.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}))}')
            page.wait_for_timeout(150)
            assert len(pending)==1 and len(requests)==before+1
            visible(page,'configuration')
            expect(page.locator('#submit')).to_be_disabled()
            expect(page.locator('#submit')).to_have_text('Un secondo...')
            expect(page.locator('#success')).to_be_hidden()
            pending.pop().fulfill(status=200,json={'success':'true' if engine == 'webkit' else True})
            # No artificial sequence or timer after a confirmed response.
            expect(page.locator('#success')).to_be_visible(timeout=1000)
            assert set(requests[-1])=={'Mission ID','Data proposta','Ora proposta','Preferenza culinaria','Note'}
            assert requests[-1]['Preferenza culinaria']=='Italiano'
            assert requests[-1]['Note']=='Nessuna comunicazione aggiuntiva'
            assert requests[-1]['Mission ID']==page.evaluate('sessionStorage.getItem("dinner-mission")')
            expect(page.locator('#summary-time')).to_have_text('20:30')
            expect(page.locator('#summary-food')).to_have_text('Italiano')
            assert page.locator('#summary-date').inner_text()
            shot(page,f'{engine}-success')
            page.reload()
            visible(page,'success')
            assert len(requests)==before+1
            assert not errors, errors
            results.append(f'{engine}: HTTP/network/invalid JSON/activation/false/truthy failures, retry, pending lock, exact payload, immediate confirmed success, refresh protection PASS')
            context.close()

            context = browser.new_context(viewport={'width':375,'height':667},is_mobile=True,has_touch=True)
            page = context.new_page()
            outbound = []
            page.on('request',lambda request: outbound.append(request.url) if request.method=='POST' else None)
            page.goto(URL)
            page.locator('#start').tap()
            expect(page.locator('#continue')).to_be_visible()
            shot(page,f'{engine}-evening')
            page.locator('#continue').tap()
            for attempt in range(4):
                page.locator('#refuse').tap()
                page.wait_for_timeout(320)
            page.locator('#really-refuse').tap()
            visible(page,'cancelled')
            assert not outbound
            shot(page,f'{engine}-cancelled')
            results.append(f'{engine}: ordinary animation, progressive cards, real refusal without submission PASS')
            context.close()
            browser.close()
finally:
    server.shutdown()
    (ROOT/'tests'/'results.txt').write_text('\n'.join(results)+'\n',encoding='utf-8')
    print('\n'.join(results))
