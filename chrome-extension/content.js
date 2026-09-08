(() => {
  if (window.__JOB_ASSISTANT_FORM_SCANNER__) return;
  window.__JOB_ASSISTANT_FORM_SCANNER__ = true;

  const state = { fields: [], labelCandidates: [], sectionCandidates: [] };
  const controlSelector = 'input, textarea, select, [contenteditable="true"]';
  const ignoredTypes = new Set([
    'hidden',
    'submit',
    'button',
    'reset',
    'image',
    'file',
    'password',
  ]);
  const repeatedKeys = new Set([
    'school_name',
    'college_name',
    'major_name',
    'degree',
    'education_start_date',
    'education_end_date',
    'company_name',
    'department_name',
    'position',
    'internship_start_date',
    'internship_end_date',
    'internship_description',
    'project_name',
    'project_role',
    'project_start_date',
    'project_end_date',
    'project_description',
    'project_link',
  ]);

  const normalize = (value = '') =>
    value.toLowerCase().replace(/[\s\-_:/：*（）()【】\[\].,，。?？]/g, '');
  const equivalent = (left, right) => {
    const a = normalize(left);
    const b = normalize(right);
    return Boolean(a && b && (a === b || a.includes(b) || b.includes(a)));
  };
  const textOf = (node) =>
    (node?.textContent || '').replace(/\s+/g, ' ').trim();
  const isVisible = (element) => {
    if (!(element instanceof HTMLElement) || !element.isConnected) return false;
    const style = getComputedStyle(element);
    if (
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      Number(style.opacity) === 0
    )
      return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };
  const isEligible = (element) => {
    if (!isVisible(element)) return false;
    if (element instanceof HTMLInputElement && ignoredTypes.has(element.type))
      return false;
    return (
      !element.hasAttribute('disabled') && !element.hasAttribute('readonly')
    );
  };
  const controlsWithin = (root) =>
    [...root.querySelectorAll(controlSelector)].filter(isEligible);

  const buildTextCaches = () => {
    const likelyLabels = new Set([
      ...document.querySelectorAll(
        'label, legend, dt, [class*="label" i], [class*="title" i]',
      ),
      ...document.querySelectorAll('body div, body span'),
    ]);
    state.labelCandidates = [...likelyLabels].filter((node) => {
      const text = textOf(node);
      return (
        isVisible(node) &&
        !node.querySelector(controlSelector) &&
        text.length > 0 &&
        text.length <= 160
      );
    });
    state.sectionCandidates = [
      ...document.querySelectorAll('h1,h2,h3,h4,h5,h6,legend,div,span'),
    ].filter((node) => {
      if (!isVisible(node) || node.childElementCount > 4) return false;
      return /^(基本信息|个人信息|教育经历|教育背景|实习经历|工作经历|工作\/实习经历|项目经历|项目经验|ai技能运用|语言水平|语言能力)$/i.test(
        textOf(node),
      );
    });
  };

  const closestUsefulContainer = (element, maxControls = 4) => {
    let node = element.parentElement;
    let fallback = node;
    for (
      let depth = 0;
      node && depth < 7;
      depth += 1, node = node.parentElement
    ) {
      const controls = controlsWithin(node);
      if (controls.length > 0 && controls.length <= maxControls) {
        fallback = node;
        const hasLabel = [
          ...node.querySelectorAll(
            'label,legend,dt,[class*="label" i],[class*="title" i]',
          ),
        ].some(
          (candidate) =>
            !candidate.contains(element) && textOf(candidate).length > 0,
        );
        if (hasLabel) return node;
      }
      if (controls.length > 12) break;
    }
    return fallback;
  };

  const nearestGeometricLabel = (element, excluded = new Set()) => {
    const rect = element.getBoundingClientRect();
    let best = null;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const candidate of state.labelCandidates) {
      if (excluded.has(candidate) || candidate.contains(element)) continue;
      const candidateRect = candidate.getBoundingClientRect();
      const verticalGap = rect.top - candidateRect.bottom;
      const horizontalGap = rect.left - candidateRect.right;
      const horizontalOverlap =
        candidateRect.right >= rect.left - 20 &&
        candidateRect.left <= rect.right + 20;
      const verticalOverlap =
        candidateRect.bottom >= rect.top - 8 &&
        candidateRect.top <= rect.bottom + 8;
      let score = Number.POSITIVE_INFINITY;
      if (verticalGap >= -8 && verticalGap <= 90 && horizontalOverlap) {
        score =
          Math.max(0, verticalGap) +
          Math.abs(candidateRect.left - rect.left) * 0.08;
      } else if (
        horizontalGap >= -8 &&
        horizontalGap <= 260 &&
        verticalOverlap
      ) {
        score =
          Math.max(0, horizontalGap) +
          Math.abs(candidateRect.top - rect.top) * 0.3 +
          18;
      }
      if (score < bestScore) {
        best = candidate;
        bestScore = score;
      }
    }
    return best ? textOf(best) : '';
  };

  const getRadioGroup = (element) => {
    if (!(element instanceof HTMLInputElement) || element.type !== 'radio')
      return [element];
    if (!element.name) return [element];
    return [
      ...document.querySelectorAll(
        `input[type="radio"][name="${CSS.escape(element.name)}"]`,
      ),
    ].filter(isEligible);
  };

  const getRadioQuestion = (element) => {
    const group = getRadioGroup(element);
    const excluded = new Set(
      group.flatMap((radio) => [...(radio.labels || [])]),
    );
    const optionContainers = group
      .map((radio) => radio.closest('label,[class*="radio" i],[role="radio"]'))
      .filter(Boolean);
    let common = element.parentElement;
    while (common && !group.every((radio) => common.contains(radio)))
      common = common.parentElement;
    let node = common;
    for (
      let depth = 0;
      node && depth < 5;
      depth += 1, node = node.parentElement
    ) {
      const candidates = [
        ...node.querySelectorAll(
          'legend,[class*="label" i],[class*="title" i],label',
        ),
      ].filter(
        (candidate) =>
          !excluded.has(candidate) &&
          !group.some((radio) => candidate.contains(radio)) &&
          !optionContainers.some(
            (container) =>
              container === candidate || container.contains(candidate),
          ),
      );
      const text = candidates
        .map(textOf)
        .find((value) => value && value.length <= 160);
      if (text) return text;
      if (controlsWithin(node).length > group.length + 4) break;
    }
    return nearestGeometricLabel(element, excluded);
  };

  const getLabel = (element) => {
    if (element instanceof HTMLInputElement && element.type === 'radio') {
      return getRadioQuestion(element) || '单选问题';
    }
    const aria = element.getAttribute('aria-label');
    if (aria) return aria.trim();
    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy) {
      const text = labelledBy
        .split(/\s+/)
        .map((id) => textOf(document.getElementById(id)))
        .filter(Boolean)
        .join(' ');
      if (text) return text;
    }
    if (element.labels?.length) {
      const text = [...element.labels].map(textOf).filter(Boolean).join(' ');
      if (text) return text;
    }
    const container = closestUsefulContainer(element);
    if (container) {
      const candidates = [
        ...container.querySelectorAll(
          'legend,dt,[class*="label" i],[class*="title" i],label',
        ),
        ...container.children,
      ].filter(
        (candidate) =>
          !candidate.contains(element) &&
          !candidate.querySelector(controlSelector),
      );
      const text = candidates
        .map(textOf)
        .find((value) => value && value.length <= 160);
      if (text) return text;
      const previous =
        element.parentElement?.previousElementSibling ||
        element.previousElementSibling;
      const previousText = textOf(previous);
      if (previousText && previousText.length <= 160) return previousText;
    }
    const nearby = nearestGeometricLabel(element);
    if (nearby) return nearby;
    const placeholder = element.getAttribute('placeholder');
    if (placeholder && !/^(请输入|请选择|yyyy|mm|dd)/i.test(placeholder.trim()))
      return placeholder.trim();
    return (
      element.getAttribute('name') ||
      element.id ||
      element.getAttribute('data-testid') ||
      '未命名字段'
    );
  };

  const getSectionContext = (element) => {
    const rect = element.getBoundingClientRect();
    let best = '';
    let bestGap = Number.POSITIVE_INFINITY;
    for (const candidate of state.sectionCandidates) {
      const candidateRect = candidate.getBoundingClientRect();
      const gap = rect.top - candidateRect.top;
      if (gap >= -20 && gap < bestGap) {
        best = textOf(candidate);
        bestGap = gap;
      }
    }
    return bestGap < 1600 ? best : '';
  };

  const getRangePart = (element) => {
    let node = element.parentElement;
    for (
      let depth = 0;
      node && depth < 5;
      depth += 1, node = node.parentElement
    ) {
      const controls = controlsWithin(node).filter(
        (control) => control instanceof HTMLInputElement,
      );
      if (controls.length === 2)
        return controls.indexOf(element) <= 0 ? 'start' : 'end';
      if (controls.length > 4) break;
    }
    return 'start';
  };

  const detectKey = (label, context, element) => {
    const text = normalize(`${label} ${context}`);
    const exact = normalize(label);
    const section = normalize(context);
    const has = (...patterns) => patterns.some((pattern) => pattern.test(text));

    if (has(/签证|visa|sponsor|workauthorization/))
      return ['visa_sponsorship', 96];
    if (has(/电子邮箱|邮箱|email|emailaddress/)) return ['email', 99];
    if (has(/手机号|手机号码|联系电话|电话|mobile|phone|telephone/))
      return ['phone', 98];
    if (has(/出生日期|出生年月|birthdate|dateofbirth|birthday/))
      return ['birth_date', 97];
    if (has(/证件号码|身份证|identitynumber|idnumber|passportnumber/))
      return ['identity_number', 97];
    if (has(/性别|gender|sex/)) return ['gender', 96];
    if (
      has(
        /通过何种方式|获知.*招聘|招聘信息来源|内推|推荐渠道|referralsource|howdidyouhear/,
      )
    )
      return ['referral_source', 93];
    if (has(/预计毕业时间|毕业时间|graduationdate/))
      return ['graduation_date', 95];
    if (has(/家庭现居住地|家庭所在地|籍贯|hometown|homeaddress/))
      return ['home_location', 90];
    if (has(/常用.*ai工具|ai工具.*模型|aitools|aimodels/))
      return ['ai_tools', 94];
    if (has(/与ai协作.*项目|ai协作.*任务|aiproject|aitask/))
      return ['ai_project_description', 91];
    if (has(/相关项目.*链接|作品链接|项目链接|projectlink|portfolio/))
      return ['project_link', 94];
    if (has(/项目角色|projectrole/)) return ['project_role', 100];
    if (has(/项目名称|projectname/)) return ['project_name', 96];
    if (
      (exact === '描述' || has(/项目描述|projectdescription/)) &&
      /项目/.test(section)
    )
      return ['project_description', 92];
    if (
      (exact === '描述' || has(/工作描述|实习描述|职责描述/)) &&
      /(实习|工作)/.test(section)
    )
      return ['internship_description', 92];
    if (has(/学院|college|faculty|schoolof/)) return ['college_name', 96];
    if (has(/学校名称|学校|院校|毕业院校|university|schoolname/))
      return ['school_name', 97];
    if (has(/专业名称|所学专业|专业|major|fieldofstudy/))
      return ['major_name', 96];
    if (has(/学历|学位|degree|educationlevel/)) return ['degree', 95];
    if (has(/公司名称|任职公司|雇主|employer|companyname|organization/))
      return ['company_name', 95];
    if (has(/部门名称|所在部门|department|division|businessunit/))
      return ['department_name', 94];
    if (
      has(/当前职位|职位名称|岗位名称|职位|jobtitle|positiontitle|currenttitle/)
    )
      return ['position', 94];
    if (
      has(/起止时间|在职时间|项目时间|教育时间|daterange|start.*end/) ||
      exact === '时间'
    ) {
      const part = getRangePart(element);
      if (/教育/.test(section)) return [`education_${part}_date`, 94];
      if (/(实习|工作)/.test(section)) return [`internship_${part}_date`, 94];
      if (/项目/.test(section)) return [`project_${part}_date`, 94];
    }
    if (has(/当前所在地|所在城市|工作地点|location|city|currentlocation/))
      return ['current_location', 93];
    if (has(/期望薪资|薪资期望|expectedsalary|salaryexpectation/))
      return ['expected_salary', 96];
    if (has(/到岗时间|通知期|noticeperiod|availabledate|availability/))
      return ['notice_period', 93];
    if (has(/语言类型|language/)) return ['language_type', 90];
    if (has(/语言考试|考试类型|languagetest|exam/)) return ['exam_name', 90];
    if (has(/考试分数|score/)) return ['exam_score', 88];
    if (/^(姓名|名字|fullname|legalname|candidatename|name)$/.test(exact))
      return ['full_name', 98];
    return ['', 0];
  };

  const currentValueOf = (element) => {
    if (element instanceof HTMLSelectElement)
      return element.selectedOptions[0]?.text?.trim() || element.value;
    if (element instanceof HTMLInputElement && element.type === 'radio') {
      const checked = getRadioGroup(element).find((radio) => radio.checked);
      return checked ? textOf(checked.labels?.[0]) || checked.value : '';
    }
    if (element instanceof HTMLInputElement && element.type === 'checkbox')
      return element.checked ? '是' : '';
    if (element.isContentEditable) return textOf(element);
    return 'value' in element ? String(element.value || '').trim() : '';
  };

  const trustedSeries = (trustedProfile) => {
    const profile = trustedProfile?.profile || {};
    const education = trustedProfile?.education || [];
    const internships = trustedProfile?.internships || [];
    const projects = trustedProfile?.projects || [];
    const languages = trustedProfile?.languages || [];
    const currentEducation = [...education]
      .filter((item) => item.end_date)
      .sort((a, b) => b.end_date.localeCompare(a.end_date))[0];
    const series = {
      full_name: [[profile.name || '', '标准个人资料']],
      email: [[profile.email || '', '标准个人资料']],
      phone: [[profile.phone || '', '标准个人资料']],
      current_location: [[profile.current_location || '', '标准个人资料']],
      expected_salary: [[profile.expected_salary || '', '标准个人资料']],
      notice_period: [[profile.notice_period || '', '标准个人资料']],
      graduation_date: [[currentEducation?.end_date || '', '教育经历']],
      school_name: education.map((item) => [
        item.school_name || '',
        '教育经历',
      ]),
      college_name: education.map((item) => [
        item.college_name || '',
        '教育经历',
      ]),
      major_name: education.map((item) => [item.major_name || '', '教育经历']),
      degree: education.map((item) => [item.degree || '', '教育经历']),
      education_start_date: education.map((item) => [
        item.start_date || '',
        '教育经历',
      ]),
      education_end_date: education.map((item) => [
        item.end_date || '',
        '教育经历',
      ]),
      company_name: internships.map((item) => [
        item.company_name || '',
        '实习经历',
      ]),
      department_name: internships.map((item) => [
        item.department_name || '',
        '实习经历',
      ]),
      position: internships.map((item) => [item.position || '', '实习经历']),
      internship_start_date: internships.map((item) => [
        item.start_date || '',
        '实习经历',
      ]),
      internship_end_date: internships.map((item) => [
        item.end_date || '',
        '实习经历',
      ]),
      internship_description: internships.map((item) => [
        item.description || '',
        '实习经历',
      ]),
      project_name: projects.map((item) => [
        item.project_name || '',
        '项目经历',
      ]),
      project_role: projects.map(() => ['Agent开发', '项目经历']),
      project_start_date: projects.map((item) => [
        item.start_date || '',
        '项目经历',
      ]),
      project_end_date: projects.map((item) => [
        item.end_date || '',
        '项目经历',
      ]),
      project_description: projects.map((item) => [
        item.description || '',
        '项目经历',
      ]),
      ai_project_description: [[projects[0]?.description || '', '项目经历']],
      language_type: languages.map((item) => [
        item.language_type || '',
        '语言水平',
      ]),
      exam_name: languages.map((item) => [item.exam_name || '', '语言水平']),
      exam_score: languages.map((item) => [item.score || '', '语言水平']),
    };
    for (const memory of trustedProfile?.memories || []) {
      if (!series[memory.field_key]?.some(([value]) => value)) {
        series[memory.field_key] = [
          [memory.value || '', '职途助手已记住的答案'],
        ];
      }
    }
    return series;
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

  const eligibleElements = () =>
    [...document.querySelectorAll(controlSelector)].filter(isEligible);

  const scan = async () => {
    ensureStyles();
    buildTextCaches();
    const { trustedProfile, fieldMemories = {} } =
      await chrome.storage.local.get(['trustedProfile', 'fieldMemories']);
    const series = trustedSeries(trustedProfile);
    const occurrences = {};
    const seenRadioGroups = new Set();

    state.fields = eligibleElements().flatMap((element, index) => {
      if (element instanceof HTMLInputElement && element.type === 'radio') {
        const group = element.name || `radio-${index}`;
        if (seenRadioGroups.has(group)) return [];
        seenRadioGroups.add(group);
      }

      const relatedElements = getRadioGroup(element);
      for (const related of relatedElements) {
        related.classList.remove(
          'job-assistant-matched',
          'job-assistant-unknown',
          'job-assistant-filled',
        );
      }
      const id = `ja-${Date.now()}-${index}`;
      element.dataset.jobAssistantId = id;
      const label = getLabel(element);
      const context = getSectionContext(element);
      const currentValue = currentValueOf(element);
      const [key, confidence] = detectKey(label, context, element);
      const available = key ? series[key] || [] : [];
      const exactMatchIndex = currentValue
        ? available.findIndex(([candidate]) =>
            equivalent(candidate, currentValue),
          )
        : -1;
      const occurrence = repeatedKeys.has(key) ? occurrences[key] || 0 : 0;
      if (repeatedKeys.has(key)) occurrences[key] = occurrence + 1;
      const [profileValue = '', profileSource = ''] =
        available[exactMatchIndex >= 0 ? exactMatchIndex : occurrence] ||
        available[0] ||
        [];
      const webMemory = (trustedProfile?.memories || []).find(
        (item) => normalize(item.label) === normalize(label),
      );
      const localMemory = fieldMemories[normalize(label)];
      const remembered = webMemory
        ? {
            fieldKey: webMemory.field_key,
            value: webMemory.value,
            source: '职途助手已记住的答案',
          }
        : localMemory
          ? { ...localMemory, source: '本机暂存答案' }
          : null;
      const useProfileValue = Boolean(profileValue);
      const value = useProfileValue ? profileValue : remembered?.value || '';
      const source = useProfileValue
        ? profileSource
        : remembered?.source ||
          (key
            ? '可信资料中缺少答案'
            : currentValue
              ? '页面已有值，需确认'
              : '未识别字段');
      const finalConfidence =
        remembered && !useProfileValue ? 100 : value ? confidence : 0;
      for (const related of relatedElements)
        related.classList.add(
          value ? 'job-assistant-matched' : 'job-assistant-unknown',
        );
      return [
        {
          id,
          label,
          context,
          key: remembered?.fieldKey || key,
          value,
          currentValue,
          source,
          confidence: finalConfidence,
          tag: element.tagName.toLowerCase(),
          inputType: element instanceof HTMLInputElement ? element.type : '',
          name: element.getAttribute('name') || '',
        },
      ];
    });

    return {
      ok: true,
      total: state.fields.length,
      matched: state.fields.filter(
        (field) => field.value && field.confidence >= 85,
      ).length,
      unknown: state.fields.filter((field) => !field.value).length,
      fields: state.fields,
      syncedAt: trustedProfile?.syncedAt || '',
    };
  };

  const setNativeValue = (element, value) => {
    const prototype =
      element instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
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
      const option =
        [...element.options].find(
          (item) =>
            normalize(item.value) === wanted || normalize(item.text) === wanted,
        ) ||
        [...element.options].find(
          (item) =>
            normalize(item.text).includes(wanted) ||
            wanted.includes(normalize(item.text)),
        );
      if (!option) return false;
      element.value = option.value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (
      element instanceof HTMLInputElement &&
      element.type === 'checkbox'
    ) {
      const checked = /^(是|yes|true|需要|同意)$/i.test(field.value.trim());
      if (element.checked !== checked) element.click();
    } else if (
      element instanceof HTMLInputElement &&
      element.type === 'radio'
    ) {
      const radios = getRadioGroup(element);
      const wanted = normalize(field.value);
      const radio = radios.find(
        (item) =>
          normalize(textOf(item.labels?.[0])).includes(wanted) ||
          normalize(item.value) === wanted,
      );
      if (!radio) return false;
      radio.click();
    } else if (element.isContentEditable) {
      element.textContent = field.value;
      element.dispatchEvent(
        new InputEvent('input', {
          bubbles: true,
          inputType: 'insertText',
          data: field.value,
        }),
      );
      element.dispatchEvent(new Event('blur', { bubbles: true }));
    } else if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement
    ) {
      let value = field.value;
      if (
        element instanceof HTMLInputElement &&
        element.type === 'date' &&
        /^\d{4}-\d{2}$/.test(value)
      )
        value = `${value}-01`;
      setNativeValue(element, value);
    } else {
      return false;
    }
    element.classList.add('job-assistant-filled');
    return true;
  };

  const cleanPageText = (value = '', maxLength = 6000) => {
    const holder = document.createElement('div');
    holder.innerHTML = String(value);
    return textOf(holder).slice(0, maxLength);
  };

  const jobPostingJson = () => {
    for (const script of document.querySelectorAll(
      'script[type="application/ld+json"]',
    )) {
      try {
        const parsed = JSON.parse(script.textContent || '{}');
        const candidates = Array.isArray(parsed)
          ? parsed
          : [parsed, ...(parsed['@graph'] || [])];
        const job = candidates.find((item) => {
          const type = item?.['@type'];
          return (
            type === 'JobPosting' ||
            (Array.isArray(type) && type.includes('JobPosting'))
          );
        });
        if (job) return job;
      } catch {
        // Ignore malformed analytics or JSON-LD blocks.
      }
    }
    return null;
  };

  const firstVisibleText = (selectors) => {
    for (const selector of selectors) {
      const node = [...document.querySelectorAll(selector)].find(isVisible);
      const text = textOf(node);
      if (text) return text;
    }
    return '';
  };

  const extractLocation = (job) => {
    const location = Array.isArray(job?.jobLocation)
      ? job.jobLocation[0]
      : job?.jobLocation;
    const address = location?.address || {};
    return (
      [address.addressRegion, address.addressLocality, address.streetAddress]
        .filter(Boolean)
        .join(' · ') ||
      cleanPageText(job?.applicantLocationRequirements?.name || '', 200)
    );
  };

  const extractJobDetails = () => {
    const job = jobPostingJson();
    const hostname = location.hostname.replace(/^www\./, '');
    const rawTitle =
      cleanPageText(job?.title || '', 300) ||
      firstVisibleText([
        'h1',
        '[class*="job-title" i]',
        '[class*="jobName" i]',
        '[data-testid*="title" i]',
      ]) ||
      document.title.split(/[|｜·_-]/)[0].trim();
    const company =
      cleanPageText(job?.hiringOrganization?.name || '', 200) ||
      firstVisibleText([
        '[class*="company-name" i]',
        '[class*="companyName" i]',
        '[data-testid*="company" i]',
      ]) ||
      hostname.split('.')[0];
    const pageLocation =
      extractLocation(job) ||
      firstVisibleText([
        '[class*="job-location" i]',
        '[class*="jobLocation" i]',
        '[data-testid*="location" i]',
      ]);
    const description =
      cleanPageText(job?.description || '', 6000) ||
      firstVisibleText([
        '[class*="job-description" i]',
        '[class*="jobDescription" i]',
        '[class*="job-detail" i]',
        '[class*="jobDetail" i]',
        '[data-testid*="description" i]',
      ]).slice(0, 6000);
    return {
      company: company || '外部招聘网站',
      title: rawTitle || '待确认岗位',
      location: pageLocation,
      description,
      url: location.href.split('#')[0],
      source: hostname,
      capturedAt: new Date().toISOString(),
    };
  };

  const queueJobCapture = async () => {
    const job = extractJobDetails();
    const { pendingApplications = [] } = await chrome.storage.local.get(
      'pendingApplications',
    );
    await chrome.storage.local.set({
      pendingApplications: [
        ...pendingApplications.filter((item) => item.url !== job.url),
        job,
      ],
    });
    return job;
  };

  const detectApplicationStatus = () => {
    const pageText = textOf(document.body).slice(0, 30000);
    const rules = [
      [
        'rejected',
        /(未通过|未录用|已拒绝|申请失败|rejected|not selected|unsuccessful)/i,
      ],
      ['offer', /(已录用|录用通知|offer received|congratulations.*offer)/i],
      [
        'interview',
        /(面试中|面试安排|进入面试|interview scheduled|interview stage)/i,
      ],
      [
        'assessment',
        /(笔试中|在线测评|测评邀请|assessment|online test|coding test)/i,
      ],
      [
        'submitted',
        /(已投递|投递成功|申请成功|已收到申请|application submitted|application received|under review)/i,
      ],
    ];
    const match = rules.find(([, pattern]) => pattern.test(pageText));
    return match ? match[0] : '';
  };

  const queueStatusCheck = async () => {
    const job = extractJobDetails();
    const status = detectApplicationStatus();
    if (!status)
      return { ok: false, error: '当前页面没有识别到明确的申请状态' };
    const check = { ...job, status, checkedAt: new Date().toISOString() };
    const { pendingStatusChecks = [] } = await chrome.storage.local.get(
      'pendingStatusChecks',
    );
    await chrome.storage.local.set({
      pendingStatusChecks: [
        ...pendingStatusChecks.filter((item) => item.url !== check.url),
        check,
      ],
    });
    return { ok: true, check };
  };

  const fill = async () => {
    if (!state.fields.length) await scan();
    let filled = 0;
    for (const field of state.fields) {
      const element = document.querySelector(
        `[data-job-assistant-id="${CSS.escape(field.id)}"]`,
      );
      if (element && fillElement(element, field)) filled += 1;
    }
    const job = await queueJobCapture();
    return {
      ok: true,
      filled,
      total: state.fields.length,
      job,
      recordQueued: true,
    };
  };

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message?.type) return false;
    if (message.type === 'SCAN_FORM') {
      void scan()
        .then(sendResponse)
        .catch((error) => sendResponse({ ok: false, error: error.message }));
      return true;
    }
    if (message.type === 'FILL_FORM') {
      void fill()
        .then(sendResponse)
        .catch((error) => sendResponse({ ok: false, error: error.message }));
      return true;
    }
    if (message.type === 'CHECK_STATUS') {
      void queueStatusCheck()
        .then(sendResponse)
        .catch((error) => sendResponse({ ok: false, error: error.message }));
      return true;
    }
    return false;
  });
})();
