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
    .mov-boton { display: inline-flex; align-items: center; justify-content: center; flex: none; min-width: 40px; min-height: 44px; padding: 0; margin: 0 0 0 auto;
      color: inherit; background: none; border: 0; cursor: pointer; }
    header .mov-boton + .tema-boton { margin-left: 0 !important; }
    .mov-boton svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; overflow: visible; }
    .mov-boton .ondas { opacity: .35; transition: opacity .3s; }
    .mov-boton.on .ondas { opacity: 1; animation: mov-late 1.6s ease-in-out infinite; }
    .mov-boton.on rect { animation: mov-tiembla 1.6s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }
    .mov-boton.fijo { position: fixed; top: 8px; right: 56px; z-index: 11; color: #fff; }
    @keyframes mov-late { 50% { opacity: .3; } }
    @keyframes mov-tiembla { 0%, 70%, 100% { transform: none; } 75% { transform: rotate(-8deg); } 80% { transform: rotate(8deg); } 85% { transform: rotate(-5deg); } 90% { transform: rotate(4deg); } }
    .mov-aviso { position: fixed; left: 12px; right: 12px; top: calc(var(--menu-h, 56px) + 10px); z-index: 60; display: flex; align-items: center; gap: 10px; padding: 10px 8px 10px 12px;
      background: var(--papel, #fff); color: var(--tinta, #1800ff); border: 1px solid currentColor; border-radius: 14px; box-shadow: 0 10px 30px rgba(0,0,0,.2);
      font: 13px/1.3 "Inter Tight", "Helvetica Neue", Arial, sans-serif; opacity: 0; transform: translateY(-10px); pointer-events: none; transition: opacity .35s, transform .35s; }
    .mov-aviso.ver { opacity: 1; transform: none; pointer-events: auto; }
    .mov-txt { flex: 1; }
    .mov-tel { flex: none; width: 14px; height: 24px; border: 1.5px solid currentColor; border-radius: 3px; animation: mov-tiembla 1.2s ease-in-out infinite; }
    .mov-aviso button { font: inherit; color: inherit; background: none; border: 0; cursor: pointer; min-height: 40px; }
    .mov-si { font-weight: 600; text-decoration: underline; text-underline-offset: 3px; padding: 0 6px; font-size: 12px !important; letter-spacing: .1em; text-transform: uppercase; }
    .mov-no { font-size: 18px !important; opacity: .6; padding: 0 6px; }
    html.menu-abierto .mov-aviso { display: none; }
    @media (max-width: 360px) { .menu-txt { display: none; } }`;
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

  // ---------- Sacudir o golpear el celular ----------
  // Botón con un teléfono que vibra en el encabezado (siempre a mano) + un aviso breve la primera vez.
  // iPhone exige pedir permiso desde un toque: el botón y el aviso lo piden en el acto (sin esperas antes de
  // requestPermission, así el cartel del sistema sale enseguida). Si ya lo había aceptado, el primer toque en
  // cualquier parte lo reactiva en silencio (no hace falta scrollear ni buscar nada).
  if (!('DeviceMotionEvent' in window) || !matchMedia('(pointer: coarse)').matches) return;
  const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const leer = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  let prev = null, ult = 0, activo = false, llego = false;
  const movimiento = e => {
    if (!llego) { llego = true; if (!activo) encender(); }   // llegaron datos: el botón pasa a encendido
    const now = performance.now(); if (now - ult < 110) return;
    const lin = e.acceleration, g = e.accelerationIncludingGravity;
    let fuerza = 0;
    // golpecitos: picos de aceleración lineal (sin gravedad); sacudidas: cambios bruscos con gravedad
    if (lin && lin.x !== null) { const m = Math.hypot(lin.x, lin.y, lin.z); if (m > 5) fuerza = (m - 4) / 14; }
    if (g && g.x !== null) {
      if (prev) { const d = Math.hypot(g.x - prev.x, g.y - prev.y, g.z - prev.z); if (d > 13) fuerza = Math.max(fuerza, (d - 11) / 22); }
      prev = { x: g.x, y: g.y, z: g.z };
    }
    if (fuerza > 0) { ult = now; window.glitchPulso(fuerza); }
  };
  const pide = typeof DeviceMotionEvent.requestPermission === 'function';   // iPhone/iPad
  const encender = () => { if (activo) return; activo = true; addEventListener('devicemotion', movimiento); boton.classList.add('on'); boton.setAttribute('aria-pressed', 'true'); };
  // pide permiso (iOS) o enciende directo; devuelve si quedó activo
  const activar = () => {
    if (!pide) { encender(); return Promise.resolve(true); }
    return DeviceMotionEvent.requestPermission().then(r => {
      if (r === 'granted') { encender(); guardar('sacudir', 'si'); return true; }
      guardar('sacudir', 'no'); return false;
    }).catch(() => false);
  };

  // botón del encabezado (en la portada, flotante junto al de claro/oscuro)
  const boton = document.createElement('button');
  boton.type = 'button'; boton.className = 'mov-boton'; boton.setAttribute('aria-pressed', 'false');
  boton.setAttribute('aria-label', 'Reaccionar al sacudir o golpear el teléfono'); boton.title = 'Sacudí o golpeá suave el celu';
  boton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="3.5" width="8" height="17" rx="1.8"/><path class="ondas" d="M5 8.5c-1.3 2-1.3 5 0 7M19 8.5c1.3 2 1.3 5 0 7M2.5 6.5c-2.2 3.3-2.2 7.7 0 11M21.5 6.5c2.2 3.3 2.2 7.7 0 11"/></svg>';
  const tema = document.querySelector('header .tema-boton, .tema-boton.fijo');
  if (tema && tema.closest('header')) tema.before(boton);
  else {
    boton.classList.add('fijo'); document.body.appendChild(boton);
    // debajo del botón flotante de claro/oscuro (en la portada el logo ocupa el centro de arriba)
    const ubicar = () => { if (!tema) return; const r = tema.getBoundingClientRect(); boton.style.top = `${r.bottom + 4}px`; boton.style.right = `${innerWidth - r.right + (r.width - 40) / 2}px`; };
    ubicar(); addEventListener('resize', ubicar);
  }

  const aviso = document.createElement('div');
  aviso.className = 'mov-aviso'; aviso.setAttribute('role', 'status');
  const avisar = (txt, conBoton) => {
    aviso.innerHTML = `<span class="mov-tel" aria-hidden="true"></span><span class="mov-txt">${txt}</span>${conBoton ? '<button type="button" class="mov-si">Probar</button>' : ''}<button type="button" class="mov-no" aria-label="Cerrar">×</button>`;
    if (!aviso.isConnected) document.body.appendChild(aviso);
    requestAnimationFrame(() => aviso.classList.add('ver'));
    clearTimeout(avisar.t); avisar.t = setTimeout(cerrar, 7000);
  };
  const cerrar = () => { aviso.classList.remove('ver'); clearTimeout(avisar.t); };
  aviso.addEventListener('click', e => {
    if (e.target.closest('.mov-no')) return cerrar();
    if (e.target.closest('.mov-si')) {
      activar().then(ok => { if (ok) { window.glitchPulso(.8); cerrar(); } else avisar('Sin permiso: activalo en Ajustes › Safari › Movimiento y orientación', false); });
    }
  });
  boton.addEventListener('click', () => {
    if (activo) { window.glitchPulso(.7); avisar('Sacudí o golpeá suave el celu', false); return; }
    activar().then(ok => { if (ok) { window.glitchPulso(.8); avisar('¡Listo! Sacudí o golpeá suave el celu', false); } else avisar('Sin permiso: activalo en Ajustes › Safari › Movimiento y orientación', false); });
  });

  if (!pide) encender();   // Android: no pide permiso, queda andando desde el principio
  else if (leer('sacudir') === 'si') {
    // ya lo aceptó otra vez. Primero se escucha sin pedir nada: si el navegador recuerda el permiso, los datos
    // llegan solos y anda desde que se abre la página. Si no llegan, iOS exige un toque: el primero en
    // cualquier parte (también el que saltea la intro) lo reactiva sin cartel.
    addEventListener('devicemotion', movimiento);
    setTimeout(() => { if (llego) { encender(); quitar(); } }, 800);
    const reactivar = e => { if (activo || llego) { encender(); return quitar(); } if (e.target.closest && e.target.closest('.mov-boton, .mov-aviso')) return; activar().then(ok => { if (ok) quitar(); }); };
    const quitar = () => { removeEventListener('click', reactivar, true); removeEventListener('touchend', reactivar, true); };
    addEventListener('click', reactivar, true); addEventListener('touchend', reactivar, true);
  }
  // aviso de una sola vez: aparece cuando termina la intro, sin necesidad de scrollear
  if (!leer('sacudir-aviso')) {
    const mostrar = () => {
      if (de.classList.contains('con-intro')) return setTimeout(mostrar, 800);
      guardar('sacudir-aviso', '1');
      avisar(activo ? 'Sacudí o golpeá suave el celu: la página reacciona' : 'Esta página reacciona si sacudís o golpeás suave el celu', !activo);
    };
    setTimeout(mostrar, 1600);
  }
})();
