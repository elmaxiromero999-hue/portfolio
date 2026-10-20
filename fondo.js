// Fondo vivo (obras.html y diseno.html): retícula técnica MUY sutil detrás del contenido.
// - Cruces finas en cada intersección y líneas mayores cada 4 módulos; la grilla se desplaza más lento que la página (parallax).
// - Una línea de escaneo baja despacio y "despierta" las cruces y algunos fragmentos de código por donde pasa.
// - Cerca del cursor las cruces se encienden apenas y se apartan un poco; al moverlo aparecen glifos de código
//   y una lectura mínima de coordenadas.
// - Cada tantos segundos una franja de la grilla se corre unos píxeles (glitch).
// Canvas fijo con z-index -1: queda sobre el color de fondo y debajo de todo el contenido (los bloques con fondo propio lo tapan).
// Con reduced-motion se dibuja quieta.
(() => {
  const cv = document.createElement('canvas'); cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none';
  document.body.prepend(cv);
  const cx = cv.getContext('2d'), de = document.documentElement;
  const quieta = matchMedia('(prefers-reduced-motion: reduce)').matches, conMouse = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const P = 72;   // módulo de la retícula, en px
  const CODIGO = ['0x1F', '01', '10', '{ }', '//', 'fn()', '< >', '#00', '++', '::', '0xA3', '1101', '=>', '&&', '$_', '[ ]', '!0', 'px', 'rgb', '.618', '404', 'Δ', '0b1', 'nil', 'λ', '%', 'x2', '*/', 'ff', '0.0'];
  let W = 0, H = 0, dpr = 1, rgb = '24,0,255', alfa = 1;
  const tono = () => { const o = de.dataset.tema === 'oscuro'; rgb = o ? '170,176,255' : '24,0,255'; alfa = o ? .9 : 1; };
  const medir = () => { dpr = Math.min(devicePixelRatio || 1, 2); W = de.clientWidth; H = de.clientHeight; cv.width = W * dpr; cv.height = H * dpr; };
  tono(); medir();
  new MutationObserver(() => { tono(); if (quieta) pinta(performance.now()); }).observe(de, { attributes: true, attributeFilter: ['data-tema'] });
  addEventListener('resize', () => { medir(); if (quieta) pinta(performance.now()); });

  let mx = -9999, my = -9999, movido = 0, lx = 0, ly = 0;
  const glifos = [];
  const azar = (a, b) => a + Math.random() * (b - a);
  const elige = () => CODIGO[Math.floor(Math.random() * CODIGO.length)];
  let franja = null, proxFranja = performance.now() + azar(4000, 9000);

  function glifo(x, y, cerca) {   // x, y en coordenadas de pantalla, se pega a la intersección más cercana
    if (glifos.length > 26) return;
    const off = scrollY * .12 % P;
    const gx = Math.round(x / P) * P, gy = Math.round((y + off) / P) * P - off;
    if (glifos.some(g => g.x === gx && Math.abs(g.y - gy) < 2)) return;
    glifos.push({ x: gx, y: gy, wy: gy + scrollY * .12, txt: elige(), t0: performance.now(), vida: azar(900, 2200), cerca });   // wy: posición en la grilla, sigue el parallax
  }

  function pinta(now) {
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.clearRect(0, 0, W, H);
    const off = scrollY * .12 % P;   // parallax: la grilla acompaña el scroll más despacio
    const scan = ((now / 16000) % 1) * (H + 240) - 120;
    const activo = now - movido < 900;
    if (franja && now > franja.fin) franja = null;
    if (!quieta && !franja && now > proxFranja) { franja = { y: Math.floor(azar(0, H / P)) * P - off, h: P * Math.ceil(azar(1, 3)), dx: azar(-14, 14), fin: now + azar(90, 180) }; proxFranja = now + azar(5000, 11000); }

    // líneas mayores cada 4 módulos, casi invisibles
    cx.lineWidth = 1 / dpr * 1.2;
    cx.strokeStyle = `rgba(${rgb},${.035 * alfa})`;
    cx.beginPath();
    for (let x = 0; x <= W; x += P * 4) { cx.moveTo(x + .5, 0); cx.lineTo(x + .5, H); }
    for (let y = -off; y <= H; y += P * 4) if (y >= -P) { cx.moveTo(0, y + .5); cx.lineTo(W, y + .5); }
    cx.stroke();

    // cruces
    for (let y = -off; y <= H + P; y += P) {
      const enFranja = franja && y >= franja.y && y < franja.y + franja.h;
      for (let x = 0; x <= W + P; x += P) {
        let X = x + (enFranja ? franja.dx : 0), Y = y;
        let a = .1, s = 3;
        if (conMouse && mx > -9999) {
          const dx = X - mx, dy = Y - my, d = Math.hypot(dx, dy) || 1, k = Math.max(0, 1 - d / 190);
          if (k > 0) { X += dx / d * k * 7; Y += dy / d * k * 7; a += k * (activo ? .32 : .16); s += k * 3; }
        }
        const ds = Math.abs(Y - scan); if (ds < 46) a += .16 * (1 - ds / 46);
        cx.strokeStyle = `rgba(${rgb},${Math.min(.5, a) * alfa})`;
        cx.beginPath(); cx.moveTo(X - s, Y); cx.lineTo(X + s, Y); cx.moveTo(X, Y - s); cx.lineTo(X, Y + s); cx.stroke();
      }
    }
    // línea de escaneo
    if (!quieta) {
      const g = cx.createLinearGradient(0, 0, W, 0);
      g.addColorStop(0, `rgba(${rgb},0)`); g.addColorStop(.5, `rgba(${rgb},${.09 * alfa})`); g.addColorStop(1, `rgba(${rgb},0)`);
      cx.fillStyle = g; cx.fillRect(0, scan, W, 1);
      if (Math.random() < .05) glifo(azar(0, W), scan, false);
    }
    // fragmentos de código
    cx.font = '500 10px ui-monospace, SFMono-Regular, Menlo, monospace'; cx.textBaseline = 'top';
    for (let i = glifos.length - 1; i >= 0; i--) {
      const g = glifos[i], e = (now - g.t0) / g.vida;
      if (e >= 1) { glifos.splice(i, 1); continue; }
      if (e < .25 && Math.random() < .35) g.txt = elige();   // se "decodifica" al aparecer
      const env = e < .15 ? e / .15 : e > .7 ? (1 - e) / .3 : 1;
      cx.fillStyle = `rgba(${rgb},${(g.cerca ? .42 : .26) * env * alfa})`;
      cx.fillText(g.txt, g.x + 6, g.wy - scrollY * .12 + 5);
    }
    // lectura de coordenadas junto al cursor mientras se mueve
    if (conMouse && activo && mx > -9999) {
      const e = 1 - (now - movido) / 900;
      cx.fillStyle = `rgba(${rgb},${.32 * e * alfa})`;
      cx.fillText(`${String(Math.round(mx)).padStart(4, '0')}·${String(Math.round(my + scrollY)).padStart(5, '0')}`, mx + 16, my + 14);
    }
  }

  if (quieta) { pinta(performance.now()); addEventListener('scroll', () => pinta(performance.now()), { passive: true }); return; }

  // ~30 cuadros por segundo alcanzan para algo tan lento y gastan la mitad
  let ultimo = 0;
  (function loop(now) {
    if (now - ultimo > 32) { ultimo = now; pinta(now); }
    requestAnimationFrame(loop);
  })(0);

  if (conMouse) addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    mx = e.clientX; my = e.clientY;
    const now = performance.now(), d = Math.hypot(mx - lx, my - ly);
    if (d > 40 && Math.random() < .5) { glifo(mx + azar(-90, 90), my + azar(-70, 70), true); lx = mx; ly = my; }
    movido = now;
  }, { passive: true });
  de.addEventListener('mouseleave', () => { mx = my = -9999; });
})();
