'use strict';

/* ============================================================ Diccionarios */
const DICT = {
  v: 'Versión del protocolo', tid: 'ID de medición (GA4)', gtm: 'Contenedor GTM',
  _p: 'ID de carga de página', cid: 'ID de cliente', uid: 'ID de usuario', sid: 'ID de sesión',
  sct: 'Nº de sesión', seg: 'Sesión con interacción', _s: 'Nº de evento en la sesión',
  en: 'Nombre del evento', _ee: 'Medición mejorada', dl: 'URL de la página', dr: 'Página de origen',
  dt: 'Título de la página', dh: 'Dominio', dp: 'Ruta', ul: 'Idioma', sr: 'Resolución', vp: 'Ventana',
  _et: 'Tiempo de interacción (ms)', _fv: 'Primera visita', _ss: 'Inicio de sesión', _nsi: 'Sesión nueva',
  ir: 'Ignorar origen', gcs: 'Estado de consentimiento', gcd: 'Consentimiento por defecto', gcu: 'Consent update',
  gcut: 'Tipo de consent update', npa: 'Anuncios no personalizados', dma: 'DMA (Europa)',
  dma_cps: 'Parámetros DMA', cu: 'Moneda', tt: 'Tipo de tráfico', _dbg: 'Modo depuración',
  ep: 'Parámetro (texto)', epn: 'Parámetro (número)', up: 'Propiedad de usuario (texto)', upn: 'Propiedad de usuario (número)',
  are: 'Redacción de Ads', frm: 'Contexto (iframe)', tag_exp: 'Experimentos', _eu: 'Región UE',
  _ng: 'Sin cookies', gtm_up: 'Propiedades de usuario GTM', pscdl: 'Pre-scroll dataLayer', _fplc: 'Enlazador first-party',
  gaf: 'Flags de GA', _tu: 'Info técnica', rcb: 'Nº de recarga'
};
const PRMAP = { id: 'item_id', nm: 'item_name', pr: 'price', br: 'item_brand', ca: 'item_category',
  va: 'item_variant', qt: 'quantity', ps: 'index', cp: 'coupon', ds: 'discount', af: 'affiliation',
  lp: 'index', ln: 'item_list_name', li: 'item_list_id', lo: 'location_id', c2: 'item_category2',
  c3: 'item_category3', c4: 'item_category4', c5: 'item_category5' };

const EV_ICON = {
  page_view: '📄', session_start: '🚀', first_visit: '✨', user_engagement: '⏱️', user_properties_set: '👤',
  scroll: '🖱️', click: '👆', search: '🔎', view_search_results: '🔎', view_item_list: '📋', view_item: '👁️',
  select_item: '☑️', add_to_wishlist: '⭐', add_to_cart: '🛒', remove_from_cart: '➖', view_cart: '🧺',
  begin_checkout: '🧾', add_shipping_info: '🚚', add_payment_info: '💳', purchase: '✅', refund: '↩️',
  view_promotion: '📣', select_promotion: '📣', generate_lead: '🎯', sign_up: '📝', login: '🔑', share: '🔗',
  form_start: '🖊️', form_submit: '📨', form_interact: '🖊️', video_start: '▶️', file_download: '⬇️', consent_update: '🔐',
  consent: '🔐', set: '⚙️', config: '⚙️', js: '🏁', get: '🔎'
};
const EV_LABEL = {
  page_view: 'Vista de página', session_start: 'Inicio de sesión', first_visit: 'Primera visita',
  user_engagement: 'Tiempo en la página', user_properties_set: 'Propiedades de usuario',
  view_item: 'Vio un producto', view_item_list: 'Vio una lista de productos', select_item: 'Seleccionó un producto',
  add_to_cart: 'Añadió al carrito', remove_from_cart: 'Quitó del carrito', view_cart: 'Vio el carrito',
  begin_checkout: 'Empezó la compra', add_shipping_info: 'Añadió datos de envío', add_payment_info: 'Añadió datos de pago',
  purchase: 'Compra realizada', refund: 'Reembolso', add_to_wishlist: 'Añadió a favoritos', view_cart_: 'Vio el carrito',
  view_promotion: 'Vio una promoción', select_promotion: 'Seleccionó una promoción', search: 'Búsqueda',
  login: 'Inició sesión', sign_up: 'Se registró', generate_lead: 'Generó un lead', share: 'Compartió',
  form_start: 'Empezó un formulario', form_submit: 'Envió un formulario', form_interact: 'Interactuó con un formulario',
  scroll: 'Hizo scroll', click: 'Clic', consent_update: 'Actualizó el consentimiento',
  consent: 'Consentimiento', set: 'Configuración (set)', config: 'Configuración (config)', js: 'Inicialización de gtag', get: 'Lectura de valor'
};
const ECOM = new Set(['view_item', 'view_item_list', 'select_item', 'add_to_cart', 'remove_from_cart', 'view_cart',
  'begin_checkout', 'add_shipping_info', 'add_payment_info', 'purchase', 'refund', 'add_to_wishlist', 'select_promotion', 'view_promotion']);
