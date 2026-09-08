(() => {
  if (window.__JOB_ASSISTANT_SITE_SYNC__) return;
  window.__JOB_ASSISTANT_SITE_SYNC__ = true;

  const syncAll = async () => {
    try {
      const {
        pendingMemories = [],
        pendingApplications = [],
        pendingStatusChecks = [],
      } = await chrome.storage.local.get([
        'pendingMemories',
        'pendingApplications',
        'pendingStatusChecks',
      ]);
      const remainingMemories = [];
      const remainingApplications = [];
      const remainingStatusChecks = [];

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
          if (!response.ok) remainingMemories.push(memory);
        } catch {
          remainingMemories.push(memory);
        }
      }

      for (const job of pendingApplications) {
        try {
          const response = await fetch('/api/dashboard', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ type: 'capture-external-job', job }),
          });
          if (!response.ok) remainingApplications.push(job);
        } catch {
          remainingApplications.push(job);
        }
      }

      for (const check of pendingStatusChecks) {
        try {
          const response = await fetch('/api/dashboard', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ type: 'extension-status-check', check }),
          });
          if (!response.ok) remainingStatusChecks.push(check);
        } catch {
          remainingStatusChecks.push(check);
        }
      }

      const response = await fetch('/api/dashboard', {
        credentials: 'same-origin',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      await chrome.storage.local.set({
        trustedProfile: { ...payload, syncedAt: new Date().toISOString() },
        pendingMemories: remainingMemories,
        pendingApplications: remainingApplications,
        pendingStatusChecks: remainingStatusChecks,
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
