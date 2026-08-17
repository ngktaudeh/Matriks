// ==UserScript==
// @name         Highlighter Pro — Line Togel
// @namespace    https://github.com/ngktaudeh/Matriks
// @version      2.2
// @description  Dashboard melayang, mewarnai keyword penting (Depo/WD), Auto-Response template, Export/Import backup, dan anti-reset storage untuk LiveChat CS.
// @author       Line Togel Internal Team
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_addStyle
// @run-at       document-idle
// @noframes
// ==/UserScript==

(function () {
  "use strict";

  const STORAGE_KEY = "lt_highlighter_pro_v2";
  const DEFAULTS = {
    keywords: [
      { word: "depo", color: "#00ff88" },
      { word: "deposit", color: "#00ff88" },
      { word: "wd", color: "#ffd700" },
      { word: "withdraw", color: "#ffd700" },
      { word: "bonus", color: "#00f0ff" },
      { word: "promo", color: "#ff2a5f" },
    ],
    templates: [
      "Halo kak, selamat datang di Line Togel! 🙌",
      "Deposit Anda sedang kami proses, mohon tunggu sebentar ya kak ⏳",
      "Terima kasih sudah menghubungi kami kak 💖",
    ],
    enabled: true,
  };

  const load = () => {
    try {
      const raw = GM_getValue(STORAGE_KEY, null);
      if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch (e) {}
    return { ...DEFAULTS };
  };

  const save = (data) => {
    try {
      GM_setValue(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      // fallback ke localStorage bila GM storage tidak tersedia
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  };

  const state = load();

  /* ===== CSS ===== */
  GM_addStyle(`
    #lt-hp-panel {
      position: fixed; bottom: 24px; right: 24px; z-index: 2147483000;
      width: 320px; max-height: 520px; overflow: hidden;
      background: rgba(10,10,14,0.92); color: #fff;
      border: 1px solid rgba(255,42,95,0.45); border-radius: 18px;
      box-shadow: 0 0 30px rgba(255,42,95,0.35);
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      backdrop-filter: blur(14px);
    }
    #lt-hp-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 14px; cursor: move;
      border-bottom: 1px solid rgba(255,42,95,0.3);
      background: linear-gradient(135deg, rgba(255,42,95,0.25), rgba(255,0,60,0.35));
    }
    #lt-hp-header b { font-size: 14px; letter-spacing: 0.5px; }
    #lt-hp-body { padding: 12px 14px; overflow-y: auto; max-height: 420px; }
    .lt-hp-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .lt-hp-row input[type=text] {
      flex: 1; background: rgba(0,0,0,0.4); color: #fff; border: 1px solid rgba(255,255,255,0.15);
      border-radius: 8px; padding: 6px 8px; font-size: 12px; outline: none;
    }
    .lt-hp-row input[type=color] { width: 30px; height: 26px; border: none; background: none; cursor: pointer; }
    .lt-hp-tpl { display: block; width: 100%; text-align: left; background: rgba(255,255,255,0.06);
      color: #fff; border: 1px solid rgba(255,255,255,0.12); border-radius: 8px;
      padding: 8px 10px; margin-bottom: 6px; font-size: 12px; cursor: pointer; }
    .lt-hp-tpl:hover { background: rgba(255,42,95,0.2); border-color: #ff2a5f; }
    .lt-hp-btn { display: inline-block; background: linear-gradient(135deg,#ff2a5f,#ff003c); color: #fff;
      border: none; border-radius: 8px; padding: 7px 10px; font-size: 12px; font-weight: 700; cursor: pointer; }
    .lt-hp-btn.ghost { background: rgba(255,255,255,0.1); }
    .lt-hp-sec { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #ff7a9e;
      margin: 12px 0 6px; font-weight: 800; }
    .lt-hp-mark { padding: 0 3px; border-radius: 4px; }
    #lt-hp-rocket { position: fixed; bottom: 24px; right: 360px; z-index: 2147483000;
      width: 42px; height: 42px; border-radius: 50%; border: 1px solid #ffd700;
      background: rgba(0,0,0,0.6); color: #ffd700; font-size: 20px; cursor: pointer;
      display: none; align-items: center; justify-content: center; }
  `);

  /* ===== Panel DOM ===== */
  const panel = document.createElement("div");
  panel.id = "lt-hp-panel";
  panel.innerHTML = `
    <div id="lt-hp-header"><b>🎨 Highlighter Pro</b><button id="lt-hp-toggle" class="lt-hp-btn ghost" style="padding:4px 8px;">${state.enabled ? "ON" : "OFF"}</button></div>
    <div id="lt-hp-body">
      <div class="lt-hp-sec">Keyword Highlight</div>
      <div id="lt-hp-kw"></div>
      <div class="lt-hp-row">
        <input type="text" id="lt-hp-newkw" placeholder="Keyword baru…">
        <input type="color" id="lt-hp-newcolor" value="#00ff88">
        <button id="lt-hp-addkw" class="lt-hp-btn">+</button>
      </div>
      <div class="lt-hp-sec">Auto-Response Template</div>
      <div id="lt-hp-tpls"></div>
      <div class="lt-hp-row">
        <input type="text" id="lt-hp-newtpl" placeholder="Template baru…">
        <button id="lt-hp-addtpl" class="lt-hp-btn">+</button>
      </div>
      <div class="lt-hp-sec">Backup Data</div>
      <div class="lt-hp-row">
        <button id="lt-hp-export" class="lt-hp-btn ghost">EXPORT</button>
        <button id="lt-hp-import" class="lt-hp-btn ghost">IMPORT</button>
        <input type="file" id="lt-hp-file" accept=".json" style="display:none;">
      </div>
    </div>
  `;
  document.body.appendChild(panel);

  const rocket = document.createElement("button");
  rocket.id = "lt-hp-rocket";
  rocket.innerHTML = "🚀";
  rocket.title = "Kembali ke atas";
  rocket.onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });
  document.body.appendChild(rocket);

  const kwBox = panel.querySelector("#lt-hp-kw");
  const tplBox = panel.querySelector("#lt-hp-tpls");

  const render = () => {
    kwBox.innerHTML = state.keywords
      .map(
        (k, i) => `
        <div class="lt-hp-row">
          <input type="color" value="${k.color}" data-i="${i}" data-f="color">
          <input type="text" value="${k.word.replace(/"/g, "&quot;")}" data-i="${i}" data-f="word">
          <button class="lt-hp-btn ghost" data-i="${i}" data-f="del" style="padding:4px 8px;">✕</button>
        </div>`
      )
      .join("");
    tplBox.innerHTML = state.templates
      .map(
        (t, i) =>
          `<button class="lt-hp-tpl" data-i="${i}" data-f="tpl">${t.replace(/</g, "&lt;")}</button>`
      )
      .join("");
  };
  render();

  const persist = () => {
    save(state);
    render();
    if (state.enabled) highlight();
  };

  /* ===== Event: edit keyword/template ===== */
  panel.addEventListener("change", (e) => {
    const el = e.target;
    const f = el.dataset.f;
    const i = parseInt(el.dataset.i, 10);
    if (f === "color") state.keywords[i].color = el.value;
    if (f === "word") state.keywords[i].word = el.value;
    persist();
  });

  panel.addEventListener("click", (e) => {
    const el = e.target;
    const f = el.dataset.f;
    const i = parseInt(el.dataset.i, 10);
    if (f === "del") state.keywords.splice(i, 1);
    if (f === "tpl") {
      const text = state.templates[i];
      navigator.clipboard.writeText(text);
      insertAtFocused(text);
    }
    if (el.id === "lt-hp-toggle") {
      state.enabled = !state.enabled;
      el.textContent = state.enabled ? "ON" : "OFF";
      persist();
    }
    if (el.id === "lt-hp-addkw") {
      const v = panel.querySelector("#lt-hp-newkw").value.trim();
      const c = panel.querySelector("#lt-hp-newcolor").value;
      if (v) state.keywords.push({ word: v, color: c });
      panel.querySelector("#lt-hp-newkw").value = "";
    }
    if (el.id === "lt-hp-addtpl") {
      const v = panel.querySelector("#lt-hp-newtpl").value.trim();
      if (v) state.templates.push(v);
      panel.querySelector("#lt-hp-newtpl").value = "";
    }
    if (el.id === "lt-hp-export") {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "lt-highlighter-pro-backup.json";
      a.click();
    }
    if (el.id === "lt-hp-import") panel.querySelector("#lt-hp-file").click();
    persist();
  });

  panel.querySelector("#lt-hp-file").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        Object.assign(state, DEFAULTS, data);
        persist();
      } catch (err) {}
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  /* ===== Insert ke input yang sedang fokus ===== */
  const insertAtFocused = (text) => {
    const el = document.activeElement;
    if (el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT")) {
      const start = el.selectionStart ?? el.value.length;
      el.value = el.value.slice(0, start) + text + el.value.slice(el.selectionEnd ?? start);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
  };

  /* ===== Keyword highlighting di pesan chat ===== */
  const highlight = () => {
    if (!state.enabled) return;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    while (walker.nextNode()) {
      const n = walker.currentNode;
      if (n.parentElement && !n.parentElement.closest("#lt-hp-panel")) nodes.push(n);
    }
    nodes.forEach((n) => {
      const text = n.nodeValue;
      if (!text) return;
      let changed = false;
      let html = text;
      state.keywords.forEach((k) => {
        if (!k.word) return;
        const re = new RegExp(`(${k.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
        if (re.test(html)) {
          changed = true;
          html = html.replace(
            re,
            `<mark class="lt-hp-mark" style="background:${k.color}33;color:${k.color};font-weight:700;">$1</mark>`
          );
        }
      });
      if (changed) {
        const span = document.createElement("span");
        span.innerHTML = html;
        n.parentElement.replaceChild(span, n);
      }
    });
  };

  /* ===== Drag panel ===== */
  let drag = null;
  panel.querySelector("#lt-hp-header").addEventListener("mousedown", (e) => {
    drag = { x: e.clientX - panel.offsetLeft, y: e.clientY - panel.offsetTop };
  });
  document.addEventListener("mousemove", (e) => {
    if (!drag) return;
    panel.style.left = e.clientX - drag.x + "px";
    panel.style.top = e.clientY - drag.y + "px";
    panel.style.right = "auto";
    panel.style.bottom = "auto";
  });
  document.addEventListener("mouseup", () => (drag = null));

  /* ===== Observer untuk chat yang muncul dinamis ===== */
  let timeout;
  const observer = new MutationObserver(() => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      highlight();
      rocket.style.display = window.scrollY > 400 ? "flex" : "none";
    }, 400);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  window.addEventListener("scroll", () => {
    rocket.style.display = window.scrollY > 400 ? "flex" : "none";
  });

  highlight();
})();
