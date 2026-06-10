// ─── SFL Bypass — Content Script ──────────────────────────────────────────
// Inject floating button + dialog overlay ke setiap halaman.
// Hanya muncul kalau extension di-enable dari popup.

(function () {
  "use strict";

  // Jangan inject ulang kalau udah ada
  if (document.getElementById("__sfl_bypass_root")) return;

  // ── Inject styles ────────────────────────────────────────────────────────

  const style = document.createElement("style");
  style.id = "__sfl_bypass_styles";
  style.textContent = `
    #__sfl_bypass_root * {
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    /* ── Floating Button ── */
    #__sfl_fab {
      position: fixed;
      bottom: 28px;
      right: 28px;
      z-index: 2147483647;
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: linear-gradient(135deg, #7c3aed, #4f46e5);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 24px rgba(124, 58, 237, 0.5), 0 0 0 0 rgba(124, 58, 237, 0.4);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      animation: __sfl_pulse 2.5s infinite;
    }
    #__sfl_fab:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 32px rgba(124, 58, 237, 0.7), 0 0 0 0 rgba(124, 58, 237, 0);
      animation: none;
    }
    #__sfl_fab:active {
      transform: scale(0.95);
    }
    #__sfl_fab svg {
      width: 22px;
      height: 22px;
      fill: none;
      stroke: #fff;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    @keyframes __sfl_pulse {
      0%   { box-shadow: 0 4px 24px rgba(124,58,237,0.5), 0 0 0 0 rgba(124,58,237,0.4); }
      60%  { box-shadow: 0 4px 24px rgba(124,58,237,0.5), 0 0 0 10px rgba(124,58,237,0); }
      100% { box-shadow: 0 4px 24px rgba(124,58,237,0.5), 0 0 0 0 rgba(124,58,237,0); }
    }

    /* ── Backdrop ── */
    #__sfl_backdrop {
      position: fixed;
      inset: 0;
      z-index: 2147483646;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      opacity: 0;
      transition: opacity 0.2s ease;
      pointer-events: none;
    }
    #__sfl_backdrop.visible {
      opacity: 1;
      pointer-events: all;
    }

    /* ── Dialog ── */
    #__sfl_dialog {
      position: fixed;
      bottom: 92px;
      right: 28px;
      z-index: 2147483647;
      width: 340px;
      background: #0A0E27;
      border: 1px solid rgba(124, 58, 237, 0.3);
      border-radius: 16px;
      padding: 20px;
      box-shadow:
        0 24px 64px rgba(0, 0, 0, 0.7),
        0 0 0 1px rgba(255,255,255,0.04) inset,
        0 -1px 0 rgba(124,58,237,0.2) inset;
      transform: translateY(12px) scale(0.96);
      opacity: 0;
      pointer-events: none;
      transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1),
                  opacity 0.18s ease;
    }
    #__sfl_dialog.visible {
      transform: translateY(0) scale(1);
      opacity: 1;
      pointer-events: all;
    }

    /* Dialog header */
    #__sfl_dialog_header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;
    }
    #__sfl_dialog_icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: rgba(124, 58, 237, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    #__sfl_dialog_icon svg {
      width: 16px;
      height: 16px;
      fill: none;
      stroke: #a78bfa;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    #__sfl_dialog_title {
      font-size: 14px;
      font-weight: 600;
      color: #e2e8f0;
      letter-spacing: -0.01em;
    }
    #__sfl_dialog_subtitle {
      font-size: 11px;
      color: #64748b;
      margin-top: 1px;
    }

    /* Input */
    #__sfl_input {
      width: 100%;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px;
      padding: 10px 12px;
      font-size: 13px;
      color: #e2e8f0;
      outline: none;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
      margin-bottom: 10px;
    }
    #__sfl_input::placeholder {
      color: #475569;
    }
    #__sfl_input:focus {
      border-color: rgba(124, 58, 237, 0.6);
      box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.15);
    }
    #__sfl_input.error {
      border-color: rgba(239, 68, 68, 0.6);
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
    }

    /* Button */
    #__sfl_btn {
      width: 100%;
      padding: 10px 16px;
      border-radius: 10px;
      border: none;
      background: linear-gradient(135deg, #7c3aed, #4f46e5);
      color: #fff;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.15s ease, transform 0.1s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    #__sfl_btn:hover:not(:disabled) {
      opacity: 0.9;
    }
    #__sfl_btn:active:not(:disabled) {
      transform: scale(0.98);
    }
    #__sfl_btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    #__sfl_btn_spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: __sfl_spin 0.6s linear infinite;
      display: none;
    }
    @keyframes __sfl_spin {
      to { transform: rotate(360deg); }
    }

    /* Status / Result area */
    #__sfl_status {
      margin-top: 12px;
      display: none;
    }
    #__sfl_status.show { display: block; }

    #__sfl_error_msg {
      font-size: 12px;
      color: #f87171;
      padding: 8px 10px;
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 8px;
      display: none;
    }
    #__sfl_error_msg.show { display: block; }

    #__sfl_result_box {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(124,58,237,0.25);
      border-radius: 10px;
      padding: 12px;
      display: none;
    }
    #__sfl_result_box.show { display: block; }

    #__sfl_result_label {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #a78bfa;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    #__sfl_result_url {
      font-size: 12px;
      color: #94a3b8;
      word-break: break-all;
      line-height: 1.5;
      margin-bottom: 10px;
      font-family: 'SF Mono', 'Fira Code', monospace;
    }
    #__sfl_result_actions {
      display: flex;
      gap: 8px;
    }
    .sfl_action_btn {
      flex: 1;
      padding: 7px 10px;
      border-radius: 8px;
      border: none;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
    }
    #__sfl_copy_btn {
      background: rgba(255,255,255,0.06);
      color: #cbd5e1;
      border: 1px solid rgba(255,255,255,0.1);
    }
    #__sfl_copy_btn:hover { background: rgba(255,255,255,0.1); }
    #__sfl_open_btn {
      background: rgba(124,58,237,0.2);
      color: #a78bfa;
      border: 1px solid rgba(124,58,237,0.3);
    }
    #__sfl_open_btn:hover { background: rgba(124,58,237,0.3); }

    #__sfl_steps_badge {
      margin-top: 8px;
      font-size: 11px;
      color: #475569;
      text-align: right;
    }
  `;
  document.head.appendChild(style);

  // ── Build DOM ────────────────────────────────────────────────────────────

  const root = document.createElement("div");
  root.id = "__sfl_bypass_root";
  root.innerHTML = `
    <div id="__sfl_backdrop"></div>

    <button id="__sfl_fab" title="SFL Bypass">
      <svg viewBox="0 0 24 24">
        <path d="M13.5 3H12H8C6.34315 3 5 4.34315 5 6V18C5 19.6569 6.34315 21 8 21H16C17.6569 21 19 19.6569 19 18V8.625"/>
        <path d="M15 3L19 7"/>
        <path d="M19 3V7H15"/>
        <path d="M9 12L11 14L15 10"/>
      </svg>
    </button>

    <div id="__sfl_dialog">
      <div id="__sfl_dialog_header">
        <div id="__sfl_dialog_icon">
          <svg viewBox="0 0 24 24">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
        </div>
        <div>
          <div id="__sfl_dialog_title">SFL Bypass</div>
          <div id="__sfl_dialog_subtitle">Skip iklan · Langsung ke tujuan</div>
        </div>
      </div>

      <input
        id="__sfl_input"
        type="url"
        placeholder="Paste link sfl.gl di sini..."
        autocomplete="off"
        spellcheck="false"
      />

      <button id="__sfl_btn">
        <div id="__sfl_btn_spinner"></div>
        <span id="__sfl_btn_text">Bypass Sekarang</span>
      </button>

      <div id="__sfl_status">
        <div id="__sfl_error_msg"></div>
        <div id="__sfl_result_box">
          <div id="__sfl_result_label">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            URL Tujuan
          </div>
          <div id="__sfl_result_url"></div>
          <div id="__sfl_result_actions">
            <button class="sfl_action_btn" id="__sfl_copy_btn">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              Salin
            </button>
            <button class="sfl_action_btn" id="__sfl_open_btn">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              Buka
            </button>
          </div>
          <div id="__sfl_steps_badge"></div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  // ── Element refs ─────────────────────────────────────────────────────────

  const fab = document.getElementById("__sfl_fab");
  const dialog = document.getElementById("__sfl_dialog");
  const backdrop = document.getElementById("__sfl_backdrop");
  const input = document.getElementById("__sfl_input");
  const btn = document.getElementById("__sfl_btn");
  const btnSpinner = document.getElementById("__sfl_btn_spinner");
  const btnText = document.getElementById("__sfl_btn_text");
  const status = document.getElementById("__sfl_status");
  const errorMsg = document.getElementById("__sfl_error_msg");
  const resultBox = document.getElementById("__sfl_result_box");
  const resultUrl = document.getElementById("__sfl_result_url");
  const copyBtn = document.getElementById("__sfl_copy_btn");
  const openBtn = document.getElementById("__sfl_open_btn");
  const stepsBadge = document.getElementById("__sfl_steps_badge");

  // ── State ─────────────────────────────────────────────────────────────────

  let isOpen = false;
  let isLoading = false;
  let lastFinalUrl = null;

  // ── Visibility helpers ────────────────────────────────────────────────────

  function showFab() { fab.style.display = "flex"; }
  function hideFab() { fab.style.display = "none"; }

  function openDialog() {
    isOpen = true;
    dialog.classList.add("visible");
    backdrop.classList.add("visible");
    setTimeout(() => input.focus(), 80);
    resetStatus();
  }

  function closeDialog() {
    isOpen = false;
    dialog.classList.remove("visible");
    backdrop.classList.remove("visible");
  }

  function resetStatus() {
    status.classList.remove("show");
    errorMsg.classList.remove("show");
    resultBox.classList.remove("show");
    input.classList.remove("error");
    errorMsg.textContent = "";
    resultUrl.textContent = "";
    stepsBadge.textContent = "";
    lastFinalUrl = null;
  }

  function showError(msg) {
    status.classList.add("show");
    errorMsg.classList.add("show");
    resultBox.classList.remove("show");
    errorMsg.textContent = msg;
    input.classList.add("error");
  }

  function showResult(url, steps) {
    lastFinalUrl = url;
    status.classList.add("show");
    resultBox.classList.add("show");
    errorMsg.classList.remove("show");
    input.classList.remove("error");
    resultUrl.textContent = url;
    stepsBadge.textContent = `${steps} redirect dilewati`;
  }

  function setLoading(loading) {
    isLoading = loading;
    btn.disabled = loading;
    btnSpinner.style.display = loading ? "block" : "none";
    btnText.textContent = loading ? "Memproses..." : "Bypass Sekarang";
  }

  // ── Events ────────────────────────────────────────────────────────────────

  fab.addEventListener("click", () => {
    if (isOpen) closeDialog(); else openDialog();
  });

  backdrop.addEventListener("click", closeDialog);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) closeDialog();
  });

  input.addEventListener("input", () => {
    if (input.classList.contains("error")) {
      input.classList.remove("error");
      errorMsg.classList.remove("show");
    }
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !isLoading) doResolve();
  });

  btn.addEventListener("click", () => {
    if (!isLoading) doResolve();
  });

  copyBtn.addEventListener("click", async () => {
    if (!lastFinalUrl) return;
    try {
      await navigator.clipboard.writeText(lastFinalUrl);
      const orig = copyBtn.innerHTML;
      copyBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Tersalin!`;
      setTimeout(() => { copyBtn.innerHTML = orig; }, 1800);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = lastFinalUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  });

  openBtn.addEventListener("click", () => {
    if (lastFinalUrl) window.open(lastFinalUrl, "_blank");
  });

  // ── Resolver ──────────────────────────────────────────────────────────────

  function doResolve() {
    const raw = input.value.trim();
    if (!raw) {
      showError("Masukkan URL terlebih dahulu.");
      return;
    }

    let parsed;
    try {
      parsed = new URL(raw);
    } catch {
      showError("Format URL tidak valid.");
      return;
    }

    const isSfl = parsed.hostname === "sfl.gl" || parsed.hostname.endsWith(".sfl.gl");
    if (!isSfl) {
      showError("Hanya link sfl.gl yang didukung saat ini.");
      return;
    }

    setLoading(true);
    resetStatus();

    chrome.runtime.sendMessage({ type: "RESOLVE_SFL", url: raw }, (res) => {
      setLoading(false);
      if (!res) {
        showError("Tidak bisa menghubungi background script. Coba reload halaman.");
        return;
      }
      if (res.ok) {
        showResult(res.finalUrl, res.steps);
        input.value = "";
      } else {
        showError(res.error || "Gagal bypass. Coba lagi.");
      }
    });
  }

  // ── Listen for enable/disable state changes ───────────────────────────────
  // autoBypass ditangani sepenuhnya oleh background.js (tab redirect),
  // content.js hanya perlu tahu soal floating button (enabled).

  function applyState(enabled) {
    if (enabled) showFab(); else { hideFab(); closeDialog(); }
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "STATE_CHANGED" && "enabled" in msg) {
      applyState(msg.enabled);
    }
  });

  // Init — check current state
  chrome.runtime.sendMessage({ type: "GET_STATE" }, (res) => {
    applyState(res?.enabled ?? false);
  });
})();