const REQ = {
  purchase: ['transaction_id', 'value', 'currency', 'items'], refund: ['transaction_id'],
  add_to_cart: ['items'], remove_from_cart: ['items'], view_cart: ['items'], view_item: ['items'],
  view_item_list: ['items'], select_item: ['items'], add_to_wishlist: ['items'], begin_checkout: ['items'],
  add_payment_info: ['items'], add_shipping_info: ['items'], select_promotion: ['items'], view_promotion: ['items']
};

function humanLabel(en) { return EV_LABEL[en] || en || '(evento)'; }
function describe(key) {
  if (DICT[key]) return DICT[key];
  const m = key.match(/^(ep|epn|up|upn)\.(.+)$/);
  if (m) return DICT[m[1]] + ': ' + m[2];
  if (/^pr\d+$/.test(key)) return 'Producto';
  return '';
}
function has(p, k) { return p[k] !== undefined && p[k] !== ''; }
function itemKeys(p) { return Object.keys(p).filter((k) => /^pr\d+$/.test(k)); }
function evValue(p) { return has(p, 'epn.value') ? p['epn.value'] : (has(p, 'ep.value') ? p['ep.value'] : undefined); }
function txId(p) { return has(p, 'ep.transaction_id') ? p['ep.transaction_id'] : ''; }
function issuesFor(p) {
  const out = []; const en = p.en || '';
  (REQ[en] || []).forEach((r) => {
    if (r === 'items') { if (!itemKeys(p).length) out.push('Falta el producto (items)'); }
    else if (r === 'value') { if (evValue(p) === undefined) out.push('Falta el importe (value)'); }
    else if (r === 'currency') { if (!has(p, 'ep.currency')) out.push('Falta la moneda (currency)'); }
    else if (r === 'transaction_id') { if (!txId(p)) out.push('Falta el nº de pedido (transaction_id)'); }
  });
  if (evValue(p) !== undefined && !has(p, 'ep.currency')) out.push('Hay importe pero falta la moneda (GA4 lo descarta)');
  return out;
}
function prToObj(str) {
  const o = {};
  String(str).split('~').forEach((c) => { const k = c.slice(0, 2), v = c.slice(2); if (PRMAP[k]) o[PRMAP[k]] = v; });
  return o;
}
function dlItems(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const ec = payload.ecommerce && typeof payload.ecommerce === 'object' ? payload.ecommerce : payload;
  if (ec && Array.isArray(ec.items)) return ec.items;
  return null;
}
function consentText(v) {
  if (!/^G/.test(v || '')) return '';
  const f = (c) => (c === '1' ? '✅' : c === '0' ? '❌' : '—');
  return 'ad_storage ' + f(v[2]) + ' · analytics_storage ' + f(v[3]);
}

/* ============================================================ Estado */
const MAX_ROWS = 1500;
let rows = [];
let selected = null;
let lastEnv = null;
const $ = (s) => document.querySelector(s);
const list = $('#list'), detail = $('#detail'), envBox = $('#env'), summaryBox = $('#summary');
const EMPTY_HTML = '<div class="about"><img class="about-logo" src="../icons/gmartos.png" alt="gmartos.es"><p class="empty">Selecciona un evento de la lista para ver sus datos.</p><div class="about-card"><b>Creado por gmartos.es</b><p>Módulos <b>PrestaShop</b> y <b>WooCommerce</b>, <b>extensiones de navegador</b>, integraciones, <b>analítica GA4/GTM</b>, <b>SEO</b> y automatizaciones para e-commerce.</p><a href="https://gmartos.es" target="_blank" rel="noreferrer">Ver servicios en gmartos.es →</a></div></div>';
function el(t, c, tx) { const e = document.createElement(t); if (c) e.className = c; if (tx != null) e.textContent = tx; return e; }

