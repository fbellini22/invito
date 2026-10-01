# DINNER PROTOCOL v1.0

Web app ironica, mobile-first, senza framework né dipendenze da caricare nel browser. Tutto rimane locale fino alla configurazione e pubblicazione da parte tua. Nessun commit, push o pubblicazione è stato effettuato.

## File

- `index.html`: schermate e controlli semantici, metadati e percorsi relativi.
- `style.css`: interfaccia SaaS sperimentale, palette lavanda/albicocca, responsive, safe area e movimento ridotto.
- `app.js`: stato, sequenze, Mission ID, gag, validazione e invio Formspree.
- `.gitignore`: esclude gli strumenti di test locali.
- `tests/verify.py`: test ripetibili con server locale e invii simulati.
- `tests/results.txt` e `tests/screenshots/`: esiti e anteprime dei test.
- `README.md`: questa guida.

Per pubblicare servono solo **index.html, style.css e app.js**. `.test-tools/` e `.test-browsers/` sono strumenti locali di verifica: non sono dipendenze del sito e non devono essere caricati su GitHub Pages.

## Struttura

Inizio → analisi → proposta → accettazione → calendari → elaborazione invio → successo. Viene mostrata una schermata alla volta. Il pulsante NO si muove dentro un'area separata da CI STO; al quarto tap appare «Ok, no davvero», che registra il rifiuto senza inviare dati.

Il Mission ID rimane in `sessionStorage` per la sessione della scheda. Dopo una ricezione confermata viene salvato solo un indicatore di invio, per impedire nuove trasmissioni dopo un ricaricamento. Nessuna data, ora, nota o preferenza è memorizzata nel browser in modo persistente. Se lo storage è disabilitato, l'app funziona in memoria, ma il ricaricamento avvia una nuova sessione.

Le schermate tecniche e le percentuali sono parte della gag: un software inutilmente sofisticato per organizzare una cena. Non rappresentano analisi reali. L'invio effettivo usa HTTPS verso Formspree. La sequenza comica dell'email parte solo dopo la conferma del servizio; «Tentativo di sembrare un’app professionale: FALLITO» è una battuta, non un errore di invio.

## Redesign: tecnologia sproporzionata

- Rimosso il tono da operazione segreta da titoli, metadati, messaggi, pulsanti e footer. Conservato il Mission ID.
- Sostituito il radar con la scheda Dinner Engine: grafico decorativo di complessità e una sola cena da organizzare. Palette lavanda e albicocca, card morbide e tipografia più vicina a un'app SaaS.
- Analisi in otto passaggi: probabilità «per me è uguale» all'87%, secondo stomaco disponibile, discussione sul ristorante stimata in 47 minuti. Risultato 98.7% e margine di errore volutamente discutibile.
- Proposta con tre obiettivi e nuovo copy su durata, calorie e dress code. Quattro risposte al NO, con ricalcolo ritardato e rifiuto reale sempre disponibile dopo la gag.
- Accettazione in due tempi: pausa per mantenere un comportamento professionale, poi «RISPOSTA CORRETTA» e sincronizzazione calendari.
- Form «IL PROBLEMA DEI CALENDARI», micro-reazione per ciascuna delle sei preferenze, nuove note e pulsante «INVIA PROPOSTA».
- Sei passaggi comici dopo la ricezione confermata. Riepilogo finale di data, ora e preferenza, con icona coerente e battuta che appare dopo 1,6 secondi. Dopo un refresh resta la conferma ma il riepilogo non viene conservato, per non memorizzare le scelte.
- Identificatori delle schermate e dei campi conservati. Endpoint, richiesta HTTP, payload email, validazioni, timeout, protezioni contro invii ripetuti e gestione di sessione rimangono quelli esistenti; aggiornati soltanto i messaggi rivolti alla persona.

I nuovi ritardi rispettano il movimento ridotto. Un messaggio ritardato del NO non può sovrascrivere la quarta risposta né interferire con l'accettazione.

## Prova locale

Apri PowerShell nella cartella del progetto ed esegui:

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Apri `http://127.0.0.1:8000`. Interrompi il server con Ctrl+C. Non serve una build. Il doppio clic su `index.html` permette di esplorare l'interfaccia, ma per testare l'invio usa il server HTTP.

Per aprire il sito su un iPhone nella stessa Wi-Fi, avvia invece `python -m http.server 8000 --bind 0.0.0.0` e visita `http://INDIRIZZO-IP-LOCALE-DEL-PC:8000`. Windows potrebbe richiedere di autorizzare il server sulla rete privata. Interrompilo al termine.

## Attivare le email con Formspree

