"use strict";

// Public form endpoint. No private keys.
const FORM_ENDPOINT = "https://formspree.io/f/mbglenaa";

(() => {
  const $ = (id) => document.getElementById(id);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const storage = {
    get(key) { try { return sessionStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { sessionStorage.setItem(key, value); } catch { /* In-memory state remains available. */ } }
  };
  let missionId = storage.get("ikea-mission");
  if (!/^IKEA-\d{4}$/.test(missionId || "")) {
    missionId = "IKEA-" + Math.floor(1000 + Math.random() * 9000);
    storage.set("ikea-mission", missionId);
  }
  const state = {
    screen: "access", chapter: "strategy", busy: false, submitting: false,
    sent: storage.get("ikea-sent") === missionId, refusals: 0,
    mission: { strategy: "", date: "", foodStop: "", forbiddenPurchase: "", notes: "" },
    travel: { timer: null, target: null }
  };
  const form = $("mission-form");
  const stops = ["strategy", "date", "foodStop", "forbiddenPurchase", "arrival"];
  const reactions = {
    strategy: {
      "Giro completo": "Errore da principianti.",
      "Operazione mirata": "Un piano ambizioso.",
      "Prima si mangia": "Finalmente una strategia."
    },
    foodStop: {
      "Ovviamente": "Risposta registrata.",
      "Vediamo": "Il piano resta flessibile.",
      "Dritti all'obiettivo": "Risposta registrata, ma poco credibile."
    },
    forbiddenPurchase: {
      "Una lampada": "Il reparto lampade è inevitabile.",
      "Una pianta": "Questa volta no. È scritto.",
      "Altre candele": "Il divieto è stato messo per iscritto.",
      "Non facciamo promesse": "Finalmente una risposta realistica."
    }
  };
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const validChoice = (name) => Object.prototype.hasOwnProperty.call(reactions[name], state.mission[name]);
  function today() {
    const date = new Date();
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
  }
  function validDate() {
    return !!state.mission.date && $("date").validity.valid && state.mission.date >= today();
  }
  function formatDate(value) {
    const [year, month, day] = value.split("-").map(Number);
    return new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long" }).format(new Date(year, month - 1, day, 12));
  }
  function show(screen) {
    if (state.screen === "configuration" && screen !== "configuration") cancelWalk();
    document.querySelectorAll(".screen").forEach((element) => { element.hidden = element.id !== screen; });
    state.screen = screen;
    document.body.dataset.scene = screen === "configuration" ? state.chapter : screen;
    window.scrollTo({ top: 0, behavior: "instant" });
    $(screen).querySelector(screen === "configuration" ? ".form-chapter:not([hidden]) h1" : "h1").focus({ preventScroll: true });
  }
  function updateChoices() {
    form.querySelectorAll("input, textarea, button").forEach((control) => { control.disabled = state.busy || state.submitting; });
    $("date-reaction").hidden = !validDate();
    if (validDate()) {
      $("chosen-date").textContent = formatDate(state.mission.date);
      const [year, month, day] = state.mission.date.split("-").map(Number);
      $("date-joke").textContent = new Date(year, month - 1, day, 12).getDay() === 6 ? "Sabato. Una scelta coraggiosa." : "Il calendario ha approvato.";
    }
  }
  function updateMinimum() { $("date").min = today(); updateChoices(); }
  updateMinimum();
  window.addEventListener("focus", updateMinimum);
  $("date").addEventListener("focus", updateMinimum);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) updateMinimum(); });

  $("accept").addEventListener("click", () => {
    if (state.screen !== "access" || state.busy) return;
    $("accept").disabled = true;
    show("configuration");
    travelTo("strategy");
  });
  let lastRefusal = -Infinity;
  $("refuse").addEventListener("click", () => {
    if (state.screen !== "access" || state.busy || performance.now() - lastRefusal < 300) return;
    lastRefusal = performance.now();
    const messages = ["Sei sicura?", "Neanche per le polpette?", "Posso aggiungere una sosta al reparto lampade."];
    state.refusals = Math.min(state.refusals + 1, messages.length);
    $("refuse-message").textContent = messages[state.refusals - 1];
    if (state.refusals === messages.length) $("really-refuse").hidden = false;
  });
  $("really-refuse").addEventListener("click", () => {
    if (state.screen === "access" && !state.busy) show("cancelled");
  });

  function renderReceipt(prefix) {
    ["strategy", "foodStop", "forbiddenPurchase"].forEach((name) => { $(prefix + "-" + name).textContent = state.mission[name]; });
    $(prefix + "-date").textContent = formatDate(state.mission.date);
  }
  function showChapter(chapter, focus = true) {
    state.chapter = chapter;
    document.querySelectorAll(".form-chapter").forEach((element) => { element.hidden = element.id !== chapter + "-chapter"; });
    document.body.dataset.scene = chapter;
    $("form-error").textContent = "";
    if (chapter !== "travel") {
      $("journey-stage").dataset.stop = chapter;
      const index = stops.indexOf(chapter);
      $("stage-count").textContent = String(index + 1).padStart(2, "0") + " / 05";
      document.querySelectorAll(".route [data-stop]").forEach((point, i) => {
        point.classList.toggle("reached", i <= index);
        if (point.dataset.stop === chapter) point.setAttribute("aria-current", "step"); else point.removeAttribute("aria-current");
      });
    }
    if (chapter === "arrival") renderReceipt("arrival");
    updateChoices();
    if (focus) {
      window.scrollTo({ top: 0, behavior: "instant" });
      $(chapter + "-chapter").querySelector("h1").focus({ preventScroll: true });
    }
  }
  function validate(through = "arrival") {
    updateMinimum();
    const limit = stops.indexOf(through);
    for (let index = 0; index < Math.min(limit + 1, 4); index++) {
      const name = stops[index];
      if (name === "date" ? validDate() : validChoice(name)) continue;
      const field = name === "date" ? $("date") : form.querySelector('[name="' + name + '"]');
      showChapter(name, false);
      $("form-error").textContent = name === "date" ? "Scegli oggi o una data futura." : "Scegli una risposta per la missione.";
      field.setAttribute("aria-invalid", "true");
      field.focus();
      return false;
    }
    return true;
  }
  function recordChoice(event) {
    const target = event.target;
    if (state.screen !== "configuration" || state.submitting || state.busy) return;
    const name = target.name;
    if (name === "notes") { state.mission.notes = target.value; return; }
    if (name !== state.chapter) return;
    target.removeAttribute("aria-invalid");
    $("form-error").textContent = "";
    if (name === "date") {
      state.mission.date = target.value;
    } else if (reactions[name] && target.checked && Object.prototype.hasOwnProperty.call(reactions[name], target.value)) {
      state.mission[name] = target.value;
      form.querySelectorAll('[name="' + name + '"]').forEach((radio) => radio.removeAttribute("aria-invalid"));
      $(name + "-reaction").textContent = reactions[name][target.value];
      $(name + "-reaction").hidden = false;
    } else return;
    updateChoices();
    if (name !== "date" || validDate()) advance();
  }
  form.addEventListener("input", recordChoice);
  form.addEventListener("change", recordChoice);
  form.querySelectorAll('input[type="radio"]').forEach((radio) => radio.addEventListener("click", recordChoice));

  // One timer is shared by the reading pause and the walk; idle questions never time out.
  function cancelWalk() {
    clearTimeout(state.travel.timer);
    state.travel.timer = null;
    state.travel.target = null;
    state.busy = false;
    $("journey-stage").classList.remove("walking");
  }
  function finishWalk() {
    const target = state.travel.target;
    if (!target) return;
    cancelWalk();
    if (state.screen === "configuration") showChapter(target);
  }
  function travelTo(chapter) {
    if (state.busy || state.submitting) return;
    state.travel.target = chapter;
    state.busy = true;
    showChapter("travel");
    $("journey-stage").classList.add("walking");
    $("journey-stage").dataset.stop = chapter;
    if (reducedMotion.matches) { finishWalk(); return; }
    state.travel.timer = setTimeout(finishWalk, 1200);
  }
  function finishReaction() {
    const target = state.travel.target;
    cancelWalk();
    if (target && state.screen === "configuration") {
      if (!validate(state.chapter)) return;
      travelTo(target);
    }
  }
  function advance() {
    if (state.screen !== "configuration" || state.busy || state.submitting || state.chapter === "arrival") return;
    const next = stops[stops.indexOf(state.chapter) + 1];
    if (!next || !validate(state.chapter)) return;
    state.busy = true;
    state.travel.target = next;
    updateChoices();
    state.travel.timer = setTimeout(finishReaction, reducedMotion.matches ? 900 : 1100);
  }
  document.querySelectorAll("[data-back]").forEach((button) => button.addEventListener("click", () => {
    if (state.screen === "configuration" && !state.busy && !state.submitting) showChapter(button.dataset.back);
  }));
  window.addEventListener("pagehide", finishWalk);
  document.addEventListener("visibilitychange", () => { if (document.hidden && state.travel.target) finishWalk(); });
  reducedMotion.addEventListener("change", () => { if (reducedMotion.matches && state.chapter === "travel" && state.travel.target) finishWalk(); });

  function renderSuccess() {
    if (state.mission.date && state.mission.forbiddenPurchase) {
      renderReceipt("summary");
      $("summary").hidden = false;
      $("final-joke").textContent = state.mission.forbiddenPurchase === "Non facciamo promesse" ? "Limitare i danni." : "Uscire senza comprare " + state.mission.forbiddenPurchase.toLowerCase() + ".";
    }
  }
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (state.submitting || state.sent || state.busy || state.screen !== "configuration") return;
    if (state.chapter !== "arrival") { advance(); return; }
    if (!validate()) return;
    state.submitting = true;
    $("submit").textContent = "INVIA IL PIANO";
    $("send-error").hidden = true;
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    const payload = {
      "Mission ID": missionId,
      "Missione": "Operazione IKEA",
      "Data": state.mission.date.split("-").reverse().join("/"),
      "Strategia": state.mission.strategy,
      "Sosta cibo": state.mission.foodStop,
      "Acquisto vietato": state.mission.forbiddenPurchase,
      "Note": state.mission.notes.trim() || "Nessuna comunicazione aggiuntiva"
    };
    updateChoices();
    $("shipping").classList.remove("delivered");
    $("shipping-delivered").hidden = true;
    show("shipping");
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
      storage.set("ikea-receipt", JSON.stringify({ missionId, ...state.mission, notes: "" }));
      storage.set("ikea-sent", missionId);
    } catch {
      state.submitting = false;
      show("configuration");
      $("send-error").hidden = false;
      $("submit").textContent = "RIPROVA LA SPEDIZIONE";
      updateChoices();
      $("send-error").scrollIntoView({ block: "nearest", behavior: "auto" });
      return;
    } finally { clearTimeout(timeout); }
    renderSuccess();
    $("shipping").classList.add("delivered");
    $("shipping-delivered").hidden = false;
    if (!reducedMotion.matches) await wait(900);
    show("success");
    state.submitting = false;
  });
  if (state.sent) {
    try {
      const receipt = JSON.parse(storage.get("ikea-receipt"));
      if (receipt && receipt.missionId === missionId && /^\d{4}-\d{2}-\d{2}$/.test(receipt.date) && ["strategy", "foodStop", "forbiddenPurchase"].every((name) => Object.prototype.hasOwnProperty.call(reactions[name], receipt[name]))) {
        state.mission = { strategy: receipt.strategy, date: receipt.date, foodStop: receipt.foodStop, forbiddenPurchase: receipt.forbiddenPurchase, notes: "" };
        renderSuccess();
      }
    } catch { /* The confirmation remains valid even when its receipt is unavailable. */ }
    show("success");
  }
})();
