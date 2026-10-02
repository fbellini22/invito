# Cronache di una cena

Piccola avventura narrativa originale, progettata prima per iPhone portrait. Il progetto esistente resta HTML, CSS e JavaScript senza framework, font remoti, audio o dipendenze di runtime.

## Anteprima locale

Dalla cartella del progetto:

~~~powershell
python -m http.server 8000 --bind 127.0.0.1
~~~

Apri http://127.0.0.1:8000. Il sito può essere esplorato anche aprendo index.html, ma per l’invio serve un server HTTP. Nessuna pubblicazione automatica.

## Capitoli e logica

Nuova quest → ACCETTA → rivelazione «Organizzare una cena» → diario → bivio (cibo) → custode (giorno) → oste (fiducia nel piano) → taverna (riepilogo e messaggio) → proposta ricevuta. La prima schermata, il titolo della scheda, intestazione e footer non anticipano la cena. IGNORA mantiene quattro tentativi; IGNORA DAVVERO conclude il percorso senza inviare nulla. La rivelazione appare in due tempi (650 ms + 850 ms), senza attese con movimento ridotto.

Il gioco è un unico form: tre incontri obbligatori e un arrivo con riepilogo. PROSEGUI valida percorso e giorno. Dall’oste, una delle tre scelte mostra una reazione; ENTRA NELLA TAVERNA prosegue. Nessun incontro avanza senza una decisione. I pulsanti indietro conservano tutti i valori. Prima del POST vengono ricontrollati anche i campi nei capitoli precedenti; un errore riapre il capitolo corretto e porta il focus al campo. Invio da tastiera nei primi capitoli avanza senza spedire la proposta.

Mission ID e indicatore di conferma rimangono in sessionStorage. Le scelte non sono memorizzate in modo persistente. Dopo il successo, un refresh mostra la conferma senza ricostruire il riepilogo. Se lo storage non è disponibile, funziona il fallback in memoria. Durante l’invio sono disabilitati anche i pulsanti per tornare indietro.

## Scenografia originale

- assets/quest-landscape.svg: borgo, montagne, sole al tramonto, fiume, ponte, locanda e lanterna. Vettori originali locali, senza artwork di videogiochi.
- assets/time-map.svg: sentiero, rilievi e rosa dei venti su pergamena.
- Icone originali inline SVG per obiettivi e sei pietanze.
- Calici, scintille, bordi, carta e dissolvenze realizzati in CSS. Nessun coriandolo multicolore.

Il paesaggio è condiviso per evitare download ripetuti: una sfumatura lo fonde con il testo su mobile; su desktop resta visibile a sinistra. I capitoli cambiano il trattamento cromatico; il finale passa alla notte. I campi restano su carta chiara per la leggibilità. L’illustrazione iniziale non è lazy-loaded perché visibile subito. Non ci sono immagini raster, video, canvas o librerie grafiche.

## Invio reale

app.js usa esattamente https://formspree.io/f/mbglenaa, tramite fetch POST JSON con Content-Type e Accept application/json. Nessun redirect e nessun campo nome/email. Il payload contiene esclusivamente Mission ID, Data proposta, Preferenza, Fiducia nel piano, Note.

Il successo richiede HTTP riuscito e JSON con ok booleano true. Errore HTTP, JSON invalido, conferma negativa, rete e timeout di 20 secondi conservano i dati, riabilitano i controlli e mostrano RIMANDALO. Nessun messaggio tecnico compare nell’interfaccia. La ricezione HTTP non certifica la consegna nella casella di posta.

I doppi tap sono bloccati durante la richiesta e dopo una conferma. Come in precedenza, un timeout dopo la ricezione sul server può rendere ambiguo un nuovo tentativo: l’ID aiuta a riconoscere eventuali duplicati ma non sostituisce la deduplicazione sul server.

## Test

La suite intercetta tutti i POST: non invia email vere.

~~~powershell
& .\.test-tools\playwright\driver\node.exe tests/verify.cjs
~~~

