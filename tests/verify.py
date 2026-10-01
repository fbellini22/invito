"""Local UI checks. No real form submission; all Formspree traffic is mocked."""
import json
import os
from pathlib import Path
import sys
import threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial

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
ARTIFACTS = ROOT / 'tests' / 'screenshots'
ARTIFACTS.mkdir(exist_ok=True)
results = []

def visible(page, screen):
    expect(page.locator('#' + screen)).to_be_visible(timeout=12000)
    assert page.locator('.screen:visible').count() == 1
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), screen + ' overflow'

def enter_form(page):
    page.locator('#start').tap()
    visible(page, 'briefing')
    page.locator('#accept').tap()
    visible(page, 'accepted')
    page.locator('#configure').tap()
    visible(page, 'configuration')

def fill(page, notes=''):
    day = page.locator('#date').get_attribute('min')
    page.locator('#date').fill(day)
    page.locator('#time').fill('20:30')
    page.locator('label.food').filter(has_text='Pizza').tap()
    page.locator('#notes').fill(notes)

try:
    with sync_playwright() as p:
        for engine in ['webkit', 'chromium']:
            browser = getattr(p, engine).launch()
            for width, height, name in [(320,568,'small'), (375,667,'se'), (393,852,'standard'), (430,932,'max'), (1440,900,'desktop')]:
                context = browser.new_context(viewport={'width': width, 'height': height}, is_mobile=width<700, has_touch=True, reduced_motion='reduce', locale='it-IT', timezone_id='Europe/Rome')
                page = context.new_page()
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.goto(URL)
                visible(page, 'access')
                mission = page.locator('#mission-id').inner_text()
                page.screenshot(path=str(ARTIFACTS / f'{engine}-{name}-access.png'), full_page=True)
                page.reload()
                assert mission == page.locator('#mission-id').inner_text()
                page.locator('#start').evaluate('(el) => {el.click(); el.click(); el.click()}')
                visible(page, 'briefing')
                assert page.locator('#analysis-log li').count() == 8
                expect(page.locator('#analysis-log')).to_contain_text('87%')
                expect(page.locator('#analysis-log')).to_contain_text('47 minuti')
                for attempt in range(4):
                    page.locator('#refuse').tap()
                    page.wait_for_timeout(320)
                    box = page.locator('#refuse').bounding_box()
                    accept = page.locator('#accept').bounding_box()
                    assert box['x'] >= 0 and box['x'] + box['width'] <= width
                    assert box['y'] >= 0 and box['y'] + box['height'] <= height
                    assert box['y'] >= accept['y'] + accept['height']
                    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                expect(page.locator('#really-refuse')).to_be_visible()
                if name == 'standard':
                    page.screenshot(path=str(ARTIFACTS / f'{engine}-briefing.png'), full_page=True)
                page.locator('#accept').tap()
                page.locator('#configure').tap()
                visible(page, 'configuration')
                page.locator('#submit').tap()
                expect(page.locator('#form-error')).to_contain_text('giorno')
                page.locator('#date').fill('2020-01-01')
                page.locator('#submit').tap()
                expect(page.locator('#form-error')).to_contain_text('futura')
                page.locator('#date').fill(page.locator('#date').get_attribute('min'))
                page.locator('#submit').tap()
                expect(page.locator('#form-error')).to_contain_text('ora')
                page.locator('#time').fill('20:30')
                page.locator('#submit').tap()
                expect(page.locator('#form-error')).to_contain_text('culinario')
                fill(page, 'Un tavolo tranquillo, grazie.')
                page.locator('label.food').filter(has_text='Sushi').tap()
                assert page.locator('input[name=preference]:checked').count() == 1
                expect(page.locator('#food-reaction')).to_have_text('Algoritmo soddisfatto.')
                for food, reaction in [('Pizza', 'Scelta statisticamente difficile da criticare.'), ('Carne', 'Proteine rilevate.'), ('Qualcosa di serio', 'Attivata la modalità tovagliolo di stoffa.'), ('Sorprendimi', 'Pericoloso livello di fiducia nel sistema.'), ('Basta che si mangi', 'Finalmente dei requisiti tecnici chiari.')]:
                    page.locator('label.food').filter(has_text=food).tap()
                    expect(page.locator('#food-reaction')).to_have_text(reaction)
                    assert page.locator('input[name=preference]:checked').count() == 1
                page.locator('#notes').blur()
                page.screenshot(path=str(ARTIFACTS / f'{engine}-{name}-form.png'), full_page=True)
                # Smaller visual area exercises ordinary scrolling when keyboard reduces space.
                page.set_viewport_size({'width': width, 'height': 400})
                page.locator('#notes').focus()
                page.locator('#submit').tap()
                expect(page.locator('#send-detail')).to_contain_text('non configurato')
                expect(page.locator('#notes')).to_have_value('Un tavolo tranquillo, grazie.')
                expect(page.locator('#submit')).to_be_enabled()
                assert not errors, errors
                results.append(f'{engine} {width}x{height}: access, session ID, analysis, 4 refusals, acceptance, validation, radio, scroll, unconfigured endpoint PASS')
                context.close()

            # Replace endpoint only in the served test copy, never in the deliverable.
            context = browser.new_context(viewport={'width':393,'height':852}, is_mobile=True, has_touch=True, reduced_motion='reduce')
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            source = (ROOT / 'app.js').read_text(encoding='utf-8').replace('INSERIRE_ENDPOINT_QUI', 'https://formspree.io/f/testonly')
            page.route('**/app.js', lambda route: route.fulfill(body=source, content_type='text/javascript'))
            requests = []
            mode = {'value':'error'}
            def respond(route):
                requests.append(route.request.post_data_json)
                if mode['value'] == 'network':
                    route.abort('failed')
                elif mode['value'] == 'error':
                    route.fulfill(status=503, json={'error':'Unavailable'})
                elif mode['value'] == 'malformed':
                    route.fulfill(status=200, json={'unexpected':True})
                else:
                    route.fulfill(status=200, json={'ok':True})
            page.route('https://formspree.io/**', respond)
            page.goto(URL)
            enter_form(page)
            fill(page)
            for failure in ['error','network','malformed']:
                mode['value'] = failure
                page.locator('#submit').tap()
                expect(page.locator('#send-error')).to_be_visible()
                expect(page.locator('#submit')).to_be_enabled()
                visible(page, 'configuration')
                expect(page.locator('#time')).to_have_value('20:30')
            mode['value'] = 'success'
            before = len(requests)
            page.locator('#mission-form').evaluate('(f) => {for(let i=0;i<4;i++)f.dispatchEvent(new Event("submit",{cancelable:true,bubbles:true}))}')
            visible(page, 'success')
            expect(page.locator('#summary')).to_be_visible()
            expect(page.locator('#summary-time')).to_have_text('20:30')
            expect(page.locator('#summary-food')).to_have_text('Pizza')
            expect(page.locator('#success-aside')).to_be_visible()
            assert page.locator('#transmission-log li').count() == 6
            expect(page.locator('#transmission-log')).to_contain_text('FALLITO')
            assert len(requests) == before + 1
            assert set(requests[-1]) == {'Mission ID','Data proposta','Ora proposta','Preferenza culinaria','Note'}
            assert requests[-1]['Note'] == 'Nessuna comunicazione aggiuntiva'
            assert requests[-1]['Mission ID'] in page.locator('#mission-id').inner_text()
            page.screenshot(path=str(ARTIFACTS / f'{engine}-success.png'), full_page=True)
            page.reload()
            visible(page, 'success')
            assert len(requests) == before + 1
            assert not errors, errors
            results.append(f'{engine}: HTTP failure, network failure, malformed confirmation, retry, exact payload, repeated submit, success, refresh protection PASS')
            context.close()

            context = browser.new_context(viewport={'width':375,'height':667},is_mobile=True,has_touch=True)
            page = context.new_page()
            outbound = []
            page.on('request', lambda request: outbound.append(request.url) if request.method == 'POST' else None)
            page.goto(URL)
            page.locator('#start').tap()
            visible(page, 'briefing')
            for attempt in range(4):
                page.locator('#refuse').tap()
                if attempt == 2:
                    expect(page.locator('#refuse-message')).to_have_text('Ricalcolo in corso...')
                    expect(page.locator('#refuse-message')).to_have_text('Strano. Il risultato continua a essere cena.')
                else:
                    page.wait_for_timeout(350)
            page.locator('#really-refuse').tap()
            visible(page, 'cancelled')
            expect(page.locator('#cancelled-aside')).to_be_visible()
            assert not outbound
            results.append(f'{engine}: normal motion, real cancellation, no outbound submission PASS')
            context.close()

            # Acceptance timing and stale refusal callbacks, with ordinary animations.
            context = browser.new_context(viewport={'width':393,'height':852},is_mobile=True,has_touch=True)
            page = context.new_page()
            page.goto(URL)
            page.locator('#start').tap()
            visible(page, 'analysis')
            expect(page.locator('#analysis-result')).to_be_visible(timeout=10000)
            page.screenshot(path=str(ARTIFACTS / f'{engine}-analysis.png'), full_page=True)
            visible(page, 'briefing')
            for attempt in range(3):
                page.locator('#refuse').tap()
                page.wait_for_timeout(310)
            page.locator('#accept').evaluate('(el) => {el.click(); el.click()}')
            visible(page, 'accepted')
            expect(page.locator('#accepted-title')).to_have_text('ATTENDERE')
            expect(page.locator('#configure')).to_be_hidden()
            expect(page.locator('#accepted-title')).to_have_text('RISPOSTA CORRETTA')
            page.screenshot(path=str(ARTIFACTS / f'{engine}-accepted.png'), full_page=True)
            expect(page.locator('#configure')).to_be_visible()
            assert page.locator('.screen:visible').count() == 1
            results.append(f'{engine}: comic analysis results, acceptance pause, repeated acceptance, delayed callbacks PASS')
            context.close()
            browser.close()
finally:
    server.shutdown()
    (ROOT / 'tests' / 'results.txt').write_text('\n'.join(results) + '\n', encoding='utf-8')
    print('\n'.join(results))
