export function initCursor({ reduce } = {}) {
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!canHover || reduce) return;

  const cursor = document.getElementById('cursor');
  if (!cursor) return;
  const ring = cursor.querySelector('.cursor-ring');
  const dot = cursor.querySelector('.cursor-dot');
  cursor.hidden = false;
  document.body.classList.add('has-cursor');

  let cx = 0, cy = 0, rx = 0, ry = 0;
  window.addEventListener('pointermove', (e) => { cx = e.clientX; cy = e.clientY; }, { passive: true });
  (function loop() {
    rx += (cx - rx) * 0.18;
    ry += (cy - ry) * 0.18;
    dot.style.transform = `translate(${cx}px, ${cy}px) translate(-50%,-50%)`;
    ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
    requestAnimationFrame(loop);
  })();

  const bind = (el) => {
    el.addEventListener('pointerenter', () => cursor.classList.add('hold'));
    el.addEventListener('pointerleave', () => cursor.classList.remove('hold'));
  };
  document.querySelectorAll('a, button, summary').forEach(bind);
  const mo = new MutationObserver((muts) => {
    muts.forEach((m) => m.addedNodes.forEach((n) => {
      if (n.nodeType !== 1) return;
      if (n.matches?.('a, button, summary')) bind(n);
      n.querySelectorAll?.('a, button, summary').forEach(bind);
    }));
  });
  mo.observe(document.body, { childList: true, subtree: true });

  // Magnetic buttons
  document.querySelectorAll('.magnet').forEach((btn) => {
    btn.addEventListener('pointermove', (e) => {
      const r = btn.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2);
      const y = e.clientY - (r.top + r.height / 2);
      btn.style.transform = `translate(${x * 0.18}px, ${y * 0.22}px)`;
    });
    btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
  });
}
