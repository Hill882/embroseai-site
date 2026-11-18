/* Watch a bot work: billing, leads, scheduling. Hold-to-approve at each gate. */

const BOTS = {
  billing: {
    job: "Billing Crew bot: match today's deposits to open invoices, then follow up on anything late.",
    steps: [
      { s: 'Read new bank deposits', d: 'Deposit, Nov 14: $2,480.00, memo "INV 1042"', ticket: { title: 'New deposit', meta: 'Memo INV 1042  ·  Sample Plumbing Co.', amount: '$2,480.00', status: 'READING', statusColor: '#8fb4ff' } },
      { s: 'Searched open invoices', d: 'Invoice #1042, Sample Plumbing Co.: $2,480.00', ticket: { title: 'Invoice #1042', meta: 'Sample Plumbing Co.', amount: '$2,480.00', status: 'FOUND', statusColor: '#8fb4ff' } },
      { s: 'Checked the match', d: 'Amount ✓  Customer ✓  Invoice number ✓', ticket: { title: 'Invoice #1042', meta: 'Amount, customer and invoice number agree.', amount: '$2,480.00', status: 'MATCHED', statusColor: '#8fb4ff' } },
      { gate: true, s: 'Mark invoice #1042 as paid?', d: 'The Crew bot proposes it. A person on your team decides.', ok: 'Hold to approve', done: 'Marked paid and logged', ticket: { title: 'Mark #1042 paid?', meta: 'The Crew bot proposes it. A person has to approve.', amount: '$2,480.00', status: 'WAITING', statusColor: '#ffb347' }, ticketDone: { title: 'Invoice #1042', meta: 'Marked paid after a person approved it.', amount: '$2,480.00', status: 'APPROVED', statusColor: '#19a35b' } },
      { s: 'Checked for overdue invoices', d: 'Invoice #1037, Sample Landscaping: $860.00, 15 days late', ticket: { title: 'Invoice #1037', meta: 'Sample Landscaping  ·  15 days late', amount: '$860.00', status: 'OVERDUE', statusColor: '#ffb347' } },
      { draft: true, s: 'Drafted a friendly reminder', to: 'To: billing@samplelandscaping.example', subj: 'Subject: Quick reminder on invoice #1037',
        body: "Hi Dana,\nJust a friendly reminder that invoice #1037 for $860.00 was due on Oct 30. You can pay by card or check. If it's already on the way, thank you and please ignore this.\nThanks!",
        ticket: { title: 'Draft reminder', meta: 'Invoice #1037  ·  Sample Landscaping', amount: '$860.00', status: 'DRAFT', statusColor: '#8fb4ff' } },
      { gate: true, s: 'Send this reminder?', d: 'Customer messages always wait for a person.', ok: 'Hold to approve', done: 'In real use it sends now. In this demo, nothing is sent.', ticket: { title: 'Send this reminder?', meta: 'Customer messages always wait for a person.', amount: '$860.00', status: 'WAITING', statusColor: '#ffb347' }, ticketDone: { title: 'Reminder ready', meta: 'Approved by a person. In this demo, nothing is sent.', amount: '$860.00', status: 'APPROVED', statusColor: '#19a35b' } }
    ]
  },
  leads: {
    job: 'Lead follow-up bot: answer a new real estate lead in minutes and keep the CRM current.',
    steps: [
      { s: 'New lead from a listing portal', d: 'Jordan (sample): 3-bed in Greenwood, asks about a Saturday showing', ticket: { title: 'New lead', meta: 'Jordan  ·  3-bed in Greenwood', amount: 'Saturday', status: 'NEW', statusColor: '#8fb4ff' } },
      { s: 'Logged it in the CRM', d: 'Contact created · source: portal · assigned: Agent A' },
      { s: "Checked the agent's calendar", d: 'Saturday 10:30 and 1:00 are open' },
      { draft: true, s: 'Drafted a personal reply', to: 'To: Jordan (sample lead)', subj: 'Text message',
        body: 'Hi Jordan, thanks for asking about the Greenwood 3-bed! I can show it Saturday at 10:30 or 1:00. Which works better for you?',
        ticket: { title: 'Draft reply', meta: 'Jordan  ·  Greenwood 3-bed', amount: 'Sat 10:30 or 1:00', status: 'DRAFT', statusColor: '#8fb4ff' } },
      { gate: true, s: 'Send this reply?', d: 'The agent approves or edits before anything goes out.', ok: 'Hold to approve', done: 'In real use it sends now. In this demo, nothing is sent.', ticket: { title: 'Send this reply?', meta: 'The agent approves or edits first.', amount: 'Jordan', status: 'WAITING', statusColor: '#ffb347' }, ticketDone: { title: 'Reply ready', meta: 'Approved by a person. Nothing is sent in this demo.', amount: 'Jordan', status: 'APPROVED', statusColor: '#19a35b' } },
      { s: 'Texted the agent a summary', d: '"New Greenwood lead, Jordan, wants Saturday. Reply sent, CRM updated."' }
    ]
  },
  schedule: {
    job: 'Scheduling bot: book a service call around the crews you already have.',
    steps: [
      { s: 'New service request', d: 'Water heater replacement · Franklin · "any morning this week"', ticket: { title: 'Service request', meta: 'Water heater  ·  Franklin', amount: 'This week', status: 'NEW', statusColor: '#8fb4ff' } },
      { s: 'Checked crew calendars', d: 'Crew B is open Thursday, 9:00 to 11:00' },
      { s: 'Checked the route', d: 'Crew B is already in Franklin Thursday morning' },
      { gate: true, s: 'Book Crew B for Thursday 9:00?', d: 'The office approves before the calendar changes.', ok: 'Hold to approve', done: 'Booked and logged', ticket: { title: 'Book Crew B?', meta: 'Thursday 9:00–11:00  ·  Franklin', amount: 'Thu 9:00', status: 'WAITING', statusColor: '#ffb347' }, ticketDone: { title: 'Crew B booked', meta: 'Thursday 9:00–11:00. Approved by a person.', amount: 'Thu 9:00', status: 'APPROVED', statusColor: '#19a35b' } },
      { draft: true, s: 'Drafted the confirmation', to: 'To: Customer (sample)', subj: 'Text message',
        body: "You're booked for Thursday between 9 and 11 AM. We'll text you when the crew is on the way. Reply here with any questions." },
      { s: 'Reminder queued', d: 'Wednesday evening reminder ready for approval' }
    ]
  }
};