Oppure python tests/verify.py (wrapper compatibile). Gli strumenti locali in .test-tools e .test-browsers restano esclusi da Git. tests/results.txt contiene gli esiti; tests/screenshots/rpg-* contiene le anteprime del redesign.

Browser: Chromium e WebKit. Viewport: 320×568, iPhone SE 375×667, standard 390×844, Pro 393×852, Max 430×932, desktop 1440×900. Copertura: tappe obbligatorie, assenza di avanzamento senza decisioni, 4 tentativi IGNORA e uscita reale, campi obbligatori, passato, sei preferenze, avanti/indietro, note, viewport ridotta, errori HTTP/rete/JSON, timeout, retry, richieste pendenti, doppi invii, payload, riepilogo, refresh, sessionStorage negato e rivelazione temporizzata con/senza movimento ridotto.

## Limiti da verificare su dispositivo

WebKit su Windows non è un iPhone fisico. Picker data, tastiera iOS, Dynamic Island, safe area e barra Safari devono essere verificati sul dispositivo reale. Sono conservati input nativi, caratteri di almeno 16px, target di almeno 44px, 100dvh con fallback, safe-area-inset e scorrimento senza pulsanti fissi. La viewport ridotta verifica lo spazio per il form, non emula la tastiera iOS.

Il tentativo di test reale del redesign è stato bloccato dalla rete dell’ambiente (ERR_NETWORK_ACCESS_DENIED). Non è stata ricevuta una conferma dal servizio; la schermata è rimasta sul messaggio con RIMANDALO. Attivazione, accettazione reale e recapito vanno verificati dal browser locale con accesso alla rete.

## Quest a scelte: il viaggio è il form

INIZIA avvia una camminata di 1,2 secondi fino al bivio. Sei destinazioni riutilizzano le icone e le card: la selezione aggiorna la reazione e l’insegna sulla mappa, senza passare alla tappa successiva. PROSEGUI conduce al custode del calendario, poi all’oste. Una scelta tra Molto, Il giusto e Quale piano? mostra la reazione dell’oste, poi ENTRA NELLA TAVERNA prosegue. Il giorno usa il picker nativo esistente. Tutte e tre le scelte sono obbligatorie.

Le decisioni vivono in state.quest e alimentano direttamente riepilogo e payload JSON. Alla taverna rimangono solo riepilogo, nota facoltativa e INVIA IL MESSAGGERO. Un errore non cancella le decisioni e non riavvia l’avventura; RIMANDALO invia lo stesso stato, salvo eventuali modifiche volontarie.

Non ci sono raccolta oggetti, inventario, skip delle scelte o timeout di avanzamento. Il solo timer del percorso conclude una camminata di 1,2 secondi; viene pulito prima della decisione successiva o all’uscita. Passando in background si conclude soltanto la transizione in corso: il successivo incontro resta in attesa. Con movimento ridotto le transizioni sono immediate, ma tutte le scelte restano obbligatorie.

Le quattro camminate aggiungono al massimo 4,8 secondi complessivi. Il tempo totale dipende dalla lettura e dalle scelte dell’utente, senza attese artificiali per raggiungere una durata prestabilita.

Riutilizzati senza modifiche assets/tavern-trail.svg, assets/time-map.svg e assets/quest-landscape.svg. Il percorso scelto cambia insegna, simbolo e un piccolo dettaglio decorativo; la taverna si avvicina e si illumina all’arrivo. Nessun nuovo asset o libreria.

## Il messaggero

INVIA IL MESSAGGERO avvia subito il POST e mostra una figura originale sulla mappa. La fine della sua animazione non conferma nulla: la scena attende la risposta. Solo HTTP riuscito e ok booleano true mostrano MESSAGGIO CONSEGNATO e il finale. Gli errori riportano alla taverna con tutti i dati e RIMANDALO. Con movimento ridotto non ci sono animazioni né attesa dopo la conferma.
