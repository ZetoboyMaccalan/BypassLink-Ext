// ─── SFL Bypass — Background Service Worker ───────────────────────────────
// Pure fetch-based sfl.gl resolver, no server needed.
// Chrome extensions bypass CORS via host_permissions in manifest.json.
//
// PENTING — Chrome Extension vs Node.js behavior:
//   redirect: "manual" di service worker → opaque response (status 0, headers null)
//   Solusi:
//     • fetchFollow  → redirect:"follow", pakai res.url buat tau landing URL
//     • fetchManual  → XMLHttpRequest (sync-like via Promise) karena XHR di
//                      extension context tetap expose responseURL + headers
//                      meski ada redirect

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// ── Cookie jar helpers ─────────────────────────────────────────────────────

function parseCookiesFromRaw(rawSetCookie, domain, jar) {
  // rawSetCookie bisa array (getSetCookie) atau string tunggal
  const list = Array.isArray(rawSetCookie) ? rawSetCookie : [rawSetCookie];
  for (const raw of list) {
    if (!raw) continue;
    const [nameValue] = raw.split(";");
    const eqIdx = nameValue.indexOf("=");
    if (eqIdx === -1) continue;
    const name = nameValue.slice(0, eqIdx).trim();
    const value = nameValue.slice(eqIdx + 1).trim();
    if (!jar[domain]) jar[domain] = {};
    jar[domain][name] = value;
  }
}

function parseCookiesFromFetchHeaders(headers, domain, jar) {
  if (typeof headers.getSetCookie === "function") {
    parseCookiesFromRaw(headers.getSetCookie(), domain, jar);
  } else {
    const raw = headers.get("set-cookie");
    if (raw) parseCookiesFromRaw(raw.split(","), domain, jar);
  }
}

function buildCookieHeader(jar, domain) {
  const parts = [];
  for (const [d, pairs] of Object.entries(jar)) {
    if (domain.includes(d) || d.includes(domain)) {
      for (const [name, val] of Object.entries(pairs)) {
        parts.push(`${name}=${val}`);
      }
    }
  }
  return parts.join("; ");
}

// ── fetchFollow — redirect:follow, returns { text, finalUrl, status } ─────
// Dipakai untuk step yang hanya butuh landing URL & body response.

async function fetchFollow(url, jar, options = {}) {
  const { hostname: domain } = new URL(url);
  const cookieStr = buildCookieHeader(jar, domain);

  const headers = new Headers(options.headers || {});
  headers.set("User-Agent", UA);
  if (cookieStr) headers.set("Cookie", cookieStr);
  if (options.extraHeaders) {
    for (const [k, v] of Object.entries(options.extraHeaders)) {
      headers.set(k, v);
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      redirect: "follow",   // biarkan browser follow redirect
      signal: controller.signal,
    });

    // Parse cookies dari domain asal & domain akhir
    parseCookiesFromFetchHeaders(res.headers, domain, jar);
    if (res.url) {
      try {
        const finalDomain = new URL(res.url).hostname;
        if (finalDomain !== domain) {
          parseCookiesFromFetchHeaders(res.headers, finalDomain, jar);
        }
      } catch (_) {}
    }

    const text = await res.text().catch(() => "");
    return { text, finalUrl: res.url || url, status: res.status };
  } finally {
    clearTimeout(timer);
  }
}

// ── fetchXHR — XHR-based, bisa baca Location header dari redirect response ─
// Dipakai untuk step yang butuh intercept redirect header (bukan follow).
// XHR di extension service worker tetap expose getAllResponseHeaders()
// meski ada redirect, karena extension punya host_permissions.

