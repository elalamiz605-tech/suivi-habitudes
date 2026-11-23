// Décor 3D animé (Three.js) : sphère organique, anneaux en orbite, champ de particules.
import * as THREE from '../vendor/three.module.min.js';

// Bruit de Perlin « simplex » 3D (Ashima Arts / Stefan Gustavson, licence MIT).
const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

const vertexShader = /* glsl */ `
uniform float uTime;
uniform float uAmp;
uniform float uFreq;
varying float vNoise;
varying vec3 vNormal;
varying vec3 vView;
${NOISE}
void main(){
  float n = snoise(position * uFreq + vec3(uTime * 0.25, uTime * 0.18, 0.0));
  n += 0.5 * snoise(position * uFreq * 2.1 - uTime * 0.3);
  vNoise = n;
  vec3 pos = position + normal * n * uAmp;
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;

const fragmentShader = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
varying float vNoise;
varying vec3 vNormal;
varying vec3 vView;
void main(){
  float fres = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.2);
  float t = smoothstep(-0.8, 0.9, vNoise);
  vec3 col = mix(uColorA, uColorB, t);
  col = mix(col, uColorC, smoothstep(0.5, 1.2, vNoise) * 0.6);
  vec3 c = col * (0.22 + 0.35 * t) + col * fres * 1.6;
  gl_FragColor = vec4(c, 0.92);
}`;

function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.3, 'rgba(255,255,255,0.6)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

// Position de la sphère selon la page : fraction de la largeur / hauteur visibles, puis échelle.
const LAYOUTS = {
  today: [0.5, 0.46, 0.82],
  habits: [0.9, 0.72, 0.75],
  tasks: [0.9, 0.76, 0.7],
  stats: [0.92, 0.68, 0.75],
  settings: [0.86, 0.62, 0.85],
};
const HALF_H = Math.tan((45 / 2) * Math.PI / 180) * 9; // demi-hauteur visible à z = 0

