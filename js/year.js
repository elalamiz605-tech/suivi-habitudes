// Momentum : une année d'habitudes en 3D.
// 371 blocs = 53 semaines × 7 jours. Hauteur et couleur = part des habitudes tenues ce jour-là.
// Trois formes, pilotées par le défilement : calendrier, spirale de série, trois anneaux.
import * as THREE from '../vendor/three.module.min.js';

const WEEKS = 53, DAYS = 7, N = WEEKS * DAYS, TODAY = N - 1;

// Une année crédible et déterministe : on commence irrégulier, on devient régulier.
function makeYear() {
  let s = 42;
  const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  return Array.from({ length: N }, (_, i) => {
    const t = i / N;
    const chance = 0.35 + 0.55 * t;
    const k = [0, 1, 2].filter(() => r() < chance).length;
    const weekend = i % 7 >= 5 && r() < 0.35;
    return i === TODAY ? 0 : weekend ? Math.max(0, k - 1) / 3 : k / 3;
  });
}

const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

export function createYear(canvas, { motion = true } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#07080c');
  scene.fog = new THREE.Fog('#07080c', 26, 62);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);

  scene.add(new THREE.HemisphereLight('#b9b4ff', '#0b0a14', 0.7));
  const key = new THREE.DirectionalLight('#ffffff', 1.6);
  key.position.set(-12, 22, 14);
  scene.add(key);
  const warm = new THREE.PointLight('#ff7a59', 60, 40, 1.6);
  scene.add(warm);

  // Sol : un plan très sombre qui accroche un peu de lumière
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: '#0a0b10', roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.01;
  scene.add(floor);

  const geo = new THREE.BoxGeometry(0.78, 1, 0.78);
  geo.translate(0, 0.5, 0);
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.38, metalness: 0.08 });
  const mesh = new THREE.InstancedMesh(geo, mat, N);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(mesh);

  // Halo du jour : un anneau lumineux posé au pied du bloc d'aujourd'hui
  const halo = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.72, 48), new THREE.MeshBasicMaterial({ color: '#ff7a59', transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
  halo.rotation.x = -Math.PI / 2;
  scene.add(halo);

  const year = makeYear();
  const shown = year.map((v) => v);
  const C_EMPTY = new THREE.Color('#171824'), C_LOW = new THREE.Color('#3b3478'), C_MID = new THREE.Color('#7b6cff'), C_HIGH = new THREE.Color('#ff7a59');
  const colorFor = (v, out) => {
    if (v <= 0.01) return out.copy(C_EMPTY);
    if (v < 0.5) return out.copy(C_LOW).lerp(C_MID, v / 0.5);
    return out.copy(C_MID).lerp(C_HIGH, (v - 0.5) / 0.5);
  };

  // Les trois formes. Chaque fonction renvoie position, rotation Y et échelle verticale du bloc i.
  const layouts = [
    (i, v) => { // Calendrier : semaines en colonnes, jours en lignes
      const w = Math.floor(i / 7), d = i % 7;
      return { x: (w - WEEKS / 2) * 1, y: 0, z: (d - 3) * 1, ry: 0, h: 0.12 + v * 2.6 };
    },
    (i, v) => { // Spirale : le temps monte, la série s'élève
      const a = i * 0.21, rad = 5.2 + Math.sin(i * 0.05) * 0.3;
      return { x: Math.cos(a) * rad, y: i * 0.034 - 1, z: Math.sin(a) * rad, ry: -a, h: 0.12 + v * 1.5 };
    },
    (i, v) => { // Trois anneaux : un par habitude
      const ring = i % 3, k = Math.floor(i / 3), count = Math.ceil(N / 3);
      const a = (k / count) * Math.PI * 2 + ring * 0.3, rad = 5 + ring * 2.3;
      return { x: Math.cos(a) * rad, y: 0, z: Math.sin(a) * rad, ry: -a, h: 0.12 + v * 2.2 };
    },
  ];
  const cams = [
    { p: new THREE.Vector3(-14, 15, 24), l: new THREE.Vector3(4, 0, 0) },
    { p: new THREE.Vector3(21, 10, 21), l: new THREE.Vector3(0, 5.8, 0) },
    { p: new THREE.Vector3(0, 24, 15), l: new THREE.Vector3(0, 0, 0) },
    { p: new THREE.Vector3(19, 6, 7), l: new THREE.Vector3(WEEKS / 2 - 1, 0.5, 0) }, // gros plan sur aujourd'hui
  ];

  const WHITE = new THREE.Color('#ffffff');
  const OFF = [0, -7, -8];
  let wide = true;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), scl = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), col = new THREE.Color();
  const camPos = cams[0].p.clone(), camLook = cams[0].l.clone(), tmpP = new THREE.Vector3(), tmpL = new THREE.Vector3();
  let stage = 0, stageShown = 0, focus = 0, focusShown = 0, today = 0, pulse = 0, time = 0, last = performance.now(), raf = 0, running = false;
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };

  function layoutAt(i, v, s) {
    const a = Math.floor(clamp(s, 0, layouts.length - 1)), b = Math.min(layouts.length - 1, a + 1);
    // décalage par bloc : la forme se transforme comme une vague qui traverse l'année
    const f = ease(clamp((s - a) * 1.35 - (i / N) * 0.35));
    const A = layouts[a](i, v), B = layouts[b](i, v);
    return { x: A.x + (B.x - A.x) * f, y: A.y + (B.y - A.y) * f, z: A.z + (B.z - A.z) * f, ry: A.ry + (B.ry - A.ry) * f, h: A.h + (B.h - A.h) * f };
  }

  function update(dt) {
    time += dt;
    stageShown += (stage - stageShown) * Math.min(1, dt * 2.2);
    focusShown += (focus - focusShown) * Math.min(1, dt * 2.5);
    pulse = Math.max(0, pulse - dt * 0.55);
    shown[TODAY] += (today - shown[TODAY]) * Math.min(1, dt * 4);
    const tw = Math.floor(TODAY / 7), td = TODAY % 7;
    for (let i = 0; i < N; i++) {
      const v = shown[i];
      const L = layoutAt(i, v, stageShown);
      // onde de célébration qui part du jour : chaque bloc saute quand elle passe
      let hop = 0;
      if (pulse > 0) {
        const w = Math.floor(i / 7), d = i % 7;
        const dist = Math.hypot(w - tw, d - td) * 0.09;
        const front = (1 - pulse) * 6;
        hop = Math.exp(-Math.pow((dist - front) * 3, 2)) * 0.9 * pulse;
      }
      const breathe = motion ? Math.sin(time * 1.2 + i * 0.37) * 0.025 * v : 0;
      pos.set(L.x, L.y + hop, L.z);
      q.setFromAxisAngle(up, L.ry);
      scl.set(1, Math.max(0.05, L.h + breathe), 1);
      m.compose(pos, q, scl);
      mesh.setMatrixAt(i, m);
      colorFor(v, col);
      if (i === TODAY) col.lerp(WHITE, 0.15 + 0.15 * Math.sin(time * 3));
      mesh.setColorAt(i, col);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;

    const T = layoutAt(TODAY, shown[TODAY], stageShown);
    halo.position.set(T.x, T.y + 0.02, T.z);
    halo.rotation.z = -T.ry;
    halo.scale.setScalar(1 + 0.25 * Math.sin(time * 3) + pulse * 2);
    halo.material.opacity = 0.55 + 0.35 * Math.sin(time * 3) * 0.5 + 0.2;
    warm.position.set(T.x, T.y + 2.5 + T.h, T.z + 1.5);
    warm.intensity = 30 + 60 * today + 120 * pulse;

    // caméra : interpolation entre les cadrages, plus le gros plan sur le jour
    const a = Math.floor(clamp(stageShown, 0, 2)), b = Math.min(2, a + 1), f = ease(clamp(stageShown - a));
    tmpP.copy(cams[a].p).lerp(cams[b].p, f);
    tmpL.copy(cams[a].l).lerp(cams[b].l, f);
    // Sur grand écran, la forme se range à droite du texte ; sur mobile, on recule la caméra.
    const off = (OFF[a] + (OFF[b] - OFF[a]) * f) * (1 - focusShown);
    if (wide) { tmpP.x += off; tmpL.x += off; }
    else tmpP.sub(tmpL).multiplyScalar(1.3).add(tmpL);
    tmpP.lerp(cams[3].p, focusShown);
    tmpL.lerp(cams[3].l, focusShown);
    const orbit = (motion ? Math.sin(time * 0.05) * 0.35 : 0) * (1 - focusShown);
    const ox = Math.cos(orbit) * tmpP.x - Math.sin(orbit) * tmpP.z;
    const oz = Math.sin(orbit) * tmpP.x + Math.cos(orbit) * tmpP.z;
    mouse.x += (mouse.tx - mouse.x) * Math.min(1, dt * 2);
    mouse.y += (mouse.ty - mouse.y) * Math.min(1, dt * 2);
    camPos.set(ox + mouse.x * 1.2, tmpP.y + mouse.y * 0.8, oz);
    camLook.copy(tmpL);
    camera.position.copy(camPos);
    camera.lookAt(camLook);
    renderer.render(scene, camera);
  }

  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(motion ? dt : 1);
    if (running) raf = requestAnimationFrame(loop);
  }
  function start() {
    if (running || document.hidden || !motion) return;
    running = true; last = performance.now(); raf = requestAnimationFrame(loop);
  }
  function stop() { running = false; cancelAnimationFrame(raf); }
  function still() { if (!motion) update(1); }

  function size() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    wide = w / h > 1.1;
    camera.fov = w < 700 ? 50 : 38;
    camera.updateProjectionMatrix();
    still();
  }
  addEventListener('resize', size);
  addEventListener('pointermove', (e) => { mouse.tx = (e.clientX / innerWidth - 0.5) * 2; mouse.ty = -(e.clientY / innerHeight - 0.5) * 2; }, { passive: true });
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  size();
  update(0.016);
  start();

  return {
    days: N,
    kept: year.filter((v) => v > 0).length,
    setStage(s) { stage = s; still(); },
    setFocus(f) { focus = f; still(); },
    setToday(v) { today = v; if (!motion) shown[TODAY] = v; still(); },
    celebrate() { pulse = 1; },
  };
}