let port = null;
function onPortMsg(m) {
  if (m.kind === 'snapshot') { rows = []; (m.state.events || []).forEach(ingest); lastEnv = m.state.env || lastEnv; render(); }
  else if (m.kind === 'push') { ingest(m.msg); scheduleRender(); }
  else if (m.kind === 'reset') { rows = []; selected = null; lastEnv = null; detail.innerHTML = EMPTY_HTML; render(); }
}
function connect() {
  try {
    port = chrome.runtime.connect({ name: 'ga4dbg-panel' });
    port.postMessage({ kind: 'init', tabId: chrome.devtools.inspectedWindow.tabId });
    port.postMessage({ kind: 'preserve', value: $('#preserve').checked });
    port.onMessage.addListener(onPortMsg);
    // El service worker de MV3 se duerme y mata el puerto: reconectar solo.
    port.onDisconnect.addListener(() => { port = null; setTimeout(connect, 700); });
  } catch (e) { port = null; setTimeout(connect, 1500); }
}
function sendPort(msg) { try { if (!port) return false; port.postMessage(msg); return true; } catch (e) { port = null; setTimeout(connect, 300); return false; } }
connect();

function evName(r) { return r.type === 'hit' ? (r.payload.en || '') : (r.dlEvent || ''); }
function isEcom(r) { return ECOM.has(evName(r)); }
function isGtmInternal(r) { return r.type === 'dl' && /^gtm\./.test(r.dlEvent || ''); }
function displayName(r) { if (r.type === 'hit') return humanLabel(r.payload.en); return r.dlEvent ? humanLabel(r.dlEvent) : r.name; }

function ingest(msg) {
  if (msg.type === 'env') { lastEnv = msg.data; return; }
  if (msg.type === 'hit') {
    msg.data.events.forEach((ev) => rows.push({
      type: 'hit', name: ev.en || '(sin evento)', transport: msg.data.transport, host: msg.data.host,
      page: msg.frame || '', ts: msg.ts, payload: ev, rawText: msg.data.raw || '', raw: msg.data
    }));
  } else if (msg.type === 'dl') {
    const it = msg.data.item; let name = '(push)', dlEvent = '';
    if (it && typeof it === 'object') {
      if (Array.isArray(it)) { dlEvent = it[1] === 'event' ? it[2] : (it[0] || ''); name = it.filter((x) => typeof x === 'string').slice(0, 2).join(' ') || '(args)'; }
      else if (it.event) { dlEvent = it.event; name = it.event; }
      else { name = '{' + Object.keys(it).slice(0, 3).join(', ') + '}'; }
    }
    rows.push({ type: 'dl', name: name, dlEvent: dlEvent, page: msg.frame || '', dlName: (msg.data.name || 'dataLayer'), replay: !!msg.data.replay, ts: msg.ts, payload: it });
  }
  if (rows.length > MAX_ROWS) rows.splice(0, rows.length - MAX_ROWS);
}

/* ============================================================ Render */
let renderPending = false;
function scheduleRender() { if (renderPending) return; renderPending = true; requestAnimationFrame(() => { renderPending = false; render(); }); }
function preprocess(vis) {
  const seenTx = {}; let prev = null;
  vis.forEach((r) => {
    r._delta = prev == null ? 0 : (r.ts - prev); prev = r.ts;
    if (r.type === 'hit') { r._issues = issuesFor(r.payload); if (r.payload.en === 'purchase') { const tx = txId(r.payload); if (tx) { if (seenTx[tx]) r._issues = r._issues.concat('Compra DUPLICADA (mismo nº de pedido)'); seenTx[tx] = true; } } }
    else r._issues = [];
  });
}
function filters() { return { q: $('#filter').value.trim().toLowerCase(), vista: $('#view').value, showGtm: $('#showGtm').checked, evt: $('#evType').value }; }
function anyFilter() { const f = filters(); return !!(f.q || f.vista || f.evt || f.showGtm); }
function visible() {
  const f = filters();
  return rows.filter((r) => {
    if (!f.showGtm && isGtmInternal(r)) return false;
    if (f.vista === 'ga4' && r.type !== 'hit') return false;
    if (f.vista === 'dl' && r.type !== 'dl') return false;
    if (f.vista === 'ecom' && !isEcom(r)) return false;
    if (f.vista === 'issues' && !(r._issues && r._issues.length)) return false;
    if (f.evt && evName(r) !== f.evt) return false;
    if (f.q) return JSON.stringify(r.payload).toLowerCase().includes(f.q) || (r.name || '').toLowerCase().includes(f.q) || displayName(r).toLowerCase().includes(f.q);
    return true;
  });
}

