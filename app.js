"use strict";

// Inserisci esclusivamente l'URL pubblico del form. Nessuna chiave privata.
const FORM_ENDPOINT = "INSERIRE_ENDPOINT_QUI";

(() => {
  const $ = (id) => document.getElementById(id);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const storage = {
    get(key) { try { return sessionStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { sessionStorage.setItem(key, value); } catch { /* In-memory fallback. */ } }
  };
  let missionId = storage.get("dinner-mission");
  if (!/^DIN-\d{4}$/.test(missionId || "")) {
    missionId = `DIN-${Math.floor(1000 + Math.random() * 9000)}`;
    storage.set("dinner-mission", missionId);
  }
  const state = { screen: "access", busy: false, submitting: false, sent: storage.get("dinner-sent") === missionId, refusals: 0 };
  $("mission-id").textContent = `MISSION ID: ${missionId}`;
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, reducedMotion.matches ? Math.min(ms, 80) : ms));
  const steps = { access: 0, analysis: 1, briefing: 2, accepted: 2, configuration: 3, transmission: 3, success: 3, cancelled: 2 };

  function show(screen) {
    document.querySelectorAll(".screen").forEach((element) => { element.hidden = element.id !== screen; });
    state.screen = screen;
    document.querySelectorAll(".steps > span").forEach((element, index) => {
      element.classList.toggle("current", index === steps[screen]);
      element.classList.toggle("done", index < steps[screen]);
      if (index === steps[screen]) element.setAttribute("aria-current", "step");
      else element.removeAttribute("aria-current");
    });
    window.scrollTo({ top: 0, behavior: "instant" });
    $(screen).querySelector("h1").focus({ preventScroll: true });
  }

  async function sequence(prefix, lines, asides = []) {
    const log = $(`${prefix}-log`);
    log.replaceChildren();
    for (let index = 0; index < lines.length; index++) {
      // Optional presentation metadata; submission and application state stay separate.
      const step = typeof lines[index] === "string" ? { text: lines[index] } : lines[index];
      const item = document.createElement("li");
      item.className = "pending";
      const label = document.createElement("span");
      label.textContent = step.text;
      const status = document.createElement("span");
      status.textContent = "···";
      status.setAttribute("aria-label", "In corso");
      item.append(label, status);
      log.append(item);
      log.scrollTop = log.scrollHeight;
      if (asides.length) $("analysis-aside").textContent = asides[index % asides.length];
      await wait(step.delay || 360 + Math.random() * 260);
      status.textContent = step.result || "✓";
      status.setAttribute("aria-label", step.result || "Completata");
      item.className = "complete";
      if (step.detail) {
        const detail = document.createElement("small");
        detail.textContent = step.detail;
        label.append(detail);
      }
      log.scrollTop = log.scrollHeight;
      const value = Math.round(((index + 1) / lines.length) * 100);
      $(`${prefix}-progress`).value = value;
      $(`${prefix}-percent`).textContent = `${value}%`;
    }
  }

  $("start").addEventListener("click", async () => {
    if (state.busy || state.screen !== "access") return;
    state.busy = true;
    $("start").disabled = true;
    show("analysis");
    await sequence("analysis", [
      "Inizializzazione algoritmo cena...",
      "Calcolo livello fame...",
      "Analisi compatibilità culinaria...",
      { text: 'Stima probabilità "per me è uguale"...', delay: 1100, result: "87%" },
      { text: "Controllo secondo stomaco per il dolce...", result: "DISPONIBILE ✓" },
      { text: 'Simulazione discussione "dove andiamo?"...', result: "ATTENZIONE", detail: "Possibile durata stimata: 47 minuti.", delay: 750 },
      "Ottimizzazione decisionale...",
      "Consultazione algoritmo estremamente sofisticato..."
    ], ["PROBABILITÀ DESSERT: 94.3%", 'RISCHIO "NON SO COSA PRENDERE": MEDIO-ALTO', "INDICE FAME: 8.7/10", "COMPATIBILITÀ PIZZA: ECCELLENTE", "AFFIDABILITÀ DI QUESTI DATI: DISCUTIBILE"]);
    $("analysis-result").hidden = false;
    $("analysis-aside").textContent = "Analisi completata con un margine di errore scientificamente discutibile.";
    $("analysis-result").scrollIntoView({ block: "nearest", behavior: "auto" });
    await wait(2500);
    show("briefing");
    state.busy = false;
  });

  let lastRefusal = 0;
  $("refuse").addEventListener("click", () => {
    if (state.screen !== "briefing" || state.busy || performance.now() - lastRefusal < 300) return;
    lastRefusal = performance.now();
    const messages = ["Interessante.", "Il sistema non si aspettava questa risposta.", "Ricalcolo in corso...", "Abbiamo controllato il codice.\nIl pulsante funziona.\nPurtroppo."];
    state.refusals = Math.min(state.refusals + 1, 4);
    $("refuse-message").textContent = messages[state.refusals - 1];
    $("refuse").style.left = state.refusals % 2 ? "0px" : "calc(100% - 120px)";
    $("refuse").style.top = state.refusals % 2 ? "14px" : "0px";
    if (state.refusals === 3) {
      wait(650).then(() => {
        if (state.screen === "briefing" && state.refusals === 3) {
          $("refuse-message").textContent = "Strano. Il risultato continua a essere cena.";
        }
      });
    }
    if (state.refusals === 4) $("really-refuse").hidden = false;
  });
  $("really-refuse").addEventListener("click", async () => {
    if (state.screen !== "briefing" || state.busy) return;
    state.busy = true;
    show("cancelled");
    await wait(1200);
    $("cancelled-aside").hidden = false;
    state.busy = false;
  });
  function celebrate() {
    if (reducedMotion.matches) return;
    for (let index = 0; index < 20; index++) {
      const particle = document.createElement("i");
      particle.className = "confetto";
      particle.style.left = `${8 + Math.random() * 84}%`;
      particle.style.background = index % 3 ? "#c7b9ff" : "#f4bb98";
      particle.style.animationDelay = `${Math.random() * .4}s`;
      $("confetti").append(particle);
    }
    setTimeout(() => $("confetti").replaceChildren(), 2400);
  }
  $("accept").addEventListener("click", async () => {
    if (state.screen !== "briefing" || state.busy) return;
    state.busy = true;
    show("accepted");
    await wait(1300);
    $("accepted-symbol").textContent = "🎉";
    $("accepted-title").textContent = "RISPOSTA CORRETTA";
    $("accepted-comment").textContent = "Statisticamente parlando.";
    $("accepted-ready").hidden = false;
    celebrate();
    state.busy = false;
  });
  $("configure").addEventListener("click", () => { if (state.screen === "accepted" && !state.busy) show("configuration"); });

  function today() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }
  function updateMinimum() { $("date").min = today(); }
  updateMinimum();
  window.addEventListener("focus", updateMinimum);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) updateMinimum(); });
  $("date").addEventListener("focus", updateMinimum);
  const form = $("mission-form");
  const foodReactions = {
    "Pizza": "Scelta statisticamente difficile da criticare.",
    "Sushi": "Algoritmo soddisfatto.",
    "Carne": "Proteine rilevate.",
    "Qualcosa di serio": "Attivata la modalità tovagliolo di stoffa.",
    "Sorprendimi": "Pericoloso livello di fiducia nel sistema.",
    "Basta che si mangi": "Finalmente dei requisiti tecnici chiari."
  };
  form.addEventListener("change", (event) => {
    if (event.target.name === "preference") $("food-reaction").textContent = foodReactions[event.target.value];
  });
  form.addEventListener("input", (event) => {
    event.target.removeAttribute("aria-invalid");
    if (event.target.name === "preference") {
      form.querySelectorAll('[name="preference"]').forEach((radio) => radio.removeAttribute("aria-invalid"));
    }
    $("form-error").textContent = "";
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (state.submitting || state.sent || state.screen !== "configuration") return;
    updateMinimum();
    const date = $("date");
    const time = $("time");
    const preference = form.querySelector('input[name="preference"]:checked');
    let invalid = null;
    let message = "";
    if (!date.value || !date.validity.valid || date.value < today()) {
      invalid = date;
      message = date.value && date.value < today() ? "I viaggi nel tempo non sono inclusi. Seleziona oggi o una data futura." : "Manca il giorno. L’algoritmo non può indovinarlo.";
    } else if (!time.value || !time.validity.valid) {
      invalid = time;
      message = "Manca l’ora. Anche un orario approssimativo è un grande progresso.";
    } else if (!preference) {
      invalid = form.querySelector('input[name="preference"]');
      message = "Il dilemma culinario è ancora aperto. Seleziona una preferenza.";
    }
    $("form-error").textContent = message;
    if (invalid) { invalid.setAttribute("aria-invalid", "true"); invalid.focus(); return; }
    state.submitting = true;
    $("submit").disabled = true;
    $("submit").textContent = "INVIO IN CORSO...";
    $("send-error").hidden = true;
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    const payload = {
      "Mission ID": missionId,
      "Data proposta": date.value.split("-").reverse().join("/"),
      "Ora proposta": time.value,
      "Preferenza culinaria": preference.value,
      "Note": $("notes").value.trim() || "Nessuna comunicazione aggiuntiva"
    };
    const controls = [...form.querySelectorAll("input, textarea")];
    controls.forEach((control) => { control.disabled = true; });
    const controller = new AbortController();
    let timeout;
    try {
      if (!/^https:\/\/formspree\.io\/f\/[a-zA-Z0-9]+$/.test(FORM_ENDPOINT)) throw new Error("configuration");
      timeout = setTimeout(() => controller.abort(), 20000);
      const response = await fetch(FORM_ENDPOINT, {
        method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload), signal: controller.signal, credentials: "omit", referrerPolicy: "no-referrer"
      });
      if (!response.ok) throw new Error("service");
      const confirmation = await response.json();
      if (confirmation.ok !== true) throw new Error("service");
      state.sent = true;
      storage.set("dinner-sent", missionId);
    } catch (error) {
      $("send-error").hidden = false;
      $("send-detail").textContent = error.message === "configuration" ? "Invio non configurato. Filippo deve completare un ultimo, banalissimo passaggio." : "Le tue scelte sono ancora qui. Puoi riprovare l’invio.";
      $("submit").textContent = "RIPROVA INVIO";
      $("submit").disabled = false;
      controls.forEach((control) => { control.disabled = false; });
      state.submitting = false;
      $("send-error").scrollIntoView({ block: "nearest", behavior: "auto" });
      return;
    } finally { clearTimeout(timeout); }
    show("transmission");
    await sequence("transmission", [
      "Salvataggio decisioni importanti...",
      "Controllo che la data esista realmente...",
      "Verifica che l’ora sia un concetto valido...",
      "Preparazione email...",
      { text: "Tentativo di sembrare un’app professionale...", result: "FALLITO", detail: "L’invio funziona. La professionalità meno." },
      "Invio proposta..."
    ]);
    await wait(500);
    $("summary-date").textContent = payload["Data proposta"];
    $("summary-time").textContent = payload["Ora proposta"];
    $("summary-food").textContent = payload["Preferenza culinaria"];
    $("summary-food-icon").textContent = { "Pizza": "🍕", "Sushi": "🍣", "Carne": "🥩", "Qualcosa di serio": "🍝", "Sorprendimi": "🎲", "Basta che si mangi": "🍽️" }[payload["Preferenza culinaria"]];
    $("summary").hidden = false;
    showSuccess();
    celebrate();
    state.submitting = false;
  });
  async function showSuccess() {
    show("success");
    await wait(1600);
    if (state.screen === "success") $("success-aside").hidden = false;
  }
  if (state.sent) showSuccess();
})();
