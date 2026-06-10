// ─── SFL Bypass — Popup Script v1.1 ───────────────────────────────────────

const floatCard   = document.getElementById("floatCard");
const floatSwitch = document.getElementById("floatSwitch");
const floatDesc   = document.getElementById("floatDesc");
const autoCard    = document.getElementById("autoCard");
const autoSwitch  = document.getElementById("autoSwitch");
const autoDesc    = document.getElementById("autoDesc");
const statusRow   = document.getElementById("statusRow");
const statusDot   = document.getElementById("statusDot");
const statusText  = document.getElementById("statusText");

let state = { enabled: false, autoBypass: false };

function applyUI(s) {
  state = s;
  const { enabled, autoBypass } = s;

  // ── Float card ──
  floatSwitch.classList.toggle("on", enabled);
  floatCard.classList.toggle("active", enabled);
  floatDesc.textContent = enabled ? "Aktif — tombol muncul di semua halaman" : "Nonaktif";

  // ── Auto card ──
  autoSwitch.classList.toggle("on", autoBypass);
  autoSwitch.classList.toggle("green", autoBypass);
  autoCard.classList.toggle("active", autoBypass);
  autoDesc.textContent = autoBypass
    ? "Aktif — sfl.gl otomatis diredirect"
    : "Nonaktif";

  // ── Status row ──
  statusRow.className = "status-row";
  statusDot.className = "status-dot";

  if (enabled && autoBypass) {
    statusRow.classList.add("active-both");
    statusDot.classList.add("purple");
    statusText.textContent = "Floating + Auto aktif";
  } else if (enabled) {
    statusRow.classList.add("active-float");
    statusDot.classList.add("purple");
    statusText.textContent = "Siap bypass via tombol";
  } else if (autoBypass) {
    statusRow.classList.add("active-auto");
    statusDot.classList.add("green");
    statusText.textContent = "Auto bypass sfl.gl aktif";
  } else {
    statusText.textContent = "Semua mode nonaktif";
  }
}

// Load state
chrome.runtime.sendMessage({ type: "GET_STATE" }, (res) => {
  applyUI(res ?? { enabled: false, autoBypass: false });
});

// Toggle floating button
floatCard.addEventListener("click", () => {
  const next = { ...state, enabled: !state.enabled };
  applyUI(next);
  chrome.runtime.sendMessage({ type: "SET_STATE", enabled: next.enabled });
});

// Toggle auto bypass
autoCard.addEventListener("click", () => {
  const next = { ...state, autoBypass: !state.autoBypass };
  applyUI(next);
  chrome.runtime.sendMessage({ type: "SET_STATE", autoBypass: next.autoBypass });
});