function fetchXHR(url, jar, options = {}) {
  return new Promise((resolve, reject) => {
    const { hostname: domain } = new URL(url);
    const cookieStr = buildCookieHeader(jar, domain);
    const method = options.method || "GET";

    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true);

    // Set headers
    xhr.setRequestHeader("User-Agent", UA);
    if (cookieStr) xhr.setRequestHeader("Cookie", cookieStr);
    if (options.extraHeaders) {
      for (const [k, v] of Object.entries(options.extraHeaders)) {
        xhr.setRequestHeader(k, v);
      }
    }
    if (options.body && !options.extraHeaders?.["Content-Type"]) {
      xhr.setRequestHeader("Content-Type", "application/json");
    }

    // KUNCI: jangan follow redirect, kita mau baca Location header-nya
    // XHR tidak punya redirect option, tapi kita bisa pakai responseURL
    // untuk tau URL akhir setelah follow.
    // Untuk intercept (tidak follow), pakai fetch manual di bawah.

    xhr.timeout = 15000;

    xhr.onload = () => {
      // Parse set-cookie dari response headers (best effort)
      const rawHeaders = xhr.getAllResponseHeaders();
      const cookieLines = rawHeaders
        .split("\n")
        .filter(l => l.toLowerCase().startsWith("set-cookie:"));
      for (const line of cookieLines) {
        const val = line.slice(line.indexOf(":") + 1).trim();
        parseCookiesFromRaw([val], domain, jar);
      }

      resolve({
        status: xhr.status,
        text: xhr.responseText,
        finalUrl: xhr.responseURL || url,
        getHeader: (name) => xhr.getResponseHeader(name),
      });
    };

    xhr.onerror = () => reject(new Error(`XHR error: ${url}`));
    xhr.ontimeout = () => reject(new Error(`XHR timeout: ${url}`));

    xhr.send(options.body || null);
  });
}

// ── fetchManualLocation — khusus buat intercept redirect location header ──
// Pakai fetch dengan redirect:"manual" HANYA untuk baca Location header.
// Di Chrome Extension, fetch manual tetap kasih location header
// selama request punya host_permissions.

async function fetchManualLocation(url, jar, options = {}) {
  const { hostname: domain } = new URL(url);
  const cookieStr = buildCookieHeader(jar, domain);

  const headers = new Headers(options.headers || {});
  headers.set("User-Agent", UA);
  if (cookieStr) headers.set("Cookie", cookieStr);
  if (options.extraHeaders) {
    for (const [k, v] of Object.entries(options.extraHeaders)) {
      headers.set(k, v);
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      redirect: "manual",
      signal: controller.signal,
    });

    // Di Chrome Extension dengan host_permissions, opaqueredirect tetap
    // expose location via res.headers — kalau tidak, fallback ke XHR
    let location = null;
    try { location = res.headers.get("location"); } catch (_) {}

    // Kalau masih null (opaque), fallback: follow redirect & ambil res.url
    if (!location && (res.status === 0 || res.type === "opaqueredirect")) {
      // Fallback: follow dan kembalikan final URL sebagai "location"
      const fallback = await fetchFollow(url, jar, options);
      return { location: fallback.finalUrl, status: 302 };
    }

    // Parse cookies kalau ada
    parseCookiesFromFetchHeaders(res.headers, domain, jar);

    return {
      location: location ? new URL(location, url).href : null,
      status: res.status,
    };
  } finally {
    clearTimeout(timer);
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? m[1].trim() : null;
}

function randomAlnum(len) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let r = "";
  for (let i = 0; i < len; i++) r += chars[Math.floor(Math.random() * chars.length)];
  return r;
}

// ── Main resolver ──────────────────────────────────────────────────────────

