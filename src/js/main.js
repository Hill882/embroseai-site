import { initDemo } from './demo.js';
import { initPicker } from './picker.js';
import { initCursor } from './cursor.js';
import { splitDisplay, revealHeadings } from './typography.js';

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const wide = window.matchMedia('(min-width: 901px)').matches;
const saveData = !!(navigator.connection && navigator.connection.saveData);
const wants3D = !reduce && wide && !saveData;
const wantsMobileStage = !reduce && !wide && !saveData;

let lastTicket = null;
const demo = initDemo({ reduce, onTicket: (d) => { lastTicket = d; } });
initPicker();
initCursor({ reduce });
if (document.getElementById('lead')) {
  import('./form.js').then((m) => m.initLeadForm()).catch((err) => console.warn('Lead form skipped', err));
}

function afterPaint(fn) {
  const ric = window.requestIdleCallback || ((cb) => setTimeout(cb, 200));
  requestAnimationFrame(() => requestAnimationFrame(() => ric(fn, { timeout: 1200 })));
}

afterPaint(async () => {
  if (reduce) return;

  if (wants3D) {
    let floor = null;
    try {
      const { createFloor } = await import('./scene.js');
      const canvas = document.getElementById('floor');
      if (canvas) {
        canvas.hidden = false;
        floor = createFloor(canvas);
        document.documentElement.classList.add('floor-on', 'motion');
        window.addEventListener('resize', () => floor.resize());
        if (lastTicket) floor.setTicket(lastTicket);
        demo.onTicket((d) => floor.setTicket(d));
      }
    } catch (err) {
      console.warn('3D scene skipped', err);
    }
    const { initMotion } = await import('./motion.js');
    splitDisplay();
    await initMotion({ reduce, floor });
    return;
  }

  if (wantsMobileStage) {
    try {
      const { initMobileStage } = await import('./stage2d.js');
      const canvas = document.getElementById('floor');
      if (canvas) {
        const stage = initMobileStage(canvas);
        document.documentElement.classList.add('floor-on', 'motion', 'stage-2d');
        if (lastTicket) stage.setTicket(lastTicket);
        demo.onTicket((d) => stage.setTicket(d));
      }
    } catch (err) {
      console.warn('Mobile stage skipped', err);
    }
    splitDisplay();
    revealHeadings();
  }
});
