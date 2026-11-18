export function splitDisplay() {
  let i = 0;
  document.querySelectorAll('.display .line').forEach((line) => {
    const text = line.textContent;
    line.textContent = '';
    text.split(/(\s+)/).forEach((part) => {
      if (/^\s+$/.test(part)) {
        line.appendChild(document.createTextNode(' '));
        return;
      }
      const word = document.createElement('span');
      word.className = 'word';
      [...part].forEach((ch) => {
        const s = document.createElement('span');
        s.className = 'char';
        s.textContent = ch;
        s.style.setProperty('--i', String(i++));
        word.appendChild(s);
      });
      line.appendChild(word);
    });
  });
}

export function revealHeadings() {
  const els = document.querySelectorAll('h2.reveal');
  if (!els.length || !('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.35, rootMargin: '0px 0px -8% 0px' });
  els.forEach((el) => io.observe(el));
}
