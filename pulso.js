// Glitch físico (las 3 páginas): la página se "rompe" un instante cuando
//  - en Mac con Safari se aprieta fuerte el trackpad (Force Touch: webkitmouseforcechanged, más fuerza = más glitch);
//  - en el celular se sacude el teléfono (DeviceMotion; en iPhone hace falta tocar "Activar" una vez, lo pide iOS).
// El efecto: franjas y bloques que invierten lo de abajo (canvas con mix-blend-mode difference) + la página tiembla.
// window.glitchPulso(intensidad 0..1) queda disponible para otros efectos. Nada con reduced-motion.
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const de = document.documentElement;
  const css = document.createElement('style');
  css.textContent = `
    .pulso-lienzo { position: fixed; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 2147483001; mix-blend-mode: difference; }
    html.pulso body > *:not(.pulso-lienzo):not(.aura):not(script):not(style) { animation: pulso-tiembla .24s steps(2) both; }
    @keyframes pulso-tiembla {
      0% { transform: translate(calc(var(--pulso, 4px) * -1), 0) skewX(calc(var(--pulso, 4px) * .15deg)); clip-path: inset(0 0 0 0); }
      33% { transform: translate(var(--pulso, 4px), 1px); clip-path: inset(0 0 0 0); }
      66% { transform: translate(calc(var(--pulso, 4px) * -.5), -1px) skewX(calc(var(--pulso, 4px) * -.1deg)); }
      100% { transform: none; } }
    .sacudir { position: fixed; left: 12px; bottom: 12px; z-index: 60; display: flex; align-items: center; gap: 8px; padding: 9px 12px 9px 14px; border: 1px solid currentColor; border-radius: 999px;
      background: var(--papel, #fff); color: var(--tinta, #1800ff); font: 11px/1 "Inter Tight", "Helvetica Neue", Arial, sans-serif; letter-spacing: .12em; text-transform: uppercase;
      box-shadow: 0 6px 24px rgba(0,0,0,.18); opacity: 0; transform: translateY(12px); transition: opacity .4s, transform .4s; }
    .sacudir.ver { opacity: 1; transform: none; }
    .sacudir button { font: inherit; letter-spacing: inherit; text-transform: inherit; color: inherit; background: none; border: 0; padding: 4px 2px; cursor: pointer; }
    .sacudir .si { font-weight: 600; text-decoration: underline; text-underline-offset: 3px; }
    .sacudir .no { opacity: .6; font-size: 14px; line-height: 1; padding: 0 2px 0 6px; }`;
  document.head.appendChild(css);

  // ---------- el efecto ----------
  const cv = document.createElement('canvas'); cv.className = 'pulso-lienzo'; cv.setAttribute('aria-hidden', 'true'); cv.hidden = true;
  document.body.appendChild(cv);
  const cx = cv.getContext('2d');
  const barras = [];
  let corriendo = false, ultimo = 0, finTiembla = 0;
  const azar = (a, b) => a + Math.random() * (b - a);
  function cuadro(now) {
    const W = cv.width, H = cv.height, dt = Math.min(50, now - (ultimo || now)); ultimo = now;
    cx.clearRect(0, 0, W, H);
    for (let i = barras.length - 1; i >= 0; i--) {
      const b = barras[i]; b.v -= dt / b.vida;
      if (b.v <= 0) { barras.splice(i, 1); continue; }
      if (Math.random() < .25) continue;   // parpadeo
      cx.fillStyle = b.col; cx.fillRect(b.x + (Math.random() - .5) * b.salto, b.y, b.w, b.h);
    }
    if (barras.length) requestAnimationFrame(cuadro); else { corriendo = false; ultimo = 0; cx.clearRect(0, 0, W, H); cv.hidden = true; }
  }
  window.glitchPulso = (I = .5) => {
    I = Math.max(.1, Math.min(1, I));
    cv.width = de.clientWidth; cv.height = de.clientHeight;
    const W = cv.width, H = cv.height, n = Math.round(6 + I * 26);
    for (let i = 0; i < n; i++) {
      const tipo = Math.random(), h = tipo < .7 ? azar(2, 10 + 34 * I) : azar(10, 40);
      barras.push({ x: tipo < .7 ? azar(-.2, .5) * W : azar(0, W - 60), y: azar(0, H), w: tipo < .7 ? azar(.3, 1) * W : azar(16, 60), h,
        col: Math.random() < .7 ? '#fff' : Math.random() < .5 ? '#00f0ff' : '#ff2bd6', v: 1, vida: azar(110, 260 + 160 * I), salto: 30 * I });
    }
    de.style.setProperty('--pulso', `${(3 + 9 * I).toFixed(1)}px`);
    // reinicia el temblor aunque ya esté temblando
    if (performance.now() > finTiembla - 60) { de.classList.remove('pulso'); void de.offsetWidth; de.classList.add('pulso'); }
    finTiembla = performance.now() + 240;
    clearTimeout(window.glitchPulso.t); window.glitchPulso.t = setTimeout(() => de.classList.remove('pulso'), 260);
    if (!corriendo) { corriendo = true; cv.hidden = false; requestAnimationFrame(cuadro); }
  };

  // ---------- Force Touch (Safari en Mac) ----------
  let ultFuerza = 0;
  document.addEventListener('webkitmouseforcewillbegin', e => e.preventDefault());   // sin la ventana de "consultar" del clic fuerte
  document.addEventListener('webkitmouseforcechanged', e => {
    const f = e.webkitForce || 0, now = performance.now();   // 1 = clic normal, 2 = clic fuerte, hasta 3
    if (f < 1.15 || now - ultFuerza < 90) return;
    ultFuerza = now; window.glitchPulso((f - 1.1) / 1.6);
  });

  // ---------- Sacudir el celular ----------
  if (!('DeviceMotionEvent' in window) || !matchMedia('(pointer: coarse)').matches) return;
  let prev = null, ultSacudida = 0;
  const movimiento = e => {
    const a = e.accelerationIncludingGravity || e.acceleration; if (!a || a.x === null) return;
    if (prev) {
      const d = Math.hypot(a.x - prev.x, a.y - prev.y, a.z - prev.z), now = performance.now();   // cambio brusco = sacudida
      if (d > 14 && now - ultSacudida > 110) { ultSacudida = now; window.glitchPulso((d - 12) / 22); }
    }
    prev = { x: a.x, y: a.y, z: a.z };
  };
  const pide = typeof DeviceMotionEvent.requestPermission === 'function';   // iPhone/iPad
  if (!pide) { addEventListener('devicemotion', movimiento); return; }

  // iOS: un aviso chico y descartable; si ya dijo que no, no se vuelve a mostrar
  let dijo = null; try { dijo = localStorage.getItem('sacudir'); } catch (e) {}
  if (dijo === 'no') return;
  const activar = () => DeviceMotionEvent.requestPermission().then(r => {
    if (r === 'granted') { addEventListener('devicemotion', movimiento); try { localStorage.setItem('sacudir', 'si'); } catch (e) {} window.glitchPulso(.8); return true; }
    try { localStorage.setItem('sacudir', 'no'); } catch (e) {} return false;
  }).catch(() => false);
  // si ya lo aceptó antes, iOS igual exige un toque: se engancha al primer toque en la página, sin aviso
  if (dijo === 'si') { addEventListener('touchend', activar, { once: true }); return; }
  const aviso = document.createElement('div'); aviso.className = 'sacudir';
  aviso.innerHTML = '<span>Sacudí el teléfono</span><button type="button" class="si">Activar</button><button type="button" class="no" aria-label="No, gracias">×</button>';
  const mostrar = () => { if (de.classList.contains('con-intro')) return setTimeout(mostrar, 1200); document.body.appendChild(aviso); requestAnimationFrame(() => aviso.classList.add('ver')); };
  // aparece recién cuando la persona empieza a recorrer (no tapa el título de la portada)
  const alScroll = () => { if (scrollY > innerHeight * .6) { removeEventListener('scroll', alScroll); mostrar(); } };
  addEventListener('scroll', alScroll, { passive: true });
  const cerrar = () => { aviso.classList.remove('ver'); setTimeout(() => aviso.remove(), 400); };
  aviso.querySelector('.si').addEventListener('click', () => { activar(); cerrar(); });
  aviso.querySelector('.no').addEventListener('click', () => { try { localStorage.setItem('sacudir', 'no'); } catch (e) {} cerrar(); });
})();
