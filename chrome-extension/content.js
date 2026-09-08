(() => {
  if (window.__JOB_ASSISTANT_FORM_SCANNER__) return;
  window.__JOB_ASSISTANT_FORM_SCANNER__ = true;

  const state = { fields: [] };
  const ignoredTypes = new Set(['hidden', 'submit', 'button', 'reset', 'image', 'file', 'password']);

  const normalize = (value = '') => value.toLowerCase().replace(/[\s\-_:/：*（）()【】\[\].,，。?？]/g, '');
  const textOf = (node) => (node?.textContent || '').replace(/\s+/g, ' ').trim();

  const getLabel = (element) => {
    const aria = element.getAttribute('aria-label');
    if (aria) return aria.trim();
    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy) {
      const text = labelledBy.split(/\s+/).map((id) => textOf(document.getElementById(id))).filter(Boolean).join(' ');
      if (text) return text;
    }
    if (element.labels?.length) {
      const text = [...element.labels].map(textOf).filter(Boolean).join(' ');
      if (text) return text;
    }
    const wrapped = element.closest('label');
    if (wrapped) {
      const clone = wrapped.cloneNode(true);
      clone.querySelectorAll('input,select,textarea,button').forEach((node) => node.remove());
      const text = textOf(clone);
      if (text) return text;
    }
    const placeholder = element.getAttribute('placeholder');
    if (placeholder) return placeholder.trim();
    return element.getAttribute('name') || element.id || element.getAttribute('data-testid') || '未命名字段';
  };

  const getSectionContext = (element) => {
    const container = element.closest('fieldset, section, article, [role="group"], .form-item, .form-group');
    const heading = container?.querySelector('legend,h1,h2,h3,h4,[class*="title"],[class*="label"]');
    return textOf(heading).slice(0, 80);
  };

  const detectKey = (label, context) => {
    const text = normalize(`${label} ${context}`);
    const exact = normalize(label);
    const has = (...patterns) => patterns.some((pattern) => pattern.test(text));

    if (has(/签证|visa|sponsor|workauthorization/)) return ['visa_sponsorship', 96];
    if (has(/电子邮箱|邮箱|email|emailaddress/)) return ['email', 99];
    if (has(/手机号|手机号码|联系电话|电话|mobile|phone|telephone/)) return ['phone', 98];
    if (has(/学院|college|faculty|schoolof/)) return ['college_name', 96];
    if (has(/学校|院校|毕业院校|university|schoolname/)) return ['school_name', 97];
    if (has(/专业名称|所学专业|major|fieldofstudy/)) return ['major_name', 96];
    if (has(/学历|学位|degree|educationlevel/)) return ['degree', 95];
    if (has(/公司名称|任职公司|雇主|employer|companyname|organization/)) return ['company_name', 95];
    if (has(/部门名称|所在部门|department|division|businessunit/)) return ['department_name', 94];
    if (has(/项目角色|projectrole/)) return ['project_role', 100];
    if (has(/项目名称|projectname/)) return ['project_name', 95];
    if (has(/当前职位|职位名称|岗位名称|jobtitle|positiontitle|currenttitle/)) return ['position', 94];
    if (has(/当前所在地|所在城市|工作地点|location|city|currentlocation/)) return ['current_location', 93];
    if (has(/期望薪资|薪资期望|expectedsalary|salaryexpectation/)) return ['expected_salary', 96];
    if (has(/到岗时间|通知期|noticeperiod|availabledate|availability/)) return ['notice_period', 93];
    if (has(/语言类型|language/)) return ['language_type', 90];
    if (has(/语言考试|考试类型|languagetest|exam/)) return ['exam_name', 90];
    if (has(/考试分数|score/)) return ['exam_score', 88];
    if (/^(姓名|名字|fullname|legalname|candidatename|name)$/.test(exact)) return ['full_name', 98];
    return ['', 0];
  };

  const trustedValues = (trustedProfile) => {
    const profile = trustedProfile?.profile || {};
    const education = trustedProfile?.education?.[0] || {};
    const internship = trustedProfile?.internships?.[0] || {};
    const project = trustedProfile?.projects?.[0] || {};
    const language = trustedProfile?.languages?.[0] || {};
    const memories = Object.fromEntries((trustedProfile?.memories || []).map((item) => [item.field_key, item.value]));
    return {
      full_name: [profile.name || '', '标准个人资料'],
      email: [profile.email || '', '标准个人资料'],
      phone: [profile.phone || '', '标准个人资料'],
      current_location: [profile.current_location || '', '标准个人资料'],
      expected_salary: [profile.expected_salary || memories.expected_salary || '', '标准个人资料'],
      notice_period: [profile.notice_period || '', '标准个人资料'],
      school_name: [education.school_name || '', '教育经历'],
      college_name: [education.college_name || '', '教育经历'],
      major_name: [education.major_name || '', '教育经历'],
      degree: [education.degree || '', '教育经历'],
      company_name: [internship.company_name || '', '实习经历'],
      department_name: [internship.department_name || '', '实习经历'],
      position: [internship.position || '', '实习经历'],
      project_name: [project.project_name || '', '项目经历'],
      project_role: [project.project_name ? 'Agent开发' : '', '项目经历'],
      language_type: [language.language_type || '', '语言水平'],
      exam_name: [language.exam_name || '', '语言水平'],
      exam_score: [language.score || '', '语言水平'],
      visa_sponsorship: [memories.visa_sponsorship || '', '已记住的答案'],
    };
  };

  const ensureStyles = () => {
    if (document.getElementById('job-assistant-field-styles')) return;
    const style = document.createElement('style');
    style.id = 'job-assistant-field-styles';
    style.textContent = `
      .job-assistant-matched { outline: 2px solid rgba(31, 111, 87, .72) !important; outline-offset: 2px !important; }
      .job-assistant-unknown { outline: 2px solid rgba(181, 117, 48, .72) !important; outline-offset: 2px !important; }
      .job-assistant-filled { box-shadow: 0 0 0 3px rgba(31, 111, 87, .18) !important; }
    `;
    document.documentElement.appendChild(style);
  };

  const eligibleElements = () => [...document.querySelectorAll('input, textarea, select, [contenteditable="true"]')].filter((element) => {
    if (!(element instanceof HTMLElement) || !element.isConnected) return false;
    if (element.matches('input') && ignoredTypes.has(element.type)) return false;
    if (element.hasAttribute('disabled') || element.hasAttribute('readonly')) return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });

  const scan = async () => {
    ensureStyles();
    const { trustedProfile, fieldMemories = {} } = await chrome.storage.local.get(['trustedProfile', 'fieldMemories']);
    const values = trustedValues(trustedProfile);
    const seenRadioGroups = new Set();

    state.fields = eligibleElements().flatMap((element, index) => {
      if (element instanceof HTMLInputElement && element.type === 'radio') {
        const group = element.name || `radio-${index}`;
        if (seenRadioGroups.has(group)) return [];
        seenRadioGroups.add(group);
      }

      element.classList.remove('job-assistant-matched', 'job-assistant-unknown', 'job-assistant-filled');
      const id = `ja-${Date.now()}-${index}`;
      element.dataset.jobAssistantId = id;
      const label = getLabel(element);
      const context = getSectionContext(element);
      const [key, confidence] = detectKey(label, context);
      const webMemory = (trustedProfile?.memories || []).find((item) => normalize(item.label) === normalize(label));
      const localMemory = fieldMemories[normalize(label)];
      const remembered = webMemory
        ? { fieldKey: webMemory.field_key, value: webMemory.value, source: '职途助手已记住的答案' }
        : localMemory
          ? { ...localMemory, source: '本机暂存答案' }
          : null;
      const [profileValue = '', profileSource = ''] = key ? (values[key] || []) : [];
      const useProfileValue = Boolean(profileValue);
      const value = useProfileValue ? profileValue : remembered?.value || '';
      const source = useProfileValue ? profileSource : remembered?.source || profileSource;
      const finalConfidence = remembered && !useProfileValue ? 100 : value ? confidence : 0;
      element.classList.add(value ? 'job-assistant-matched' : 'job-assistant-unknown');
      return [{
        id,
        label,
        key: remembered?.fieldKey || key,
        value,
        source: source || (key ? '可信资料中缺少答案' : '未识别字段'),
        confidence: finalConfidence,
        tag: element.tagName.toLowerCase(),
        inputType: element instanceof HTMLInputElement ? element.type : '',
        name: element.getAttribute('name') || '',
      }];
    });

    return {
      ok: true,
      total: state.fields.length,
      matched: state.fields.filter((field) => field.value && field.confidence >= 85).length,
      unknown: state.fields.filter((field) => !field.value).length,
      fields: state.fields.map(({ id, ...field }) => ({ id, ...field })),
      syncedAt: trustedProfile?.syncedAt || '',
    };
  };

  const setNativeValue = (element, value) => {
    const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    setter ? setter.call(element, value) : (element.value = value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
  };

  const fillElement = (element, field) => {
    if (!field.value || field.confidence < 85) return false;

    if (element instanceof HTMLSelectElement) {
      const wanted = normalize(field.value);
      const option = [...element.options].find((item) => normalize(item.value) === wanted || normalize(item.text) === wanted)
        || [...element.options].find((item) => normalize(item.text).includes(wanted) || wanted.includes(normalize(item.text)));
      if (!option) return false;
      element.value = option.value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (element instanceof HTMLInputElement && element.type === 'checkbox') {
      const checked = /^(是|yes|true|需要|同意)$/i.test(field.value.trim());
      if (element.checked !== checked) element.click();
    } else if (element instanceof HTMLInputElement && element.type === 'radio') {
      const radios = [...document.querySelectorAll(`input[type="radio"][name="${CSS.escape(element.name)}"]`)];
      const wanted = normalize(field.value);
      const radio = radios.find((item) => normalize(getLabel(item)).includes(wanted) || normalize(item.value) === wanted);
      if (!radio) return false;
      radio.click();
    } else if (element.isContentEditable) {
      element.textContent = field.value;
      element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: field.value }));
      element.dispatchEvent(new Event('blur', { bubbles: true }));
    } else if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      let value = field.value;
      if (element instanceof HTMLInputElement && element.type === 'date' && /^\d{4}-\d{2}$/.test(value)) value = `${value}-01`;
      setNativeValue(element, value);
    } else {
      return false;
    }

    element.classList.add('job-assistant-filled');
    return true;
  };

  const fill = async () => {
    if (!state.fields.length) await scan();
    let filled = 0;
    for (const field of state.fields) {
      const element = document.querySelector(`[data-job-assistant-id="${CSS.escape(field.id)}"]`);
      if (element && fillElement(element, field)) filled += 1;
    }
    return { ok: true, filled, total: state.fields.length };
  };

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message?.type) return false;
    if (message.type === 'SCAN_FORM') {
      void scan().then(sendResponse).catch((error) => sendResponse({ ok: false, error: error.message }));
      return true;
    }
    if (message.type === 'FILL_FORM') {
      void fill().then(sendResponse).catch((error) => sendResponse({ ok: false, error: error.message }));
      return true;
    }
    return false;
  });
})();
