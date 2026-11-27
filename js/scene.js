// Fond animé (Three.js) : un champ de points en perspective qui ondule lentement.
// La part de points allumés en vermillon suit la progression du jour.
import * as THREE from '../vendor/three.module.min.js';

const vertexShader = /* glsl */ `
uniform float uTime;
uniform float uProgress;
uniform float uPulse;
uniform float uPulseT;
uniform float uPx;
attribute float aRand;
varying float vLit;
varying float vFade;
varying float vGlow;

void main(){
  vec3 p = position;
  // Deux houles lentes croisées : le relief du champ.
  float w = sin(p.x * 0.32 + uTime * 0.35) * 0.45
          + sin(p.y * 0.41 - uTime * 0.27) * 0.35
          + sin((p.x + p.y) * 0.18 + uTime * 0.2) * 0.3;
  p.z += w;

  // Onde circulaire déclenchée par une journée parfaite ou un niveau gagné.
  float d = length(p.xy);
  float ring = exp(-pow((d - uPulseT * 22.0) * 0.9, 2.0)) * uPulse;
  p.z += ring * 0.9;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;

  float depth = -mv.z;
  vFade = smoothstep(34.0, 8.0, depth) * smoothstep(1.5, 5.0, depth);
  vLit = step(aRand, uProgress);
  vGlow = ring + smoothstep(0.6, 1.1, w) * 0.35;
  gl_PointSize = uPx * (3.0 + vLit * 1.4 + ring * 2.0) * (14.0 / depth);
}`;

const fragmentShader = /* glsl */ `
uniform vec3 uBase;
uniform vec3 uSignal;
varying float vLit;
varying float vFade;
varying float vGlow;

void main(){
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c);
  if (r > 0.5) discard;
  float edge = smoothstep(0.5, 0.2, r);
  vec3 col = mix(uBase, uSignal, vLit);
  float a = (0.6 + vLit * 0.4 + vGlow * 0.4) * edge * vFade;
  gl_FragColor = vec4(col, a);
}`;

// Couleur des points éteints selon le thème (valeurs sRGB brutes).
const DARK_BASE = [0.6, 0.63, 0.68];
const LIGHT_BASE = [0.42, 0.45, 0.5];

// Cadrage de la caméra par page : léger glissement quand on change de section.
const VIEWS = {
  today: [0, -9.5, 7.2],
  habits: [-3, -10, 6.4],
  tasks: [3, -10.5, 6.8],
  stats: [-1.5, -8.5, 8.2],
  settings: [2, -9, 7.6],
};

export function createScene(canvas, { motion = true, theme = 'dark' } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'low-power' });
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 80);

  // Grille de points
  const COLS = 120, ROWS = 84, GAP = 0.42;
  const n = COLS * ROWS;
  const pos = new Float32Array(n * 3);
  const rnd = new Float32Array(n);
  let s = 7;
  const rand = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  for (let y = 0, i = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++, i++) {
      pos[i * 3] = (x - COLS / 2) * GAP;
      pos[i * 3 + 1] = (y - ROWS / 2) * GAP;
      pos[i * 3 + 2] = 0;
      rnd[i] = rand();
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aRand', new THREE.BufferAttribute(rnd, 1));

  const uniforms = {
    uTime: { value: 0 },
    uProgress: { value: 0 },
    uPulse: { value: 0 },
    uPulseT: { value: 0 },
    uPx: { value: dpr },
    // Valeurs sRGB brutes : le shader écrit directement la couleur affichée.
    uBase: { value: new THREE.Vector3(...(theme === 'light' ? LIGHT_BASE : DARK_BASE)) },
    uSignal: { value: new THREE.Vector3(1.0, 0.357, 0.227) },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms, vertexShader, fragmentShader,
    transparent: true, depthWrite: false, blending: THREE.NormalBlending,
  });
  scene.add(new THREE.Points(geo, mat));

  let route = 'today';
  let enabled = motion;
  let running = false;
  let raf = 0;
  let last = 0;
  let progress = 0, progressTarget = 0;
  let pulse = 0, pulseT = 0;
  const cam = new THREE.Vector3(...VIEWS.today);
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };

  function layout() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function place(k) {
    const v = VIEWS[route] || VIEWS.today;
    cam.x += (v[0] - cam.x) * k;
    cam.y += (v[1] - cam.y) * k;
    cam.z += (v[2] - cam.z) * k;
    camera.position.set(cam.x + mouse.x * 0.8, cam.y + mouse.y * 0.5, cam.z);
    camera.lookAt(cam.x * 0.6, 2.5, 0);
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    uniforms.uTime.value += dt;
    progress += (progressTarget - progress) * Math.min(1, dt * 2.5);
    uniforms.uProgress.value = progress;
    if (pulse > 0) {
      pulseT += dt * 0.55;
      pulse = Math.max(0, 1 - pulseT);
    }
    uniforms.uPulse.value = pulse;
    uniforms.uPulseT.value = pulseT;
    mouse.x += (mouse.tx - mouse.x) * dt * 2;
    mouse.y += (mouse.ty - mouse.y) * dt * 2;
    place(Math.min(1, dt * 1.8));
    renderer.render(scene, camera);
  }

  function loop(now) {
    frame(now);
    raf = requestAnimationFrame(loop);
  }

  function start() {
    if (running || !enabled || document.hidden) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  function renderStill() {
    uniforms.uProgress.value = progress = progressTarget;
    place(1);
    renderer.render(scene, camera);
  }

  window.addEventListener('resize', () => {
    layout();
    if (!running) renderStill();
  });
  window.addEventListener('pointermove', (e) => {
    mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    mouse.ty = -(e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  layout();
  renderStill();
  start();

  return {
    setRoute(r) {
      route = r;
      if (!running) renderStill();
    },
    setProgress(p) {
      progressTarget = p;
      if (!running) renderStill();
    },
    burst() {
      if (!running) return;
      pulse = 1;
      pulseT = 0;
    },
    setTheme(th) {
      uniforms.uBase.value.set(...(th === 'light' ? LIGHT_BASE : DARK_BASE));
      if (!running) renderStill();
    },
    setMotion(on) {
      enabled = on;
      if (on) start();
      else {
        stop();
        renderStill();
      }
    },
  };
}