function render() {
  renderEnv(); syncEvTypes(); renderSummary();
  $('#reset').hidden = !anyFilter();
  const items = visible(); preprocess(items);
  const atBottom = list.scrollTop + list.clientHeight >= list.scrollHeight - 40;
  list.innerHTML = '';
  if (!items.length) {
    const li = el('li'); li.style.cursor = 'default'; li.style.borderLeftColor = 'transparent';
    li.appendChild(el('span', 'empty', rows.length ? 'No hay eventos con este filtro.' : 'Esperando eventos… recarga la página (F5).'));
    list.appendChild(li);
  }
  const frag = document.createDocumentFragment();
  items.forEach((r) => {
    const li = el('li'); const cls = [];
    if (r === selected) cls.push('sel'); if (r._issues && r._issues.length) cls.push('warn'); if (isEcom(r)) cls.push('ecom');
    if (cls.length) li.className = cls.join(' ');
    li.appendChild(el('span', 'tag ' + (r.type === 'hit' ? 'hit' : 'dl'), r.type === 'hit' ? 'GA4' : 'DL'));
    li.appendChild(el('span', 'ico', r.type === 'hit' ? (EV_ICON[r.payload.en] || '📊') : (EV_ICON[r.dlEvent] || '📋')));
    const rm = el('div', 'rowmain');
    rm.appendChild(el('span', 'name', displayName(r)));
    rm.appendChild(el('span', 'subname', (evName(r) || '') + (r.type === 'hit' ? ' · ' + r.host : ' · ' + r.dlName)));
    li.appendChild(rm);
    if (r._issues && r._issues.length) { const w = el('span', 'badge-warn', '⚠'); w.title = 'Con avisos'; li.appendChild(w); }
    li.appendChild(el('span', 'meta', new Date(r.ts).toLocaleTimeString() + (r._delta ? '  +' + r._delta + 'ms' : '')));
    li.onclick = () => { selected = r; showDetail(r); markSelected(); };
    frag.appendChild(li);
  });
  list.appendChild(frag); markSelected();
  if (atBottom) list.scrollTop = list.scrollHeight;
}
function markSelected() { const els = list.querySelectorAll('li'); const items = visible(); els.forEach((li, i) => li.classList && li.classList.toggle('sel', items[i] === selected)); }

