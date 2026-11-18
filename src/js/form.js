const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function initLeadForm() {
  const form = document.getElementById('lead');
  if (!form) return;

  const name = document.getElementById('lead-name');
  const phone = document.getElementById('lead-phone');
  const email = document.getElementById('lead-email');
  const status = document.getElementById('lead-status');
  const submit = document.getElementById('lead-submit');
  const ok = document.getElementById('lead-ok');
  const fields = form.querySelector('.lead-fields');
  const map = document.getElementById('lead-map');
  const ajax = form.getAttribute('data-ajax');
  form.setAttribute('novalidate', '');

  function getPickerSelection() {
    const picker = document.getElementById('picker');
    if (!picker) return '';
    const ind = picker.querySelector('input[name="industry"]:checked');
    if (!ind) return '';
    const industry = (ind.closest('label')?.querySelector('span')?.textContent || ind.value).trim();
    const jobs = [...picker.querySelectorAll('#task-list input:checked')].map((i) => {
      const node = i.closest('label')?.querySelector('.tx');
      const job = node ? (node.childNodes[0]?.textContent || '').trim() : '';
      return job || i.value;
    }).filter(Boolean);
    if (!jobs.length) return '';
    return industry + ': ' + jobs.join('; ');
  }

  function setStatus(msg, kind) {
    status.textContent = msg || '';
    status.className = 'lead-status' + (kind ? ' is-' + kind : '');
  }

  function setInvalid(el, on) {
    if (!el) return;
    if (on) el.setAttribute('aria-invalid', 'true');
    else el.removeAttribute('aria-invalid');
  }

  function digits(s) { return (s || '').replace(/\D/g, ''); }

  function validate() {
    const issues = [];
    const nameVal = (name.value || '').trim();
    const phoneVal = (phone.value || '').trim();
    const emailVal = (email.value || '').trim();
    setInvalid(name, false);
    setInvalid(phone, false);
    setInvalid(email, false);
    [name, phone, email].forEach((el) => el.removeAttribute('aria-describedby'));

    if (!nameVal) {
      issues.push('Enter your name.');
      setInvalid(name, true);
    }
    if (!phoneVal && !emailVal) {
      issues.push('Enter a phone number or an email, or both.');
      setInvalid(phone, true);
      setInvalid(email, true);
    } else {
      if (emailVal && !EMAIL_RE.test(emailVal)) {
        issues.push('Enter a valid email address.');
        setInvalid(email, true);
      }
      if (phoneVal && digits(phoneVal).length < 7) {
        issues.push('Enter a valid phone number.');
        setInvalid(phone, true);
      }
    }
    return issues;
  }

  function syncMap() {
    if (map) map.value = getPickerSelection() || '';
  }

  const picker = document.getElementById('picker');
  if (picker) picker.addEventListener('change', syncMap);

  form.addEventListener('submit', async (e) => {
    if (!ajax) return; // let the browser POST
    e.preventDefault();
    syncMap();
    const issues = validate();
    if (issues.length) {
      setStatus(issues.join(' '), 'error');
      form.querySelectorAll('[aria-invalid="true"]').forEach((el) => el.setAttribute('aria-describedby', 'lead-status'));
      const first = form.querySelector('[aria-invalid="true"]');
      if (first) first.focus();
      return;
    }

    submit.disabled = true;
    form.setAttribute('aria-busy', 'true');
    setStatus('Sending…', '');

    const data = {};
    new FormData(form).forEach((value, key) => {
      if (key === '_honey' && !value) return;
      if (key === 'automation_map' && !value) return;
      data[key] = value;
    });

    try {
      const res = await fetch(ajax, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data)
      });
      let json = {};
      try { json = await res.json(); } catch { json = {}; }
      const okFlag = json.success === true || json.success === 'true';
      if (!res.ok || !okFlag) {
        throw new Error(json.message || 'Send failed');
      }
      if (fields) fields.hidden = true;
      if (ok) {
        ok.hidden = false;
        ok.setAttribute('tabindex', '-1');
        ok.focus();
      }
      setStatus('Thanks — I got your note.', 'ok');
      form.reset();
      syncMap();
    } catch (err) {
      setStatus('Something went wrong sending the note. Call or text (317) 777-1512, or email hello@embroseai.com.', 'error');
    } finally {
      submit.disabled = false;
      form.removeAttribute('aria-busy');
    }
  });
}
