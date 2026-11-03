// Sonidos de interfaz estilo consola vieja / 8 bits, sintetizados con Web Audio (no hay archivos de audio).
// window.SFX.{tick, clic, abrir, cerrar, barrido, glitch(I), bit, datos, paso, ok} los usan las demás partes del sitio.
// Además, solos: tick al pasar el mouse por algo tocable, clic al tocar, abrir/cerrar del visor y del menú.
// El navegador solo deja sonar después del primer toque o tecla; antes no suena nada.
// Botón de sonido (parlante) en el encabezado; la elección queda guardada (localStorage 'sonido').
(() => {
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  const de = document.documentElement;
  let ctx = null, salida = null, activo = true, listo = false;
  try { activo = localStorage.getItem('sonido') !== 'off'; } catch (e) {}

  const arrancar = () => {
    if (!ctx) {
      ctx = new AC();
      salida = ctx.createGain(); salida.gain.value = .16;   // volumen general: bajito
      const comp = ctx.createDynamicsCompressor(); salida.connect(comp); comp.connect(ctx.destination);
    }
    if (ctx.state !== 'running') ctx.resume().catch(() => {});   // iOS también usa 'interrupted'
    listo = true;
  };
  // en táctil, pointerdown no cuenta como gesto: también touchend, pointerup y click
  ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'].forEach(ev => addEventListener(ev, arrancar, { capture: true, passive: true }));
  const puede = () => activo && listo && ctx && ctx.state === 'running';

  // un tono con envolvente corta; f2 = glissando
  function tono(f, dur = .07, { tipo = 'square', vol = .4, f2 = null, cuando = 0 } = {}) {
    if (!puede()) return;
    const t = ctx.currentTime + cuando, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = tipo; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .004); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(salida); o.start(t); o.stop(t + dur + .02);
  }
  let ruidoBuf = null;
  function ruido(dur = .12, { vol = .3, frec = 2400, q = .8, cuando = 0 } = {}) {
    if (!puede()) return;
    if (!ruidoBuf) { ruidoBuf = ctx.createBuffer(1, ctx.sampleRate * .5, ctx.sampleRate); const d = ruidoBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const t = ctx.currentTime + cuando, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = ruidoBuf; f.type = 'bandpass'; f.frequency.value = frec; f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(salida); s.start(t, Math.random() * .3); s.stop(t + dur + .02);
  }
  const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5];
  const al = l => l[Math.floor(Math.random() * l.length)];

  const SFX = {
    tick: () => tono(2400, .018, { vol: .1 }),
    clic: () => { tono(880, .05, { vol: .28, f2: 1320 }); ruido(.02, { vol: .08, frec: 5000 }); },
    abrir: () => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tono(f, .07, { vol: .25, cuando: i * .045 })),
    cerrar: () => [1046.5, 783.99, 523.25].forEach((f, i) => tono(f, .06, { vol: .22, cuando: i * .04 })),
    barrido: () => { tono(140, .42, { tipo: 'sawtooth', vol: .16, f2: 2200 }); ruido(.4, { vol: .07, frec: 1200, q: .4 }); },
    glitch: (I = .5) => { ruido(.08 + I * .14, { vol: .12 + I * .2, frec: 800 + Math.random() * 3000, q: 2 }); for (let k = 0; k < 2 + I * 4; k++) tono(al(PENTA) * (Math.random() < .5 ? 2 : .5), .03, { vol: .12, cuando: Math.random() * .12 }); },
    bit: () => tono(al(PENTA) * 2, .045, { vol: .14 }),
    datos: (dur = .6) => { for (let t = 0; t < dur; t += .035) tono(al(PENTA) * (Math.random() < .3 ? 2 : 1), .025, { vol: .08, cuando: t }); },
    paso: () => { tono(330, .04, { vol: .2, f2: 660 }); tono(990, .03, { vol: .12, cuando: .04 }); },
    ok: () => { tono(784, .06, { vol: .25 }); tono(1568, .09, { vol: .25, cuando: .07 }); },
  };
  window.SFX = SFX;

  // ---------- sonidos automáticos ----------
  // .cp-obra no: el campo de Obra tiene su propio sonido al descubrir
  const TOCABLE = 'a[href], button, [role="button"], .ru-carta, summary, label';
  let ultimoTick = 0, ultimoEl = null, ultimoScroll = 0;
  addEventListener('scroll', () => { ultimoScroll = performance.now(); }, { passive: true });
  document.addEventListener('pointerover', e => {
    if (e.pointerType !== 'mouse') return;
    const el = e.target.closest(TOCABLE); if (!el || el === ultimoEl) return;
    ultimoEl = el; const now = performance.now(); if (now - ultimoTick < 130 || now - ultimoScroll < 150) return; ultimoTick = now; SFX.tick();
  }, { passive: true });
  document.addEventListener('pointerout', e => { if (ultimoEl && !ultimoEl.contains(e.relatedTarget)) ultimoEl = null; }, { passive: true });
  document.addEventListener('click', e => { if (e.target.closest(TOCABLE)) SFX.clic(); }, { capture: true, passive: true });
  // visor y menú: abrir / cerrar
  const mirar = (el, prueba) => { if (!el) return; let antes = prueba(); new MutationObserver(() => { const ahora = prueba(); if (ahora !== antes) { antes = ahora; (ahora ? SFX.abrir : SFX.cerrar)(); } }).observe(el, { attributes: true, attributeFilter: ['class'] }); };
  const visor = document.getElementById('visor'); mirar(visor, () => visor.classList.contains('abierto'));
  mirar(de, () => de.classList.contains('menu-abierto'));

  // ---------- botón de sonido ----------
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'son-boton';
  b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path class="ondas" d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/><path class="mute" d="M16 9.5l5 5M21 9.5l-5 5"/></svg>';
  const pintar = () => { b.classList.toggle('apagado', !activo); b.setAttribute('aria-pressed', String(activo)); b.setAttribute('aria-label', activo ? 'Silenciar sonidos' : 'Activar sonidos'); b.title = activo ? 'Sonido activado' : 'Sonido apagado'; };
  const alternar = () => { activo = !activo; try { localStorage.setItem('sonido', activo ? 'on' : 'off'); } catch (e) {} pintar(); if (activo) { arrancar(); setTimeout(SFX.ok, 60); } };
  b.addEventListener('click', alternar);
  pintar();
  const tema = document.querySelector('header .tema-boton');
  const enMenu = b.cloneNode(true); enMenu.classList.add('en-menu');   // en celular va dentro del menú desplegable (en el encabezado no entra)
  enMenu.insertAdjacentHTML('beforeend', '<span class="son-txt"></span>');
  enMenu.removeAttribute('aria-label'); enMenu.removeAttribute('title');   // lo nombra su texto visible
  const pintarMenu = () => { enMenu.classList.toggle('apagado', !activo); enMenu.setAttribute('aria-pressed', String(activo)); enMenu.querySelector('.son-txt').textContent = activo ? 'Sonido activado' : 'Sonido apagado'; };
  enMenu.addEventListener('click', () => { alternar(); pintarMenu(); });
  b.addEventListener('click', pintarMenu); pintarMenu();
  if (tema) { tema.before(b); const nav = document.querySelector('header nav'); if (nav) nav.appendChild(enMenu); }
  else {
    // portada: apilado debajo de los botones flotantes de la derecha
    b.classList.add('fijo'); document.body.appendChild(b);
    const ubicar = () => {
      const ref = document.querySelector('.mov-boton.fijo') || document.querySelector('.tema-boton.fijo'); if (!ref) return;
      const r = ref.getBoundingClientRect(); b.style.top = `${r.bottom + 4}px`; b.style.right = `${innerWidth - r.right + (r.width - 44) / 2}px`;
    };
    requestAnimationFrame(ubicar); addEventListener('resize', ubicar);
  }
  const css = document.createElement('style');
  css.textContent = `
    .son-boton { display: inline-flex; align-items: center; justify-content: center; flex: none; min-width: 40px; min-height: 44px; padding: 0; margin: 0 0 0 clamp(10px, 1.6vw, 22px); color: inherit; background: none; border: 0; cursor: pointer; }
    .son-boton svg { width: 21px; height: 21px; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
    .son-boton .mute { display: none; } .son-boton.apagado .mute { display: inline; } .son-boton.apagado .ondas { display: none; }
    .son-boton + .tema-boton { margin-left: 4px !important; }
    .son-boton.fijo { position: fixed; z-index: 11; color: #fff; width: 44px; height: 44px; margin: 0; }
    .son-boton.en-menu { display: none; }
    header .mov-boton + .son-boton { margin-left: 0; }
    @media (max-width: 760px) {
      header > .son-boton { display: none; }
      header nav .son-boton.en-menu { display: flex; justify-content: flex-start; gap: 12px; margin: 22px 0 0; padding: 0; font: inherit; font-size: 12px; letter-spacing: .14em; text-transform: uppercase; color: var(--gris); border: 0; }
      header nav .son-boton.en-menu svg { width: 22px; height: 22px; }
    }`;
  document.head.appendChild(css);
})();
