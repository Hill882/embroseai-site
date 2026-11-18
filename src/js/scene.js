import * as THREE from 'three';

const INK = 0x070c16;
const BRAND = 0x0b5fff;
const WARM = 0xffb347;
const OK = 0x19a35b;

// Gate and ticket are steered into empty pockets so they never sit behind type.
const STATIONS = {
  hero:     { cam: [4.2, 6.4, 11.5], look: [4.6, -2.2, -9], gate: [5.0, 0, -18], dim: 0 },
  demo:     { cam: [-3.35, 2.05, 4.6], look: [-3.45, 0.45, -9], gate: [-3.5, 0, -8.6], dim: 0.06 },
  automate: { cam: [0, 7.4, 18], look: [0, 0.1, -16], gate: [0, 0, -24], dim: 0.42 },
  services: { cam: [0, 8.0, 19], look: [0, 0.15, -17], gate: [0, 0, -26], dim: 0.5 },
  crew:     { cam: [0, 8.2, 19.5], look: [0, 0.15, -18], gate: [0, 0, -26], dim: 0.52 },
  local:    { cam: [6.4, 5.2, 14], look: [6.8, 0.1, -8], gate: [7.2, 0, -16], dim: 0.4 },
  how:      { cam: [0, 7.6, 18], look: [0, 0.1, -16], gate: [0, 0, -24], dim: 0.48 },
  about:    { cam: [0, 7.8, 18.5], look: [0, 0.1, -17], gate: [0, 0, -26], dim: 0.5 },
  faq:      { cam: [0, 8.4, 20], look: [0, 0.1, -18], gate: [0, 0, -28], dim: 0.55 },
  contact:  { cam: [0, 6.8, 18], look: [0, -0.4, -20], gate: [0, 0, -28], dim: 0.45 }
};
const TICKET_POS = [-3.35, 0.82, -2.15];

function v3(a) { return new THREE.Vector3(a[0], a[1], a[2]); }

function makeTicketTexture({ title, meta, amount, status, statusColor }) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const ctx = c.getContext('2d');
  const r = 48;
  ctx.clearRect(0, 0, 1024, 512);
  ctx.fillStyle = '#101b30';
  roundRect(ctx, 16, 16, 992, 480, r); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 4; ctx.stroke();
  ctx.fillStyle = statusColor || '#8fb4ff';
  roundRect(ctx, 48, 48, 240, 56, 28); ctx.fill();
  ctx.fillStyle = '#0b1424';
  ctx.font = '600 32px "IBM Plex Sans", system-ui, sans-serif';
  ctx.fillText(status || '', 72, 86);
  ctx.fillStyle = '#e8eefb';
  ctx.font = '800 64px Syne, system-ui, sans-serif';
  ctx.fillText(title || '', 48, 200);
  ctx.fillStyle = '#9aa8c0';
  ctx.font = '500 32px "IBM Plex Sans", system-ui, sans-serif';
  wrapText(ctx, meta || '', 48, 260, 920, 42);
  ctx.fillStyle = '#ffb347';
  ctx.font = '700 72px Syne, system-ui, sans-serif';
  ctx.fillText(amount || '', 48, 430);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, max, lh) {
  const words = String(text).split(' ');
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > max) {
      ctx.fillText(line, x, y); line = w; y += lh;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, y);
}

function glowSprite(color, size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, color);
  g.addColorStop(0.35, color.replace('1)', '0.35)'));
  g.addColorStop(1, color.replace('1)', '0)'));
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  return new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
}

