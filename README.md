# A cena, insieme

Un invito digitale a cena, curato e informale. DINNER PROTOCOL rimane il nome interno del progetto. HTML, CSS e JavaScript vanilla, senza framework né dipendenze da caricare nel browser. Nessun commit, push o pubblicazione è stato effettuato durante il redesign.

## File

- `index.html`: schermate e controlli semantici, metadati e percorsi relativi.
- `style.css`: invito su carta panna, titoli serif, bordeaux e oliva, illustrazioni CSS, responsive e safe area.
- `app.js`: stato, sequenze, Mission ID, gag, validazione e invio Formspree.
- `.gitignore`: esclude gli strumenti di test locali.
- `tests/verify.py`: test ripetibili con server locale e invii simulati.
- `tests/results.txt` e `tests/screenshots/`: esiti e anteprime dei test.
- `README.md`: questa guida.

Per pubblicare servono solo **index.html, style.css e app.js**. `.test-tools/` e `.test-browsers/` sono strumenti locali di verifica: non sono dipendenze del sito e non devono essere caricati su GitHub Pages.

## Struttura

Invito → ingredienti della serata → proposta → brindisi → giorno, ora e cibo → successo. Viene mostrata una schermata alla volta. Le quattro card della serata appaiono progressivamente, poi «CONTINUIAMO» permette di proseguire senza fretta. Il pulsante NO si sposta leggermente in un'area separata da SÌ, CI STO; al quarto tap appare «No davvero», che chiude l'invito senza inviare dati.

Il Mission ID rimane in `sessionStorage` per la sessione della scheda. Dopo una ricezione confermata viene salvato solo un indicatore di invio, per impedire nuove trasmissioni dopo un ricaricamento. Nessuna data, ora, nota o preferenza è memorizzata nel browser in modo persistente. Se lo storage è disabilitato, l'app funziona in memoria, ma il ricaricamento avvia una nuova sessione.

Il Mission ID è mantenuto soltanto internamente e nel payload email. Non appare nell'invito. L'invio effettivo usa HTTPS verso Formspree. Durante la richiesta il pulsante mostra «Un secondo...». Il successo appare subito dopo la conferma del servizio, senza sequenze finte o attese aggiuntive.

## Redesign: un invito, una serata

- Rimossi dashboard, barre, log, percentuali, indicatori di stato e tutto il copy informatico. Eliminati anche il codice delle sequenze e gli stili ormai inutili.
- Nuova impaginazione da invito/menu: carta panna, bordeaux, terracotta, oliva; Georgia per i titoli e font di sistema per i testi. Nessun font esterno.
- Tavolo apparecchiato per due e bicchieri da brindisi disegnati in CSS, senza immagini da scaricare. Animazioni brevi e rispetto del movimento ridotto.
- Apertura «Ti va di andare a cena insieme?», quattro card su cibo, bere, chiacchiere e dolce; proposta semplice «Cena?».
- Gag del NO con spostamenti contenuti, quattro messaggi naturali e rifiuto reale. Accettazione immediata con brindisi, senza pause obbligatorie.
- Form «Quando sei libera?», date e time picker nativi, sei card da menu. «Italiano» sostituisce «Qualcosa di serio» anche nel valore inviato via email.
- Riepilogo con giorno della settimana, data, ora e cibo. Successo immediato dopo la conferma, senza caricamenti artificiali. Dopo un refresh rimane la conferma ma il riepilogo non è conservato, per non memorizzare le scelte.
- Endpoint, struttura del payload, richiesta HTTP, validazioni, timeout, blocchi dei doppi invii e sessione preservati. I nomi tecnici di alcuni identificatori rimangono interni e non sono visibili.

Con movimento ridotto le quattro card sono disponibili subito. L'interazione non richiede hover o animazioni.

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

L'app invia un POST JSON con `Accept: application/json`. La conferma finale appare esclusivamente dopo HTTP riuscito e JSON `ok: true`. La notifica dipende dall'azione Email attiva sul servizio; l'accettazione del form non certifica che il messaggio sia già arrivato nella casella. [Documentazione AJAX](https://help.formspree.io/articles/building-your-form/submit-forms-with-javascript-ajax).

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
6. Per verificare un errore, disconnetti la rete dopo il caricamento: i dati rimangono nel form e appare **RIPROVA**. Ricollega la rete e riprova.

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

Il redesign aggiunge verifiche sull'assenza di componenti tecnici visibili, le quattro card della serata, tutti i messaggi culinari, i quattro NO, accettazione immediata, riepilogo, valore Italiano nel payload e successo entro un secondo dalla conferma simulata. Il test mantiene pendente una richiesta per controllare che non appaia un falso successo e che i doppi invii siano bloccati. Anteprime aggiornate in `tests/screenshots/`.

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
