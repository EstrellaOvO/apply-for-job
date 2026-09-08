const SITE_ORIGIN = 'https://job-application-companion.alight-hare-2905.chatgpt.site';

const elements = {
  syncTitle: document.getElementById('syncTitle'),
  syncDetail: document.getElementById('syncDetail'),
  syncButton: document.getElementById('syncButton'),
  scanButton: document.getElementById('scanButton'),
  fillButton: document.getElementById('fillButton'),
  statusText: document.getElementById('statusText'),
  summary: document.getElementById('summary'),
  totalCount: document.getElementById('totalCount'),
  matchedCount: document.getElementById('matchedCount'),
  unknownCount: document.getElementById('unknownCount'),
  resultsSection: document.getElementById('resultsSection'),
  fieldList: document.getElementById('fieldList'),
  unknownSection: document.getElementById('unknownSection'),
  unknownList: document.getElementById('unknownList'),
};

let lastScan = null;

const normalize = (value = '') => value.toLowerCase().replace(/[\s\-_:/：*（）()【】\[\].,，。?？]/g, '');
const hash = (value) => {
  let result = 5381;
  for (const char of value) result = ((result << 5) + result) ^ char.charCodeAt(0);
  return (result >>> 0).toString(36);
};
const escapeHtml = (value = '') => value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);

const getActiveTab = async () => (await chrome.tabs.query({ active: true, currentWindow: true }))[0];

const updateProfileStatus = async () => {
  const { trustedProfile, pendingMemories = [], profileSyncError = '' } = await chrome.storage.local.get(['trustedProfile', 'pendingMemories', 'profileSyncError']);
  if (!trustedProfile) {
    elements.syncTitle.textContent = '尚未同步可信资料';
    elements.syncDetail.textContent = profileSyncError || '打开职途助手即可自动同步';
    elements.syncButton.textContent = '打开';
    return;
  }
  const time = new Date(trustedProfile.syncedAt);
  elements.syncTitle.textContent = '可信资料已就绪';
  elements.syncDetail.textContent = `${time.toLocaleString('zh-CN')} 同步${pendingMemories.length ? ` · ${pendingMemories.length} 条答案待回写` : ''}`;
  elements.syncButton.textContent = '刷新';
};

const ensureScanner = async (tabId) => {
  await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
};

const messageTab = async (type) => {
  const tab = await getActiveTab();
  if (!tab?.id) throw new Error('找不到当前标签页');
  await ensureScanner(tab.id);
  return chrome.tabs.sendMessage(tab.id, { type });
};

const renderScan = (scan) => {
  lastScan = scan;
  elements.summary.classList.remove('hidden');
  elements.resultsSection.classList.remove('hidden');
  elements.totalCount.textContent = String(scan.total);
  elements.matchedCount.textContent = String(scan.matched);
  elements.unknownCount.textContent = String(scan.unknown);
  elements.fillButton.disabled = scan.matched === 0;
  elements.statusText.textContent = `已识别 ${scan.total} 个字段，其中 ${scan.matched} 个可从可信资料自动填写。`;
  elements.fieldList.innerHTML = scan.fields.map((field) => `
    <div class="field-row ${field.value ? 'matched' : ''}">
      <span class="field-dot"></span>
      <div class="field-copy"><strong>${escapeHtml(field.label)}</strong><span>${escapeHtml(field.source)}${field.value ? ` · ${escapeHtml(field.value)}` : ''}</span></div>
      <span class="confidence">${field.confidence ? `${field.confidence}%` : '待确认'}</span>
    </div>
  `).join('');

  const unknown = scan.fields.filter((field) => !field.value).slice(0, 8);
  elements.unknownSection.classList.toggle('hidden', unknown.length === 0);
  elements.unknownList.innerHTML = unknown.map((field) => `
    <div class="unknown-item">
      <label for="answer-${escapeHtml(field.id)}">${escapeHtml(field.label)}</label>
      <div class="answer-row"><input id="answer-${escapeHtml(field.id)}" data-field-id="${escapeHtml(field.id)}" placeholder="输入以后使用的答案" /><button type="button" data-save-id="${escapeHtml(field.id)}">记住</button></div>
    </div>
  `).join('');

  elements.unknownList.querySelectorAll('[data-save-id]').forEach((button) => {
    button.addEventListener('click', () => void saveUnknownAnswer(button.dataset.saveId));
  });
};

const saveUnknownAnswer = async (fieldId) => {
  const field = lastScan?.fields.find((item) => item.id === fieldId);
  const input = elements.unknownList.querySelector(`[data-field-id="${CSS.escape(fieldId)}"]`);
  const value = input?.value.trim();
  if (!field || !value) return;

  const storageKey = normalize(field.label);
  const fieldKey = field.key || `extension_${hash(storageKey)}`;
  const { fieldMemories = {}, pendingMemories = [] } = await chrome.storage.local.get(['fieldMemories', 'pendingMemories']);
  fieldMemories[storageKey] = { fieldKey, label: field.label, value };
  const memory = { id: crypto.randomUUID(), fieldKey, label: field.label, value };
  await chrome.storage.local.set({
    fieldMemories,
    pendingMemories: [...pendingMemories.filter((item) => item.fieldKey !== fieldKey), memory],
  });
  elements.statusText.textContent = `已记住“${field.label}”，打开职途助手时会自动回写。`;
  renderScan(await messageTab('SCAN_FORM'));
  await updateProfileStatus();
};

elements.scanButton.addEventListener('click', async () => {
  elements.scanButton.disabled = true;
  elements.statusText.textContent = '正在读取当前页面字段…';
  try {
    const result = await messageTab('SCAN_FORM');
    if (!result?.ok) throw new Error(result?.error || '扫描失败');
    renderScan(result);
  } catch (error) {
    elements.statusText.textContent = `无法扫描：${error instanceof Error ? error.message : '当前页面不支持扩展注入'}`;
  } finally {
    elements.scanButton.disabled = false;
  }
});

elements.fillButton.addEventListener('click', async () => {
  elements.fillButton.disabled = true;
  elements.statusText.textContent = '正在填写高置信字段…';
  try {
    const result = await messageTab('FILL_FORM');
    if (!result?.ok) throw new Error(result?.error || '填写失败');
    elements.statusText.textContent = `已填写 ${result.filled} 个字段。请逐项复核后自行提交申请。`;
    elements.fillButton.textContent = '已完成填写';
  } catch (error) {
    elements.statusText.textContent = `填写失败：${error instanceof Error ? error.message : '未知错误'}`;
    elements.fillButton.disabled = false;
  }
});

elements.syncButton.addEventListener('click', async () => {
  const tab = await getActiveTab();
  if (tab?.url?.startsWith(SITE_ORIGIN) && tab.id) {
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'SYNC_SITE_PROFILE' });
      elements.syncDetail.textContent = '同步请求已发送…';
      window.setTimeout(() => void updateProfileStatus(), 900);
      return;
    } catch {
      // Reloading the page will reinstall the site sync bridge.
    }
  }
  await chrome.tabs.create({ url: SITE_ORIGIN });
});

void updateProfileStatus();
