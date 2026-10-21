// Índice de Diseño como visor 3D: los capítulos son cartas en una rueda que gira (arrastrar, flechas, teclado,
// o sola cada pocos segundos). La del frente se ve a color, con su video si tiene, y abajo su ficha con el nombre
// que se "decodifica". Tocar la del frente abre el capítulo (transicion.js + capitulos.js); tocar otra la trae
// al frente. Al girar rápido las cartas se separan en cian/magenta. Botones Rueda / Lista: la lista original
// (#indice ol) sigue siendo la fuente de datos y queda como vista alternativa (se recuerda en localStorage).
(() => {
  const indice = document.getElementById('indice'); if (!indice) return;
  const filas = [...indice.querySelectorAll('ol a[href^="#"]')]; const N = filas.length; if (N < 3) return;
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const GLIFOS = '01#%&*/\\<>_=+▮▯◢◣';

  // datos de cada capítulo, sacados del renglón del índice (y de su miniatura, que arma diseno-inst.js)
  const datos = filas.map(a => {
    const m = a.querySelector('.m'), img = m && m.querySelector('img'), vid = m && m.querySelector('video');
    let foto = img ? img.getAttribute('src') : vid ? vid.getAttribute('poster') : null;
    if (!foto && a.dataset.vista === 'motion') foto = 'img/motion-cuadros/m1-1.webp';
    return { href: a.getAttribute('href'), vista: a.dataset.vista, n: a.querySelector('.n').textContent, nombre: a.querySelector('b').textContent,
      q: (a.querySelector('.q') || {}).textContent || '', anio: (a.querySelector('.a') || {}).textContent || '', foto,
      video: vid && vid.getAttribute('src') && !/#t=/.test(vid.getAttribute('src')) ? vid.getAttribute('src') : null };
  });

  // ---------- armado ----------
  const r = document.createElement('div');
  r.className = 'rueda';
  r.innerHTML = `<div class="ru-escena" role="group" aria-roledescription="carrusel" aria-label="Capítulos de Diseño">
      <div class="ru-mira" aria-hidden="true"><i></i><i></i><i></i><i></i><span class="ru-etq">visor · cap</span></div>
      <div class="ru-anillo">${datos.map((d, i) => `<a class="ru-carta" href="${esc(d.href)}" data-vista="${esc(d.vista)}" data-rueda="atras" draggable="false" style="--i:${i}" aria-label="${esc(d.n + ' ' + d.nombre)}">
        <span class="ru-img">${d.foto ? `<img src="${esc(d.foto)}" alt="" decoding="async" draggable="false">` : ''}</span>
        <span class="ru-velo"></span><span class="ru-n">${esc(d.n)}</span><span class="ru-nombre">${esc(d.nombre)}</span></a>`).join('')}</div>
    </div>
    <div class="ru-info">
      <div class="ru-hud" aria-hidden="true"><span>θ <b class="ru-ang">000.0</b>°</span><span class="ru-ayuda">arrastrá · tocá la del frente para abrir</span><span><b class="ru-cuenta">01</b> / ${String(N).padStart(2, '0')}</span></div>
      <p class="ru-q"></p>
      <h3 class="ru-titulo" aria-hidden="true"></h3><span class="ru-anuncio" aria-live="polite"></span>
      <div class="ru-acciones"><button type="button" class="ru-ant" aria-label="Capítulo anterior">←</button>
        <a class="ru-abrir" href="#"><span>Abrir capítulo</span> <span aria-hidden="true">→</span></a>
        <button type="button" class="ru-sig" aria-label="Capítulo siguiente">→</button></div>
    </div>`;
  indice.querySelector('ol').before(r);
  const escena = r.querySelector('.ru-escena'), anillo = r.querySelector('.ru-anillo'), cartas = [...r.querySelectorAll('.ru-carta')];
  const anuncio = r.querySelector('.ru-anuncio'), abrir = r.querySelector('.ru-abrir'), titulo = r.querySelector('.ru-titulo'), ruQ = r.querySelector('.ru-q'), ang = r.querySelector('.ru-ang'), cuenta = r.querySelector('.ru-cuenta');

  // vista Rueda / Lista
  const tit = indice.querySelector('.indice-tit');
  const modos = document.createElement('span'); modos.className = 'ru-modos';
  modos.innerHTML = '<button type="button" data-modo="rueda">Rueda</button><button type="button" data-modo="lista">Lista</button>';
  if (tit) tit.insertBefore(modos, tit.lastElementChild);
  const ponerModo = m => {
    indice.classList.toggle('modo-lista', m === 'lista');
    modos.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.modo === m)));
    try { localStorage.setItem('indice-modo', m); } catch (e) {}
    if (m === 'rueda') medir();
    sincronizarVideo();
  };
  modos.addEventListener('click', e => { const b = e.target.closest('button'); if (b) ponerModo(b.dataset.modo); });

  // ---------- geometría y animación ----------
  const PASO = 360 / N;
  r.style.setProperty('--paso', PASO + 'deg');
  let bloqueoHasta = 0;   // justo después de arrastrar, ninguna carta queda "al frente" para abrir
  let theta = 0, destino = 0, frente = -1, radio = 300, ultimoT = 0, vel = 0, corriendo = false, arrastre = null;
  function medir() {
    const w = cartas[0].offsetWidth || 240;
    radio = Math.round((w / 2) / Math.tan(Math.PI / N) * 1.12);
    r.style.setProperty('--radio', radio + 'px');
    pintar();
  }
  const norm = a => ((a % 360) + 540) % 360 - 180;   // -180..180
  function pintar() {
    anillo.style.transform = `translateZ(${-radio}px) rotateY(${-theta}deg)`;
    cartas.forEach((c, i) => {
      const rel = norm(i * PASO - theta), f = Math.max(0, Math.cos(rel * Math.PI / 180));
      c.style.setProperty('--f', f.toFixed(3));
      c.style.zIndex = Math.round(f * 100);
    });
    ang.textContent = (((theta % 360) + 360) % 360).toFixed(1).padStart(5, '0');
    const i = ((Math.round(theta / PASO) % N) + N) % N;
    if (i !== frente) cambiarFrente(i);
  }
  function animar(t) {
    const dt = Math.min(48, t - (ultimoT || t)); ultimoT = t;
    const antes = theta;
    if (!arrastre) theta += (destino - theta) * (1 - Math.pow(.0018, dt / 1000));   // resorte hacia el destino
    vel = (theta - antes) / Math.max(1, dt);
    r.classList.toggle('rapido', Math.abs(vel) > .09);
    pintar();
    if (arrastre || Math.abs(destino - theta) > .05) requestAnimationFrame(animar);
    else { theta = destino; pintar(); corriendo = false; ultimoT = 0; r.classList.remove('rapido'); }
  }
  const mover = () => { if (quieto) { theta = destino; pintar(); return; } if (!corriendo) { corriendo = true; requestAnimationFrame(animar); } };
  const irA = i => { destino = destino + norm(i * PASO - destino); mover(); };   // por el camino más corto
  const paso = d => { destino = Math.round(destino / PASO) * PASO + d * PASO; mover(); };

  // ficha del frente: nombre que se decodifica, video solo en la carta del frente
  let deco = 0;
  let porUsuario = false;   // solo se anuncia al lector de pantalla lo que giró la persona, no el giro automático
  const desbloquear = () => {
    const bloqueada = (arrastre && arrastre.mueve) || performance.now() < bloqueoHasta;
    cartas.forEach((c, k) => { c.dataset.rueda = k === frente && !bloqueada ? 'frente' : 'atras'; c.tabIndex = k === frente ? 0 : -1; });
    // con teclado, el foco sigue a la carta del frente (si no, Enter abriría la anterior)
    if (anillo.contains(document.activeElement) && document.activeElement !== cartas[frente]) cartas[frente].focus({ preventScroll: true });
  };
  function cambiarFrente(i) {
    frente = i; const d = datos[i];
    desbloquear();
    if (porUsuario) { anuncio.textContent = `${d.n}: ${d.nombre}`; porUsuario = false; }
    cuenta.textContent = d.n; ruQ.textContent = [d.q, d.anio].filter(Boolean).join(' · ');
    abrir.setAttribute('href', d.href); abrir.dataset.vista = d.vista;
    const c = cartas[i]; c.classList.remove('salta'); void c.offsetWidth; c.classList.add('salta');
    const t0 = performance.now(), id = ++deco;
    (function deco1(now) {
      if (id !== deco) return;
      const p = quieto ? 1 : Math.min(1, (now - t0) / 420);
      titulo.textContent = [...d.nombre].map((ch, k) => (ch === ' ' || k / d.nombre.length < p * 1.2 - .1) ? ch : GLIFOS[Math.floor(Math.random() * GLIFOS.length)]).join('');
      if (p < 1) requestAnimationFrame(deco1); else titulo.textContent = d.nombre;
    })(t0);
    sincronizarVideo();
  }
  // solo la carta del frente tiene video, y solo corre si el índice se ve; las demás lo sueltan (no siguen bajando)
  function sincronizarVideo() {
    const mirar = visible && !document.hidden && !indice.classList.contains('modo-lista') && !document.documentElement.dataset.cap;
    cartas.forEach((c, j) => {
      const v = c.querySelector('video');
      if (j !== frente) { if (v) { v.pause(); v.removeAttribute('src'); v.load(); v.remove(); } return; }
      const d = datos[j]; if (!d.video || quieto) return;
      if (!mirar) { if (v) v.pause(); return; }
      let w = v;
      if (!w) { w = document.createElement('video'); w.muted = true; w.loop = true; w.playsInline = true; w.preload = 'auto'; w.src = d.video; if (d.foto) w.poster = d.foto; c.querySelector('.ru-img').appendChild(w); }
      w.play().catch(() => {});
    });
  }

  // ---------- interacción ----------
  r.querySelector('.ru-ant').addEventListener('click', () => { pausa(); porUsuario = true; paso(-1); });
  r.querySelector('.ru-sig').addEventListener('click', () => { pausa(); porUsuario = true; paso(1); });
  r.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); pausa(); porUsuario = true; paso(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); pausa(); porUsuario = true; paso(1); }
  });
  // carta que no está al frente: se trae al frente en vez de abrirse
  cartas.forEach((c, i) => {
    c.addEventListener('click', e => { if (c.dataset.rueda !== 'frente') { e.preventDefault(); pausa(); porUsuario = true; irA(i); } });
    // al enfocar con teclado (no con el mouse o el dedo, que también enfocan al tocar)
    c.addEventListener('focus', () => { if (c.matches(':focus-visible') && c.dataset.rueda !== 'frente') { pausa(); porUsuario = true; irA(i); } });
  });
  // arrastre horizontal (el vertical sigue scrolleando la página); sin el arrastre nativo de links
  escena.addEventListener('dragstart', e => e.preventDefault());
  escena.addEventListener('pointerdown', e => {
    if (e.button) return;
    arrastre = { x: e.clientX, y: e.clientY, t0: theta, mueve: false, id: e.pointerId };
    pausa();
  });
  addEventListener('pointermove', e => {
    if (!arrastre || e.pointerId !== arrastre.id) return;
    const dx = e.clientX - arrastre.x, dy = e.clientY - arrastre.y;
    if (!arrastre.mueve) {
      if (Math.abs(dx) < (e.pointerType === 'touch' ? 12 : 6)) return;   // con el dedo, un temblor no es arrastre
      if (Math.abs(dy) > Math.abs(dx)) { arrastre = null; return; }   // era scroll vertical
      arrastre.mueve = true; r.classList.add('arrastrando');
      cartas.forEach(c => c.dataset.rueda = 'atras');   // mientras se arrastra, ningún toque abre
      try { escena.setPointerCapture(e.pointerId); } catch (err) {}
      if (!corriendo) { corriendo = true; requestAnimationFrame(animar); }
    }
    theta = arrastre.t0 - dx * (PASO / ((cartas[0].offsetWidth || 240) * .9));
    destino = theta;
  });
  const soltar = e => {
    if (!arrastre || (e && e.pointerId !== arrastre.id)) return;
    const movio = arrastre.mueve; arrastre = null; r.classList.remove('arrastrando');
    if (movio) {
      destino = Math.round((theta - vel * 180) / PASO) * PASO;   // la inercia elige la carta, después encastra
      mover();
      // el clic que llega justo después de soltar no debe abrir la carta
      const tapa = ev => { ev.preventDefault(); ev.stopPropagation(); };
      addEventListener('click', tapa, true); setTimeout(() => removeEventListener('click', tapa, true), 80);
      bloqueoHasta = performance.now() + 120; setTimeout(desbloquear, 140); porUsuario = true;
    }
  };
  addEventListener('pointerup', soltar); addEventListener('pointercancel', soltar);
  // rueda del mouse horizontal o con Shift
  escena.addEventListener('wheel', e => {
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;
    if (!d) return; e.preventDefault(); pausa();
    destino += d * .12; clearTimeout(soltar.t); soltar.t = setTimeout(() => { destino = Math.round(destino / PASO) * PASO; mover(); }, 140); mover();
  }, { passive: false });

  // giro automático cada 4,5 s mientras se ve el índice y nadie lo toca
  let pausadoHasta = 0, visible = false;
  const pausa = () => { pausadoHasta = performance.now() + 9000; };
  r.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') pausa(); });
  r.addEventListener('focusin', pausa);
  if ('IntersectionObserver' in window) new IntersectionObserver(es => { visible = es[0].isIntersecting; sincronizarVideo(); }).observe(escena);
  else visible = true;
  document.addEventListener('visibilitychange', sincronizarVideo);
  addEventListener('popstate', () => setTimeout(sincronizarVideo, 0));   // al entrar o salir de un capítulo
  if (!quieto) setInterval(() => {
    if (!visible || document.hidden || arrastre || performance.now() < pausadoHasta || indice.classList.contains('modo-lista') || document.documentElement.dataset.cap) return;
    if (r.contains(document.activeElement)) return;   // alguien navega con teclado o lector: la rueda no se mueve sola
    if (matchMedia('(hover: hover)').matches && r.matches(':hover')) return;
    paso(1);
  }, 4500);

  window.RUEDA = {
    volverA: href => { const i = datos.findIndex(d => d.href === href); if (i < 0) return; destino = theta = i * PASO + Math.round(theta / 360) * 360; pintar(); pausa(); medir(); sincronizarVideo(); abrir.focus({ preventScroll: true }); },
    detener: sincronizarVideo,
  };

  addEventListener('resize', medir);
  let modo = 'rueda'; try { modo = localStorage.getItem('indice-modo') || 'rueda'; } catch (e) {}
  indice.classList.add('con-rueda');   // recién acá se oculta la lista (si este script falla, queda la lista)
  ponerModo(modo === 'lista' ? 'lista' : 'rueda');
  medir();
})();