async function resolveSflGl(url) {
  const jar = {};

  // ── Step 1: Land di sfl.gl, parse form ──────────────────────────────────
  const { text: sflHtml } = await fetchFollow(url, jar);

  const rayIdMatch = sflHtml.match(/name="ray_id"\s+value="([^"]+)"/);
  const aliasMatch = sflHtml.match(/name="alias"\s+value="([^"]+)"/);
  const actionMatch = sflHtml.match(/action="([^"]+)"/);

  if (!rayIdMatch || !aliasMatch || !actionMatch) {
    throw new Error("Format halaman sfl.gl berubah, tidak bisa parsing form.");
  }

  const rayId = rayIdMatch[1];
  const alias = aliasMatch[1];
  const action = actionMatch[1];

  // ── Step 2: Submit form → intercept Location header → blog1 ─────────────
  const formUrl = `${action}?ray_id=${encodeURIComponent(rayId)}&alias=${encodeURIComponent(alias)}`;
  const { location: loc1 } = await fetchManualLocation(formUrl, jar);

  if (!loc1) throw new Error("Tidak ada redirect dari form sfl.gl (loc1 null).");
  const blog1 = new URL(loc1, action).href;

  // ── Step 3: Visit blog1, POST /api/session ───────────────────────────────
  await fetchFollow(blog1, jar);

  await fetchFollow("https://app.khaddavi.net/api/session", jar, {
    method: "POST",
    extraHeaders: {
      "Content-Type": "application/json",
      Referer: blog1,
      Origin: "https://app.khaddavi.net",
    },
    body: "{}",
  });

  // ── Step 4: POST /api/verify → dapat target URL ──────────────────────────
  const { text: verifyText } = await fetchFollow(
    "https://app.khaddavi.net/api/verify",
    jar,
    {
      method: "POST",
      extraHeaders: {
        "Content-Type": "application/json",
        Referer: blog1,
        Origin: "https://app.khaddavi.net",
      },
      body: JSON.stringify({ _a: 0, captcha: null, passcode: null }),
    }
  );

  let verifyData;
  try { verifyData = JSON.parse(verifyText); }
  catch (_) { throw new Error("Response /api/verify bukan JSON valid."); }
  if (!verifyData.target) throw new Error("Verify gagal, tidak ada target URL.");

  // ── Step 5: Visit target → intercept redirect → blog2 ───────────────────
  const { location: loc2 } = await fetchManualLocation(verifyData.target, jar);

  if (!loc2) throw new Error("Tidak ada redirect ke step-2 (loc2 null).");
  const blog2 = new URL(loc2, verifyData.target).href;

  // ── Step 6: Visit blog2, POST /api/session ke-2 ──────────────────────────
  await fetchFollow(blog2, jar);

  await fetchFollow("https://app.khaddavi.net/api/session", jar, {
    method: "POST",
    extraHeaders: {
      "Content-Type": "application/json",
      Referer: blog2,
      Origin: "https://app.khaddavi.net",
    },
    body: "{}",
  });

  // ── Step 7: POST /api/go dengan canvas fingerprint palsu ─────────────────
  const key = Math.floor(Math.random() * 1000);
  const w = 1280, h = 720;
  const size = `${(w + key) * 2}.${(h + key) * 2}`;
  const idempotencyKey = randomAlnum(32);

  const { text: goText } = await fetchFollow(
    "https://app.khaddavi.net/api/go",
    jar,
    {
      method: "POST",
      extraHeaders: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
        Referer: blog2,
        Origin: "https://app.khaddavi.net",
      },
      body: JSON.stringify({ key, size, _dvc: "canvas_fp_server_v1" }),
    }
  );

  let goData;
  try { goData = JSON.parse(goText); }
  catch (_) { throw new Error("Response /api/go bukan JSON valid."); }
  if (!goData.url) throw new Error("Tidak ada URL dari /api/go.");

  // ── Step 8: Visit final URL, extract destination ──────────────────────────
  const { text: readyHtml, finalUrl: readyFinalUrl } = await fetchFollow(
    goData.url,
    jar,
    { extraHeaders: { Referer: blog2 } }
  );

  const title = extractTitle(readyHtml);

  // Cek window.location.href di HTML
  const hrefMatch = readyHtml.match(/window\.location\.href\s*=\s*["']([^"']+)["']/);
  if (hrefMatch) {
    return { finalUrl: hrefMatch[1].replace(/\\\//g, "/"), steps: 8, title };
  }

  // Kalau redirect follow langsung ke tujuan akhir
  if (readyFinalUrl && readyFinalUrl !== goData.url) {
    return { finalUrl: readyFinalUrl, steps: 8, title };
  }

  throw new Error("Tidak bisa menemukan URL tujuan di halaman akhir sfl.gl.");
}

// ── Helpers ────────────────────────────────────────────────────────────────

function isSflUrl(url) {
  try {
    const { hostname } = new URL(url);
    return hostname === "sfl.gl" || hostname.endsWith(".sfl.gl");
  } catch (_) { return false; }
}

function getState() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["enabled", "autoBypass"], (data) => {
      resolve({
        enabled: data.enabled ?? false,
        autoBypass: data.autoBypass ?? false,
      });
    });
  });
}

