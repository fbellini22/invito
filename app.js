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
  const state = { screen: "access", busy: false, submitting: false, sent: storage.get("dinner-sent") === missionId, refusals: 0, chapter: "date" };
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, reducedMotion.matches ? Math.min(ms, 80) : ms));

  function show(screen) {
    document.querySelectorAll(".screen").forEach((element) => { element.hidden = element.id !== screen; });
    state.screen = screen;
    document.body.dataset.scene = screen === "configuration" ? state.chapter : screen;
    document.querySelector(".app").classList.toggle("declined", screen === "cancelled");
    window.scrollTo({ top: 0, behavior: "instant" });
    $(screen).querySelector(screen === "configuration" ? ".form-chapter:not([hidden]) h1" : "h1").focus({ preventScroll: true });
  }

  $("start").addEventListener("click", async () => {
    if (state.busy || state.screen !== "access") return;
    state.busy = true;
    $("start").disabled = true;
    show("analysis");
    for (const card of document.querySelectorAll(".evening-card")) {
      card.hidden = false;
      if (!reducedMotion.matches) await wait(550);
    }
    $("essentials-ready").hidden = false;
    state.busy = false;
  });
  $("continue").addEventListener("click", () => {
    if (state.screen === "analysis" && !state.busy) show("briefing");
  });

  let lastRefusal = -Infinity;
  $("refuse").addEventListener("click", () => {
    if (state.screen !== "briefing" || state.busy || performance.now() - lastRefusal < 300) return;
    lastRefusal = performance.now();
    const messages = ["Ah.", "Questa non era prevista.", "Posso offrirti la possibilità di ripensarci?", "Ok ok, ho capito."];
    state.refusals = Math.min(state.refusals + 1, 4);
    $("refuse-message").textContent = messages[state.refusals - 1];
    $("refuse").style.left = state.refusals % 2 ? "calc(50% - 90px)" : "calc(50% - 30px)";
    if (state.refusals === 4) $("really-refuse").hidden = false;
  });
  $("really-refuse").addEventListener("click", async () => {
    if (state.screen !== "briefing" || state.busy) return;
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
  $("accept").addEventListener("click", () => {
    if (state.screen !== "briefing" || state.busy) return;
    show("accepted");
    celebrate();
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
    "Pizza": "Difficile sbagliare.",
    "Sushi": "Scelta rispettabile.",
    "Carne": "Messaggio ricevuto.",
    "Italiano": "Si gioca in casa.",
    "Sorprendimi": "Questa è molta fiducia.",
    "Basta che si mangi": "La risposta più concreta finora."
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

  function showChapter(chapter, focus = true) {
    state.chapter = chapter;
    document.querySelectorAll(".form-chapter").forEach((element) => { element.hidden = element.id !== chapter + "-chapter"; });
    document.body.dataset.scene = chapter;
    $("form-error").textContent = "";
    if (focus) {
      window.scrollTo({ top: 0, behavior: "instant" });
      $(chapter + "-chapter").querySelector("h1").focus({ preventScroll: true });
    }
  }

  function validate(includeFood = true) {
    updateMinimum();
    const date = $("date");
    const time = $("time");
    const preference = form.querySelector('input[name="preference"]:checked');
    let invalid = null;
    let message = "";
    if (!date.value || !date.validity.valid || date.value < today()) {
      invalid = date;
      message = date.value && date.value < today() ? "Scegli oggi o una data futura." : "Scegli il giorno che preferisci.";
    } else if (!time.value || !time.validity.valid) {
      invalid = time;
      message = "A che ora ci vediamo? Scegli un orario.";
    } else if (includeFood && !preference) {
      invalid = form.querySelector('input[name="preference"]');
      message = "Scegli cosa ti andrebbe di mangiare.";
    }
    if (invalid) {
      showChapter(invalid === date || invalid === time ? "date" : "food", false);
      $("form-error").textContent = message;
      invalid.setAttribute("aria-invalid", "true");
      invalid.focus();
      return false;
    }
    $("form-error").textContent = "";
    return true;
  }

  $("date-next").addEventListener("click", () => {
    if (state.screen === "configuration" && !state.submitting && state.chapter === "date" && validate(false)) showChapter("food");
  });
  $("food-next").addEventListener("click", () => {
    if (state.screen === "configuration" && !state.submitting && state.chapter === "food" && validate()) showChapter("notes");
  });
  document.querySelectorAll("[data-back]").forEach((button) => button.addEventListener("click", () => {
    if (state.screen === "configuration" && !state.submitting) showChapter(button.dataset.back);
  }));

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (state.submitting || state.sent || state.screen !== "configuration") return;
    if (state.chapter !== "notes") {
      if (validate(state.chapter === "food")) showChapter(state.chapter === "date" ? "food" : "notes");
      return;
    }
    if (!validate()) return;
    const date = $("date");
    const time = $("time");
    const preference = form.querySelector('input[name="preference"]:checked');
    state.submitting = true;
    $("submit").disabled = true;
    $("submit").textContent = "Un secondo...";
    $("send-error").hidden = true;
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    const payload = {
      "Mission ID": missionId,
      "Data proposta": date.value.split("-").reverse().join("/"),
      "Ora proposta": time.value,
      "Preferenza culinaria": preference.value,
      "Note": $("notes").value.trim() || "Nessuna comunicazione aggiuntiva"
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
      $("send-detail").textContent = "Non è stato possibile confermare l’invio. Per fortuna le tue scelte sono ancora qui.";
      $("submit").textContent = "RIPROVA";
      $("submit").disabled = false;
      controls.forEach((control) => { control.disabled = false; });
      state.submitting = false;
      $("send-error").scrollIntoView({ block: "nearest", behavior: "auto" });
      return;
    } finally { clearTimeout(timeout); }
    const [day, month, year] = payload["Data proposta"].split("/").map(Number);
    $("summary-date").textContent = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(year, month - 1, day, 12));
    $("summary-time").textContent = payload["Ora proposta"];
    $("summary-food").textContent = payload["Preferenza culinaria"];
    $("summary-food-icon").textContent = { "Pizza": "🍕", "Sushi": "🍣", "Carne": "🥩", "Italiano": "🍝", "Sorprendimi": "🎲", "Basta che si mangi": "🍽️" }[payload["Preferenza culinaria"]];
    $("summary").hidden = false;
    show("success");
    celebrate();
    state.submitting = false;
  });
  if (state.sent) show("success");
})();