function syncEvTypes() {
  const sel = $('#evType'); const cur = sel.value; const s = new Set();
  rows.forEach((r) => { if (!isGtmInternal(r)) { const n = evName(r); if (n) s.add(n); } });
  const names = [...s].sort();
  sel.innerHTML = '<option value="">Cualquier evento</option>' + names.map((n) => '<option value="' + n.replace(/"/g, '&quot;') + '">' + humanLabel(n) + '</option>').join('');
  if (names.includes(cur)) sel.value = cur;
}

function renderEnv() {
  if (!lastEnv) { envBox.textContent = ''; return; }
  const e = lastEnv; const p = [];
  if (e.containers && e.containers.length) p.push('GTM: <b>' + e.containers.join(', ') + '</b>');
  if (e.ga4 && e.ga4.length) p.push('GA4: <b>' + e.ga4.join(', ') + '</b>');
  if (e.others && e.others.length) p.push('Ads: ' + e.others.join(', '));
  p.push('gtag: <b>' + (e.gtagLoaded ? 'sí' : 'no') + '</b>');
  p.push('dataLayer: <b>' + ((e.dataLayers || []).join(', ') || 'no') + '</b>');
  const g = [...rows].reverse().find((r) => r.type === 'hit' && r.payload.gcs);
  if (g) { const c = consentText(g.payload.gcs); if (c) p.push('consentimiento: <b>' + c + '</b>'); }
  envBox.innerHTML = p.join(' &nbsp;·&nbsp; ');
}

function renderSummary() {
  const counts = {}; let dl = 0, issues = 0;
  rows.forEach((r) => {
    if (isGtmInternal(r) && !$('#showGtm').checked) return;
    if (r.type === 'hit') { const n = r.payload.en || '(sin evento)'; counts[n] = (counts[n] || 0) + 1; } else dl++;
    if (r._issues && r._issues.length) issues++;
  });
  const cur = $('#evType').value;
  const parts = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).map((n) =>
    '<span class="chip' + (ECOM.has(n) ? ' ec' : '') + (n === cur ? ' active' : '') + '" data-ev="' + n.replace(/"/g, '&quot;') + '">' + (EV_ICON[n] || '📊') + ' ' + humanLabel(n) + ' <b>' + counts[n] + '</b></span>');
  if (dl) parts.push('<span class="chip' + ($('#view').value === 'dl' ? ' active' : '') + '" data-dl="1">📋 dataLayer <b>' + dl + '</b></span>');
  if (issues) parts.push('<span class="chip warn' + ($('#view').value === 'issues' ? ' active' : '') + '" data-issues="1">⚠ avisos <b>' + issues + '</b></span>');
  summaryBox.innerHTML = parts.join('');
  summaryBox.querySelectorAll('.chip').forEach((c) => {
    c.onclick = () => {
      if (c.dataset.ev) { $('#evType').value = ($('#evType').value === c.dataset.ev) ? '' : c.dataset.ev; $('#view').value = ''; }
      else if (c.dataset.dl) { $('#view').value = ($('#view').value === 'dl') ? '' : 'dl'; $('#evType').value = ''; }
      else if (c.dataset.issues) { $('#view').value = ($('#view').value === 'issues') ? '' : 'issues'; }
      render();
    };
  });
}

/* ============================================================ Detalle */
function pageMeta(r) {
  const d = el('div', 'd-meta');
  d.appendChild(document.createTextNode('🕒 ' + new Date(r.ts).toLocaleString() + '   ·   📍 '));
  const a = el('a', '', r.page || '—'); a.href = r.page || '#'; a.target = '_blank'; a.rel = 'noreferrer';
  d.appendChild(a);
  return d;
}
function statCard(t, v, money) { const c = el('div', 'card' + (money ? ' money' : '')); c.appendChild(el('div', 't', t)); c.appendChild(el('div', 'v', v)); return c; }
function itemCard(it) {
  const c = el('div', 'item');
  c.appendChild(el('div', 'nm', it.item_name || it.name || ('SKU ' + (it.item_id || it.id || '?'))));
  const a = el('div', 'attrs');
  const add = (label, val) => { if (val == null || val === '') return; const s = el('span'); s.appendChild(document.createTextNode(label + ': ')); s.appendChild(el('b', '', String(val))); a.appendChild(s); };
  add('SKU', it.item_id || it.id); add('Precio', (it.price != null && it.price !== '') ? it.price + ' €' : ''); add('Cantidad', it.quantity != null && it.quantity !== '' ? 'x' + it.quantity : '');
  add('Marca', it.item_brand || it.brand); add('Categoría', it.item_category || it.category); add('Variante', it.item_variant || it.variant);
  c.appendChild(a); return c;
}
function consentPills(gcs, gcd) {
  const wrap = el('div', 'consent-row');
  if (!/^G/.test(gcs || '')) { wrap.appendChild(el('span', 'pill n', 'sin datos')); return wrap; }
  const names = ['ad_storage', 'analytics_storage', 'ad_user_data', 'ad_personalization']; const pos = [2, 3, 4, 5];
  names.forEach((n, i) => { const c = gcs[pos[i]]; if (c === undefined) return; const ok = c === '1'; wrap.appendChild(el('span', 'pill ' + (ok ? 'g' : 'd'), (ok ? '✅ ' : '❌ ') + n)); });
  return wrap;
}
function kvTable(pairs) {
  const t = el('table', 'kv');
  pairs.forEach((pr) => { if (pr[1] == null || pr[1] === '') return; const tr = el('tr'); tr.appendChild(el('td', 'k', pr[0])); tr.appendChild(el('td', 'v', String(pr[1]))); t.appendChild(tr); });
  return t.querySelector('tr') ? t : null;
}
function decodeGcd(v) {
  if (!/[a-z]/i.test(v || '')) return [];
  const L = (v.match(/[a-z]/gi) || []);
  const map = { t: 'concedido por defecto', p: 'denegado por defecto', q: 'denegado (hasta consent update)', r: 'concedido (hasta consent update)', u: 'no establecido', v: 'no establecido', l: 'no configurado', m: 'no configurado' };
  const cats = ['ad_storage', 'analytics_storage', 'ad_user_data', 'ad_personalization'];
  return cats.map((c, i) => [c, map[(L[i] || '').toLowerCase()] || '—']);
}
function howSent(r) {
  const host = r.host || ''; let nota = '';
  if (host === 'g' || /^stats\.g\.doubleclick/.test(host)) nota = 'envío first-party (proxy/servidor propio)';
  else if (/region\d*\.analytics\.google\.com/.test(host)) nota = 'endpoint regional de Google';
  else if (/analytics\.google\.com|google-analytics\.com/.test(host)) nota = 'servidor de Google Analytics';
  else nota = 'server-side / dominio propio';
  const via = { fetch: 'fetch (segundo plano)', sendBeacon: 'sendBeacon (al navegar/cerrar)', xhr: 'XMLHttpRequest', pixel: 'pixel (imagen)' };
  return { destino: host, via: via[r.transport] || r.transport, metodo: r.raw.method, endpoint: r.raw.endpoint, nota: nota };
}
function paramList(p, re) { const out = []; Object.keys(p).forEach((k) => { const m = k.match(re); if (m) out.push([m[1], p[k]]); }); return out; }

const KEYLABEL = {
  event: 'Evento', ecommerce: 'Ecommerce', items: 'Productos', user_properties: 'Propiedades de usuario',
  event_id: 'ID de evento', event_source: 'Origen del evento', send_to_server: 'Enviar al servidor',
  consent_state: 'Estado de consentimiento', currency: 'Moneda', value: 'Importe', transaction_id: 'Nº de pedido',
  user_id: 'ID de usuario', visitor_type: 'Tipo de visitante', recurrent: 'Recurrente', pagePostType: 'Tipo de página',
  page_type: 'Tipo de página', content_group1: 'Grupo de contenido', ads_data_redaction: 'Redacción de datos de Ads',
  url_passthrough: 'URL passthrough', allow_ad_personalization_signals: 'Permitir personalización de anuncios',
  session_id: 'ID de sesión', page_title: 'Título de página', page_location: 'URL de página'
};
function friendlyKey(k) { return KEYLABEL[k] || k; }
function isPlainObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }
function scalarStr(v) { if (v == null) return ''; if (typeof v === 'object') return ''; return String(v); }
function renderConsentBlock(container, mode, data) {
  container.appendChild(el('div', 'subsec', 'Consentimiento' + (mode ? ' · ' + mode : '')));
  const wrap = el('div', 'consent-row');
  const order = ['ad_storage', 'analytics_storage', 'ad_user_data', 'ad_personalization', 'functionality_storage', 'personalization_storage', 'security_storage'];
  order.forEach((k) => { if (data[k] == null) return; const g = data[k] === 'granted' || data[k] === true; wrap.appendChild(el('span', 'pill ' + (g ? 'g' : 'd'), (g ? '✅ ' : '❌ ') + k)); });
  container.appendChild(wrap);
  const extra = Object.keys(data).filter((k) => order.indexOf(k) < 0).map((k) => [friendlyKey(k), scalarStr(data[k])]);
  const t = kvTable(extra); if (t) container.appendChild(t);
}
function renderObjectBlock(container, obj, skip) {
  skip = skip || {};
  const scalars = [], nested = [];
  Object.keys(obj).forEach((k) => {
    if (skip[k]) return; const v = obj[k]; if (v == null || v === '') return;
    if (Array.isArray(v)) { if (v.length && isPlainObj(v[0])) nested.push([k, v, 'items']); else scalars.push([friendlyKey(k), v.join(', ')]); }
    else if (isPlainObj(v)) nested.push([k, v, 'obj']);
    else scalars.push([friendlyKey(k), String(v)]);
  });
  const t = kvTable(scalars); if (t) container.appendChild(t);
  nested.forEach((n) => {
    container.appendChild(el('div', 'subsec', friendlyKey(n[0])));
    if (n[2] === 'items') n[1].forEach((it) => container.appendChild(itemCard(it)));
    else renderObjectBlock(container, n[1], {});
  });
}
function renderDlDetail(container, it) {
  if (Array.isArray(it)) {
    const cmd = it[0]; const arg = (typeof it[1] === 'string') ? it[1] : '';
    container.appendChild(el('div', 'nota', 'Comando gtag: ' + [cmd, arg].filter(Boolean).join(' · ')));
    let data = null; for (let i = 1; i < it.length; i++) { if (isPlainObj(it[i])) { data = it[i]; break; } }
    if (cmd === 'consent' && data) { renderConsentBlock(container, arg, data); return; }
    if (data) { renderObjectBlock(container, data, {}); return; }
    const rest = it.slice(1).map((x, i) => ['valor ' + (i + 1), scalarStr(x)]).filter((p) => p[1]);
    const t = kvTable(rest); if (t) container.appendChild(t); else container.appendChild(el('div', 'nota', 'Sin datos adicionales.'));
    return;
  }
  if (isPlainObj(it)) { renderObjectBlock(container, it, { ecommerce: 1, items: 1 }); return; }
  container.appendChild(el('div', 'nota', String(it)));
}
function copyBtn(get) { const b = el('button', '', 'Copiar JSON'); b.onclick = () => navigator.clipboard.writeText(get()).then(() => { b.textContent = 'Copiado ✓'; setTimeout(() => { b.textContent = 'Copiar JSON'; }, 1400); }).catch(() => {}); return b; }

function head(r) {
  const h = el('div', 'd-head');
  const t = el('div', 'd-title');
  t.appendChild(el('span', 'd-ico', r.type === 'hit' ? (EV_ICON[r.payload.en] || '📊') : (EV_ICON[r.dlEvent] || '📋')));
  t.appendChild(el('span', '', displayName(r)));
  t.appendChild(el('span', 'tag ' + (r.type === 'hit' ? 'hit' : 'dl'), r.type === 'hit' ? 'GA4' : 'dataLayer'));
  const en = evName(r); if (en && humanLabel(en) !== en) t.appendChild(el('span', 'd-en', '(' + en + ')'));
  h.appendChild(t); h.appendChild(pageMeta(r));
  if (r.type === 'hit') h.appendChild(el('div', 'd-endpoint mono', r.raw.method + ' · ' + r.transport + ' · ' + r.raw.endpoint));
  return h;
}

function showDetail(r) {
  detail.innerHTML = '';
  detail.appendChild(head(r));

  if (r._issues && r._issues.length) {
    const box = el('ul', 'd-issues'); r._issues.forEach((i) => box.appendChild(el('li', '', i))); detail.appendChild(box);
  }

  // Items (ecommerce): de pr1.. (hit) o de ecommerce.items (dataLayer)
  let items = null, value, currency, tx;
  if (r.type === 'hit') {
    items = itemKeys(r.payload).map((k) => prToObj(r.payload[k]));
    value = evValue(r.payload); currency = r.payload['ep.currency']; tx = txId(r.payload);
  } else {
    items = dlItems(r.payload);
    const ec = r.payload && r.payload.ecommerce; if (ec) { value = ec.value; currency = ec.currency; tx = ec.transaction_id; }
  }

  // Tarjetas resumen
  const cards = el('div', 'cards'); let anyCard = false;
  if (value != null && value !== '') { cards.appendChild(statCard('Importe', value + (currency ? ' ' + currency : ' €'), true)); anyCard = true; }
  if (items && items.length) { cards.appendChild(statCard('Productos', String(items.length))); anyCard = true; }
  if (tx) { cards.appendChild(statCard('Nº de pedido', tx)); anyCard = true; }
  if (r.type === 'hit' && has(r.payload, '_et')) { cards.appendChild(statCard('Interacción', Math.round(Number(r.payload._et) / 1000) + ' s')); anyCard = true; }
  if (anyCard) detail.appendChild(cards);

  if (items && items.length) {
    detail.appendChild(el('h4', 'sec', 'Productos'));
    items.forEach((it) => detail.appendChild(itemCard(it)));
  }

  if (r.type === 'hit') {
    const p = r.payload;
    // Cómo se envió a Google
    const hs = howSent(r);
    detail.appendChild(el('h4', 'sec', 'Cómo se envió a Google'));
    detail.appendChild(kvTable([['Destino', hs.destino], ['', ''], ['Vía', hs.via], ['Método', hs.metodo], ['Endpoint', hs.endpoint]]) || el('div'));
    detail.appendChild(el('div', 'nota', hs.nota));

    // Datos enviados
    detail.appendChild(el('h4', 'sec', 'Datos enviados a Google'));
    const ids = kvTable([['Client ID (cid)', p.cid], ['Session ID (sid)', p.sid], ['Nº de sesión (sct)', p.sct], ['User ID (uid)', p.uid],
      ['Tiempo de interacción', has(p, '_et') ? Math.round(Number(p._et) / 1000) + ' s' : ''], ['Primera visita', p._fv === '1' ? 'sí' : ''], ['Idioma', p.ul]]);
    if (ids) { detail.appendChild(el('div', 'subsec', 'Identificadores y sesión')); detail.appendChild(ids); }
    const eps = paramList(p, /^(?:ep|epn)\.(.+)$/);
    if (eps.length) { detail.appendChild(el('div', 'subsec', 'Parámetros del evento')); detail.appendChild(kvTable(eps)); }
    const ups = paramList(p, /^(?:up|upn)\.(.+)$/);
    if (ups.length) { detail.appendChild(el('div', 'subsec', 'Propiedades de usuario')); detail.appendChild(kvTable(ups)); }

    // Consentimiento (Consent Mode v2)
    detail.appendChild(el('h4', 'sec', 'Consentimiento (Consent Mode v2)'));
    if (p.gcs) { detail.appendChild(el('div', 'subsec', 'Estado actual (gcs)')); detail.appendChild(consentPills(p.gcs, p.gcd)); }
    else detail.appendChild(el('div', 'nota', 'Este envío no incluye estado de consentimiento (gcs).'));
    const cflags = [];
    decodeGcd(p.gcd).forEach((x) => cflags.push(['Por defecto · ' + x[0], x[1]]));
    if (has(p, 'npa')) cflags.push(['Anuncios no personalizados (npa)', p.npa === '1' ? 'sí' : 'no']);
    if (has(p, 'dma')) cflags.push(['Región DMA / Europa (dma)', p.dma === '1' ? 'sí' : 'no']);
    if (has(p, 'dma_cps')) cflags.push(['Consentimiento DMA (dma_cps)', p.dma_cps]);
    if (has(p, '_ng')) cflags.push(['Modo sin cookies (_ng)', p._ng === '1' ? 'sí' : 'no']);
    if (has(p, 'gcu')) cflags.push(['Consentimiento actualizado (gcu)', 'sí']);
    if (has(p, 'us_privacy')) cflags.push(['US Privacy', p.us_privacy]);
    if (has(p, 'gdpr')) cflags.push(['GDPR aplica', p.gdpr === '1' ? 'sí' : 'no']);
    const ct = kvTable(cflags);
    if (ct) { detail.appendChild(el('div', 'subsec', 'Por defecto y señales')); detail.appendChild(ct); }

    // Página
    const pg = kvTable([['Título', p.dt], ['URL', p.dl], ['Origen (referrer)', p.dr]]);
    if (pg) { detail.appendChild(el('h4', 'sec', 'Página')); detail.appendChild(pg); }
  }

  if (r.type === 'dl') {
    detail.appendChild(el('h4', 'sec', 'Contenido del push'));
    renderDlDetail(detail, r.payload);
  }

  // Toolbar
  const tb = el('div', 'toolbar'); tb.appendChild(copyBtn(() => JSON.stringify(r.payload, null, 2)));
  if (r.type === 'hit') {
    const rb = el('button', '', 'Ver envío en crudo'); let pre = null;
    rb.onclick = () => { if (pre) { pre.remove(); pre = null; rb.textContent = 'Ver envío en crudo'; } else { pre = el('pre', '', r.rawText || '(sin cuerpo)'); detail.appendChild(pre); rb.textContent = 'Ocultar'; } };
    tb.appendChild(rb);
  }
  detail.appendChild(tb);

  // Avanzado (plegado)
  const adv = el('details', 'adv');
  if (r.type === 'hit') {
    const keys = Object.keys(r.payload).filter((k) => !/^pr\d+$/.test(k)).sort();
    adv.appendChild(el('summary', '', 'Todos los parámetros técnicos (' + keys.length + ')'));
    const t = el('table', 'raw');
    keys.forEach((k) => { const tr = el('tr'); tr.appendChild(el('td', 'k', k)); tr.appendChild(el('td', '', String(r.payload[k]))); tr.appendChild(el('td', 'd', k === 'gcs' ? consentText(r.payload[k]) : describe(k))); t.appendChild(tr); });
    adv.appendChild(t);
  } else {
    adv.appendChild(el('summary', '', 'Ver datos completos (JSON)'));
    adv.appendChild(el('pre', '', JSON.stringify(r.payload, null, 2)));
  }
  detail.appendChild(adv);
}

/* ============================================================ Exportar / controles */
function download(name, text, mime) { const b = new Blob([text], { type: mime }); const a = el('a'); a.href = URL.createObjectURL(b); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }
function toCsv() {
  const esc = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const lines = [['fecha', 'tipo', 'evento', 'transporte', 'host', 'nº_pedido', 'importe', 'moneda', 'nº_items', 'avisos', 'pagina'].join(',')];
  rows.forEach((r) => {
    if (r.type === 'hit') lines.push([new Date(r.ts).toISOString(), 'GA4', r.payload.en || '', r.transport, r.host, txId(r.payload), evValue(r.payload) === undefined ? '' : evValue(r.payload), r.payload['ep.currency'] || '', itemKeys(r.payload).length, (r._issues || []).join(' | '), r.page].map(esc).join(','));
    else lines.push([new Date(r.ts).toISOString(), 'dataLayer', r.dlEvent || r.name, '', r.dlName, '', '', '', '', '', r.page].map(esc).join(','));
  });
  return lines.join('\n');
}
$('#filter').oninput = render;
$('#view').onchange = render;
$('#evType').onchange = render;
$('#showGtm').onchange = render;
$('#reset').onclick = () => { $('#filter').value = ''; $('#view').value = ''; $('#evType').value = ''; $('#showGtm').checked = false; render(); };
$('#preserve').onchange = (e) => sendPort({ kind: 'preserve', value: e.target.checked });
$('#clear').onclick = () => { rows = []; selected = null; detail.innerHTML = EMPTY_HTML; render(); sendPort({ kind: 'clear' }); };
$('#export').onclick = () => download('ga4-gtm-' + Date.now() + '.json', JSON.stringify(rows, null, 2), 'application/json');
$('#exportCsv').onclick = () => download('ga4-gtm-' + Date.now() + '.csv', toCsv(), 'text/csv;charset=utf-8');
