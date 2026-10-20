// Aura del cursor (las 3 páginas): por donde pasa el mouse la página se "rompe" en píxeles y franjas de glitch.
// Es un canvas fijo encima de todo con mix-blend-mode: difference: lo blanco que se dibuja invierte lo que hay
// abajo, así que sobre texto, fotos o fondo azul el efecto toma los colores de la propia página.
// Cuanto más rápido se mueve el cursor, más grande y desordenado el rastro. Solo con mouse; nada con reduced-motion.
// Cuando no hay nada que dibujar el canvas se oculta (una capa de mezcla a pantalla completa cuesta al scrollear).
// No aparece sobre el visor de obras ni durante la intro.
(() => {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cv = document.createElement('canvas'); cv.className = 'aura'; cv.setAttribute('aria-hidden', 'true'); cv.hidden = true;
  // estilos esenciales acá mismo, por si una página no carga tema.css
  cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:2147483000;mix-blend-mode:difference;image-rendering:pixelated';
  document.body.appendChild(cv);
  const cx = cv.getContext('2d');
  let W = 0, H = 0;
  const de = document.documentElement;
  const medir = () => { W = cv.width = de.clientWidth; H = cv.height = de.clientHeight; };   // sin la barra de scroll
  medir(); addEventListener('resize', medir);

  const C = 10;   // celda base de la grilla de píxeles
  const celdas = new Map();
  let mx = -999, my = -999, px = null, py = null, vel = 0, corriendo = false, ultimo = 0, quieto = 0, halo = 0;
  const azar = (a, b) => a + Math.random() * (b - a);
  const tapado = () => de.classList.contains('con-intro') || !!document.querySelector('#visor.abierto');

  function sembrar(x, y, v) {
    // rastro acotado: pocas celdas, cerca del cursor, para que se vea el efecto sin tapar lo que se lee
    const n = Math.min(16, 2 + v * .18), rad = Math.min(64, 12 + v * .55);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() ** 1.6 * rad;
      const t = Math.random(), tam = t < .62 ? 1 : t < .8 ? 2 : .5;   // píxeles de distinto tamaño
      const gx = Math.floor((x + Math.cos(a) * r) / (C * tam)) * C * tam, gy = Math.floor((y + Math.sin(a) * r) / (C * tam)) * C * tam;
      const tipo = Math.random() < .1 + Math.min(.15, v / 400) ? 'barra' : Math.random() < .12 ? 'rgb' : 'bloque';
      const k = `${gx},${gy},${tam}`, c = celdas.get(k);
      if (c) { c.v = 1; continue; }
      celdas.set(k, { x: gx, y: gy, s: C * tam, v: 1, tipo, w: tipo === 'barra' ? C * azar(2, 7) : 0, dx: azar(-12, 12), col: Math.random() < .5 ? '#00f0ff' : '#ff2bd6',
        vida: azar(150, 340) });
    }
  }

  function cuadro(now) {
    const dt = Math.min(64, now - (ultimo || now)); ultimo = now;
    cx.clearRect(0, 0, W, H);
    // halo suave que sigue al cursor: invierte apenas lo de abajo y se apaga si el mouse queda quieto
    quieto += dt; halo = mx > -999 ? (quieto < 700 ? Math.min(1, halo + dt / 150) : Math.max(0, halo - dt / 400)) : 0;
    if (halo > 0) {
      const g = cx.createRadialGradient(mx, my, 0, mx, my, 44);
      g.addColorStop(0, `rgba(255,255,255,${.16 * halo})`); g.addColorStop(1, 'rgba(255,255,255,0)');
      cx.fillStyle = g; cx.fillRect(mx - 44, my - 44, 88, 88);
    }
    for (const [k, c] of celdas) {
      c.v -= dt / c.vida;
      if (c.v <= 0) { celdas.delete(k); continue; }
      if (Math.random() < .18) continue;   // parpadeo
      cx.globalAlpha = Math.min(1, c.v * 1.3);
      if (c.tipo === 'barra') { cx.fillStyle = '#fff'; cx.fillRect(c.x + c.dx * (1 - c.v), c.y, c.w, Math.max(2, c.s * .35)); }
      else if (c.tipo === 'rgb') { cx.fillStyle = c.col; cx.fillRect(c.x + 2, c.y, c.s, c.s); }
      else { cx.fillStyle = '#fff'; cx.fillRect(c.x, c.y, c.s, c.s); }
    }
    cx.globalAlpha = 1;
    vel *= .86;
    if (celdas.size || halo > 0) requestAnimationFrame(cuadro);
    else { corriendo = false; ultimo = 0; cx.clearRect(0, 0, W, H); cv.hidden = true; }
  }
  const arrancar = () => { if (corriendo) return; corriendo = true; cv.hidden = false; requestAnimationFrame(cuadro); };

  addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    mx = e.clientX; my = e.clientY; quieto = 0;
    const d = px === null ? 0 : Math.hypot(mx - px, my - py); px = mx; py = my;
    if (tapado()) { celdas.clear(); return; }
    vel = Math.max(vel * .7, d);
    sembrar(mx, my, vel);
    arrancar();
  }, { passive: true });
  de.addEventListener('mouseleave', () => { mx = my = -999; px = py = null; });
  // al hacer clic, una explosión de píxeles
  addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || tapado()) return; sembrar(e.clientX, e.clientY, 70); arrancar(); }, { passive: true });
})();
