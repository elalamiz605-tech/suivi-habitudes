// Fond animé : des vagues qui traversent l'écran, dessinées sur un canvas 2D.
// La vague vermillon s'épaissit et s'éclaire avec la progression du jour ;
// une validation envoie une impulsion qui soulève toutes les lignes.
// Même interface que l'ancien fond : setRoute, setProgress, burst, setTheme, setMotion.

const LINES = 7;
const ROUTE_SHIFT = { today: 0, habits: -0.06, tasks: 0.06, stats: -0.03, year: 0.04, review: -0.02, settings: 0.03 };

export function createScene(canvas, { motion = true, theme = 'dark' } = {}) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
  let W = 0, H = 0;
  let enabled = motion;
  let running = false;
  let raf = 0;
  let last = 0;
  let time = 0;
  let route = 'today';
  let shift = 0, shiftTarget = 0;
  let progress = 0, progressTarget = 0;
  let pulse = 0;
  let calm = 0, calmTarget = 0;        // 1 = vagues discrètes, grises, descendues (intro)
  let signalOn = 1, signalTarget = 1;  // 0 = ligne orange éteinte
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  let colors = palette(theme);

  function palette(th) {
    const light = th === 'light';
    return {
      bg: light ? '#f4f5f7' : '#090a0c',
      line: light ? '38, 42, 50' : '164, 170, 180',
      lineAlpha: light ? 0.14 : 0.16,
      signal: light ? '232, 73, 42' : '255, 91, 58',
    };
  }

  function layout() {
    W = canvas.width = Math.round(window.innerWidth * dpr);
    H = canvas.height = Math.round(window.innerHeight * dpr);
  }

  function draw() {
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, W, H);
    const step = 6 * dpr;
    const mid = H * (0.5 + shift + calm * 0.24) + mouse.y * 14 * dpr;
    const dim = 1 - calm * 0.55;
    const lift = pulse * pulse * H * 0.05;
    const main = 3;
    for (let l = 0; l < LINES; l++) {
      const isMain = l === main;
      const amp1 = H * 0.08 * (1 + l * 0.15) * (1 + pulse * 0.6);
      const amp2 = H * 0.05 * (1 + pulse * 0.3);
      const off = (l - main) * 22 * dpr;
      ctx.beginPath();
      for (let x = 0; x <= W + step; x += step) {
        const u = x / W + mouse.x * 0.04;
        const y = mid + off - lift
          + Math.sin(u * 6 + time * 0.7 + l * 0.7) * amp1
          + Math.sin(u * 2.3 - time * 0.4 + l) * amp2;
        x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      if (isMain && signalOn < 0.03) continue; // ligne éteinte pendant l'intro : rien à dessiner
      if (isMain) {
        // Halo : un second trait large et pâle, bien moins coûteux qu'un shadowBlur.
        ctx.strokeStyle = `rgba(${colors.signal}, ${(0.1 + progress * 0.15 + pulse * 0.1) * signalOn})`;
        ctx.lineWidth = (8 + progress * 8 + pulse * 10) * dpr;
        ctx.stroke();
        ctx.strokeStyle = `rgba(${colors.signal}, ${(0.7 + progress * 0.3) * signalOn})`;
        ctx.lineWidth = (1.6 + progress * 1.4 + pulse * 1.5) * dpr;
      } else {
        const near = 1 - Math.abs(l - main) / LINES;
        ctx.strokeStyle = `rgba(${colors.line}, ${(colors.lineAlpha + near * 0.1 + pulse * 0.1) * dim})`;
        ctx.lineWidth = 1.2 * dpr;
      }
      ctx.stroke();
    }
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    time += dt;
    progress += (progressTarget - progress) * Math.min(1, dt * 2.5);
    shift += (shiftTarget - shift) * Math.min(1, dt * 2);
    if (pulse > 0) pulse = Math.max(0, pulse - dt * 0.7);
    calm += (calmTarget - calm) * Math.min(1, dt * 1.6);
    signalOn += (signalTarget - signalOn) * Math.min(1, dt * 2.2);
    mouse.x += (mouse.tx - mouse.x) * dt * 2;
    mouse.y += (mouse.ty - mouse.y) * dt * 2;
    draw();
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
    progress = progressTarget;
    shift = shiftTarget;
    calm = calmTarget;
    signalOn = signalTarget;
    pulse = 0;
    draw();
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
      shiftTarget = ROUTE_SHIFT[route] ?? 0;
      if (!running) renderStill();
    },
    setProgress(p) {
      progressTarget = Math.max(0, Math.min(1, p || 0));
      if (!running) renderStill();
    },
    burst() {
      if (running) pulse = 1;
    },
    // 'calm' : intro, lignes grises et discrètes ; 'wake' : la ligne orange s'allume ; 'normal' : l'app.
    setMood(m) {
      calmTarget = m === 'normal' ? 0 : 1;
      signalTarget = m === 'calm' ? 0 : 1;
      if (m === 'wake') this.burst();
      if (!running) renderStill();
    },
    setTheme(th) {
      colors = palette(th);
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
