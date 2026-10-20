// Transición del índice de Diseño a cada capítulo: el logo del capítulo se arma con sus vectores reales
// (nodos y manijas a la vista, como en Illustrator), se rellena, hace un glitch y la cortina se levanta.
// Logos: AHPC y Feria del Centro salen de INSTITUCIONAL; Agencia, FIT y Nexar de img/marca/capitulos/*.svg.
// Visuales en vivo y Experimentación no tienen logo: hacen una "ráfaga" rápida con sus propias piezas
// (cuadros de los videos en img/motion-cuadros/, miniaturas de DISENO), cada una con un efecto distinto
// (pixelado, vectorizado, glitch, onda, armado por bloques) dibujado en un canvas. Con un clic, Esc o scroll se saltea.
(() => {
  const links = document.querySelectorAll('#indice a[href^="#"]');
  if (!links.length || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const NS = 'http://www.w3.org/2000/svg';
  const I = typeof INSTITUCIONAL !== 'undefined' ? INSTITUCIONAL : null;

  // ---------- Logos ----------
  const archivos = { agencia: 'img/marca/capitulos/agencia.svg', fit: 'img/marca/capitulos/fit.svg', nexar: 'img/marca/capitulos/nexar.svg' };
  const cache = {};
  const traer = k => cache[k] || (cache[k] = fetch(archivos[k]).then(r => r.ok ? r.text() : null).catch(() => null)
    .then(t => { if (!t) delete cache[k]; return t; }));   // si falla, se reintenta la próxima vez
  async function logo(k) {
    if (k === 'ahpc') return I && I.ahpc.logos.sigla;
    if (k === 'fdc') return I && `<svg viewBox="0 0 435 290">${I.fdc.lineas.slice(0, 6).map((l, n) =>
      l.icono.replace('<svg', `<svg x="${(n % 3) * 150}" y="${Math.floor(n / 3) * 150}" width="135" height="135"`)).join('')}</svg>`;
    return traer(k);
  }
  // ---------- Ráfagas: qué piezas pasa cada capítulo (se eligen al cargar la página y se precargan) ----------
  const mezclar = l => { for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return l; };
  const expo = (typeof DISENO !== 'undefined' && DISENO[0]) ? DISENO[0].works.map(w => w.thumb) : [];
  const RAFAGA = {
    // un cuadro de cada video por vuelta, así no se repiten dos seguidos del mismo
    motion: [0, 1, 2].flatMap(c => mezclar([1, 2, 3, 4, 5, 6]).map(v => `img/motion-cuadros/m${v}-${c + 1}.webp`)).slice(0, 14),
    exp: mezclar(expo.slice()).slice(0, 14),
  };
  const imgs = {}, listas = {};
  const cargarImg = src => imgs[src] || (imgs[src] = new Promise(res => {
    const im = new Image(); im.decoding = 'async';
    // se decodifica antes de usarla, así el primer drawImage no traba la ráfaga
    im.onload = () => im.decode().catch(() => {}).then(() => { listas[src] = im; res(im); }); im.onerror = () => { delete imgs[src]; res(null); }; im.src = src;
  }));
  const piezasRafaga = k => Promise.all(RAFAGA[k].map(cargarImg)).then(l => l.filter(Boolean));
  // los logos son livianos: se traen enseguida; las fotos de las ráfagas, recién cuando el índice está por verse
  const prefetch = () => Object.keys(archivos).forEach(traer);
  ('requestIdleCallback' in window) ? requestIdleCallback(prefetch, { timeout: 3000 }) : setTimeout(prefetch, 1500);
  const indice = document.getElementById('indice');
  if ('IntersectionObserver' in window && indice) {
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); Object.keys(RAFAGA).forEach(piezasRafaga); } }, { rootMargin: '600px' });
    io.observe(indice);
  } else Object.keys(RAFAGA).forEach(piezasRafaga);

  // ---------- Trazados: todo a coordenadas absolutas y cortado en subtrazados ----------
  // Cada pieza guarda sus nodos (fin de cada segmento) y manijas (puntos de control de las curvas).
  function leer(d) {
    const t = []; let i = 0, cmd = null, k = 0;
    const ARGS = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };
    const num = () => { const m = /^[\s,]*([-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)/.exec(d.slice(i)); if (!m) return null; i += m[0].length; return +m[1]; };
    const bandera = () => { const m = /^[\s,]*([01])/.exec(d.slice(i)); if (!m) return null; i += m[0].length; return +m[1]; };
    while (i < d.length) {
      const m = /^[\s,]*([MmLlHhVvCcSsQqTtAaZz])/.exec(d.slice(i));
      if (m) { cmd = m[1]; i += m[0].length; if (cmd.toUpperCase() === 'Z') { t.push([cmd]); continue; } }
      else if (!cmd || /^[\s,]*$/.test(d.slice(i)) || cmd.toUpperCase() === 'Z') break;   // números sueltos tras Z: no hay a qué asignarlos
      const n = ARGS[cmd.toUpperCase()], a = [];
      for (k = 0; k < n; k++) { const v = (cmd.toUpperCase() === 'A' && (k === 3 || k === 4)) ? bandera() : num(); if (v === null) return t; a.push(v); }
      t.push([cmd, ...a]);
      if (cmd === 'M') cmd = 'L'; else if (cmd === 'm') cmd = 'l';
    }
    return t;
  }
  function piezasDe(d, mt) {   // mt = [escala, tx, ty]
    const [s, tx, ty] = mt || [1, 0, 0], P = (x, y) => [x * s + tx, y * s + ty], f = v => +v.toFixed(2);
    const subs = []; let cur = null, x = 0, y = 0, x0 = 0, y0 = 0, cx = null, cy = null, qx = null, qy = null, prev = '';
    const nuevo = () => { cur = { d: '', nodos: [], manijas: [] }; subs.push(cur); };
    const ir = (X, Y) => { const p = P(X, Y); cur.nodos.push(p); return p; };
    for (const [c, ...a] of leer(d)) {
      const C = c.toUpperCase(), rel = c !== C && C !== 'Z';
      const ax = v => rel ? x + v : v, ay = v => rel ? y + v : v;
      if (C === 'M') { nuevo(); x = x0 = ax(a[0]); y = y0 = ay(a[1]); const p = ir(x, y); cur.d += `M${f(p[0])} ${f(p[1])}`; }
      else {
        if (!cur) { nuevo(); const p = ir(x, y); cur.d += `M${f(p[0])} ${f(p[1])}`; }
        if (C === 'Z') { cur.d += 'Z'; x = x0; y = y0; }
        else if (C === 'L' || C === 'H' || C === 'V') {
          if (C === 'L') { x = ax(a[0]); y = ay(a[1]); } else if (C === 'H') x = rel ? x + a[0] : a[0]; else y = rel ? y + a[0] : a[0];
          const p = ir(x, y); cur.d += `L${f(p[0])} ${f(p[1])}`;
        } else if (C === 'C' || C === 'S') {
          let x1, y1; const o = C === 'C' ? 0 : -2;
          if (C === 'C') { x1 = ax(a[0]); y1 = ay(a[1]); } else { x1 = (prev === 'C' || prev === 'S') ? 2 * x - cx : x; y1 = (prev === 'C' || prev === 'S') ? 2 * y - cy : y; }
          const x2 = ax(a[2 + o]), y2 = ay(a[3 + o]), X = ax(a[4 + o]), Y = ay(a[5 + o]);
          const p1 = P(x1, y1), p2 = P(x2, y2), a0 = P(x, y);
          cx = x2; cy = y2; x = X; y = Y; const p = ir(x, y);
          cur.manijas.push([a0, p1], [p, p2]);
          cur.d += `C${f(p1[0])} ${f(p1[1])} ${f(p2[0])} ${f(p2[1])} ${f(p[0])} ${f(p[1])}`;
        } else if (C === 'Q' || C === 'T') {
          let x1, y1;
          if (C === 'Q') { x1 = ax(a[0]); y1 = ay(a[1]); x = ax(a[2]); y = ay(a[3]); }
          else { x1 = (prev === 'Q' || prev === 'T') ? 2 * x - qx : x; y1 = (prev === 'Q' || prev === 'T') ? 2 * y - qy : y; x = ax(a[0]); y = ay(a[1]); }
          qx = x1; qy = y1; const p1 = P(x1, y1), p = ir(x, y);
          cur.manijas.push([p, p1]);
          cur.d += `Q${f(p1[0])} ${f(p1[1])} ${f(p[0])} ${f(p[1])}`;
        } else if (C === 'A') {
          x = ax(a[5]); y = ay(a[6]); const p = ir(x, y);
          cur.d += `A${f(a[0] * s)} ${f(a[1] * s)} ${a[2]} ${a[3]} ${a[4]} ${f(p[0])} ${f(p[1])}`;
        }
      }
      prev = C;
    }
    return subs.filter(p => p.d.length > 12);
  }
  // transform="translate(a b) scale(s)" o "translate(a,b)": lo único que traen estos SVG
  function matriz(el) {
    let s = 1, tx = 0, ty = 0;
    for (let n = el; n && n.tagName && n.tagName.toLowerCase() !== 'svg'; n = n.parentNode) {
      const t = n.getAttribute && n.getAttribute('transform'); if (!t) continue;
      const tr = /translate\(\s*([-\d.e]+)[\s,]*([-\d.e]*)\s*\)/.exec(t), sc = /scale\(\s*([-\d.e]+)/.exec(t);
      const ns = sc ? +sc[1] : 1, nx = tr ? +tr[1] : 0, ny = tr ? +(tr[2] || 0) : 0;
      // la transformación del padre se aplica después de la del hijo
      tx = tx * ns + nx; ty = ty * ns + ny; s *= ns;
    }
    // svg anidados (íconos de la Feria): x, y y escala del viewBox
    const sv = el.closest('svg svg');
    if (sv) {
      const vb = (sv.getAttribute('viewBox') || '0 0 1 1').split(/[\s,]+/).map(Number), k = (+sv.getAttribute('width') || vb[2]) / vb[2];
      tx = tx * k + (+sv.getAttribute('x') || 0); ty = ty * k + (+sv.getAttribute('y') || 0); s *= k;
    }
    return [s, tx, ty];
  }
  function aD(el) {
    const g = n => +el.getAttribute(n) || 0, tag = el.tagName.toLowerCase();
    if (tag === 'path') return el.getAttribute('d') || '';
    if (tag === 'rect') { const w = g('width'), h = g('height'); return `M${g('x')} ${g('y')}h${w}v${h}h${-w}z`; }
    if (tag === 'circle' || tag === 'ellipse') { const rx = g('r') || g('rx'), ry = g('r') || g('ry'), X = g('cx'), Y = g('cy');
      return `M${X - rx} ${Y}A${rx} ${ry} 0 1 0 ${X + rx} ${Y}A${rx} ${ry} 0 1 0 ${X - rx} ${Y}Z`; }
    if (tag === 'polygon' || tag === 'polyline') return 'M' + el.getAttribute('points').trim().replace(/\s+/g, ' ') + (tag === 'polygon' ? 'Z' : '');
    if (tag === 'line') return `M${g('x1')} ${g('y1')}L${g('x2')} ${g('y2')}`;
    return '';
  }

  // ---------- Escena ----------
  const el = (tag, at = {}, padre) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (padre) padre.appendChild(e); return e; };
  const azar = (a, b) => a + Math.random() * (b - a);
  const GLIFOS = '01#%&*/\\<>_=+▮▯◢◣';
  let activa = null;
  // historial primero (así Atrás vuelve al índice donde estaba), después el salto sin scroll suave y el foco al capítulo
  function saltar(destino, hash) {
    if (location.hash !== hash) { history.replaceState({ y: scrollY }, ''); history.pushState(null, '', hash); }
    const h = document.documentElement, sb = h.style.scrollBehavior; h.style.scrollBehavior = 'auto';
    destino.scrollIntoView(); h.style.scrollBehavior = sb;
    if (!destino.hasAttribute('tabindex')) destino.tabIndex = -1;
    destino.focus({ preventScroll: true });
  }

  // ---------- Ráfaga en canvas ----------
  // Cada golpe muestra una pieza en un encuadre (pantalla completa, carta o tira) con un efecto que se resuelve
  // mientras dura; los golpes se aceleran y se apilan como collage. El último queda vectorizado y se disuelve.
  const EFECTOS = ['pixel', 'glitch', 'vector', 'onda', 'armado'];
  const posters = new WeakMap();
  function vectorizada(img, oscuro) {   // posterizado a 4 tonos de la paleta del sitio, a baja resolución
    const key = posters.get(img); if (key && key.o === oscuro) return key.c;
    const w = 180, h = Math.max(1, Math.round(w * img.naturalHeight / img.naturalWidth));
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0, w, h);
    let d; try { d = x.getImageData(0, 0, w, h); } catch (e) { return c; }   // imagen de otro origen: queda sin posterizar
    const p = d.data;
    const pal = oscuro ? [[0, 0, 0], [24, 0, 255], [140, 146, 255], [255, 255, 255]] : [[24, 0, 255], [10, 0, 120], [140, 146, 255], [255, 255, 255]];
    const orden = oscuro ? [0, 1, 2, 3] : [1, 0, 2, 3];   // de oscuro a claro
    for (let i = 0; i < p.length; i += 4) {
      const l = (p[i] * .3 + p[i + 1] * .59 + p[i + 2] * .11) / 255, q = pal[orden[Math.min(3, Math.floor(l * 4))]];
      p[i] = q[0]; p[i + 1] = q[1]; p[i + 2] = q[2];
    }
    x.putImageData(d, 0, 0); posters.set(img, { o: oscuro, c }); return c;
  }
  function rafaga(t, fotos, hn, ht) {
    const cv = t.querySelector('.tr-lienzo'), cx = cv.getContext('2d');
    const dpr = Math.min(devicePixelRatio || 1, 1.5), W = cv.width = Math.round(innerWidth * dpr), H = cv.height = Math.round(innerHeight * dpr);
    const oscuro = document.documentElement.dataset.tema === 'oscuro', fondo = oscuro ? '#000' : '#1800ff';
    const chico = document.createElement('canvas'), chx = chico.getContext('2d');
    const efectos = mezclar(EFECTOS.slice());
    // armado de la secuencia: de 150 ms por golpe a 55 ms
    const n = fotos.length, golpes = []; let acum = 0;
    fotos.forEach((img, i) => {
      const dur = 150 - 95 * (i / Math.max(1, n - 1)), ar = img.naturalWidth / img.naturalHeight, r = Math.random();
      let caja;
      // las piezas apaisadas (cuadros de video) van más seguido a pantalla completa o en tira
      const apaisada = ar > 1.3 && W / H < ar;
      if (r < (apaisada ? .5 : .3) || i === 0) caja = [0, 0, W, H];
      else if (r < (apaisada ? .62 : .8)) {   // carta: la pieza entera, corrida del centro
        let h = H * azar(.42, .72), w = h * ar; if (w > W * .82) { w = W * .82; h = w / ar; }
        caja = [(W - w) / 2 + azar(-.22, .22) * W, (H - h) / 2 + azar(-.12, .12) * H, w, h];
      }
      else { const h = H * azar(.16, .3); caja = [0, azar(.08, .7) * H, W, h]; }
      const tiles = []; for (let k = 0; k < 20; k++) tiles.push([azar(-.35, .35) * W, azar(-.3, .3) * H]);
      golpes.push({ img, ini: acum, dur, caja, efecto: efectos[i % efectos.length], limpia: caja[2] === W && caja[3] === H || i % 4 === 0, flash: Math.random() < .2, tiles });
      acum += dur;
    });
    const recorte = (iw, ih, w, h) => { const s = Math.max(w / iw, h / ih), sw = w / s, sh = h / s; return [(iw - sw) / 2, (ih - sh) / 2, sw, sh]; };
    const pinta = (g, p, now) => {
      const [x, y, w, h] = g.caja, img = g.img, [sx, sy, sw, sh] = recorte(img.naturalWidth, img.naturalHeight, w, h);
      cx.imageSmoothingEnabled = true; cx.globalCompositeOperation = 'source-over'; cx.globalAlpha = 1;
      if (g.efecto === 'pixel') {
        const b = Math.max(3, Math.round(((1 - p) ** 2) * 56 + 3) * dpr), cw = Math.max(1, Math.ceil(w / b)), ch = Math.max(1, Math.ceil(h / b));
        chico.width = cw; chico.height = ch; chx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);
        cx.imageSmoothingEnabled = false; cx.drawImage(chico, 0, 0, cw, ch, x, y, w, h);
      } else if (g.efecto === 'vector') {
        const v = vectorizada(img, oscuro), [vx, vy, vw, vh] = recorte(v.width, v.height, w, h);
        cx.imageSmoothingEnabled = false; cx.drawImage(v, vx, vy, vw, vh, x + azar(-4, 4) * dpr * (1 - p), y, w, h);
      } else if (g.efecto === 'onda') {
        const paso = 3 * dpr, A = 46 * dpr * (1 - p) ** 1.5;
        cx.fillStyle = fondo; cx.fillRect(x, y, w, h);
        for (let yy = 0; yy < h; yy += paso) cx.drawImage(img, sx, sy + yy / h * sh, sw, paso / h * sh, x + Math.sin(yy / (26 * dpr) + now / 35) * A, y + yy, w, paso);
      } else if (g.efecto === 'armado') {
        const cols = 5, fil = 4, e = 1 - (1 - p) ** 3, tw = w / cols, th = h / fil;
        cx.fillStyle = fondo; cx.fillRect(x, y, w, h);
        for (let c = 0; c < cols; c++) for (let f = 0; f < fil; f++) {
          const [ox, oy] = g.tiles[c * fil + f];
          cx.drawImage(img, sx + c * sw / cols, sy + f * sh / fil, sw / cols, sh / fil, x + c * tw + ox * (1 - e), y + f * th + oy * (1 - e), tw + 1, th + 1);
        }
      } else {   // glitch: franjas corridas + barras de color en diferencia
        cx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
        for (let k = 0; k < 9; k++) {   // franjas tomadas de la imagen (no del propio canvas, que es más caro)
          const f = Math.random(), hh = azar(2, 28) * dpr, dx = azar(-70, 70) * dpr * (1 - p * .6);
          cx.drawImage(img, sx, sy + f * sh, sw, hh / h * sh, x + dx, y + f * h, w, hh);
        }
        cx.globalCompositeOperation = 'difference';
        cx.fillStyle = '#00f0ff'; cx.fillRect(x, y + Math.random() * h, w, azar(4, 24) * dpr);
        cx.fillStyle = '#ff2bd6'; cx.fillRect(x + azar(-30, 30) * dpr, y + Math.random() * h, w, azar(3, 16) * dpr);
        cx.globalCompositeOperation = 'source-over';
      }
    };
    cx.fillStyle = fondo; cx.fillRect(0, 0, W, H);
    const inicio = performance.now() + 260;
    let actual = -1;
    (function cuadro(now) {
      if (!t.isConnected) return;
      const el = now - inicio;
      if (el >= 0 && el < acum) {
        const i = golpes.findIndex(g => el < g.ini + g.dur), g = golpes[i], p = Math.min(1, (el - g.ini) / g.dur);
        if (i !== actual) {
          actual = i; if (g.limpia) { cx.fillStyle = fondo; cx.fillRect(0, 0, W, H); }
          hn.textContent = String(i + 1).padStart(2, '0'); ht.textContent = g.efecto;
        }
        try { pinta(g, p, now); } catch (e) {}   // un cuadro que falla no frena la ráfaga
        if (g.flash && p < .25) { cx.globalCompositeOperation = 'difference'; cx.fillStyle = '#fff'; cx.fillRect(...g.caja); cx.globalCompositeOperation = 'source-over'; }   // negativo de un cuadro
      } else if (el >= acum) {
        // cierre: el último golpe vectorizado a pantalla completa que se disuelve en bloques hacia el fondo
        const q = Math.min(1, (el - acum) / 380), g = golpes[golpes.length - 1];
        if (q < 1) {
          try { pinta({ ...g, caja: [0, 0, W, H], efecto: 'vector' }, 1, now); } catch (e) {}
          const b = 28 * dpr; cx.fillStyle = fondo;
          for (let yy = 0; yy < H; yy += b) for (let xx = 0; xx < W; xx += b) if (Math.random() < q * 1.1) cx.fillRect(xx, yy, b, b);
        } else { cx.fillStyle = fondo; cx.fillRect(0, 0, W, H); return; }
      }
      requestAnimationFrame(cuadro);
    })(performance.now());
    return 260 + acum + 380;   // duración total: la línea de tiempo de la transición se ajusta a esto
  }

  async function transicion(a) {
    const destino = document.querySelector(a.getAttribute('href')); if (!destino) { activa = null; return; }
    const k = a.dataset.vista;
    const nombre = a.querySelector('b').textContent, num = a.querySelector('.n').textContent, rubro = (a.querySelector('.q') || {}).textContent || '';
    const esRafaga = k in RAFAGA;
    // lo que no llegó a cargar en 0,7 s no se espera; la ráfaga usa lo que ya está
    const espera = new Promise(r => setTimeout(() => r(null), 700));
    const svgTxt = esRafaga ? null : await Promise.race([logo(k), espera]);
    const fotos = esRafaga ? await Promise.race([piezasRafaga(k), espera.then(() => RAFAGA[k].map(s => listas[s]).filter(Boolean))]) : [];

    const fila = a.getBoundingClientRect();   // se mide después de esperar el logo
    const t = document.createElement('div'); t.className = esRafaga ? 'trans rafaga' : 'trans'; t.setAttribute('aria-hidden', 'true');
    t.innerHTML = `<div class="tr-grilla"></div>
      <div class="tr-hud tl"><b>${num}</b> / 07 — ${rubro}</div>
      <div class="tr-hud tr">x <span class="tr-x">0000</span> · y <span class="tr-y">0000</span></div>
      ${esRafaga ? '<canvas class="tr-lienzo"></canvas>' : ''}
      <div class="tr-hud bl">${esRafaga ? `cuadro <span class="tr-n">00</span> / ${String(fotos.length).padStart(2, '0')} · <span class="tr-t">—</span>` : 'nodos <span class="tr-n">0</span> · trazados <span class="tr-t">0</span>'}</div>
      <div class="tr-hud br">clic o esc para saltar</div>
      <div class="tr-escena"><div class="tr-logo"></div><div class="tr-caja">${'<i></i>'.repeat(8)}</div></div>
      <p class="tr-nombre"></p>`;
    t.style.clipPath = `inset(${fila.top}px ${innerWidth - fila.right}px ${innerHeight - fila.bottom}px ${fila.left}px)`;
    document.body.appendChild(t);
    const caja = t.querySelector('.tr-logo'), tit = t.querySelector('.tr-nombre');

    // logo: capa de relleno (el original, con sus colores) + piezas de contorno con nodos y manijas
    let N = 0, M = 0, totalT = 0;
    if (svgTxt) {
      caja.innerHTML = svgTxt;
      const orig = caja.querySelector('svg');
      orig.removeAttribute('width'); orig.removeAttribute('height'); orig.removeAttribute('role');
      if (!orig.getAttribute('viewBox')) orig.setAttribute('viewBox', '0 0 100 100');
      const vb = orig.getAttribute('viewBox').split(/[\s,]+/).map(Number);
      orig.querySelectorAll('[data-color]').forEach(p => p.setAttribute('fill', p.dataset.color));
      orig.querySelectorAll('[data-acento]').forEach(p => p.setAttribute('fill', '#9cc8e4'));
      const formas = [...orig.querySelectorAll('path, rect, circle, ellipse, polygon, polyline, line')];
      const relleno = el('g', { class: 'tr-relleno' }); [...orig.childNodes].forEach(n => relleno.appendChild(n)); orig.appendChild(relleno);

      const r = caja.getBoundingClientRect(), esc = Math.min(r.width / vb[2], r.height / vb[3]), u = 1 / esc;   // unidades por píxel
      let piezas = [];
      formas.forEach(f => { try { piezas.push(...piezasDe(aD(f), matriz(f))); } catch (e) {} });
      // muchas piezas chiquitas: se agrupan para que la animación siga fluida
      const MAX = 150;
      if (piezas.length > MAX) {
        const n = Math.ceil(piezas.length / MAX), g = [];
        for (let i = 0; i < piezas.length; i += n) { const p = piezas.slice(i, i + n); g.push({ d: p.map(q => q.d).join(''), nodos: p.flatMap(q => q.nodos), manijas: p.flatMap(q => q.manijas) }); }
        piezas = g;
      }
      totalT = piezas.length;
      const capa = el('g', { class: 'tr-piezas' }, orig);
      const nodosMax = Math.max(2, Math.floor(260 / Math.max(1, piezas.length))), manMax = Math.max(1, Math.floor(70 / Math.max(1, piezas.length)));
      piezas.forEach((p, i) => {
        const g = el('g', { class: 'tr-pz' }, capa);
        el('path', { d: p.d, pathLength: 1, class: 'tr-trazo', 'stroke-width': 1.3 * u }, g);   // sin non-scaling-stroke: Chrome ignora pathLength con él
        const paso = Math.max(1, Math.ceil(p.nodos.length / nodosMax));
        p.nodos.filter((_, j) => j % paso === 0).forEach(([x, y]) => { el('rect', { x: x - 2.5 * u, y: y - 2.5 * u, width: 5 * u, height: 5 * u, class: 'tr-nodo' }, g); N++; });
        p.manijas.filter((_, j) => j % Math.max(1, Math.ceil(p.manijas.length / manMax)) === 0).forEach(([[x, y], [hx, hy]]) => {
          el('line', { x1: x, y1: y, x2: hx, y2: hy, class: 'tr-manija' }, g); el('circle', { cx: hx, cy: hy, r: 2.2 * u, class: 'tr-punta' }, g); M++;
        });
        const dist = Math.max(vb[2], vb[3]);
        g.style.transform = `translate(${azar(-.45, .45) * dist}px, ${azar(-.4, .4) * dist}px) rotate(${azar(-40, 40)}deg) scale(${azar(.4, 1.6)})`;
        g.style.transitionDelay = `${180 + (i / Math.max(1, piezas.length)) * 420 + azar(0, 90)}ms`;
      });
      // la caja de selección abraza el logo real (no el recuadro donde entra)
      const rb = relleno.getBoundingClientRect(), lb = caja.getBoundingClientRect();
      if (rb.width) Object.assign(t.querySelector('.tr-caja').style, { inset: 'auto', left: `${rb.left - lb.left - 14}px`, top: `${rb.top - lb.top - 14}px`, width: `${rb.width + 28}px`, height: `${rb.height + 28}px` });
      // capas de glitch: el relleno en cian y magenta
      ['tr-g1', 'tr-g2'].forEach(c => { const cl = orig.cloneNode(false); cl.classList.add('tr-glitch', c); cl.appendChild(relleno.cloneNode(true)); caja.appendChild(cl); });
    }

    // HUD: coordenadas que corren y contadores
    const hx = t.querySelector('.tr-x'), hy = t.querySelector('.tr-y'), hn = t.querySelector('.tr-n'), ht = t.querySelector('.tr-t');
    const t0 = performance.now();
    (function hud(now) {
      if (!t.isConnected) return;
      const p = Math.min(1, (now - t0) / 1150);
      hx.textContent = String(Math.round(azar(0, 9999) * (1 - p) + 2048 * p)).padStart(4, '0');
      hy.textContent = String(Math.round(azar(0, 9999) * (1 - p) + 1152 * p)).padStart(4, '0');
      if (!esRafaga) { hn.textContent = Math.round(N * p); ht.textContent = Math.round(totalT * p); }
      // nombre que se decodifica de glifos al texto real
      tit.textContent = [...nombre].map((ch, i) => (ch === ' ' || i / nombre.length < p * 1.25 - .15) ? ch : GLIFOS[Math.floor(Math.random() * GLIFOS.length)]).join('');
      requestAnimationFrame(hud);
    })(t0);

    // línea de tiempo
    let fin = false;
    const timers = [];
    const en = (ms, f) => timers.push(setTimeout(f, ms));
    const irAlCapitulo = () => {
      saltar(destino, a.getAttribute('href'));
    };
    const salir = () => {
      if (fin) return; fin = true; timers.forEach(clearTimeout);
      irAlCapitulo(); t.classList.add('sale'); activa = 'saliendo';
      removeEventListener('keydown', tecla);
      setTimeout(() => { t.remove(); activa = null; removeEventListener('wheel', frena); removeEventListener('touchmove', frena); }, 750);
    };
    const tecla = e => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!e.repeat) salir(); } };
    // la rueda o el dedo saltean, pero la inercia del trackpad no sigue scrolleando hasta que la cortina se va
    const frena = e => { e.preventDefault(); salir(); };
    activa = salir;
    t.addEventListener('click', e => { if (e.detail < 2 && performance.now() - t0 > 300) salir(); });   // el 2º clic de un doble clic no saltea
    addEventListener('keydown', tecla); addEventListener('wheel', frena, { passive: false }); addEventListener('touchmove', frena, { passive: false });

    requestAnimationFrame(() => requestAnimationFrame(() => { t.style.clipPath = 'inset(0px 0px 0px 0px)'; t.classList.add('entra'); }));
    const dura = esRafaga && fotos.length ? rafaga(t, fotos, hn, ht) : 0;
    if (window.TR_PAUSA) return;   // para revisar cada etapa a mano desde la consola
    if (esRafaga) {
      const total = Math.max(1200, Math.min(2200, dura || 1200));
      en(total - 350, () => t.classList.add('glitch')); en(total - 100, () => t.classList.remove('glitch')); en(total, salir); return;
    }
    en(1150, () => t.classList.add('rellena'));
    en(1400, () => t.classList.add('glitch'));
    en(1800, () => t.classList.remove('glitch'));
    en(2050, salir);
  }

  // Atrás: vuelve a la altura del índice desde donde se saltó (algunos navegadores no la recuerdan solos)
  addEventListener('popstate', e => { if (e.state && typeof e.state.y === 'number') { const h = document.documentElement, sb = h.style.scrollBehavior; h.style.scrollBehavior = 'auto'; scrollTo(0, e.state.y); h.style.scrollBehavior = sb; } });
  links.forEach(a => a.addEventListener('click', e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    if (activa === 'saliendo') return;   // mientras se va la cortina, el salto común
    e.preventDefault(); if (activa) return;
    activa = () => {};
    transicion(a).catch(err => {
      console.error('transición:', err);
      document.querySelectorAll('.trans').forEach(n => n.remove()); activa = null;
      const d = document.querySelector(a.getAttribute('href')); if (d) saltar(d, a.getAttribute('href'));
    });
  }));
})();