// ── Auto bypass: intercept tab navigasi ke sfl.gl ─────────────────────────

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Hanya proses saat tab mulai loading & URL-nya sfl.gl
  if (changeInfo.status !== "loading") return;
  const url = changeInfo.url || tab.url;
  if (!url || !isSflUrl(url)) return;

  const { autoBypass } = await getState();
  if (!autoBypass) return;

  // Tandai tab ini sedang diproses (hindari loop)
  const processingKey = `processing_${tabId}`;
  const existing = await new Promise((r) =>
    chrome.storage.session.get(processingKey, (d) => r(d[processingKey]))
  ).catch(() => null);
  if (existing === url) return;

  await chrome.storage.session.set({ [processingKey]: url }).catch(() => {});

  // Tampilkan loading page dulu supaya user tau lagi diproses
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        document.documentElement.innerHTML = `
          <head>
            <meta charset="UTF-8">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                background: #0A0E27;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                color: #e2e8f0;
              }
              .wrap { text-align: center; }
              .spinner {
                width: 36px; height: 36px;
                border: 3px solid rgba(124,58,237,0.2);
                border-top-color: #7c3aed;
                border-radius: 50%;
                animation: spin 0.7s linear infinite;
                margin: 0 auto 16px;
              }
              @keyframes spin { to { transform: rotate(360deg); } }
              .label { font-size: 14px; color: #94a3b8; }
              .url { font-size: 11px; color: #475569; margin-top: 6px; word-break: break-all; max-width: 320px; }
            </style>
          </head>
          <body>
            <div class="wrap">
              <div class="spinner"></div>
              <div class="label">Bypassing sfl.gl...</div>
              <div class="url" id="__sfl_url"></div>
            </div>
          </body>`;
        document.getElementById("__sfl_url").textContent = location.href;
      },
    });
  } catch (_) {}

  // Resolve
  try {
    const result = await resolveSflGl(url);
    await chrome.tabs.update(tabId, { url: result.finalUrl });
  } catch (err) {
    // Gagal → inject error page
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (errMsg, originalUrl) => {
          document.body.innerHTML = `
            <div class="wrap">
              <div style="font-size:28px;margin-bottom:12px;">⚠️</div>
              <div class="label" style="color:#f87171">Bypass gagal</div>
              <div class="url" style="color:#ef4444;margin-top:6px">${errMsg}</div>
              <a href="${originalUrl}" style="display:inline-block;margin-top:20px;padding:8px 18px;background:rgba(124,58,237,0.15);color:#a78bfa;border:1px solid rgba(124,58,237,0.3);border-radius:8px;font-size:12px;text-decoration:none">
                Buka link asli
              </a>
            </div>`;
        },
        args: [err.message, url],
      });
    } catch (_) {}
  } finally {
    // Hapus flag processing setelah selesai
    await chrome.storage.session.remove(processingKey).catch(() => {});
  }
});

// ── Message listener ───────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "RESOLVE_SFL") {
    resolveSflGl(msg.url)
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.type === "GET_STATE") {
    getState().then(sendResponse);
    return true;
  }

  if (msg.type === "SET_STATE") {
    const updates = {};
    if ("enabled" in msg) updates.enabled = msg.enabled;
    if ("autoBypass" in msg) updates.autoBypass = msg.autoBypass;

    chrome.storage.local.set(updates, () => {
      // Broadcast STATE_CHANGED ke semua tab
      chrome.tabs.query({}, (tabs) => {
        for (const tab of tabs) {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, {
              type: "STATE_CHANGED",
              enabled: updates.enabled,
              autoBypass: updates.autoBypass,
            }).catch(() => {});
          }
        }
      });
      sendResponse({ ok: true });
    });
    return true;
  }
});