const RING = 2 * Math.PI * 44;
const HOLD_MS = 700;

function haptic(pattern) {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch (_) { /* unsupported */ }
}


function $(id) { return document.getElementById(id); }
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export function initDemo({ reduce, onTicket } = {}) {
  const tabs = document.querySelector('.tabs');
  const log = $('demo-log');
  const live = $('demo-live');
  const job = $('demo-job');
  const panel = $('demo-panel');
  const replay = $('demo-replay');
  if (!tabs || !log) return { setTicketListener() {} };

  let run = 0;
  let current = 'billing';
  let interacted = false;
  const listeners = [];

  function ticket(data) { listeners.forEach((fn) => fn(data || null)); }
  function wait(ms) { return new Promise((r) => setTimeout(r, reduce ? 0 : ms)); }
  function say(t) { live.textContent = ''; setTimeout(() => { live.textContent = t; }, 30); }

  function stepItem(st) {
    const li = el('li', 'work');
    const stEl = el('span', 'st');
    stEl.setAttribute('aria-hidden', 'true');
    li.appendChild(stEl);
    const body = el('div');
    body.appendChild(el('strong', null, st.s));
    li.appendChild(body);
    return { li, body };
  }

  function typeInto(p, text, token) {
    if (reduce) { p.textContent = text; return Promise.resolve(); }
    p.classList.add('caret');
    let i = 0;
    return new Promise((res) => {
      (function tick() {
        if (token !== run) return res();
        i = Math.min(text.length, i + 3);
        p.textContent = text.slice(0, i);
        if (i < text.length) setTimeout(tick, 18);
        else { p.classList.remove('caret'); res(); }
      })();
    });
  }

  function makeHoldButton(label) {
    const btn = el('button', 'hold-btn');
    btn.type = 'button';
    btn.innerHTML = `<svg class="hold-ring" viewBox="0 0 100 100" aria-hidden="true"><circle class="ring-bg" cx="50" cy="50" r="44"></circle><circle class="ring-fg" cx="50" cy="50" r="44"></circle></svg><span class="hold-label">${label}</span>`;
    const fg = btn.querySelector('.ring-fg');
    fg.style.strokeDasharray = String(RING);
    fg.style.strokeDashoffset = String(RING);
    return { btn, fg, labelEl: btn.querySelector('.hold-label') };
  }

  function gate(st, it, token, userStarted) {
    it.li.className = 'gate';
    it.li.tabIndex = -1;
    it.body.appendChild(el('span', 'det', st.d));
    const who = el('span', 'who', 'Waiting for a person');
    it.body.appendChild(who);
    const actions = el('div', 'gate-actions');
    const hold = makeHoldButton('Hold to approve');
    const waitBtn = el('button', 'btn btn-hold', 'Not yet');
    waitBtn.type = 'button';
    actions.appendChild(hold.btn);
    actions.appendChild(waitBtn);
    it.body.appendChild(actions);
    say('Waiting for your approval: ' + st.s);
    if (userStarted) hold.btn.focus({ preventScroll: true });
    if (st.ticket) ticket(st.ticket);

    return new Promise((res) => {
      const finish = () => {
        if (token !== run) return;
        interacted = true;
        haptic([16, 30, 28]);
        hold.btn.classList.add('done');
        hold.labelEl.textContent = 'Approved';
        hold.fg.style.strokeDashoffset = '0';
        actions.remove();
        it.li.className = 'approved';
        who.textContent = 'You approved · ' + st.done;
        say('Approved. ' + st.done);
        if (st.ticketDone) ticket(st.ticketDone);
        it.li.focus({ preventScroll: true });
        res();
      };

      waitBtn.addEventListener('click', () => {
        who.textContent = 'On hold. The bot waits; nothing changes until someone approves.';
        say(who.textContent);
        waitBtn.remove();
        hold.btn.focus();
      });

      let filling = false;
      let raf = 0;
      let start = 0;
      const setRing = (p) => { hold.fg.style.strokeDashoffset = String(RING * (1 - p)); };

      const startHold = (e) => {
        if (e && e.type === 'keydown' && e.key !== ' ' && e.key !== 'Enter') return;
        if (e && e.type === 'keydown') e.preventDefault();
        // Keyboard: approve immediately so the control is usable without a timed hold.
        if (e && e.type === 'keydown') { finish(); return; }
        filling = true;
        start = performance.now();
        haptic(12);
        let buzzed = false;
        const tick = (now) => {
          if (!filling) return;
          const p = Math.min((now - start) / (reduce ? 0 : HOLD_MS), 1);
          setRing(p);
          if (!buzzed && p >= 0.5) { haptic(8); buzzed = true; }
          if (p >= 1) finish();
          else raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      };
      const cancel = () => {
        if (!filling || hold.btn.classList.contains('done')) return;
        filling = false;
        cancelAnimationFrame(raf);
        setRing(0);
      };
      hold.btn.addEventListener('pointerdown', startHold);
      hold.btn.addEventListener('keydown', startHold);
      window.addEventListener('pointerup', cancel);
      window.addEventListener('pointercancel', cancel);
    });
  }

  async function play(name, userStarted) {
    const token = ++run;
    current = name;
    const bot = BOTS[name];
    job.textContent = bot.job;
    log.textContent = '';
    replay.hidden = true;
    ticket(null);
    for (let i = 0; i < bot.steps.length; i++) {
      const st = bot.steps[i];
      const it = stepItem(st);
      log.appendChild(it.li);
      if (st.gate) {
        await wait(300);
        if (token !== run) return;
        await gate(st, it, token, userStarted || interacted);
        if (token !== run) return;
        await wait(500);
        continue;
      }
      await wait(750);
      if (token !== run) return;
      if (st.ticket) ticket(st.ticket);
      if (st.draft) {
        const box = el('div', 'draft');
        box.appendChild(el('div', 'meta', st.to + ' · ' + st.subj));
        const p = el('p');
        box.appendChild(p);
        it.body.appendChild(box);
        await typeInto(p, st.body, token);
        if (token !== run) return;
      } else {
        it.body.appendChild(el('span', 'det', st.d));
      }
      it.li.className = 'done';
      say(st.s + '. ' + (st.d || 'Draft ready for review.'));
      await wait(450);
      if (token !== run) return;
    }
    replay.hidden = false;
    say('Demo finished. Use Replay or pick another bot.');
  }

  tabs.hidden = false;
  log.classList.add('live');
  const tabBtns = [...tabs.querySelectorAll('[role=tab]')];
  function select(btn, focus) {
    tabBtns.forEach((b) => {
      const on = b === btn;
      b.setAttribute('aria-selected', on);
      b.tabIndex = on ? 0 : -1;
    });
    panel.setAttribute('aria-labelledby', btn.id);
    if (focus) btn.focus();
    play(btn.dataset.bot, false);
  }
  tabBtns.forEach((b, i) => {
    b.addEventListener('click', () => select(b));
    b.addEventListener('keydown', (e) => {
      let n = null;
      if (e.key === 'ArrowRight') n = tabBtns[(i + 1) % tabBtns.length];
      else if (e.key === 'ArrowLeft') n = tabBtns[(i - 1 + tabBtns.length) % tabBtns.length];
      else if (e.key === 'Home') n = tabBtns[0];
      else if (e.key === 'End') n = tabBtns[tabBtns.length - 1];
      if (n) { e.preventDefault(); select(n, true); }
    });
  });
  replay.addEventListener('click', () => play(current, true));
  play('billing', false);

  if (onTicket) listeners.push(onTicket);
  return {
    onTicket(fn) { listeners.push(fn); }
  };
}
