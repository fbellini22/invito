"use strict";

// Inserisci esclusivamente l'URL pubblico del form. Nessuna chiave privata.
const FORM_ENDPOINT = "https://formspree.io/f/mbglenaa";

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
  const state = { screen: "access", busy: false, submitting: false, sent: storage.get("dinner-sent") === missionId, refusals: 0, chapter: "food", quest: { food: "", date: "", plan: "", notes: "" }, travel: { timer: null, target: null } };
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, reducedMotion.matches ? Math.min(ms, 80) : ms));

  function show(screen) {
    if (state.screen === "configuration" && screen !== "configuration") cancelWalk();
    document.querySelectorAll(".screen").forEach((element) => { element.hidden = element.id !== screen; });
    state.screen = screen;
    document.body.dataset.scene = screen === "configuration" ? state.chapter : screen;
    document.querySelector(".app").classList.toggle("declined", screen === "cancelled");
    window.scrollTo({ top: 0, behavior: "instant" });
    $(screen).querySelector(screen === "configuration" ? ".form-chapter:not([hidden]) h1" : "h1").focus({ preventScroll: true });
  }

  $("accept").addEventListener("click", async () => {
    if (state.screen !== "access" || state.busy) return;
    state.busy = true;
    $("accept").disabled = true;
    show("reveal");
    if (!reducedMotion.matches) await wait(650);
    $("reveal-objective").hidden = false;
    if (!reducedMotion.matches) await wait(850);
    $("reveal-punchline").hidden = false;
    state.busy = false;
  });
  $("continue").addEventListener("click", () => {
    if (state.screen === "reveal" && !state.busy) show("journal");
  });

  let lastRefusal = -Infinity;
  $("refuse").addEventListener("click", () => {
    if (state.screen !== "access" || state.busy || performance.now() - lastRefusal < 300) return;
    lastRefusal = performance.now();
    const messages = ["Ah.", "Questa non era prevista.", "Neanche un’occhiata alla ricompensa?", "Ok ok, ho capito."];
    state.refusals = Math.min(state.refusals + 1, 4);
    $("refuse-message").textContent = messages[state.refusals - 1];
    $("refuse").style.left = state.refusals % 2 ? "calc(50% - 90px)" : "calc(50% - 30px)";
    if (state.refusals === 4) $("really-refuse").hidden = false;
  });
  $("really-refuse").addEventListener("click", async () => {
    if (state.screen !== "access" || state.busy) return;
    show("cancelled");
    await wait(1000);
    $("cancelled-aside").hidden = false;
  });
  function celebrate() {
    if (reducedMotion.matches) return;
    for (let index = 0; index < 16; index++) {
      const particle = document.createElement("i");
      particle.className = "confetto";
      particle.style.left = `${8 + Math.random() * 84}%`;
      particle.style.background = ["#c49b56", "#e1bc7c", "#ac8957"][index % 3];
      particle.style.animationDelay = `${Math.random() * .4}s`;
      $("confetti").append(particle);
    }
    setTimeout(() => $("confetti").replaceChildren(), 2400);
  }
  const form = $("mission-form");
  const stops = ["start", "food", "date", "plan", "arrival"];
  const plans = ["Serata tranquilla", "Cena + qualcosa dopo", "Sorprendimi"];
  const routes = {
    "Pizza": ["La via della pizza è stata scelta.", "Difficile contestare questa decisione.", "La Via della Pizza"],
    "Aperitivo": ["LA VIA DELL’APERITIVO È STATA SCELTA.", "Una quest che inizia bene.", "La Via dell’Aperitivo"],
    "Carne": ["La locanda del cacciatore è stata scelta.", "Messaggio ricevuto.", "La Locanda del Cacciatore"],
    "Italiano": ["La vecchia osteria è stata scelta.", "Si gioca in casa.", "La Vecchia Osteria"],
    "Sorprendimi": ["Il sentiero sconosciuto è stato scelto.", "Questa è molta fiducia.", "Il Sentiero Sconosciuto"],
    "Basta che si mangi": ["Qualsiasi strada è stata scelta.", "Finalmente dei requisiti chiari.", "Qualsiasi Strada"]
  };
  function today() {
    const date = new Date();
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
  }
  function validDate() { return !!state.quest.date && $("date").validity.valid && state.quest.date >= today(); }
  function validPlan() { return plans.includes(state.quest.plan); }
  function formatDate(value, year = false) {
    const [y, m, d] = value.split("-").map(Number);
    return new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long", ...(year ? { year: "numeric" } : {}) }).format(new Date(y, m - 1, d, 12));
  }
  function updateChoices() {
    const locked = state.busy || state.submitting;
    $("food-next").disabled = locked || !routes[state.quest.food];
    $("date-next").disabled = locked || !validDate();
    $("date-reaction").hidden = !validDate();
    if (validDate()) $("chosen-date").textContent = formatDate(state.quest.date);
  }
  function updateMinimum() { $("date").min = today(); updateChoices(); }
  updateMinimum();
  window.addEventListener("focus", updateMinimum);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) updateMinimum(); });
  $("date").addEventListener("focus", updateMinimum);

  function recordChoice(event) {
    const target = event.target;
    if (state.submitting || state.busy) return;
    target.removeAttribute("aria-invalid");
    $("form-error").textContent = "";
    if (target.name === "preference" && target.checked) {
      state.quest.food = target.value;
      form.querySelectorAll('[name="preference"]').forEach((radio) => radio.removeAttribute("aria-invalid"));
      const route = routes[target.value];
      $("chosen-route").textContent = route[0];
      $("food-reaction").textContent = route[1];
      $("route-reaction").hidden = false;
      $("route-marker").hidden = false;
      $("route-symbol").replaceChildren(target.nextElementSibling.querySelector("svg").cloneNode(true));
      $("route-name").textContent = route[2];
      $("journey-stage").dataset.route = target.value;
    } else if (target.name === "plan" && target.checked) {
      state.quest.plan = target.value;
      form.querySelectorAll('[name="plan"]').forEach((radio) => radio.removeAttribute("aria-invalid"));
      if (state.chapter === "plan" && validate("plan")) travelTo("arrival");
    } else if (["date", "notes"].includes(target.name)) {
      state.quest[target.name] = target.value;
    }
    updateChoices();
  }
  form.addEventListener("input", recordChoice);
  form.addEventListener("change", recordChoice);
  form.querySelectorAll('[name="plan"]').forEach((radio) => radio.addEventListener("click", recordChoice));

  function showChapter(chapter, focus = true) {
    state.chapter = chapter;
    document.querySelectorAll(".form-chapter").forEach((element) => { element.hidden = element.id !== chapter + "-chapter"; });
    document.body.dataset.scene = chapter;
    $("form-error").textContent = "";
    if (chapter !== "travel") {
      $("journey-stage").dataset.stop = chapter;
      document.querySelectorAll(".quest-route [data-stop]").forEach((point, index) => {
        const current = point.dataset.stop === chapter;
        point.classList.toggle("reached", index <= stops.indexOf(chapter));
        point.querySelector("span").textContent = index <= stops.indexOf(chapter) ? "●" : "○";
        if (current) point.setAttribute("aria-current", "step"); else point.removeAttribute("aria-current");
      });
      $("journey-stage").querySelector(".tavern-glow").hidden = chapter !== "arrival";
    }
    if (chapter === "arrival") {
      $("arrival-food").textContent = routes[state.quest.food][2];
      $("arrival-date").textContent = formatDate(state.quest.date, true);
      $("arrival-plan").textContent = state.quest.plan;
    }
    updateChoices();
    if (focus) {
      window.scrollTo({ top: 0, behavior: "instant" });
      $(chapter + "-chapter").querySelector("h1").focus({ preventScroll: true });
    }
  }
  function validate(through = "arrival") {
    updateMinimum();
    let field, message, chapter;
    if (!routes[state.quest.food]) {
      field = form.querySelector('[name="preference"]'); chapter = "food";
      message = "Scegli come inizia la serata.";
    } else if (through !== "food" && !validDate()) {
      field = $("date"); chapter = "date";
      message = state.quest.date && state.quest.date < today() ? "Scegli oggi o una data futura." : "Scegli il giorno che preferisci.";
    } else if (["plan", "arrival"].includes(through) && !validPlan()) {
      field = form.querySelector('[name="plan"]'); chapter = "plan";
      message = "Scegli il tipo di serata.";
    }
    if (!field) return true;
    showChapter(chapter, false);
    $("form-error").textContent = message;
    field.setAttribute("aria-invalid", "true");
    field.focus();
    return false;
  }
  function cancelWalk() {
    clearTimeout(state.travel.timer);
    state.travel.timer = null;
    state.travel.target = null;
    state.busy = false;
    $("journey-stage").classList.remove("walking");
  }
  function finishWalk() {
    if (!state.travel.target) return;
    const target = state.travel.target;
    cancelWalk();
    if (target && state.screen === "configuration") showChapter(target);
  }
  function travelTo(chapter) {
    if (state.busy || state.submitting) return;
    state.travel.target = chapter;
    state.busy = true;
    showChapter("travel");
    $("journey-stage").classList.add("walking");
    $("journey-stage").dataset.stop = chapter;
    if (reducedMotion.matches) { finishWalk(); return; }
    // This timer ends only a short walk. No decision has an automatic deadline.
    state.travel.timer = setTimeout(finishWalk, 1200);
  }
  $("configure").addEventListener("click", () => {
    if (state.screen !== "journal" || state.busy) return;
    show("configuration");
    travelTo("food");
  });
  function advance() {
    if (state.screen !== "configuration" || state.busy || state.submitting) return;
    const next = { food: "date", date: "plan", plan: "arrival" }[state.chapter];
    if (next && validate(state.chapter)) travelTo(next);
  }
  ["food-next", "date-next"].forEach((id) => $(id).addEventListener("click", () => {
    if (state.chapter === id.split("-")[0]) advance();
  }));
  document.querySelectorAll("[data-back]").forEach((button) => button.addEventListener("click", () => {
    if (state.screen === "configuration" && !state.busy && !state.submitting && stops.indexOf(button.dataset.back) < stops.indexOf(state.chapter)) showChapter(button.dataset.back);
  }));
  // Resolve only the in-between walk on backgrounding; the next choice still waits.
  window.addEventListener("pagehide", finishWalk);
  document.addEventListener("visibilitychange", () => { if (document.hidden && state.travel.target) finishWalk(); });
  reducedMotion.addEventListener("change", () => { if (reducedMotion.matches && state.travel.target) finishWalk(); });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (state.submitting || state.sent || state.busy || state.screen !== "configuration") return;
    if (state.chapter !== "arrival") { advance(); return; }
    if (!validate()) return;
    state.submitting = true;
    $("submit").disabled = true;
    $("submit").textContent = "Un secondo...";
    $("send-error").hidden = true;
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    const payload = {
      "Mission ID": missionId,
      "Data proposta": state.quest.date.split("-").reverse().join("/"),
      "Preferenza": state.quest.food,
      "Tipo di serata": state.quest.plan,
      "Note": state.quest.notes.trim() || "Nessuna comunicazione aggiuntiva"
    };
    const controls = [...form.querySelectorAll("input, textarea, button")];
    controls.forEach((control) => { control.disabled = true; });
    const controller = new AbortController();
    let timeout;
    try {
      timeout = setTimeout(() => controller.abort(), 20000);
      const response = await fetch(FORM_ENDPOINT, {
        method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload), signal: controller.signal, credentials: "omit", referrerPolicy: "strict-origin-when-cross-origin"
      });
      if (!response.ok) throw new Error("service");
      const confirmation = await response.json();
      if (!confirmation || confirmation.ok !== true) throw new Error("service");
      state.sent = true;
      storage.set("dinner-sent", missionId);
    } catch {
      $("send-error").hidden = false;
      $("send-detail").textContent = "La proposta non è partita. Le tue scelte sono ancora al sicuro.";
      $("submit").textContent = "RIPROVA";
      $("submit").disabled = false;
      controls.forEach((control) => { control.disabled = false; });
      state.submitting = false;
      $("send-error").scrollIntoView({ block: "nearest", behavior: "auto" });
      return;
    } finally { clearTimeout(timeout); }
    const [day, month, year] = payload["Data proposta"].split("/").map(Number);
    $("summary-date").textContent = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(year, month - 1, day, 12));
    $("summary-plan").textContent = payload["Tipo di serata"];
    $("summary-food").textContent = routes[payload["Preferenza"]][2];
    $("summary").hidden = false;
    show("success");
    celebrate();
    state.submitting = false;
  });
  if (state.sent) show("success");
})();