export function createScene(canvas, { motion = true } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  const orbGroup = new THREE.Group();
  scene.add(orbGroup);

  // Sphère organique
  const uniforms = {
    uTime: { value: 0 },
    uAmp: { value: 0.3 },
    uFreq: { value: 0.85 },
    uColorA: { value: new THREE.Color('#5b3df5') },
    uColorB: { value: new THREE.Color('#22d3ee') },
    uColorC: { value: new THREE.Color('#f472b6') },
  };
  const orb = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.5, 48),
    new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, transparent: true }),
  );
  orbGroup.add(orb);

  // Coque géométrique en fil de fer
  const shell = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(2.25, 1)),
    new THREE.LineBasicMaterial({ color: 0x9d8bff, transparent: true, opacity: 0.16 }),
  );
  orbGroup.add(shell);

  // Anneaux avec satellites
  const rings = [
    { r: 2.8, tilt: [1.15, 0.2, 0.35], color: '#22d3ee', speed: 0.45 },
    { r: 3.3, tilt: [1.35, -0.5, -0.6], color: '#a78bfa', speed: -0.3 },
    { r: 3.9, tilt: [1.0, 0.6, 1.1], color: '#f472b6', speed: 0.2 },
  ].map(({ r, tilt, color, speed }) => {
    const outer = new THREE.Group();
    outer.rotation.set(...tilt);
    const spin = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.007, 6, 256),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.28 }),
    );
    const sat = new THREE.Mesh(new THREE.SphereGeometry(0.065, 20, 20), new THREE.MeshBasicMaterial({ color }));
    sat.position.x = r;
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture(), color, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.scale.setScalar(0.6);
    sat.add(halo);
    spin.add(ring, sat);
    outer.add(spin);
    orbGroup.add(outer);
    return { spin, speed };
  });

  // Champ de particules
  const N = 1800;
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const palette = ['#7c5cff', '#22d3ee', '#f472b6', '#ffffff'].map((c) => new THREE.Color(c));
  for (let i = 0; i < N; i++) {
    const r = 5 + Math.random() * 16;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th) * 0.65;
    pos[i * 3 + 2] = r * Math.cos(ph) - 6;
    const c = palette[Math.floor(Math.random() * palette.length)];
    col.set([c.r, c.g, c.b], i * 3);
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pMat = new THREE.PointsMaterial({ size: 0.07, map: dotTexture(), vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending });
  const stars = new THREE.Points(pGeo, pMat);
  scene.add(stars);

  // Petites formes flottantes
  const floaters = [];
  const shapes = [new THREE.OctahedronGeometry(0.28), new THREE.TetrahedronGeometry(0.3), new THREE.TorusGeometry(0.22, 0.07, 10, 32), new THREE.IcosahedronGeometry(0.25)];
  for (let i = 0; i < 9; i++) {
    const m = new THREE.Mesh(
      shapes[i % shapes.length],
      new THREE.MeshBasicMaterial({ color: palette[i % 3], wireframe: true, transparent: true, opacity: 0.35 }),
    );
    m.position.set((Math.random() - 0.5) * 16, (Math.random() - 0.5) * 8, -2 - Math.random() * 6);
    m.userData = { base: m.position.y, phase: Math.random() * Math.PI * 2, rs: 0.2 + Math.random() * 0.5 };
    scene.add(m);
    floaters.push(m);
  }

  // ---------- Animation ----------
  const lowA = new THREE.Color('#5b3df5'), highA = new THREE.Color('#10b981');
  const lowC = new THREE.Color('#f472b6'), highC = new THREE.Color('#a3e635');
  const mouse = { x: 0, y: 0 }, smooth = { x: 0, y: 0 };
  let route = 'today', progress = 0, progressTarget = 0, burst = 0;
  let cur = null, target = [0, 0, 1];
  let running = false, raf = 0, last = performance.now(), time = 0;
  let enabled = motion;

  function layout() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const [fx, fy, sc] = w < 860 ? [0.6, 0.78, 0.5] : LAYOUTS[route] || LAYOUTS.today;
    target = [fx * HALF_H * camera.aspect, fy * HALF_H, sc];
    if (!cur) cur = [...target];
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += dt;
    smooth.x += (mouse.x - smooth.x) * 0.04;
    smooth.y += (mouse.y - smooth.y) * 0.04;
    progress += (progressTarget - progress) * 0.03;
    burst *= 0.96;
    for (let i = 0; i < 3; i++) cur[i] += (target[i] - cur[i]) * 0.035;

    uniforms.uTime.value = time;
    uniforms.uAmp.value = 0.26 + 0.08 * Math.sin(time * 0.6) + burst * 0.55;
    uniforms.uColorA.value.copy(lowA).lerp(highA, progress);
    uniforms.uColorC.value.copy(lowC).lerp(highC, progress);

    orb.rotation.y = time * 0.14 + smooth.x * 0.5;
    orb.rotation.x = time * 0.06 + smooth.y * 0.3;
    shell.rotation.y = -time * 0.09;
    shell.rotation.z = time * 0.04;
    rings.forEach((r) => (r.spin.rotation.z = time * r.speed * (1 + burst * 3)));
    stars.rotation.y = time * 0.015 + smooth.x * 0.08;
    stars.rotation.x = smooth.y * 0.05;
    pMat.size = 0.07 + burst * 0.09;
    floaters.forEach((m) => {
      m.rotation.x += dt * m.userData.rs;
      m.rotation.y += dt * m.userData.rs * 0.7;
      m.position.y = m.userData.base + Math.sin(time * 0.6 + m.userData.phase) * 0.35;
    });

    orbGroup.position.set(cur[0], cur[1], 0);
    orbGroup.scale.setScalar(cur[2] * (1 + burst * 0.18));
    orbGroup.rotation.z = Math.sin(time * 0.2) * 0.08;

    camera.position.x = smooth.x * 0.7;
    camera.position.y = -smooth.y * 0.45;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }

  function loop(now) {
    frame(now);
    if (running) raf = requestAnimationFrame(loop);
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
    if (!cur) cur = [...target];
    cur = [...target];
    frame(performance.now());
  }

  window.addEventListener('resize', () => {
    layout();
    if (!running) renderStill();
  });
  window.addEventListener('pointermove', (e) => {
    mouse.x = e.clientX / window.innerWidth - 0.5;
    mouse.y = e.clientY / window.innerHeight - 0.5;
  });
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  layout();
  renderStill();
  start();

  return {
    setRoute(r) {
      route = r;
      layout();
      if (!running) renderStill();
    },
    setProgress(p) {
      progressTarget = p;
      if (!running) {
        progress = p;
        renderStill();
      }
    },
    burst() {
      burst = 1;
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
