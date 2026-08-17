// ==UserScript==
// @name         UI & SLA Tracker — Line Togel
// @namespace    https://github.com/ngktaudeh/Matriks
// @version      2.2
// @description  Indikator SLA sidebar, notifikasi toast, dan Tracker Pengecekan (2/4 menit) otomatis untuk LiveChat CS.
// @author       Line Togel Internal Team
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @run-at       document-idle
// @noframes
// ==/UserScript==

(function () {
  "use strict";

  const STORAGE_KEY = "lt_sla_tracker_v2";
  const DEFAULTS = { notify2: true, notify3: true, enabled: true };

  const load = () => {
    try {
      const raw = GM_getValue(STORAGE_KEY, null);
      if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch (e) {}
    return { ...DEFAULTS };
  };
  const save = (d) => {
    try { GM_setValue(STORAGE_KEY, JSON.stringify(d)); }
    catch (e) { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); }
  };
  const state = load();

  GM_addStyle(`
    #lt-sla-panel {
      position: fixed; top: 16px; right: 16px; z-index: 2147483000;
      background: rgba(10,10,14,0.92); color: #fff; border: 1px solid rgba(255,215,0,0.45);
      border-radius: 14px; padding: 12px 14px; font-size: 12px;
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      box-shadow: 0 0 25px rgba(255,215,0,0.3); backdrop-filter: blur(12px);
    }
    #lt-sla-panel h4 { margin: 0 0 8px; font-size: 13px; letter-spacing: 0.5px; }
    .lt-sla-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .lt-sla-row label { cursor: pointer; user-select: none; }
    #lt-sla-toast {
      position: fixed; top: 16px; left: 50%; transform: translateX(-50%); z-index: 2147483001;
      background: linear-gradient(135deg,#ff2a5f,#ff003c); color: #fff; border-radius: 12px;
      padding: 12px 20px; font-size: 13px; font-weight: 700;
      box-shadow: 0 0 25px rgba(255,42,95,0.5); display: none;
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    }
  `);

  const panel = document.createElement("div");
  panel.id = "lt-sla-panel";
  panel.innerHTML = `
    <h4>⏱️ UI & SLA Tracker</h4>
    <div class="lt-sla-row"><label><input type="checkbox" id="lt-sla-2" ${state.notify2 ? "checked" : ""}> Notifikasi 2 menit</label></div>
    <div class="lt-sla-row"><label><input type="checkbox" id="lt-sla-3" ${state.notify3 ? "checked" : ""}> Notifikasi 3 menit</label></div>
    <div class="lt-sla-row"><label><input type="checkbox" id="lt-sla-enable" ${state.enabled ? "checked" : ""}> Aktif</label></div>
  `;
  document.body.appendChild(panel);

  const toast = document.createElement("div");
  toast.id = "lt-sla-toast";
  document.body.appendChild(toast);

  const showToast = (msg) => {
    toast.textContent = msg;
    toast.style.display = "block";
    setTimeout(() => (toast.style.display = "none"), 4000);
  };

  panel.addEventListener("change", (e) => {
    if (e.target.id === "lt-sla-2") state.notify2 = e.target.checked;
    if (e.target.id === "lt-sla-3") state.notify3 = e.target.checked;
    if (e.target.id === "lt-sla-enable") state.enabled = e.target.checked;
    save(state);
  });

  const started = Date.now();
  let warned2 = false;
  let warned3 = false;

  const tick = () => {
    if (!state.enabled) return;
    const elapsed = (Date.now() - started) / 60000;
    if (elapsed >= 3 && !warned3 && state.notify3) {
      warned3 = true;
      showToast("⚠️ Sudah 3 menit — cek antrian livechat Anda!");
    } else if (elapsed >= 2 && !warned2 && state.notify2) {
      warned2 = true;
      showToast("⏱️ Sudah 2 menit — perhatikan SLA chat!");
    }
  };

  setInterval(tick, 1000);
  tick();
})();
