# Cronache di una cena

Piccola avventura narrativa originale, progettata prima per iPhone portrait. Il progetto esistente resta HTML, CSS e JavaScript senza framework, font remoti, audio o dipendenze di runtime.

## Anteprima locale

Dalla cartella del progetto:

~~~powershell
python -m http.server 8000 --bind 127.0.0.1
~~~

Apri http://127.0.0.1:8000. Il sito può essere esplorato anche aprendo index.html, ma per l’invio serve un server HTTP. Nessuna pubblicazione automatica.

## Capitoli e logica

Prologo → preparativi → quest → accettazione → data/ora → cibo → messaggio → proposta ricevuta. Il quarto rifiuto rende disponibile NO DAVVERO: conclude il percorso senza inviare nulla.

Un unico form contiene tre capitoli. Avanti valida prima data/ora, poi la preferenza. I pulsanti indietro conservano tutti i valori. Prima del POST vengono ricontrollati anche i campi nei capitoli precedenti; un errore riapre il capitolo corretto e porta il focus al campo. Invio da tastiera nei primi capitoli avanza senza spedire la proposta.

Mission ID e indicatore di conferma rimangono in sessionStorage. Le scelte non sono memorizzate in modo persistente. Dopo il successo, un refresh mostra la conferma senza ricostruire il riepilogo. Se lo storage non è disponibile, funziona il fallback in memoria. Durante l’invio sono disabilitati anche i pulsanti per tornare indietro.

## Scenografia originale

- assets/quest-landscape.svg: borgo, montagne, sole al tramonto, fiume, ponte, locanda e lanterna. Vettori originali locali, senza artwork di videogiochi.
- assets/time-map.svg: sentiero, rilievi e rosa dei venti su pergamena.
- Icone originali inline SVG per obiettivi e sei pietanze.
- Calici, scintille, bordi, carta e dissolvenze realizzati in CSS. Nessun coriandolo multicolore.

Il paesaggio è condiviso per evitare download ripetuti: una sfumatura lo fonde con il testo su mobile; su desktop resta visibile a sinistra. I capitoli cambiano il trattamento cromatico; il finale passa alla notte. I campi restano su carta chiara per la leggibilità. L’illustrazione iniziale non è lazy-loaded perché visibile subito. Non ci sono immagini raster, video, canvas o librerie grafiche.

## Invio reale

app.js usa esattamente https://formspree.io/f/mbglenaa, tramite fetch POST JSON con Content-Type e Accept application/json. Nessun redirect e nessun campo nome/email. Il payload contiene esclusivamente Mission ID, Data proposta, Ora proposta, Preferenza culinaria, Note.

Il successo richiede HTTP riuscito e JSON con ok booleano true. Errore HTTP, JSON invalido, conferma negativa, rete e timeout di 20 secondi conservano i dati, riabilitano i controlli e mostrano RIPROVA. Nessun messaggio tecnico compare nell’interfaccia. La ricezione HTTP non certifica la consegna nella casella di posta.

I doppi tap sono bloccati durante la richiesta e dopo una conferma. Come in precedenza, un timeout dopo la ricezione sul server può rendere ambiguo un nuovo tentativo: l’ID aiuta a riconoscere eventuali duplicati ma non sostituisce la deduplicazione sul server.

## Test

La suite intercetta tutti i POST: non invia email vere.

~~~powershell
& .\.test-tools\playwright\driver\node.exe tests/verify.cjs
~~~

Oppure python tests/verify.py (wrapper compatibile). Gli strumenti locali in .test-tools e .test-browsers restano esclusi da Git. tests/results.txt contiene gli esiti; tests/screenshots/rpg-* contiene le anteprime del redesign.

Browser: Chromium e WebKit. Viewport: 320×568, iPhone SE 375×667, standard 390×844, Pro 393×852, Max 430×932, desktop 1440×900. Copertura: capitoli, 4 rifiuti e uscita reale, campi obbligatori, passato, sei preferenze, avanti/indietro, note, viewport ridotta, errori HTTP/rete/JSON, timeout, retry, richieste pendenti, doppi invii, payload, riepilogo, refresh, sessionStorage negato e animazioni con/senza movimento ridotto.

## Limiti da verificare su dispositivo

WebKit su Windows non è un iPhone fisico. Picker data/ora, tastiera iOS, Dynamic Island, safe area e barra Safari devono essere verificati sul dispositivo reale. Sono conservati input nativi, caratteri di almeno 16px, target di almeno 44px, 100dvh con fallback, safe-area-inset e scorrimento senza pulsanti fissi. La viewport ridotta verifica lo spazio per il form, non emula la tastiera iOS.

Il tentativo di test reale del redesign è stato bloccato dalla rete dell’ambiente (ERR_NETWORK_ACCESS_DENIED). Non è stata ricevuta una conferma dal servizio; la schermata è rimasta sul messaggio con RIPROVA. Attivazione, accettazione reale e recapito vanno verificati dal browser locale con accesso alla rete.
