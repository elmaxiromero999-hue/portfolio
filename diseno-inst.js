// Secciones institucionales de Diseño: Archivo Histórico, Agencia Córdoba Cultura, Feria del Centro y Catálogo FIT.
// Los datos salen de institucional.js (lo genera actualizar_institucional.py).
(() => {
  const I = INSTITUCIONAL, A = I.ahpc;
  const sinMov = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const chica = matchMedia('(max-width: 760px)').matches;
  const $ = id => document.getElementById(id);

  // ---------- utilidades ----------
  const aparecer = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visto'); aparecer.unobserve(e.target); } }),
    { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.sube').forEach(el => aparecer.observe(el));

  // los videos solo corren mientras se ven (y cargan recién al acercarse)
  const enPantalla = new IntersectionObserver(es => es.forEach(e => {
    const v = e.target;
    if (e.isIntersecting) { if (v.preload === 'none') { v.preload = 'auto'; } if (!sinMov) v.play().catch(() => {}); } else v.pause();
  }), { rootMargin: '150px' });

  // Galería justificada: cada pieza en su proporción, filas del mismo alto que llenan el ancho
  // (el alto ideal sale de --h en el CSS; ninguna fila pasa de 1,7 veces ese alto)
  const galerias = [];
  function acomodar(el) {
    const W = el.clientWidth; if (!W) return;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 10, ideal = parseFloat(getComputedStyle(el).getPropertyValue('--h')) || 300, tope = ideal * 1.7;
    const items = [...el.children], ars = items.map(b => +b.dataset.ar);
    const alto = (desde, hasta) => (W - gap * (hasta - desde - 1)) / ars.slice(desde, hasta).reduce((a, b) => a + b, 0);
    let i = 0;
    while (i < items.length) {
      let j = i + 1;
      while (j < items.length && alto(i, j) > ideal) {
        const sin = alto(i, j), con = alto(i, j + 1);
        // cortar la fila si sumar la pieza la deja más lejos del alto ideal (o la aplasta, como una banda angosta)
        if (con < ideal && (sin <= tope ? Math.abs(Math.log(sin / ideal)) < Math.abs(Math.log(con / ideal)) : con < ideal * .6)) break;
        j++;
      }
      const h = Math.min(alto(i, j), tope);
      for (let k = i; k < j; k++) {
        const b = items[k], w = Math.floor(h * ars[k]);
        b.style.width = `${w}px`; b.style.height = `${Math.round(h)}px`;
        // si la pieza se ve más grande que su miniatura, pasa a la imagen grande (nunca vuelve atrás)
        const im = b.querySelector('img');
        if (im && b.dataset.src && w * (devicePixelRatio || 1) > +b.dataset.tw * 1.05) { im.src = b.dataset.src; delete b.dataset.src; }
      }
      i = j;
    }
  }
  const alCambiar = new ResizeObserver(es => es.forEach(e => acomodar(e.target)));
  function galeria(el, piezas, sub, { grande = false } = {}) {
    el.classList.add('just');
    piezas.forEach((p, i) => {
      const ar = p.w / p.h, b = document.createElement('button');
      b.type = 'button'; b.className = 'pz'; b.setAttribute('aria-label', (p.titulo || sub) + (p.tipo === 'video' ? ' (video)' : ''));
      b.dataset.ar = ar;
      if (p.tipo === 'video') {
        b.innerHTML = `<video muted loop playsinline preload="none" poster="${esc(p.poster)}" src="${esc(p.src)}"></video><span class="play">${p.audio ? '▶ con sonido' : '▶'}</span><span class="et">${esc(p.titulo)}</span>`;
        enPantalla.observe(b.querySelector('video'));
      } else {
        b.innerHTML = `<img src="${esc(grande && !chica ? p.src : p.thumb)}" alt="${esc(p.titulo)}" loading="lazy" decoding="async"><span class="et">${esc(p.titulo)}</span>`;
        if (!grande || chica) { b.dataset.src = p.src; b.dataset.tw = p.w * Math.min(1, 720 / Math.max(p.w, p.h)); }   // las miniaturas miden 720 px del lado mayor
      }
      b.onclick = () => verPiezas(piezas.map(x => ({ ...x, sub })), i);
      el.appendChild(b);
    });
    acomodar(el); alCambiar.observe(el);
    return el;
  }

  // ---------- 01 · Archivo Histórico ----------
  document.querySelectorAll('[data-logo]').forEach(el => { el.insertAdjacentHTML('afterbegin', A.logos[el.dataset.logo]); el.querySelector('svg').setAttribute('aria-hidden', 'true'); });
  aparecer.observe($('ahSigno'));
  $('ahAntes').src = A.antes;
  $('ahFotoManif').src = A.fotos.restauracion.src;

  // recorrido del signo: el scroll dentro de .ah-anatomia elige el paso
  const anat = $('ahAnatomia'), esc_ = anat.querySelector('.ah-escenario');
  const pasos = [...anat.querySelectorAll('.ah-paso')], puntos = [...anat.querySelectorAll('.ah-puntos i')];
  const fotosPaso = ['libro', 'manos', 'fachada', 'modulo', 'estanterias', null];
  const cajaFotos = $('ahFotos');
  const imgs = fotosPaso.map(k => {
    if (!k) return null;
    const im = new Image(); im.src = A.fotos[k].src; im.alt = ''; im.loading = 'lazy'; im.decoding = 'async';
    cajaFotos.insertBefore(im, cajaFotos.firstChild); return im;
  });
  const final = cajaFotos.querySelector('.final');
  let pasoActual = -1;
  function irAPaso(n) {
    if (n === pasoActual) return; pasoActual = n;
    esc_.dataset.paso = n;
    pasos.forEach((p, k) => p.classList.toggle('on', k === n));
    puntos.forEach((p, k) => p.classList.toggle('on', k <= n));
    imgs.forEach((im, k) => im && im.classList.toggle('on', k === n));
    final.classList.toggle('on', n === pasos.length - 1);
    $('ahCuenta').textContent = `${String(n + 1).padStart(2, '0')} / ${String(pasos.length).padStart(2, '0')}`;
  }
  irAPaso(0);

  // efectos ligados al scroll (un solo rAF)
  const frase = $('ahFrase');
  (function partir(nodo, acento) {   // cada palabra en un <span> para iluminarla al leer
    [...nodo.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(t => {
          if (!t.trim()) { frag.appendChild(document.createTextNode(t)); return; }
          const s = document.createElement('span'); s.textContent = t; if (acento) s.className = 'acento'; frag.appendChild(s);
        });
        n.replaceWith(frag);
      } else partir(n, acento || n.nodeName === 'EM');
    });
  })(frase, false);
  const palabras = [...frase.querySelectorAll('span')];
  const gigante = document.querySelector('.ah-gigante'), fotoManif = $('ahFotoManif');
  let pedido = false;
  function alScroll() {
    pedido = false;
    const vh = innerHeight;
    // pasos del signo
    const r = anat.getBoundingClientRect(), recorrido = r.height - vh;
    const prog = Math.min(1, Math.max(0, -r.top / recorrido));
    irAPaso(Math.min(pasos.length - 1, Math.floor(prog * pasos.length * 0.999)));
    if (sinMov) { palabras.forEach(s => s.classList.add('on')); return; }
    // manifiesto: se iluminan las palabras a medida que sube
    const rf = frase.getBoundingClientRect();
    const pf = Math.min(1, Math.max(0, (vh * 0.85 - rf.top) / (rf.height + vh * 0.35)));
    const hasta = Math.round(pf * palabras.length);
    palabras.forEach((s, k) => s.classList.toggle('on', k < hasta));
    // parallax suave
    const rg = gigante.getBoundingClientRect(); if (rg.top < vh && rg.bottom > 0) gigante.style.setProperty('--desliza', `${Math.max(-40, (rg.top - vh) * 0.06)}px`);
    const rm = fotoManif.parentNode.getBoundingClientRect(); if (rm.top < vh && rm.bottom > 0) fotoManif.style.setProperty('--desliza', `${(rm.top / vh) * -60 - 40}px`);
  }
  addEventListener('scroll', () => { if (!pedido) { pedido = true; requestAnimationFrame(alScroll); } }, { passive: true });
  addEventListener('resize', alScroll); alScroll();

  // colores: copiar el código
  document.querySelectorAll('[data-copiar]').forEach(b => b.onclick = () => {
    (navigator.clipboard ? navigator.clipboard.writeText(b.dataset.copiar) : Promise.reject()).catch(() => {});
    b.classList.add('copiado'); setTimeout(() => b.classList.remove('copiado'), 1400);
  });

  // convivencia de marcas (láminas 13 y 14) y el manual completo
  const laminas = A.laminas.map((l, k) => ({ ...l, titulo: 'Manual de marca · Archivo Histórico', sub: `Lámina ${k + 1}` }));
  [[12, 'Convivencia con la marca de Córdoba Gobierno · uso general'], [13, 'Convivencia con la marca de Córdoba Gobierno · redes']].forEach(([k, txt]) => {
    const f = document.createElement('figure');
    f.innerHTML = `<button type="button" aria-label="Ampliar: ${esc(txt)}"><img src="${esc(laminas[k].src)}" alt="${esc(txt)}" loading="lazy" width="${laminas[k].w}" height="${laminas[k].h}"></button><figcaption>${esc(txt)}</figcaption>`;
    f.querySelector('button').onclick = () => verPiezas(laminas, k);
    f.classList.add('sube'); aparecer.observe(f);
    $('ahConvive').appendChild(f);
  });
  laminas.forEach((l, k) => {
    const b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', `Lámina ${k + 1} del manual`);
    b.innerHTML = `<img src="${esc(l.thumb)}" alt="" loading="lazy" decoding="async"><span>${String(k + 1).padStart(2, '0')}</span>`;
    b.onclick = () => verPiezas(laminas, k);
    $('ahManual').appendChild(b);
  });
  $('ahVerManual').onclick = () => verPiezas(laminas, 0);

  // ---------- 02 · Agencia Córdoba Cultura ----------
  $('agIntro').textContent = I.agencia.intro;
  I.agencia.proyectos.forEach(p => {
    const art = document.createElement('article'); art.className = 'proy'; art.id = 'ag-' + p.slug;
    art.innerHTML = `<div class="proy-cab sube"><h3>${esc(p.titulo)}<span class="rubro">${esc(p.rubro)} · ${I.agencia.anio}</span></h3><p>${esc(p.desc)}</p></div><div class="g"></div>`;
    galeria(art.querySelector('.g'), p.piezas, p.titulo);
    aparecer.observe(art.querySelector('.sube'));
    $('agProyectos').appendChild(art);
  });

  // ---------- 05 · Feria del Centro: el sistema como un mapa de subte ----------
  const F = I.fdc, svgNS = 'http://www.w3.org/2000/svg';
  $('fdcSub').textContent = F.sub; $('fdcDesc').textContent = F.desc; $('fdcConcepto').textContent = F.concepto;
  $('fdcDatos').innerHTML = F.datos.map(([n, t]) => `<div><b data-n="${esc(n)}">${esc(n)}</b><span>${esc(t)}</span></div>`).join('');
  const lineasCab = document.querySelector('.fdc-lineas');
  lineasCab.querySelectorAll('path').forEach(p => p.style.setProperty('--l', Math.ceil(p.getTotalLength())));
  aparecer.observe(lineasCab);
  if (sinMov) lineasCab.querySelectorAll('animateMotion').forEach(a => a.remove());
  new IntersectionObserver((es, o) => es.forEach(e => {     // los números cuentan desde cero
    if (!e.isIntersecting) return; o.disconnect(); if (sinMov) return;
    e.target.querySelectorAll('b').forEach(b => {
      const fin = +b.dataset.n, t0 = performance.now();
      const paso = t => { const k = Math.min(1, (t - t0) / 1400); b.textContent = Math.round(fin * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(paso); };
      requestAnimationFrame(paso);
    });
  }), { threshold: .5 }).observe($('fdcDatos'));

  // cinta en movimiento (dos copias seguidas: da la vuelta sin salto); se frena con el mouse
  function cinta(cont, piezas, { alto = 200, inv = false, seg = 2.4, titulo = '' } = {}) {
    const pista = document.createElement('div'); pista.className = 'pista';
    const c = document.createElement('div'); c.className = 'cinta' + (inv ? ' inv' : '');
    let lista = piezas; while (lista.length && lista.length < 14) lista = lista.concat(piezas);   // que llene el ancho aunque sean pocas
    c.style.setProperty('--t', `${lista.length * seg}s`); c.style.setProperty('--alto', alto + 'px');
    const visor = piezas.map(p => ({ ...p, titulo: p.titulo || titulo, sub: 'Feria del Centro' }));
    [0, 1].forEach(copia => lista.forEach((p, k) => {
      const b = document.createElement('button'); b.type = 'button';
      if (copia || k >= piezas.length) { b.tabIndex = -1; b.setAttribute('aria-hidden', 'true'); } else b.setAttribute('aria-label', p.titulo || titulo);
      b.style.aspectRatio = `${p.w} / ${p.h}`;
      b.innerHTML = `<img src="${esc(alto > 220 && !chica && p.w / p.h > 2.2 ? p.src : p.thumb)}" alt="" loading="lazy" decoding="async">`;
      b.onclick = () => verPiezas(visor, k % piezas.length);
      c.appendChild(b);
    }));
    pista.appendChild(c); cont.appendChild(pista); return pista;
  }

  // 1 · el mapa de líneas: cada rubro es una línea; se cruzan e invierten el orden, como en un plano de subte
  const mapa = $('fdcMapa'), rotulos = F.muros.find(m => m.slug === 'rotulos'), sel = F.muros.find(m => m.slug === 'seleccionados');
  const L = F.lineas;
  const capaLineas = document.createElementNS(svgNS, 'g'), capaEncima = document.createElementNS(svgNS, 'g');
  capaLineas.setAttribute('class', 'capa-lineas'); mapa.append(capaLineas, capaEncima);
  L.forEach((l, k) => {
    // doblan en una S suave y larga (como las bandas de las piezas), no en ángulo
    const y0 = 45 + k * 48, y1 = 45 + (L.length - 1 - k) * 48, dx = Math.abs(y1 - y0) * 1.25 + 60, xa = 290 + k * 34, xb = xa + dx;
    const d = `M60 ${y0} H${xa} C${xa + dx * .5} ${y0} ${xb - dx * .5} ${y1} ${xb} ${y1} H1130`;
    const gl = document.createElementNS(svgNS, 'g'); gl.dataset.linea = l.slug;
    gl.innerHTML = `<path id="ln-${l.slug}" class="ln" d="${d}" stroke="${l.color}" style="--k:${k}"/>`;
    capaLineas.appendChild(gl);
    const g = document.createElementNS(svgNS, 'g'); g.dataset.linea = l.slug;
    g.innerHTML = `      <circle class="est" cx="${170 + k * 12}" cy="${y0}" r="8"/><circle class="est" cx="${980 - k * 14}" cy="${y1}" r="8"/>
      <circle class="tren" r="6"><animateMotion dur="${7 + k * 1.3}s" begin="-${k * 1.7}s" repeatCount="indefinite"><mpath href="#ln-${l.slug}"/></animateMotion></circle>
      <g class="bl"><circle cx="34" cy="${y0}" r="19" fill="${l.color}"/><text x="34" y="${y0}">${l.letra}</text></g>
      <g class="bl"><circle cx="1160" cy="${y1}" r="22" fill="${l.color}"/>${l.icono.replace('<svg ', `<svg x="1138" y="${y1 - 22}" width="44" height="44" `)}</g>
      <text class="rot" x="66" y="${y0 - 14}">${esc(l.nombre)}</text>`;
    capaEncima.appendChild(g);
    const ln = gl.querySelector('.ln'); try { ln.style.setProperty('--l', Math.ceil(ln.getTotalLength() || 2000)); } catch (e) { ln.style.setProperty('--l', 2000); }   // el capítulo puede estar oculto al medir
  });
  if (sinMov) mapa.querySelectorAll('animateMotion').forEach(a => a.remove());
  aparecer.observe(mapa);
  const elegir = $('fdcElegir'), contRot = $('fdcRotulos');
  const cuantos = slug => rotulos.piezas.filter(p => p.grupo === (L.find(l => l.slug === slug) || {}).carpeta).length;
  [{ slug: 'todas', letra: '★', nombre: 'Todas las líneas', color: '#141414' }, ...L].forEach(l => {
    const b = document.createElement('button'); b.type = 'button'; b.style.setProperty('--c', l.color); b.dataset.linea = l.slug;
    b.innerHTML = `<span>${esc(l.nombre)}</span><sup>${l.slug === 'todas' ? rotulos.piezas.length : cuantos(l.slug)}</sup><i>${l.icono ? l.icono : l.letra}</i>`;
    b.setAttribute('aria-pressed', l.slug === 'todas');
    b.onclick = () => verLinea(l.slug);
    elegir.appendChild(b);
  });
  function verLinea(slug) {
    elegir.querySelectorAll('button').forEach(b => { b.classList.toggle('on', b.dataset.linea === slug); b.setAttribute('aria-pressed', b.dataset.linea === slug); });
    elegir.classList.toggle('filtra', slug !== 'todas');
    mapa.classList.toggle('filtra', slug !== 'todas');
    mapa.querySelectorAll('[data-linea]').forEach(g => g.querySelectorAll('.ln, .est, .bl, .tren').forEach(x => x.classList.toggle('on', g.dataset.linea === slug)));
    const l = L.find(x => x.slug === slug);
    const lista = rotulos.piezas.filter(p => !l || p.grupo === l.carpeta).map(p => ({ ...p, titulo: l ? `Rótulo · ${l.nombre}` : 'Rótulo de expositor' }));
    contRot.innerHTML = '';
    if (l) cinta(contRot, lista, { alto: 330, seg: 3.4 });   // filtrada: una fila más alta (mismo alto total, la página no salta)
    else { const m = Math.ceil(lista.length / 2); cinta(contRot, lista.slice(0, m), { alto: 160, seg: 2.6 }); cinta(contRot, lista.slice(m), { alto: 160, seg: 2.6, inv: true }); }
    $('fdcNotaRot').textContent = l ? `${lista.length} rótulos de ${l.nombre.toLowerCase()}: nombre, provincia y rubro, con el color y el ícono de su línea.` : rotulos.nota;
  }
  verLinea('todas');

  // 2 · en el lugar: las fotos avanzan de costado con el scroll, sobre una línea con una estación por foto
  const viaje = $('fdcViaje'), vias = $('fdcVias'), paradas = $('fdcParadas'), fotosV = F.recorrido.map(f => ({ ...f, sub: 'Feria del Centro · en el lugar' }));
  viaje.style.setProperty('--n', fotosV.length);
  const tarjetas = fotosV.map((f, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'fdc-foto'; b.style.aspectRatio = `${f.w} / ${f.h}`;
    b.setAttribute('aria-label', f.titulo);
    b.innerHTML = `<img src="${esc(chica ? f.thumb : f.src)}" alt="${esc(f.titulo)}" loading="lazy" decoding="async"><span>${esc(f.titulo)}</span>`;
    b.onclick = () => verPiezas(fotosV, i);
    vias.appendChild(b); return b;
  });
  let paradasPos = [];
  const btnParadas = fotosV.map((f, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'fdc-parada'; b.setAttribute('aria-label', `Ir a: ${f.titulo}`);
    b.onclick = () => { const r = viaje.getBoundingClientRect(); scrollTo({ top: scrollY + r.top + paradasPos[i] * (viaje.offsetHeight - innerHeight), behavior: sinMov ? 'auto' : 'smooth' }); };
    paradas.appendChild(b); return b;
  });
  function medirViaje() {
    const recorrido = Math.max(1, vias.scrollWidth - vias.clientWidth);
    paradasPos = tarjetas.map(t => Math.min(1, Math.max(0, (t.offsetLeft + t.offsetWidth / 2 - vias.clientWidth / 2) / recorrido)));
    btnParadas.forEach((b, i) => b.style.left = `${paradasPos[i] * 100}%`);
    moverViaje();
  }
  function moverViaje() {
    if (sinMov) return;
    const r = viaje.getBoundingClientRect(), total = viaje.offsetHeight - innerHeight;
    const p = Math.min(1, Math.max(0, -r.top / Math.max(1, total)));
    const recorrido = Math.max(0, vias.scrollWidth - vias.clientWidth);
    vias.style.transform = `translateX(${-p * recorrido}px)`;
    $('fdcAvance').style.width = `${p * 100}%`;
    let cerca = 0; paradasPos.forEach((q, i) => { if (Math.abs(q - p) < Math.abs(paradasPos[cerca] - p)) cerca = i; });
    btnParadas.forEach((b, i) => b.classList.toggle('on', i <= cerca && paradasPos[i] <= p + .02));
    tarjetas.forEach((t, i) => t.classList.toggle('cerca', i === cerca));
    const txt = $('fdcParadaTxt'); txt.textContent = fotosV[cerca].titulo;
    txt.style.left = `min(calc(${paradasPos[cerca] * 100}% - 11px), calc(100% - ${txt.offsetWidth}px))`;
  }
  let pedidoViaje = false;
  addEventListener('scroll', () => { if (!pedidoViaje) { pedidoViaje = true; requestAnimationFrame(() => { pedidoViaje = false; moverViaje(); }); } }, { passive: true });
  new ResizeObserver(medirViaje).observe(vias);
  tarjetas.forEach(t => t.querySelector('img').addEventListener('load', medirViaje, { once: true }));

  // 3 · las piezas: una selección corta en dos cintas · 4 · la bienvenida a cada proyecto
  cinta($('fdcPiezas'), F.piezas.digital, { alto: 300, seg: 4.5 });
  cinta($('fdcPiezas'), F.piezas.gran, { alto: 300, seg: 4.5, inv: true });
  $('fdcCantSel').textContent = `${sel.piezas.length} piezas · ${sel.nota}`;
  cinta($('fdcSeleccionados'), sel.piezas.map(p => ({ ...p, titulo: 'Bienvenida a un proyecto seleccionado' })), { alto: 230, seg: 2.2 });
  document.querySelectorAll('#feria-del-centro .estacion').forEach(el => aparecer.observe(el));

  // ---------- 04 · Catálogo FIT: libro (versión resumida) + catálogo completo ----------
  const T = I.fit;
  $('fitTitulo').textContent = T.titulo; $('fitDesc').textContent = T.desc;
  const paginas = T.paginas.map(p => ({ ...p, titulo: T.corto, sub: `Página ${p.n}` }));
  const resumida = T.resumida.map(n => paginas.find(p => p.n === n)).filter(Boolean);
  const libro = crearLibro($('fitLibro'), resumida, { alCambiar: t => { $('fitPag').textContent = t; } });
  $('fitSig').onclick = libro.siguiente; $('fitAnt').onclick = libro.anterior;
  $('fitAmpliar').onclick = () => verPiezas(resumida, libro.actual());
  $('fitCant').textContent = `${paginas.length} páginas`;
  const estante = $('fitEstante');
  paginas.forEach((p, k) => {
    const b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', `Catálogo FIT, página ${p.n}`);
    b.innerHTML = `<img src="${esc(p.thumb)}" alt="" loading="lazy" decoding="async"><span>${p.n}</span>`;
    b.onclick = () => { if (!estante.dataset.movio) verPiezas(paginas, k); };
    estante.appendChild(b);
  });
  $('fitTodo').onclick = () => verPiezas(paginas, 0);
  document.querySelectorAll('.fit-completo .flechas button').forEach(b => b.onclick = () => estante.scrollBy({ left: +b.dataset.d * estante.clientWidth * .7, behavior: 'smooth' }));
  // arrastrar el estante con el mouse
  let x0 = null, s0 = 0;
  estante.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; x0 = e.clientX; s0 = estante.scrollLeft; delete estante.dataset.movio; });
  addEventListener('pointermove', e => {
    if (x0 === null) return; const dx = e.clientX - x0;
    if (Math.abs(dx) > 5) { estante.dataset.movio = 1; estante.classList.add('arrastra'); estante.scrollLeft = s0 - dx; }
  });
  addEventListener('pointerup', () => { x0 = null; estante.classList.remove('arrastra'); setTimeout(() => delete estante.dataset.movio, 0); });

  // ---------- 05 · Nexar Networks: línea de tiempo + recortes del video ----------
  const X = I.nexar, total = X.linea[X.linea.length - 1][3];
  const tc = t => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  $('nxDesc').textContent = X.desc;
  const completo = inicio => verPiezas([{ ...X.completo, titulo: 'Nexar Networks', sub: 'Video completo', inicio }], 0);
  $('nxCompleto').onclick = () => completo(0);
  const linea = $('nxLinea'), cabezal = $('nxCabezal'), filasNx = $('nxFilas');
  const segs = X.linea.map(([escena, nombre, a, b]) => {
    const s = document.createElement('button'); s.type = 'button'; s.className = 'nx-seg'; s.dataset.escena = escena;
    s.style.flex = `${b - a} 1 0`; s.setAttribute('aria-label', `${nombre}, de ${tc(a)} a ${tc(b)}: ver con sonido`);
    s.innerHTML = `<b>${esc(nombre)}</b><span>${tc(a)}</span>`;
    s.onclick = () => completo(a);
    // al pasar por una escena se resaltan sus recortes
    s.onmouseenter = () => { filasNx.classList.add('filtrado'); filasNx.querySelectorAll('.nx-pz').forEach(t => t.classList.toggle('resalta', t.dataset.escena === escena)); };
    s.onmouseleave = () => { filasNx.classList.remove('filtrado'); filasNx.querySelectorAll('.nx-pz').forEach(t => t.classList.remove('resalta')); };
    linea.appendChild(s); return s;
  });
  const tiles = [];
  X.filas.forEach(fila => {
    const f = document.createElement('div'); f.className = 'nx-fila';
    fila.forEach(p => {
      const ar = p.w / p.h, b = document.createElement('button');
      b.type = 'button'; b.className = 'nx-pz'; b.dataset.escena = p.escena || '';
      b.style.flex = `${ar} 1 0`; b.style.aspectRatio = `${p.w} / ${p.h}`;
      const rango = p.desde != null ? `${tc(p.desde)}–${tc(p.desde + p.dur)}` : 'logo';
      b.setAttribute('aria-label', `${p.titulo}, ${p.detalle} (${rango}): ver en el video completo con sonido`);
      b.innerHTML = `<video muted loop playsinline preload="none" poster="${esc(p.poster)}" src="${esc(p.src)}"></video><span class="tc">${rango}</span><span class="et"><b>${esc(p.titulo)}</b><span>${esc(p.detalle)}</span></span>`;
      const v = b.querySelector('video'); enPantalla.observe(v);
      b.onclick = () => p.desde != null ? completo(p.desde) : verPiezas([{ ...p, sub: p.detalle }], 0);
      b.onmouseenter = () => { activo = { b, v, p }; };
      b.onmouseleave = () => { if (activo && activo.b === b) activo = null; };
      tiles.push({ b, v, p });
      f.appendChild(b);
    });
    filasNx.appendChild(f);
  });
  // el cabezal marca en qué momento del video original está el recorte que se mira
  let activo = null, nxVisible = false;
  new IntersectionObserver(es => { nxVisible = es[0].isIntersecting; if (nxVisible) requestAnimationFrame(seguir); }).observe($('nexar'));
  function seguir() {
    if (!nxVisible) return;
    let t = activo;
    if (!t) {   // sin mouse encima: el recorte que esté más cerca del centro de la pantalla
      let mejor = Infinity;
      tiles.forEach(x => { const r = x.b.getBoundingClientRect(), d = Math.abs(r.top + r.height / 2 - innerHeight / 2); if (r.bottom > 0 && r.top < innerHeight && d < mejor && !x.v.paused) { mejor = d; t = x; } });
    }
    if (t && t.v.readyState > 1) {
      const seg = X.linea.find(l => l[0] === t.p.escena);
      const pos = t.p.desde != null ? t.p.desde + t.v.currentTime : seg[2] + (seg[3] - seg[2]) * (t.v.currentTime / (t.v.duration || 1));
      cabezal.style.left = `${(pos / total) * 100}%`; cabezal.classList.add('on');
      $('nxTiempo').textContent = `${tc(pos)} / ${tc(total)}`;
      segs.forEach(s => s.classList.toggle('on', s === segs[X.linea.findIndex(l => pos >= l[2] && pos < l[3])]));
    } else { cabezal.classList.remove('on'); segs.forEach(s => s.classList.remove('on')); }
    requestAnimationFrame(seguir);
  }

  // ---------- Índice: cada capítulo con su miniatura (video en los de motion) ----------
  const pzA = k => I.agencia.proyectos[0].piezas[k] || {};
  const expo = (typeof DISENO !== 'undefined' && DISENO[0]) ? DISENO[0].works : [];   // const global: no cuelga de window
  const previas = {
    ahpc: { img: A.fotos.fachada.src }, fit: { img: paginas[0].thumb }, fdc: { img: F.recorrido[2].thumb },
    agencia: { img: pzA(0).poster, video: pzA(0).src }, nexar: { img: I.nexar.filas[2][0].poster, video: I.nexar.filas[2][0].src },
    motion: { video: (typeof MOTION !== 'undefined' && MOTION[0]) ? MOTION[0].src : null }, exp: { img: expo[0] && expo[0].thumb } };
  const conMouse = matchMedia('(hover: hover)').matches, quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('#indice a').forEach(a => {
    const p = previas[a.dataset.vista]; if (!p) return;
    const m = document.createElement('span'); m.className = 'm'; m.setAttribute('aria-hidden', 'true');
    if (p.video && conMouse && !quieto) {
      const v = document.createElement('video'); v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'none';
      if (p.img) v.poster = p.img; v.src = p.video; m.appendChild(v);
      a.addEventListener('mouseenter', () => v.play().catch(() => {}));
      a.addEventListener('mouseleave', () => v.pause());
    } else if (p.img) { const i = new Image(); i.src = p.img; i.alt = ''; i.loading = 'lazy'; i.decoding = 'async'; m.appendChild(i); }
    else if (p.video) { const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'metadata'; v.src = p.video + '#t=0.5'; m.appendChild(v); }
    if (m.firstChild) a.appendChild(m);
  });

  // ---------- Portada: cinta con trabajos de todos los capítulos (se duplica para que el loop no corte) ----------
  const pista = document.querySelector('.franja-pista');
  if (pista) {
    const fotos = [A.fotos.fachada.src, paginas[0].thumb, F.recorrido[2].thumb, pzA(0).poster, I.nexar.filas[2][0].poster,
      ...expo.slice(0, 12).map(w => w.thumb), paginas[2] && paginas[2].thumb, F.recorrido[0] && F.recorrido[0].thumb].filter(Boolean);
    const orden = fotos.map((f, k) => k % 2 ? fotos[fotos.length - 1 - (k >> 1)] : fotos[k >> 1]).filter((f, k, l) => l.indexOf(f) === k);
    const html = orden.map(f => `<img src="${f}" alt="" loading="lazy" decoding="async" draggable="false">`).join('');
    pista.innerHTML = html + html;
    pista.querySelectorAll('img').forEach(i => i.addEventListener('load', () => i.style.setProperty('--r', (i.naturalWidth / i.naturalHeight).toFixed(3)), { once: true }));
  }

})();