1. Crea un account su [Formspree](https://formspree.io/) e verifica il tuo indirizzo email.
2. Crea un form chiamato `DINNER PROTOCOL`.
3. Nel pannello **Workflow**, verifica l'azione **Email** e seleziona il tuo indirizzo verificato come destinatario. Il destinatario si configura nel servizio, non nel codice pubblico. [Istruzioni ufficiali](https://help.formspree.io/articles/form-and-project-settings/changing-a-form-email-address).
4. Nelle impostazioni del form disattiva reCAPTCHA per questa integrazione senza challenge e senza script di tracking di terze parti. Non configurare regole che richiedano nome o email del visitatore: quei campi non vengono raccolti. [Impostazioni reCAPTCHA](https://help.formspree.io/articles/form-and-project-settings/recaptcha-settings).
5. Copia l'endpoint pubblico, nel formato `https://formspree.io/f/IL_TUO_ID`.
6. In cima ad `app.js`, sostituisci solo il valore della costante:

```javascript
const FORM_ENDPOINT = "https://formspree.io/f/IL_TUO_ID";
```

Non inserire password, chiavi API o token privati. L'ID del form è pubblico per sua natura. Non è stato inserito alcun indirizzo email nel progetto.

L'app invia un POST JSON con `Accept: application/json`. La sequenza finale parte esclusivamente dopo HTTP riuscito e conferma JSON `ok: true`. La notifica dipende dall'azione Email attiva sul servizio; l'accettazione del form non certifica che il messaggio sia già arrivato nella casella. [Documentazione AJAX](https://help.formspree.io/articles/building-your-form/submit-forms-with-javascript-ajax).

Il payload contiene soltanto:

```text
Mission ID: DIN-8472
Data proposta: 10/10/2026
Ora proposta: 20:30
Preferenza culinaria: Pizza
Note: Nessuna comunicazione aggiuntiva
```

Il layout e l'oggetto effettivo dell'email dipendono da Formspree. Il nome del form permette di riconoscere DINNER PROTOCOL. Il sito non include analytics, font remoti o raccolta di dati sul dispositivo; il servizio riceve comunque i normali metadati tecnici di una richiesta HTTP e applica le proprie politiche di conservazione e limiti del piano.

## Testare l'invio reale

1. Configura l'endpoint e l'azione Email come sopra.
2. Apri una nuova sessione del browser, completa il percorso e invia una risposta di prova.
3. Verifica la risposta nel pannello Submissions di Formspree e l'email nella tua casella, inclusa la cartella spam.
4. Controlla che siano presenti esattamente Mission ID, data, ora, preferenza e note. Prova anche senza note.
5. Per ripetere il percorso dopo un invio riuscito, usa una nuova sessione privata oppure cancella i soli dati di sessione del sito. Il blocco dopo il successo è intenzionale.
6. Per verificare un errore, disconnetti la rete dopo il caricamento: i dati rimangono nel form e appare **RIPROVA INVIO**. Ricollega la rete e riprova.

I test automatici non inviano email vere. Senza il tuo endpoint non è possibile verificare recapito, filtri antispam o quote del servizio.

I doppi tap sono bloccati durante l'invio e dopo la conferma. In caso di timeout dopo che il server ha già ricevuto i dati, un tentativo manuale potrebbe generare un duplicato: una garanzia assoluta richiederebbe deduplicazione lato server. Il Mission ID aiuta a riconoscerlo. Il timeout è di 20 secondi.

## Test locali e limiti iOS

Per ripetere i test già predisposti:

```powershell
python tests/verify.py
```

Gli strumenti di test sono installati solo nelle cartelle escluse da Git. In una copia nuova del progetto si preparano con:

```powershell
python -m pip install --target .test-tools playwright
$env:PYTHONPATH = Join-Path (Get-Location) '.test-tools'
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Get-Location) '.test-browsers'
python -m playwright install webkit chromium
python tests/verify.py
```

Verifiche automatiche: WebKit e Chromium, 320×568, 375×667 (SE), 393×852, 430×932 e 1440×900. Percorsi relativi testati sotto una sottocartella. Controllati: schermata unica, Mission ID, tap ripetuti, quattro rifiuti, rifiuto reale senza POST, accettazione, errori di validazione, date passate, preferenza singola, scroll con viewport ridotta, endpoint assente, errore HTTP, errore di rete, conferma non valida, retry, payload, successo e blocco dopo refresh. Nessun errore JavaScript nei percorsi monitorati.

Il redesign aggiunge verifiche su tutti i messaggi culinari, risultati dell'analisi, ricalcolo al terzo NO, pausa di accettazione, tap ripetuti su CI STO, riepilogo, battuta finale e sequenza email in sei passaggi. Anteprime aggiornate in `tests/screenshots/`.

Il test su WebKit Windows **non equivale a una certificazione su Safari iOS fisico**. I controlli nativi di data/ora, tastiera, notch/Dynamic Island e barre mobili Safari devono ancora essere verificati su un iPhone reale. La riduzione dell'altezza della viewport verifica lo scroll, non simula integralmente la tastiera iOS.

L'app usa `viewport-fit=cover`, `100dvh` con fallback `100vh`, inset `env(safe-area-inset-*)`, input da almeno 16px e layout a scorrimento naturale, senza pulsanti fissi sopra la tastiera. Nessun hover necessario; animazioni disattivate con movimento ridotto. Su schermi piccoli è previsto lo scroll verticale.

Checklist su dispositivo reale prima di condividere l'invito:

- Apri il link da WhatsApp/iMessage in Safari, in verticale.
- Espandi e comprimi la barra Safari: nessun controllo deve rimanere coperto.
- Apri i picker data/ora e verifica che una data passata venga rifiutata.
- Scrivi nelle note, chiudi la tastiera e raggiungi il pulsante di invio.
- Prova le sei preferenze, quattro rifiuti e rifiuto reale.
- Prova una trasmissione reale, un errore di rete e tap ripetuti.
- Ripeti con “Riduci movimento” attivo.

## Pubblicare su GitHub Pages, quando vorrai

1. Crea un repository, per esempio `dinner-protocol`.
2. Carica nella radice solo `index.html`, `style.css` e `app.js` con l'endpoint configurato. Non caricare le cartelle degli strumenti di test.
3. Apri **Settings → Pages → Build and deployment**.
4. Seleziona **Deploy from a branch**, branch `main`, cartella `/(root)`, quindi **Save**.
5. Quando GitHub completa la pubblicazione, apri l'URL mostrato, tipicamente `https://username.github.io/dinner-protocol/`, e ripeti il test email.

Non occorrono framework, backend o processi di compilazione. [Guida ufficiale GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).