export function createFloor(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setClearColor(INK, 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(INK);
  scene.fog = new THREE.Fog(INK, 10, 38);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
  camera.position.fromArray(STATIONS.hero.cam);
  camera.lookAt(v3(STATIONS.hero.look));

  scene.add(new THREE.HemisphereLight(0x1c3c8a, 0x1a1208, 0.55));
  const key = new THREE.DirectionalLight(0xffe1b8, 1.2);
  key.position.set(-6, 8, 6); scene.add(key);
  const fill = new THREE.PointLight(BRAND, 2.2, 22, 1.6);
  fill.position.set(3, 2.2, 4); scene.add(fill);
  const lamp = new THREE.PointLight(WARM, 2.8, 16, 1.8);
  lamp.position.set(-1.6, 3.2, -7.5); scene.add(lamp);
  const gateLight = new THREE.PointLight(WARM, 0.8, 10, 2);
  gateLight.position.set(0, 1.2, -8.2); scene.add(gateLight);

  const grid = new THREE.GridHelper(60, 60, 0x1a2c4e, 0x132038);
  grid.material.transparent = true; grid.material.opacity = 0.45;
  scene.add(grid);

  const bench = new THREE.Mesh(
    new THREE.BoxGeometry(6.2, 0.14, 32),
    new THREE.MeshStandardMaterial({ color: 0x101828, metalness: 0.45, roughness: 0.4 })
  );
  bench.position.set(0, 0.07, -8);
  scene.add(bench);
  const railMat = new THREE.MeshStandardMaterial({ color: 0x0b5fff, emissive: BRAND, emissiveIntensity: 0.55, metalness: 0.2, roughness: 0.35 });
  for (const x of [-1.15, 1.15]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 28), railMat);
    rail.position.set(x, 0.16, -8);
    scene.add(rail);
  }

  const dustCount = 280;
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 14;
    dustPos[i * 3 + 1] = Math.random() * 6;
    dustPos[i * 3 + 2] = -Math.random() * 28 + 8;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xb9c8e6, size: 0.025, transparent: true, opacity: 0.4, depthWrite: false }));
  scene.add(dust);

  function makeBot(x, z, hue) {
    const group = new THREE.Group();
    group.add(new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 24, 24),
      new THREE.MeshStandardMaterial({ color: hue, emissive: hue, emissiveIntensity: 1.8, roughness: 0.25, metalness: 0.1 })
    ));
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.28, 0.012, 8, 32),
      new THREE.MeshStandardMaterial({ color: hue, emissive: hue, emissiveIntensity: 0.8, transparent: true, opacity: 0.8 })
    );
    ring.rotation.x = Math.PI / 2.2;
    group.add(ring);
    const glow = glowSprite(hue === BRAND ? 'rgba(11,95,255,1)' : 'rgba(255,179,71,1)');
    glow.scale.setScalar(1.05);
    group.add(glow);
    group.position.set(x, 0.72, z);
    group.userData = { ring, baseY: 0.72, phase: Math.random() * Math.PI * 2 };
    scene.add(group);
    return group;
  }
  const bots = [makeBot(-1.85, 1.2, BRAND), makeBot(1.95, -1.4, BRAND), makeBot(-2.0, -5.6, WARM)];

  const ticketMat = new THREE.MeshStandardMaterial({
    color: 0x101b30, roughness: 0.45, metalness: 0.05,
    emissive: new THREE.Color(0x12203a), emissiveIntensity: 0.35
  });
  const ticket = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.0), ticketMat);
  ticket.position.set(...TICKET_POS);
  ticket.scale.setScalar(0);
  scene.add(ticket);
  let ticketTex = null;

  const gate = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x2a1c08, emissive: WARM, emissiveIntensity: 0.55, metalness: 0.4, roughness: 0.35 });
  const postL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.7, 0.1), frameMat);
  const postR = postL.clone();
  postL.position.set(-1.25, 0.95, 0);
  postR.position.set(1.25, 0.95, 0);
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.1, 0.12), frameMat);
  lintel.position.set(0, 1.75, 0);
  gate.add(postL, postR, lintel);
  const veil = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 1.55),
    new THREE.MeshBasicMaterial({ color: WARM, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
  );
  veil.position.set(0, 0.95, 0);
  gate.add(veil);
  gate.position.set(0, 0, -8.2);
  scene.add(gate);

  const camCur = v3(STATIONS.hero.cam);
  const lookCur = v3(STATIONS.hero.look);
  const camT = v3(STATIONS.hero.cam);
  const lookT = v3(STATIONS.hero.look);
  const gateCur = v3(STATIONS.hero.gate);
  const gateT = v3(STATIONS.hero.gate);
  gate.position.copy(gateCur);
  let dimCur = 0;
  let dimTgt = 0;
  const pointer = { x: 0, y: 0 };
  window.addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }, { passive: true });

  const clock = new THREE.Clock();
  let running = true;
  let approvedGlow = false;

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
  }

  function tick() {
    if (!running) return;
    requestAnimationFrame(tick);
    const t = clock.getElapsedTime();
    dust.rotation.y = t * 0.01;
    const pos = dust.geometry.attributes.position;
    for (let i = 0; i < pos.count; i += 3) {
      let y = pos.getY(i) + 0.002;
      if (y > 6) y = 0.1;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
    for (const b of bots) {
      b.position.y = b.userData.baseY + Math.sin(t * 1.4 + b.userData.phase) * 0.08;
      b.userData.ring.rotation.z = t * 0.7 + b.userData.phase;
    }
    camCur.lerp(camT, 0.06);
    lookCur.lerp(lookT, 0.06);
    gateCur.lerp(gateT, 0.08);
    gate.position.copy(gateCur);
    dimCur += (dimTgt - dimCur) * 0.06;
    canvas.style.opacity = String(1 - dimCur * 0.28);
    camera.position.set(camCur.x + pointer.x * 0.35, camCur.y + pointer.y * 0.2, camCur.z);
    camera.lookAt(lookCur.x + pointer.x * 0.12, lookCur.y, lookCur.z);
    if (ticket.visible && ticket.scale.x > 0) {
      ticket.lookAt(camera.position.x, camera.position.y - 0.1, camera.position.z);
    }
    const pulse = 0.55 + Math.sin(t * 3.2) * 0.25;
    frameMat.emissiveIntensity = approvedGlow ? 0.9 : pulse + 0.4;
    gateLight.color.setHex(approvedGlow ? OK : WARM);
    renderer.render(scene, camera);
  }

  resize();
  tick();

  return {
    setStation(from, to, t) {
      const A = STATIONS[from] || STATIONS.hero;
      const B = STATIONS[to] || A;
      const k = t * t * (3 - 2 * t);
      camT.lerpVectors(v3(A.cam), v3(B.cam), k);
      lookT.lerpVectors(v3(A.look), v3(B.look), k);
      gateT.lerpVectors(v3(A.gate), v3(B.gate), k);
      dimTgt = (A.dim ?? 0) + ((B.dim ?? 0) - (A.dim ?? 0)) * k;
      const onDemo = from === 'demo' || to === 'demo';
      if (!onDemo && ticket.scale.x > 0) ticket.scale.setScalar(0);
      else if (onDemo && ticketTex && ticket.scale.x === 0) ticket.scale.setScalar(1);
    },
    setTicket(data) {
      if (!data) {
        ticket.scale.setScalar(0);
        approvedGlow = false;
        frameMat.emissive = new THREE.Color(WARM);
        return;
      }
      if (ticketTex) ticketTex.dispose();
      ticketTex = makeTicketTexture(data);
      ticketMat.map = ticketTex;
      ticketMat.needsUpdate = true;
      ticket.scale.setScalar(1);
      approvedGlow = (data.status || '').toUpperCase() === 'APPROVED';
      frameMat.emissive = new THREE.Color(approvedGlow ? OK : WARM);
    },
    resize,
    dispose() {
      running = false;
      renderer.dispose();
    }
  };
}
