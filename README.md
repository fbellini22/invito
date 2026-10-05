# Operazione IKEA — Piano per due

Invito personale interattivo: una visita a IKEA trattata come un'operazione logistica. HTML, CSS e JavaScript senza framework, font remoti o dipendenze di runtime. Non affiliato a IKEA; nessun logo o asset proprietario.

## Percorso
ACCETTA LA MISSIONE → strategia (ingresso) → data (showroom) → sosta cibo (ristorante) → acquisto vietato (magazzino) → ricevuta e note (casse) → spedizione → conferma.

Le domande aspettano indefinitamente. Una scelta valida blocca gli input, mostra la reazione per 1.100 ms e avvia un viaggio di 1.200 ms. Con movimento ridotto restano 900 ms di lettura, senza viaggio animato. Un solo timer gestisce reazione e viaggio. Background e pagehide concludono solo il passaggio già scelto. La data nativa accetta oggi o un giorno futuro.

NON OGGI propone tre battute, poi NO DAVVERO annulla senza inviare. RIVEDI LE SCELTE riapre le decisioni senza cancellare le note.

## Base tecnica riutilizzata
Gestione screen/chapter, focus e scroll, sessionStorage con fallback in memoria, blocco degli input, timer unico, data locale, fetch JSON, AbortController, conferma stretta, errori e retry. L'identità visiva, la narrazione, le quattro decisioni e gli asset sono nuovi.

Lo stato usa strategy, date, foodStop, forbiddenPurchase e notes. Le chiavi ikea-mission, ikea-sent e ikea-receipt sono separate dalle altre missioni. Solo la ricevuta confermata viene salvata (senza note): al refresh si ripristinano conferma e riepilogo, senza inviare nuovamente. Le scelte non confermate restano in memoria: un refresh ricomincia il percorso.

## Invio
Endpoint invariato: https://formspree.io/f/mbglenaa.
Payload: Mission ID (IKEA-xxxx), Missione, Data (gg/mm/aaaa), Strategia, Sosta cibo, Acquisto vietato, Note.

Il POST parte insieme alla scena della scatola. La fine dell'animazione non determina il successo: servono HTTP riuscito e JSON con ok booleano true. Timeout di 20 secondi. Errori di rete, HTTP o JSON mostrano RIPROVA LA SPEDIZIONE mantenendo le scelte. Doppi invii bloccati durante la richiesta e dopo la conferma. Un retry dopo un timeout può duplicare una richiesta già accettata dal server: Mission ID permette di riconoscerla.

## Grafica
assets/store-plan.svg: planimetria originale con showroom, ristorante, scaffali, scatole e percorso.
Pittogrammi SVG originali in index.html. Animazioni CSS per carrello, frecce e scatola. Nessuna immagine o icona scaricata da IKEA.

## Anteprima e test
Avvia un server HTTP locale nella cartella del progetto, ad esempio python -m http.server 8000 --bind 127.0.0.1, e apri http://127.0.0.1:8000.

Test: .test-tools/playwright/driver/node.exe tests/verify.cjs
In alternativa: python tests/verify.py

Tutti i POST dei test sono intercettati: nessuna email reale. Esiti in tests/results.txt; anteprime attuali in tests/screenshots/ikea-*.png. Le vecchie anteprime sono solo artefatti storici e non sono caricate dal sito.

## Mobile
100dvh con fallback, safe-area, date picker nativo, input da almeno 16 px, controlli da almeno 44 px, scrolling naturale e prefers-reduced-motion. Verificati Chromium e WebKit su viewport da 320 a 1440 px. WebKit desktop non sostituisce un iPhone fisico: controllare picker nativo, tastiera, Dynamic Island, barra Safari e rientro dopo cambio app sul dispositivo.
