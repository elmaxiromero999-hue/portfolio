// Obra: "campo" para explorar los dibujos con una linterna.
// Las obras están desparramadas en un plano más grande que la pantalla, a distintas profundidades. El cursor mueve
// la cámara (parallax según la profundidad) y es una linterna: un velo cubre todo y solo se ve lo que se ilumina.
// Cada obra iluminada "emerge" por encima del velo con un glitch y queda descubierta (HUD: vistas n / total).
// Al pasar por una se levanta y muestra su ficha; clic → visor (window.abrirObra, en obras.html).
// En pantallas táctiles la linterna queda al centro, el campo se mueve deslizando de costado y deriva solo;
// primer toque descubre la obra, el segundo la amplía. Teclado: Tab recorre las obras y la cámara las sigue.
(() => {
  const campo = document.getElementById('escena'); if (!campo || typeof OBRAS === 'undefined') return;
  const mundo = campo.querySelector('.cp-mundo'), velo = campo.querySelector('.cp-velo'), lente = campo.querySelector('.cp-lente'), luces = [velo, lente];
  const ficha = campo.querySelector('.cp-ficha'), cuenta = campo.querySelector('.cp-cuenta'), barra = campo.querySelector('.cp-progreso i'), coords = campo.querySelector('.cp-coords');
  const anuncio = campo.querySelector('.cp-anuncio');
  const tactil = matchMedia('(hover: none), (pointer: coarse)').matches, quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const GLIFOS = '01#%&*/\\<>_=+▮▯';

  // azar con semilla: el campo es el mismo en cada visita
  let semilla = 11; const azar = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647;
  const total = OBRAS.length;

  const piezas = OBRAS.map((o, i) => {
    const el = document.createElement('button');
    el.type = 'button'; el.className = 'cp-obra' + (o.nuevo ? ' es-nueva' : '');
    el.setAttribute('aria-label', `${o.titulo}${o.tecnica ? ', ' + o.tecnica : ''}. Ampliar`);
    el.innerHTML = `<img src="${esc(o.thumb)}" alt="" draggable="false" decoding="async">${o.nuevo ? '<span class="cp-nuevo">Nuevo</span>' : ''}`;
    mundo.appendChild(el);
    return { o, i, el, x: 0, y: 0, w: 0, h: 0, d: 1, rot: 0, vista: false, sx: 0, sy: 0 };
  });

  // ---------- armado del campo ----------
  let Vw = 0, Vh = 0, Wf = 0, Hf = 0, R = 160;
  function armar() {
    Vw = campo.clientWidth; Vh = campo.clientHeight;
    Wf = Vw * (tactil ? 2.8 : 2.3); Hf = Vh * (tactil ? 1.35 : 2);
    R = Math.max(105, Math.min(200, Vw * .14));
    campo.style.setProperty('--r', R + 'px');
    const base = Math.min(Vw * (tactil ? .44 : .2), Vh * (tactil ? .36 : .38));
    // grilla con jitter para que no se amontonen; orden mezclado
    const cols = Math.ceil(Math.sqrt(total * Wf / Hf)), filas = Math.ceil(total / cols);
    const celdas = []; for (let f = 0; f < filas; f++) for (let c = 0; c < cols; c++) celdas.push([c, f]);
    semilla = 11;
    for (let k = celdas.length - 1; k > 0; k--) { const j = Math.floor(azar() * (k + 1)); [celdas[k], celdas[j]] = [celdas[j], celdas[k]]; }
    // las nuevas, cerca del centro (lo primero que se ve)
    const orden = piezas.slice().sort((a, b) => (b.o.nuevo ? 1 : 0) - (a.o.nuevo ? 1 : 0));
    const centro = celdas.slice().sort((a, b) => Math.hypot(a[0] - cols / 2 + .5, a[1] - filas / 2 + .5) - Math.hypot(b[0] - cols / 2 + .5, b[1] - filas / 2 + .5));
    const usadas = new Set();
    orden.forEach(p => {
      let cel = p.o.nuevo ? centro.find(c => !usadas.has(c)) : celdas.find(c => !usadas.has(c));
      usadas.add(cel);
      p.d = .58 + azar() * .55;                       // profundidad: más cerca = más grande y se mueve más
      if (p.o.nuevo) p.d = 1.12;                      // lo nuevo, adelante y grande
      const ar = p.o.w / p.o.h, area = base * base * (p.o.w > 1500 && p.o.h > 1500 ? 1.5 : 1) * p.d * p.d;
      p.w = Math.sqrt(area * ar); p.h = p.w / ar;
      const rangoX = Vw + (Wf - Vw) * p.d, rangoY = Vh + (Hf - Vh) * p.d;
      p.x = ((cel[0] + .2 + azar() * .6) / cols) * rangoX - p.w / 2;
      p.y = ((cel[1] + .2 + azar() * .6) / filas) * rangoY - p.h / 2;
      p.rot = (azar() - .5) * 26;
      p.el.style.width = p.w + 'px'; p.el.style.height = p.h + 'px';
      p.el.style.setProperty('--rot', p.rot.toFixed(1) + 'deg');
      p.el.style.zIndex = '';
    });
  }

  // ---------- cámara y linterna ----------
  let camX = 0, camY = 0, objX = 0, objY = 0, luzX = 0, luzY = 0, luzOX = 0, luzOY = 0;
  let ultimoMov = 0, tocando = false, siguiendo = null, arrastre = null, derivaX = 0, dentro = false;
  const limitar = () => { objX = Math.max(0, Math.min(Wf - Vw, objX)); objY = Math.max(0, Math.min(Hf - Vh, objY)); };
  function centrarEn(p) {   // la cámara lleva una obra al centro de la pantalla
    objX = (p.x + p.w / 2 - Vw / 2) / p.d; objY = (p.y + p.h / 2 - Vh / 2) / p.d; limitar();
  }

  campo.addEventListener('pointermove', e => {
    const r = campo.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    if (e.pointerType === 'mouse') {
      luzOX = mx; luzOY = my; ultimoMov = performance.now(); siguiendo = null; dentro = true;
    } else if (arrastre) {
      luzOX = mx; luzOY = my;
      if (!arrastre.movio && Math.abs(e.clientX - arrastre.x) > 8) { arrastre.movio = true; mostrarFicha(null); siguiendo = null; }   // fue arrastre, no toque
      objX = arrastre.cx - (e.clientX - arrastre.x) * 1.4; limitar(); ultimoMov = performance.now();
    }
  });
  campo.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse') return;
    const r = campo.getBoundingClientRect();
    tocando = true; luzOX = e.clientX - r.left; luzOY = e.clientY - r.top;
    arrastre = { x: e.clientX, cx: objX };
    if (!e.target.closest('.cp-obra')) { mostrarFicha(null); siguiendo = null; }   // tocar el fondo suelta la obra señalada
  });
  // el arrastre se olvida un instante después, para que el clic que llega al soltar sepa que no fue un toque
  const soltar = () => { tocando = false; const a = arrastre; setTimeout(() => { if (arrastre === a) arrastre = null; }, 60); };
  addEventListener('pointerup', soltar); addEventListener('pointercancel', soltar);
  campo.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { dentro = false; luzOX = Vw / 2; luzOY = Vh / 2; } });

  // ---------- descubrir obras ----------
  let vistas = 0;
  const pintarCuenta = () => {
    cuenta.textContent = `${String(vistas).padStart(2, '0')} / ${total}`;
    barra.style.transform = `scaleX(${vistas / total})`;
    campo.classList.toggle('completo', vistas === total);
  };
  function descubrir(p, silencio) {
    if (p.vista) return;
    p.vista = true; p.el.classList.add('vista');
    if (!silencio && !quieto) { p.el.classList.add('emerge'); setTimeout(() => p.el.classList.remove('emerge'), 520); }
    vistas++; pintarCuenta();
    if (vistas === total) { anuncio.textContent = 'Viste todas las obras'; if (!silencio && window.glitchPulso) glitchPulso(.7); }
  }
  let encendiendo = [];
  campo.querySelector('.cp-todo').addEventListener('click', () => { encendiendo.forEach(clearTimeout); encendiendo = piezas.map((p, k) => setTimeout(() => descubrir(p), quieto ? 0 : k * 40)); });
  campo.querySelector('.cp-apagar').addEventListener('click', () => { encendiendo.forEach(clearTimeout); encendiendo = []; mostrarFicha(null); piezas.forEach(p => { p.vista = false; p.el.classList.remove('vista'); }); vistas = 0; pintarCuenta(); if (window.glitchPulso) glitchPulso(.35); });

  // ficha que acompaña a la obra señalada; el título se decodifica
  let encima = null, deco = 0, armada = null;   // armada: obra con el primer toque (táctil), el segundo la amplía
  function mostrarFicha(p) {
    if (encima === p) return;
    if (encima) encima.el.classList.remove('encima');
    encima = p; if (!p) { armada = null; ficha.classList.remove('ver'); return; }
    p.el.classList.add('encima');
    const o = p.o, id = ++deco, t0 = performance.now();
    ficha.innerHTML = `<span class="cp-fn">${String(p.i + 1).padStart(2, '0')} / ${total}</span><b></b><span>${esc([o.tecnica, o.medidas].filter(Boolean).join(' · ') || 'Dibujo')}</span><em>${tactil ? 'tocá de nuevo para ampliar' : 'clic para ampliar'}</em>`;
    const b = ficha.querySelector('b');
    (function d(now) {
      if (id !== deco) return;
      const q = quieto ? 1 : Math.min(1, (now - t0) / 320);
      b.textContent = [...o.titulo].map((ch, k) => ch === ' ' || k / o.titulo.length < q * 1.2 - .1 ? ch : GLIFOS[Math.floor(Math.random() * GLIFOS.length)]).join('');
      if (q < 1) requestAnimationFrame(d);
    })(t0);
    ficha.classList.add('ver');
  }
  piezas.forEach(p => {
    p.el.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { descubrir(p); mostrarFicha(p); } });
    p.el.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && encima === p) mostrarFicha(null); });
    // con teclado: la cámara la busca (el toque en Android y el foco que devuelve el visor también enfocan, pero sin :focus-visible)
    p.el.addEventListener('focus', () => { if (!p.el.matches(':focus-visible')) return; descubrir(p); mostrarFicha(p); siguiendo = p; centrarEn(p); });
    p.el.addEventListener('blur', () => { if (encima === p) mostrarFicha(null); });
    p.el.addEventListener('click', e => {
      if (arrastre && arrastre.movio) return;
      // táctil: el primer toque descubre y muestra la ficha, el segundo amplía
      if (tactil && armada !== p) { armada = p; descubrir(p); mostrarFicha(p); return; }
      armada = null;
      if (window.glitchPulso) glitchPulso(.25);
      window.abrirObra && abrirObra(p.i);
    });
  });

  // ---------- cuadro a cuadro ----------
  let visible = false, corriendo = false, t0 = 0;
  const visorAbierto = () => { const v = document.getElementById('visor'); return v && v.classList.contains('abierto'); };
  let ultimaFirma = '';
  function cuadro(now) {
    if (!visible) { corriendo = false; return; }
    if (visorAbierto()) { t0 = now; requestAnimationFrame(cuadro); return; }   // el visor tapa todo: no se dibuja
    // deriva sola en táctil, o con el mouse quieto un rato (así el campo siempre está vivo)
    const quietoHace = now - ultimoMov;
    if (!quieto && !siguiendo && !encima && (tactil ? !tocando && quietoHace > 1200 : quietoHace > 6000)) {
      const dt = Math.min(48, now - (t0 || now));
      derivaX += dt * .00012;
      objX += Math.cos(derivaX * 2.1) * dt * .05 * (Wf - Vw) / 1000; objY += Math.cos(derivaX * 1.3 + 1) * dt * .035 * (Hf - Vh) / 1000; limitar();
    }
    // con el mouse: la cámara solo avanza cuando el cursor se acerca a un borde (en el centro queda quieta para mirar)
    if (dentro && !tactil && !siguiendo && !encima) {
      const empuje = t => { const z = Math.max(0, Math.abs(t) - .5) / .5; return Math.sign(t) * z * z; };
      const paso = Math.min(48, now - (t0 || now)) * .9;
      objX += empuje(luzOX / Vw * 2 - 1) * paso; objY += empuje(luzOY / Vh * 2 - 1) * paso; limitar();
    }
    t0 = now;
    const k = quieto ? 1 : .07;
    camX += (objX - camX) * k; camY += (objY - camY) * k;
    if (tactil && !tocando) { luzOX = Vw / 2; luzOY = Vh / 2; }
    luzX += (luzOX - luzX) * (quieto ? 1 : .25); luzY += (luzOY - luzY) * (quieto ? 1 : .25);
    // si la cámara y la luz ya llegaron, no hay nada que redibujar
    const firma = `${camX.toFixed(1)},${camY.toFixed(1)},${luzX.toFixed(0)},${luzY.toFixed(0)},${encima ? encima.i : -1}`;
    if (firma === ultimaFirma) { requestAnimationFrame(cuadro); return; }
    ultimaFirma = firma;
    // la luz solo la usan el velo y la lente: escribirla ahí evita recalcular el estilo de todo el campo
    for (const n of luces) { n.style.setProperty('--lx', luzX.toFixed(1) + 'px'); n.style.setProperty('--ly', luzY.toFixed(1) + 'px'); }
    for (const p of piezas) {
      p.sx = p.x - camX * p.d; p.sy = p.y - camY * p.d;
      p.el.style.transform = `translate3d(${p.sx.toFixed(1)}px, ${p.sy.toFixed(1)}px, 0)`;
      // lo que entra en la luz emerge
      if (!p.vista) {
        const cx = p.sx + p.w / 2, cy = p.sy + p.h / 2, dx = Math.max(Math.abs(cx - luzX) - p.w / 2, 0), dy = Math.max(Math.abs(cy - luzY) - p.h / 2, 0);
        if (Math.hypot(dx, dy) < R * .45) descubrir(p);
      }
    }
    if (encima) {   // la ficha sigue a la obra señalada
      const fw = ficha.offsetWidth || 236, fh = ficha.offsetHeight || 110;
      // a la derecha de la obra; si no entra, a la izquierda; siempre dentro del campo
      let fx = encima.sx + encima.w + 14; if (fx + fw > Vw - 12) fx = encima.sx - fw - 14;
      fx = Math.min(Vw - fw - 12, Math.max(12, fx));
      const fy = Math.min(Vh - fh - 70, Math.max(12, encima.sy));
      ficha.style.transform = `translate(${fx.toFixed(0)}px, ${fy.toFixed(0)}px)`;
    }
    coords.textContent = `x ${String(Math.round(camX)).padStart(4, '0')} · y ${String(Math.round(camY)).padStart(4, '0')}`;
    requestAnimationFrame(cuadro);
  }
  const arrancar = () => { if (!corriendo && visible) { corriendo = true; requestAnimationFrame(cuadro); } };

  // entrada: las obras llegan desde el fondo, escalonadas
  let entro = false;
  function entrar() {
    if (entro) return; entro = true;
    if (quieto) { campo.classList.add('listo'); return; }
    piezas.forEach((p, k) => { p.el.querySelector('img').style.transitionDelay = `${k * 45}ms`; });
    requestAnimationFrame(() => requestAnimationFrame(() => campo.classList.add('listo')));
    setTimeout(() => piezas.forEach(p => { p.el.querySelector('img').style.transitionDelay = ''; }), total * 45 + 900);
  }

  if ('IntersectionObserver' in window) new IntersectionObserver(es => { visible = es[0].isIntersecting; arrancar(); if (visible) entrar(); }).observe(campo);
  else { visible = true; arrancar(); entrar(); }

  let anchoPrev = innerWidth, rz;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (campo.clientWidth === Vw && campo.clientHeight === Vh) return; armar(); limitar(); ultimaFirma = ''; }, 150); });
  campo.addEventListener('scroll', () => { if (campo.scrollLeft || campo.scrollTop) campo.scrollTo(0, 0); });
  armar();
  objX = camX = (Wf - Vw) / 2; objY = camY = (Hf - Vh) / 2;
  luzX = luzOX = Vw / 2; luzY = luzOY = Vh / 2;
  piezas.filter(p => p.o.nuevo).forEach(p => descubrir(p, true));   // lo nuevo arranca a la vista
  pintarCuenta();
  campo.querySelector('.cp-ayuda').textContent = tactil ? 'Deslizá de costado para explorar · tocá una obra para verla' : 'Mové el cursor para iluminar · clic para ampliar';
})();
