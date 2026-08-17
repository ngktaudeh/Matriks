// ==UserScript==
// @name         Duplicate Checker — Line Togel
// @namespace    https://github.com/ngktaudeh/Matriks
// @version      2.2
// @description  Mendeteksi pesan spam atau duplikat dari agent secara otomatis dengan warna merah untuk LiveChat CS.
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

  const STORAGE_KEY = "lt_duplicate_checker_v2";
  const DEFAULTS = { window: 20, enabled: true, minLen: 4 };

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
    #lt-dc-badge {
      position: fixed; bottom: 24px; left: 24px; z-index: 2147483000;
      background: rgba(10,10,14,0.9); color: #fff; border: 1px solid rgba(255,0,60,0.5);
      border-radius: 14px; padding: 10px 14px; font-size: 12px;
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      box-shadow: 0 0 20px rgba(255,0,60,0.3); backdrop-filter: blur(10px);
    }
    #lt-dc-badge b { color: #ff2a5f; }
    .lt-dc-dup { background: rgba(255,0,60,0.35) !important; outline: 1px solid #ff003c !important; border-radius: 6px !important; }
  `);

  const seen = [];
  let flagged = 0;

  const badge = document.createElement("div");
  badge.id = "lt-dc-badge";
  badge.innerHTML = "📑 Duplicate Checker: <b>0</b> duplikat";
  document.body.appendChild(badge);

  const updateBadge = () => {
    badge.querySelector("b").textContent = flagged;
  };

  const markDuplicate = (node) => {
    node.classList.add("lt-dc-dup");
    flagged++;
    updateBadge();
  };

  const scan = () => {
    if (!state.enabled) return;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    while (walker.nextNode()) {
      const n = walker.currentNode;
      if (n.parentElement && !n.parentElement.closest("#lt-dc-badge")) nodes.push(n);
    }
    nodes.forEach((n) => {
      const text = (n.nodeValue || "").trim();
      if (text.length < state.minLen) return;
      const norm = text.toLowerCase().replace(/\s+/g, " ");
      if (seen.includes(norm)) {
        if (n.parentElement && !n.parentElement.classList.contains("lt-dc-dup")) {
          markDuplicate(n.parentElement);
        }
      } else {
        seen.push(norm);
        if (seen.length > state.window) seen.shift();
      }
    });
  };

  let timeout;
  const observer = new MutationObserver(() => {
    clearTimeout(timeout);
    timeout = setTimeout(scan, 600);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  scan();
})();
