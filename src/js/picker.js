let getSelection = () => '';
export function getPickerSelection() { return getSelection(); }

export function initPicker() {
  const $ = (id) => document.getElementById(id);
  const autoEl = $('auto');
  const picker = $('picker');
  const map = $('map');
  const indList = $('ind-list');
  const taskList = $('task-list');
  const taskStep = $('task-step');
  const nojs = $('nojs-map');
  const cfgEl = $('cfg');
  if (!autoEl || !picker || !cfgEl) return;

  const data = JSON.parse(autoEl.textContent);
  const cfg = JSON.parse(cfgEl.textContent);
  if (nojs) nojs.hidden = true;
  picker.classList.add('is-ready');

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  let ind = null;
  Object.keys(data).forEach((k) => {
    const lab = el('label', 'chip');
    const inp = el('input');
    inp.type = 'radio'; inp.name = 'industry'; inp.value = k;
    lab.appendChild(inp);
    lab.appendChild(el('span', null, data[k].name));
    inp.addEventListener('change', () => { ind = k; renderTasks(); renderMap(); });
    indList.appendChild(lab);
  });

  function renderTasks() {
    taskStep.disabled = false;
    taskList.textContent = '';
    data[ind].tasks.forEach((t) => {
      const lab = el('label', 'task');
      const inp = el('input'); inp.type = 'checkbox'; inp.value = t.id;
      const span = el('span');
      const txt = el('span', 'tx');
      txt.appendChild(document.createTextNode(t.job));
      txt.appendChild(el('small', null, t.bot));
      span.appendChild(txt);
      lab.appendChild(inp); lab.appendChild(span);
      inp.addEventListener('change', renderMap);
      taskList.appendChild(lab);
    });
  }

  function chosen() {
    if (!ind) return [];
    const ids = [...taskList.querySelectorAll('input:checked')].map((i) => i.value);
    return data[ind].tasks.filter((t) => ids.indexOf(t.id) > -1);
  }

  function planItem(list, name, note, price) {
    const li = el('li');
    const mid = el('div');
    mid.appendChild(el('strong', null, name));
    mid.appendChild(el('small', null, note));
    li.appendChild(mid);
    li.appendChild(el('span', 'pr', price));
    list.appendChild(li);
  }

  function renderMap() {
    const sel = chosen();
    map.textContent = '';
    if (!sel.length) {
      const e = el('div', 'map-empty');
      const n = el('span', 'num', '3'); n.setAttribute('aria-hidden', 'true');
      e.appendChild(n);
      e.appendChild(el('p', null, ind ? "Now pick the jobs you'd hand off." : 'Your automation map shows up here.'));
      map.appendChild(e);
      return;
    }
    map.appendChild(el('h3', null, 'Your automation map'));
    map.appendChild(el('p', 'sub2', data[ind].name + ' · ' + sel.length + (sel.length === 1 ? ' job' : ' jobs')));
    const lane = el('ul', 'lane');
    let lo = 0, hi = 0, billing = 0, local = 0, build = 0;
    sel.forEach((t) => {
      const li = el('li');
      const row = el('div', 'flowrow');
      row.appendChild(el('span', 'pill', t.job));
      const a1 = el('span', 'arrow', '→'); a1.setAttribute('aria-hidden', 'true'); row.appendChild(a1);
      row.appendChild(el('span', t.kind === 'billing' ? 'pill crew' : 'pill bot', t.bot));
      if (t.kind !== 'local') {
        const a2 = el('span', 'arrow', '→'); a2.setAttribute('aria-hidden', 'true'); row.appendChild(a2);
        row.appendChild(el('span', 'pill you', 'You approve'));
      }
      li.appendChild(row);
      li.appendChild(el('span', 'does', t.does));
      li.appendChild(el('span', 'ex', t.hrs ? 'Example: ' + t.hrs[0] + '–' + t.hrs[1] + ' hrs/week back' : 'Quoted after a hardware and needs review'));
      lane.appendChild(li);
      if (t.hrs) { lo += t.hrs[0]; hi += t.hrs[1]; }
      if (t.kind === 'billing') billing++; else if (t.kind === 'local') local++; else build++;
    });
    map.appendChild(lane);
    if (hi) {
      const tot = el('div', 'total');
      tot.appendChild(el('span', null, 'Illustrative example'));
      tot.appendChild(el('b', null, lo + '–' + hi + ' hrs/week'));
      map.appendChild(tot);
      map.appendChild(el('p', 'disclaim', 'Example numbers for a typical small team, not a promise or a measured result. Your AI Audit gives real numbers for your business.'));
    }
    map.appendChild(el('h3', null, "Where I'd start"));
    const plan = el('ol', 'plan');
    planItem(plan, 'Free 30-minute intro call', 'We confirm which of these is worth doing first.', 'Free');
    if (build || local) planItem(plan, 'AI Audit', 'A written roadmap for your workflows' + (local ? ', including hardware for private AI' : '') + '.', cfg.audit);
    if (billing) planItem(plan, 'Embrose Crew 30-day pilot', 'One Crew bot, one workflow. Credited toward setup if you continue within 60 days.', cfg.pilot);
    if (build) planItem(plan, build > 2 ? 'Process Implementation' : 'Setup Sprint', build > 2 ? 'End-to-end build across these jobs.' : 'Build and launch these 1–2 automations.', 'From ' + (build > 2 ? cfg.process : cfg.sprint));
    if (local) planItem(plan, 'Private / local AI setup', 'Hardware scoped in the audit, then quoted. Hardware billed separately.', 'Quote');
    if (build) planItem(plan, 'Monthly retainer (optional)', 'Up to ' + cfg.hours + ' a month of improvements and fixes.', cfg.retainer + '/mo');
    map.appendChild(plan);
    const ctas = el('div', 'ctas');
    const call = el('a', 'btn magnet', 'Call ' + cfg.phone); call.href = 'tel:' + cfg.tel;
    const msg = 'Hi Collin, I saw the Embrose AI automation map. ' + data[ind].name + ': ' + sel.map((t) => t.job).join('; ') + '. Can we set up a free intro call?';
    const text = el('a', 'btn btn-ghost magnet', 'Text me this map');
    text.href = 'sms:' + cfg.tel + '?&body=' + encodeURIComponent(msg);
    ctas.appendChild(call); ctas.appendChild(text);
    map.appendChild(ctas);
  }

  getSelection = () => {
    const sel = chosen();
    if (!ind || !sel.length) return '';
    return data[ind].name + ': ' + sel.map((t) => t.job).join('; ');
  };
}
