(() => {
  'use strict';
  if (window.__GA4DBG__) return;
  window.__GA4DBG__ = true;

  const DL_NAMES = ['dataLayer']; // añade aquí nombres custom si tu GTM usa otro

  const send = (type, data) => {
    try {
      window.postMessage(
        { __ga4dbg: 1, type, data, ts: Date.now(), frame: location.href, top: window.top === window },
        '*'
      );
    } catch (e) {}
  };

  /* ---------- serialización segura ---------- */
  function safe(input) {
    const seen = new WeakSet();
    const walk = (v, d) => {
      if (typeof v === 'function') return '[function]';
      if (typeof v === 'undefined') return '[undefined]';
      if (v === null || typeof v !== 'object') return v;
      if (seen.has(v)) return '[circular]';
      if (d > 8) return '[deep]';
      seen.add(v);
      if (Object.prototype.toString.call(v) === '[object Arguments]') v = Array.from(v);
      if (Array.isArray(v)) return v.map((x) => walk(x, d + 1));
      if (v instanceof Date) return v.toISOString();
      if (v.nodeType) return '[DOM ' + (v.nodeName || '') + ']';
      const out = {};
      for (const k of Object.keys(v)) {
        try { out[k] = walk(v[k], d + 1); } catch (e) { out[k] = '[error]'; }
      }
      return out;
    };
    return walk(input, 0);
  }

  /* ---------- 1. dataLayer ---------- */
  function wrapPush(arr, name) {
    if (!arr || arr.__ga4dbgWrapped) return;
    Object.defineProperty(arr, '__ga4dbgWrapped', { value: true, enumerable: false });

    arr.slice().forEach((item) => send('dl', { name, item: safe(item), replay: true }));

    // IMPORTANTE: wrapper PLANO que delega en el push NATIVO. NUNCA getter/setter que
    // encadene con el push de GTM: eso provoca recursión infinita (GTM envuelve nuestro
    // wrapper y el nuestro llamaba al de GTM). Como estamos en document_start, GTM se
    // envuelve DESPUÉS y su push llama al nuestro, así que seguimos observando igual.
    var nativePush = arr.push;
    var wrapped = function () {
      for (var i = 0; i < arguments.length; i++) {
        try { send('dl', { name: name, item: safe(arguments[i]) }); } catch (e) { /* noop */ }
      }
      return nativePush.apply(this, arguments);
    };
    try {
      Object.defineProperty(arr, 'push', { value: wrapped, configurable: true, writable: true, enumerable: false });
    } catch (e) { try { arr.push = wrapped; } catch (e2) { /* noop */ } }
  }

  const observed = new Set();
  function observeDl(name) {
    if (observed.has(name)) return;
    observed.add(name);
    let val = window[name];
    if (Array.isArray(val)) wrapPush(val, name);
    try {
      Object.defineProperty(window, name, {
        configurable: true,
        get: () => val,
        set: (v) => { val = v; if (Array.isArray(v)) wrapPush(v, name); }
      });
    } catch (e) {}
  }
  DL_NAMES.forEach(observeDl);

  /* ---------- 2. hits GA4 ---------- */
  const PATH_RE = /\/(g|j|mp)\/collect$|\/collect$/;

  function classify(urlStr) {
    let u;
    try { u = new URL(urlStr, location.href); } catch (e) { return null; }
    if (!PATH_RE.test(u.pathname)) return null;
    const p = {};
    u.searchParams.forEach((v, k) => { p[k] = v; });
    if (p.v !== '2') return null;                    // Measurement Protocol v2
    if (!/^G-/.test(p.tid || '')) return null;       // sólo GA4 (excluye AW-, DC-)
    return { host: u.hostname, endpoint: u.origin + u.pathname, search: u.search, common: p };
  }

  function expand(hit, body) {
    const lines = (body || '').split('\n').filter(Boolean);
    if (!lines.length) return [hit.common];
    return lines.map((line) => {
      const o = Object.assign({}, hit.common);
      new URLSearchParams(line).forEach((v, k) => { o[k] = v; });
      return o;
    });
  }

  async function bodyToText(body) {
    if (!body) return '';
    if (typeof body === 'string') return body;
    if (body instanceof URLSearchParams) return body.toString();
    if (typeof Blob !== 'undefined' && body instanceof Blob) {
      try { return await body.text(); } catch (e) { return ''; }
    }
    if (body instanceof ArrayBuffer) {
      try { return new TextDecoder().decode(body); } catch (e) { return ''; }
    }
    if (ArrayBuffer.isView(body)) {
      try { return new TextDecoder().decode(body.buffer); } catch (e) { return ''; }
    }
    return '';
  }

  async function report(transport, url, body) {
    if (!url) return;
    const hit = classify(url);
    if (!hit) return;
    const text = await bodyToText(body);
    send('hit', {
      transport,
      host: hit.host,
      endpoint: hit.endpoint,
      method: text ? 'POST' : 'GET',
      raw: text || (hit.search || '').replace(/^\?/, ''),
      events: expand(hit, text)
    });
  }

  const origFetch = window.fetch;
  if (origFetch) {
    window.fetch = function (input, init) {
      try {
        const url = typeof input === 'string' ? input : input && input.url;
        report('fetch', url, init && init.body);
      } catch (e) {}
      return origFetch.apply(this, arguments);
    };
  }

  if (navigator.sendBeacon) {
    const origBeacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = function (url, data) {
      try { report('sendBeacon', url, data); } catch (e) {}
      return origBeacon(url, data);
    };
  }

  const xhrOpen = XMLHttpRequest.prototype.open;
  const xhrSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (m, u) {
    this.__ga4dbgUrl = u;
    return xhrOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function (b) {
    try { report('xhr', this.__ga4dbgUrl, b); } catch (e) {}
    return xhrSend.apply(this, arguments);
  };

  const imgDesc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
  if (imgDesc && imgDesc.set) {
    Object.defineProperty(HTMLImageElement.prototype, 'src', {
      configurable: true,
      enumerable: imgDesc.enumerable,
      get() { return imgDesc.get.call(this); },
      set(v) {
        try { report('pixel', v, null); } catch (e) {}
        return imgDesc.set.call(this, v);
      }
    });
  }

  /* ---------- 3. entorno: contenedores GTM y tags GA4 ---------- */
  let lastSig = '';
  function autoDetectDataLayers() {
    try {
      Object.keys(window).forEach((k) => {
        const val = window[k];
        if (!Array.isArray(val) || observed.has(k) || val.length > 5000) return;
        const looks = /datalayer|(^|_)dl$/i.test(k) ||
          val.some((x) => x && typeof x === 'object' && (x.event || x.ecommerce || (Array.isArray(x) && typeof x[0] === 'string')));
        if (looks) { if (DL_NAMES.indexOf(k) < 0) DL_NAMES.push(k); observeDl(k); }
      });
    } catch (e) {}
  }
  function scan() {
    try {
      autoDetectDataLayers();
      var gtm = window.google_tag_manager || {};
      var keys = [];
      try { keys = Object.keys(gtm); } catch (e) { keys = []; }
      var containers = keys.filter((k) => /^GTM-/.test(k));
      var ga4 = keys.filter((k) => /^G-/.test(k));
      var others = keys.filter((k) => /^(AW|DC)-/.test(k));
      var gtagLoaded = typeof window.gtag === 'function';
      var dl = DL_NAMES.filter((n) => { try { return Array.isArray(window[n]); } catch (e) { return false; } });
      var sig = [containers, ga4, others, gtagLoaded, dl].join('|');
      if (sig !== lastSig) {
        lastSig = sig;
        send('env', { containers: containers, ga4: ga4, others: others, gtagLoaded: gtagLoaded, dataLayers: dl });
      }
    } catch (e) { /* nunca romper el intervalo de escaneo */ }
  }
  scan();
  var _ticks = 0;
  var _iv = setInterval(function () { scan(); if (++_ticks > 40) clearInterval(_iv); }, 1000);
})();
