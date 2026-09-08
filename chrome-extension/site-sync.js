(() => {
  if (window.__JOB_ASSISTANT_SITE_SYNC__) return;
  window.__JOB_ASSISTANT_SITE_SYNC__ = true;

  const syncAll = async () => {
    try {
      const { pendingMemories = [] } = await chrome.storage.local.get('pendingMemories');
      const remaining = [];

      for (const memory of pendingMemories) {
        try {
          const response = await fetch('/api/dashboard', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
              type: 'remember-answer',
              fieldKey: memory.fieldKey,
              label: memory.label,
              value: memory.value,
              scope: 'global',
            }),
          });
          if (!response.ok) remaining.push(memory);
        } catch {
          remaining.push(memory);
        }
      }

      const response = await fetch('/api/dashboard', { credentials: 'same-origin' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      await chrome.storage.local.set({
        trustedProfile: { ...payload, syncedAt: new Date().toISOString() },
        pendingMemories: remaining,
        profileSyncError: '',
      });
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : '同步失败';
      await chrome.storage.local.set({ profileSyncError: message });
      return { ok: false, error: message };
    }
  };

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== 'SYNC_SITE_PROFILE') return false;
    void syncAll().then(sendResponse);
    return true;
  });

  void syncAll();
})();
