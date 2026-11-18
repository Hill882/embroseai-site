/* Lightweight 2D Approval Floor for mobile. No Three.js, no GSAP, no Lenis. */

const INK = '#070c16';

export function initMobileStage(canvas) {
  canvas.hidden = false;
  canvas.classList.add('stage-2d');
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
  if (!ctx) return { setTicket() {}, dispose() {} };

  const dprCap = window.devicePixelRatio > 2 ? 1.25 : Math.min(window.devicePixelRatio || 1, 1.5);
  let w = 0, h = 0, running = true, ticket = null;
  let px = 0, py = 0; // smoothed pointer / tilt
  let tx = 0, ty = 0;
  let camZ = 0;
  const dust = Array.from({ length: 36 }, () => ({
    x: Math.random() * 2 - 1,
    y: Math.random(),
    z: Math.random(),
    s: 0.6 + Math.random() * 1.2
  }));

  function resize() {
    const cssW = canvas.clientWidth || window.innerWidth;
    const cssH = canvas.clientHeight || window.innerHeight;
    const dpr = dprCap;
    w = Math.max(1, Math.round(cssW * dpr));
    h = Math.max(1, Math.round(cssH * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  window.addEventListener('pointermove', (e) => {
    tx = (e.clientX / window.innerWidth) * 2 - 1;
    ty = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  const stations = document.querySelectorAll('[data-station]');

  function pageState() {
    const mid = window.innerHeight * 0.45;
    let from = 0;
    stations.forEach((s, i) => {
      if (s.getBoundingClientRect().top <= mid) from = i;
    });
    const a = stations[from];
    const name = a?.dataset.station || 'hero';
    const ar = a.getBoundingClientRect();
    const t = Math.min(Math.max((-ar.top + mid) / (a.offsetHeight || 1), 0), 1);
    const demo = document.getElementById('demo');
    let ticketTravel = 0;
    if (demo) {
      const r = demo.getBoundingClientRect();
      const span = r.height + window.innerHeight * 0.5;
      ticketTravel = Math.min(Math.max((window.innerHeight * 0.7 - r.top) / span, 0), 1);
    }
    const maxY = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const scrollP = Math.min(Math.max(window.scrollY / maxY, 0), 1);
    return { name, t, ticketTravel, scrollP };
  }

  function project(x, y, z, vpX, vpY, focal) {
    const zz = z + 0.001;
    const s = focal / zz;
    return [vpX + x * s, vpY + y * s, s];
  }

  function drawTicket(ctx, x, y, s, data, dpr) {
    const tw = 210 * dpr * Math.min(s, 1.15);
    const th = 112 * dpr * Math.min(s, 1.15);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.12);
    roundRect(ctx, -tw / 2, -th / 2, tw, th, 14 * dpr);
    ctx.fillStyle = '#101b30';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.2)';
    ctx.lineWidth = 1.5 * dpr;
    ctx.stroke();
    const badge = data.statusColor || '#ffb347';
    ctx.fillStyle = badge;
    roundRect(ctx, -tw / 2 + 10 * dpr, -th / 2 + 10 * dpr, 68 * dpr, 16 * dpr, 8 * dpr);
    ctx.fill();
    ctx.fillStyle = '#0b1424';
    ctx.font = `600 ${10 * dpr}px "IBM Plex Sans", system-ui, sans-serif`;
    ctx.fillText((data.status || '').toString().slice(0, 12), -tw / 2 + 16 * dpr, -th / 2 + 22 * dpr);
    ctx.fillStyle = '#e8eefb';
    ctx.font = `800 ${15 * dpr}px Syne, system-ui, sans-serif`;
    ctx.fillText((data.title || '').toString().slice(0, 22), -tw / 2 + 10 * dpr, -th / 2 + 48 * dpr);
    ctx.fillStyle = '#ffb347';
    ctx.font = `700 ${16 * dpr}px Syne, system-ui, sans-serif`;
    ctx.fillText((data.amount || '').toString().slice(0, 14), -tw / 2 + 10 * dpr, th / 2 - 16 * dpr);
    ctx.restore();
  }

  function roundRect(ctx, x, y, rw, rh, r) {
    const rad = Math.min(r, rw / 2, rh / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + rw, y, x + rw, y + rh, rad);
    ctx.arcTo(x + rw, y + rh, x, y + rh, rad);
    ctx.arcTo(x, y + rh, x, y, rad);
    ctx.arcTo(x, y, x + rw, y, rad);
    ctx.closePath();
  }

  let last = performance.now();
  function tick(now) {
    if (!running) return;
    requestAnimationFrame(tick);
    // Skip a frame on very long stalls to stay smooth
    if (now - last < 12) return;
    last = now;
    if (document.hidden) return;

    px += (tx - px) * 0.06;
    py += (ty - py) * 0.06;
    const st = pageState();
    const inDemo = st.name === 'demo' || (st.name === 'hero' && st.t > 0.75) || (st.name === 'automate' && st.t < 0.15);
    const deep = ['services', 'crew', 'local', 'how', 'about', 'faq', 'contact'].includes(st.name);
    camZ += 0.004 + st.scrollP * 0.002;

    const dpr = w / (canvas.clientWidth || 1);
    // Vanishing point stays in the lower half so geometry lives under typography
    const vpX = w * (0.5 + px * 0.04);
    const vpY = h * (deep ? 0.84 : inDemo ? 0.76 : 0.82) + py * 8 * dpr;
    const focal = 190 * dpr;
    const near = 40;
    const far = 780;

    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, w, h);

    // Stars
    ctx.fillStyle = 'rgba(200,214,240,0.55)';
    for (let i = 0; i < 40; i++) {
      const sx = ((i * 97) % 1000) / 1000 * w;
      const sy = ((i * 53) % 700) / 700 * (vpY * 0.9);
      ctx.globalAlpha = 0.25 + ((i * 13) % 8) / 16;
      ctx.fillRect(sx, sy, dpr, dpr);
    }
    ctx.globalAlpha = 1;

    // Floor wash
    const floor = ctx.createLinearGradient(0, vpY, 0, h);
    floor.addColorStop(0, 'rgba(11,20,36,0)');
    floor.addColorStop(0.15, 'rgba(11,20,36,0.55)');
    floor.addColorStop(1, 'rgba(8,14,26,1)');
    ctx.fillStyle = floor;
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(w, h);
    ctx.lineTo(vpX + 40, vpY);
    ctx.lineTo(vpX - 40, vpY);
    ctx.closePath();
    ctx.fill();

    // Perspective grid
    ctx.lineWidth = Math.max(1, dpr);
    const zOff = (camZ * 70) % 46;
    ctx.strokeStyle = 'rgba(26,51,90,0.7)';
    for (let i = 0; i < 18; i++) {
      const z = near + i * 46 + (46 - zOff);
      if (z > far) continue;
      const [, y, s] = project(0, 70 * dpr, z, vpX, vpY, focal);
      const half = 240 * dpr * s;
      ctx.globalAlpha = Math.max(0.08, 1 - i / 18) * 0.8;
      ctx.beginPath();
      ctx.moveTo(vpX - half, y);
      ctx.lineTo(vpX + half, y);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(19,32,56,0.85)';
    for (let i = -8; i <= 8; i++) {
      const x = i * 38 * dpr;
      const [x1, y1] = project(x, 70 * dpr, near, vpX, vpY, focal);
      const [x2, y2] = project(x, 70 * dpr, far, vpX, vpY, focal);
      ctx.globalAlpha = i === 0 ? 0.15 : 0.45;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Rails
    const drawRail = (x, color, width) => {
      const [x1, y1] = project(x, 68 * dpr, near, vpX, vpY, focal);
      const [x2, y2] = project(x, 68 * dpr, far * 0.85, vpX, vpY, focal);
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    };
    drawRail(-48 * dpr, 'rgba(11,95,255,0.95)', 3 * dpr);
    drawRail(48 * dpr, 'rgba(11,95,255,0.95)', 3 * dpr);

    // Dust
    ctx.fillStyle = 'rgba(185,200,230,0.7)';
    dust.forEach((d) => {
      d.z -= 0.0025;
      if (d.z < 0) d.z = 1;
      const z = near + d.z * (far - near);
      const [dx, dy, s] = project(d.x * 160 * dpr, (d.y - 0.4) * 90 * dpr, z, vpX, vpY, focal);
      const r = d.s * s * 1.4;
      ctx.globalAlpha = 0.35 * (1 - d.z);
      ctx.beginPath();
      ctx.arc(dx, dy, r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Bots
    const t = now / 1000;
    [[-90, 0.22, '#0b5fff'], [110, 0.55, '#0b5fff'], [-40, 0.78, '#ffb347']].forEach(([wx, z01], i, arr) => {
      const z = near + 80 + z01 * 420;
      const bob = Math.sin(t * 1.5 + i) * 8 * dpr;
      const [bx, by, s] = project(wx * dpr, -18 * dpr + bob, z, vpX, vpY, focal);
      const color = arr[i][2];
      const rad = 9 * dpr * Math.min(s, 1.4);
      const g = ctx.createRadialGradient(bx, by, 0, bx, by, rad * 4);
      g.addColorStop(0, color);
      g.addColorStop(0.25, color + '55');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(bx, by, rad * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(bx, by, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = 1.2 * dpr;
      ctx.beginPath();
      ctx.ellipse(bx, by, rad * 2.1, rad * 0.7, 0.3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    // Gate — sits at mid-far depth; kept in the lower stage
    const gateZ = near + 400;
    const [glx, gy] = project(-58 * dpr, 70 * dpr, gateZ, vpX, vpY, focal);
    const [grx, gy2] = project(58 * dpr, 70 * dpr, gateZ, vpX, vpY, focal);
    const [gtx] = project(0, -70 * dpr, gateZ, vpX, vpY, focal);
    const [, gty] = project(0, -70 * dpr, gateZ, vpX, vpY, focal);
    const postW = Math.max(3 * dpr, (grx - glx) * 0.04);
    const pulse = 0.55 + Math.sin(t * 3) * 0.25;
    const approved = ticket && String(ticket.status || '').toUpperCase() === 'APPROVED';
    ctx.strokeStyle = approved ? `rgba(25,163,91,${0.8 + pulse * 0.2})` : `rgba(255,179,71,${0.75 + pulse * 0.25})`;
    ctx.fillStyle = approved ? 'rgba(25,163,91,0.12)' : 'rgba(255,179,71,0.12)';
    ctx.lineWidth = postW;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(glx, gy);
    ctx.lineTo(glx, gty);
    ctx.lineTo(grx, gty);
    ctx.lineTo(grx, gy2);
    ctx.stroke();
    ctx.fillRect(glx, gty, grx - glx, gy - gty);

    // Scroll-scrubbed ticket: travels up the floor toward the gate during the demo
    if (ticket && inDemo) {
      const travel = 0.12 + st.ticketTravel * 0.78;
      const z = near + 30 + travel * 260;
      const [kx, ky, s] = project(0, 8 * dpr, z, vpX, vpY, focal);
      ctx.globalAlpha = Math.min(1, 0.3 + st.ticketTravel * 1.2);
      drawTicket(ctx, kx, ky - 20 * dpr, s, ticket, dpr);
      ctx.globalAlpha = 1;
    }
  }

  function onVis() {
    if (!document.hidden && running) {
      last = performance.now();
      requestAnimationFrame(tick);
    }
  }
  document.addEventListener('visibilitychange', onVis);

  resize();
  window.addEventListener('resize', resize, { passive: true });
  requestAnimationFrame(tick);

  return {
    setTicket(data) { ticket = data || null; },
    dispose() {
      running = false;
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVis);
    }
  };
}
