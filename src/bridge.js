window.addEventListener('message', (e) => {
  if (e.source !== window) return;
  const d = e.data;
  if (!d || d.__ga4dbg !== 1) return;
  try {
    chrome.runtime.sendMessage(d, () => void chrome.runtime.lastError);
  } catch (err) {}
});
