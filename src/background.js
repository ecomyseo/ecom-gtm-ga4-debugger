const MAX = 800;
const store = new Map(); // tabId -> { events: [], env: null, preserve: false }
const ports = new Map(); // tabId -> Set<Port>

function state(tabId) {
  if (!store.has(tabId)) store.set(tabId, { events: [], env: null, preserve: false });
  return store.get(tabId);
}

function broadcast(tabId, payload) {
  const set = ports.get(tabId);
  if (!set) return;
  for (const p of set) { try { p.postMessage(payload); } catch (e) {} }
}

// Histórico persistente: sobrevive a que el service worker se duerma
const saveT = new Map();
function persist(tabId) {
  if (saveT.has(tabId)) return;
  saveT.set(tabId, setTimeout(() => {
    saveT.delete(tabId);
    try { chrome.storage.session.set({ ['hist_' + tabId]: store.get(tabId) || { events: [], env: null, preserve: false } }); } catch (e) {}
  }, 800));
}
function dropHist(tabId) { try { chrome.storage.session.remove('hist_' + tabId); } catch (e) {} }

chrome.runtime.onMessage.addListener((msg, sender) => {
  const tabId = sender.tab && sender.tab.id;
  if (!tabId || !msg || msg.__ga4dbg !== 1) return;
  const s = state(tabId);

  if (msg.type === 'env') {
    // El env del frame SUPERIOR manda; los iframes (anuncios, doubleclick…) mandan env
    // vacío y NO deben machacar el bueno (el env se guarda por pestaña, no por frame).
    if (msg.top || !s.env) s.env = msg.data;
  } else {
    s.events.push(msg);
    if (s.events.length > MAX) s.events.shift();
  }
  broadcast(tabId, { kind: 'push', msg });
  persist(tabId);

  if (msg.type === 'hit') {
    const n = s.events.reduce((a, e) => a + (e.type === 'hit' ? e.data.events.length : 0), 0);
    chrome.action.setBadgeText({ tabId, text: String(n) });
    chrome.action.setBadgeBackgroundColor({ tabId, color: '#1a73e8' });
  }
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'ga4dbg-panel') return;
  let tabId = null;

  port.onMessage.addListener((m) => {
    if (m.kind === 'init') {
      tabId = m.tabId;
      if (!ports.has(tabId)) ports.set(tabId, new Set());
      ports.get(tabId).add(port);
      const cur = state(tabId);
      if (!cur.events.length) {
        try {
          chrome.storage.session.get('hist_' + tabId, (o) => {
            const s = o && o['hist_' + tabId];
            if (s && s.events && s.events.length) store.set(tabId, s);
            port.postMessage({ kind: 'snapshot', state: state(tabId) });
          });
          return;
        } catch (e) {}
      }
      port.postMessage({ kind: 'snapshot', state: cur });
    }
    if (tabId == null) return;
    if (m.kind === 'clear') {
      const s = state(tabId);
      s.events = [];
      chrome.action.setBadgeText({ tabId, text: '' });
      dropHist(tabId);
    }
    if (m.kind === 'preserve') state(tabId).preserve = !!m.value;
  });

  port.onDisconnect.addListener(() => {
    if (tabId != null && ports.has(tabId)) ports.get(tabId).delete(port);
  });
});

chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status !== 'loading') return;
  const s = state(tabId);
  if (s.preserve) return;
  s.events = [];
  s.env = null;
  chrome.action.setBadgeText({ tabId, text: '' });
  dropHist(tabId);
  broadcast(tabId, { kind: 'reset' });
});

chrome.tabs.onRemoved.addListener((id) => { store.delete(id); ports.delete(id); dropHist(id); });
