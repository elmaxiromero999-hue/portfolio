// Libro con hojas que se dan vuelta agarrándolas de la punta (canvas 2D, sin librerías).
// crearLibro(contenedor, paginas[{src,w,h}], { alCambiar(desde, hasta, total) }) -> { siguiente(), anterior(), actual() }
// En pantallas anchas muestra doble página (la tapa sola a la derecha); en angostas, una sola.
// El doblez es la mediatriz entre la esquina original y el punto donde está el dedo: la parte levantada
// se refleja sobre esa línea y muestra el dorso de la hoja.
(() => {
  const PAPEL = '#f3f1ec';

  window.crearLibro = (cont, paginas, { alCambiar } = {}) => {
    const N = paginas.length, ar = paginas[0].w / paginas[0].h;
    const cv = document.createElement('canvas'); cv.className = 'libro-lienzo';
    cv.setAttribute('role', 'img'); cont.appendChild(cv);
    const ctx = cv.getContext('2d');
    const sinMov = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const imgs = [];
    const cargar = i => {
      if (i < 0 || i >= N || imgs[i]) return;
      const im = new Image(); im.decoding = 'async'; im.onload = pedir; im.src = paginas[i].src; imgs[i] = im;
    };

    let W = 0, H = 0, pw = 0, ph = 0, oy = 0, dpr = 1, doble = true;
    let pos = 0;           // doble: índice de la página derecha (par); simple: página a la vista
    let corr = 0, corrMeta = 0;   // corrimiento para centrar el libro cerrado (tapa o contratapa sola)
    let vuelta = null;     // hoja en movimiento: { dir, C, P, front, back, under }
    let anim = null, presion = null, asomo = null;

    // ---------- medidas ----------
    function medir() {
      dpr = Math.min(2, devicePixelRatio || 1);
      W = cont.clientWidth;
      doble = W >= 720;
      const altoMax = Math.min(innerHeight * 0.74, 860);
      pw = doble ? Math.min(W / 2 - 8, altoMax * ar) : Math.min(W - 24, altoMax * ar);
      ph = pw / ar; oy = Math.round(ph * 0.08);
      H = Math.round(ph + oy * 2);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      cv.style.width = W + 'px'; cv.style.height = H + 'px';
      if (!doble) pos = Math.min(pos, N - 1); else pos -= pos % 2;
      corrMeta = corr = metaCorr();
      pedir();
    }
    const metaCorr = () => !doble ? 0 : pos === 0 ? -pw / 2 : pos >= N ? pw / 2 : 0;
    const lomo = () => doble ? W / 2 + corr : (W - pw) / 2;          // x del lomo (en simple: borde izquierdo)
    const rectDe = lado => ({ x: lado < 0 ? lomo() - pw : lomo(), y: oy, w: pw, h: ph });

    // ---------- dibujo ----------
    function pagina(i, r, espejo = false) {
      const im = imgs[i];
      if (i < 0 || i >= N) return;
      ctx.save();
      if (espejo) { ctx.translate(r.x * 2 + r.w, 0); ctx.scale(-1, 1); }
      ctx.fillStyle = PAPEL; ctx.fillRect(r.x, r.y, r.w, r.h);
      if (im && im.complete && im.naturalWidth) ctx.drawImage(im, r.x, r.y, r.w, r.h);
      ctx.restore();
    }
    function sombraLomo(r, lado) {        // curvatura del papel junto al lomo
      const x = lado < 0 ? r.x + r.w : r.x, a = r.w * 0.12, g = ctx.createLinearGradient(x, 0, x + lado * a, 0);
      g.addColorStop(0, 'rgba(0,0,0,.2)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(lado < 0 ? x - a : x, r.y, a, r.h);
    }
    function base(lado, i) {              // una página quieta + su sombra de lomo
      if (i < 0 || i >= N) return;
      const r = rectDe(lado); pagina(i, r); if (doble) sombraLomo(r, lado);
    }
    function sombraLibro(xs) {
      if (!xs.length) return;
      const x0 = Math.min(...xs.map(r => r.x)), x1 = Math.max(...xs.map(r => r.x + r.w));
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.28)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18;
      ctx.fillStyle = PAPEL; ctx.fillRect(x0, oy, x1 - x0, ph); ctx.restore();
    }

    // recorta un polígono contra el semiplano (X-M)·n * signo >= 0
    function cortar(poly, M, n, signo) {
      const out = [], f = p => ((p.x - M.x) * n.x + (p.y - M.y) * n.y) * signo;
      poly.forEach((a, k) => {
        const b = poly[(k + 1) % poly.length], fa = f(a), fb = f(b);
        if (fa >= 0) out.push(a);
        if ((fa >= 0) !== (fb >= 0)) { const t = fa / (fa - fb); out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }); }
      });
      return out;
    }
    const camino = poly => { ctx.beginPath(); poly.forEach((p, k) => k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath(); };
    const esquinas = r => [{ x: r.x, y: r.y }, { x: r.x + r.w, y: r.y }, { x: r.x + r.w, y: r.y + r.h }, { x: r.x, y: r.y + r.h }];

    function dibujar() {
      pedido = false;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      if (!doble) return dibujarSimple();
      const izq = pos - 1, der = pos;
      // sombra del libro bajo las páginas que hay de cada lado
      const vis = [];
      if (izq >= 0 || (vuelta && vuelta.dir < 0 && vuelta.under >= 0)) vis.push(rectDe(-1));
      if (der < N || (vuelta && vuelta.dir < 0)) vis.push(rectDe(1));
      sombraLibro(vis);
      if (!vuelta) { base(-1, izq); base(1, der); return; }
      if (vuelta.dir > 0) { base(-1, izq); hoja(rectDe(1), 1); }
      else { base(1, der); hoja(rectDe(-1), -1); }
    }
    function dibujarSimple() {
      const r = rectDe(1);
      sombraLibro([r]);
      if (!vuelta) return pagina(pos, r);
      hoja(r, 1);
    }

    // la hoja que se dobla
    function hoja(r, lado) {
      const { C, P, front, back, under } = vuelta;
      const d = { x: P.x - C.x, y: P.y - C.y }, L = Math.hypot(d.x, d.y);
      if (L < 0.5) { pagina(front, r); if (doble) sombraLomo(r, lado); return; }
      const n = { x: d.x / L, y: d.y / L }, M = { x: (C.x + P.x) / 2, y: (C.y + P.y) / 2 };
      const rect = esquinas(r), fija = cortar(rect, M, n, 1), lev = cortar(rect, M, n, -1);
      // 1) lo que queda debajo (la página siguiente) y la parte de la hoja que todavía no se levantó
      pagina(under, r); if (doble && under >= 0 && under < N) sombraLomo(r, lado);
      if (fija.length > 2) { ctx.save(); camino(fija); ctx.clip(); pagina(front, r); if (doble) sombraLomo(r, lado); ctx.restore(); }
      // sombra que proyecta la hoja sobre la página de abajo, junto al doblez
      if (lev.length > 2) {
        ctx.save(); camino(lev); ctx.clip();
        const s = Math.min(L * 0.5, pw * 0.35), g = ctx.createLinearGradient(M.x, M.y, M.x - n.x * s, M.y - n.y * s);
        g.addColorStop(0, 'rgba(0,0,0,.38)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
      }
      // 2) la solapa: la parte levantada reflejada sobre el doblez, mostrando el dorso
      if (lev.length < 3) return;
      const a = 1 - 2 * n.x * n.x, b = -2 * n.x * n.y, dd = 1 - 2 * n.y * n.y, k = 2 * (M.x * n.x + M.y * n.y);
      ctx.save();
      ctx.transform(a, b, b, dd, k * n.x, k * n.y);
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 22; camino(lev); ctx.fillStyle = PAPEL; ctx.fill(); ctx.restore();
      camino(lev); ctx.clip();
      if (back === null) { ctx.fillStyle = PAPEL; ctx.fillRect(r.x, r.y, r.w, r.h); }
      else pagina(back, r, true);
      // volumen del papel: más oscuro en el doblez, un brillo y se apaga hacia la punta
      const s = Math.min(L * 0.5, pw * 0.5), g = ctx.createLinearGradient(M.x, M.y, M.x - n.x * s, M.y - n.y * s);
      g.addColorStop(0, 'rgba(0,0,0,.22)'); g.addColorStop(0.18, 'rgba(255,255,255,.14)'); g.addColorStop(0.6, 'rgba(0,0,0,.03)'); g.addColorStop(1, 'rgba(0,0,0,.1)');
      ctx.fillStyle = g; ctx.fillRect(r.x - pw, r.y - ph, r.w + pw * 2, r.h + ph * 2);
      ctx.restore();
    }

    let pedido = false;
    function pedir() { if (!pedido) { pedido = true; requestAnimationFrame(dibujar); } }

    // ---------- física del papel ----------
    // la punta no puede alejarse del lomo más que el ancho de la hoja (si no, el papel "se estiraría")
    function limitar(p) {
      const sx = lomo(), arriba = vuelta.C.y < oy + ph / 2;
      const s1 = { x: sx, y: arriba ? oy : oy + ph }, s2 = { x: sx, y: arriba ? oy + ph : oy };
      const r1 = pw, r2 = Math.hypot(pw, ph);
      for (const [s, rr] of [[s1, r1], [s2, r2]]) {
        const dx = p.x - s.x, dy = p.y - s.y, l = Math.hypot(dx, dy);
        if (l > rr) p = { x: s.x + dx * rr / l, y: s.y + dy * rr / l };
      }
      return p;
    }
    function empezar(dir, arriba) {
      if (anim) return false;
      let front, back, under;
      if (doble) {
        if (dir > 0) { if (pos >= N) return false; front = pos; back = pos + 1; under = pos + 2; }
        else { if (pos <= 0) return false; front = pos - 1; back = pos - 2; under = pos - 3; }
      } else {
        if (dir > 0) { if (pos >= N - 1) return false; front = pos; back = null; under = pos + 1; }
        else { if (pos <= 0) return false; front = pos - 1; back = null; under = pos; }
      }
      const r = rectDe(doble ? dir : 1);
      const C = { x: doble && dir < 0 ? r.x : r.x + r.w, y: arriba ? r.y : r.y + r.h };
      vuelta = { dir, C, P: { ...C }, front, back, under };
      return true;
    }
    // destino de la punta: del otro lado del lomo, a la misma altura
    const destino = () => ({ x: 2 * lomo() - vuelta.C.x, y: vuelta.C.y });

    function animar(desde, hasta, dur, arco, fin) {
      if (sinMov) dur = 1;
      const t0 = performance.now();
      anim = true;
      const paso = t => {
        const k = Math.min(1, (t - t0) / dur), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        const sube = arco * Math.sin(Math.PI * k) * (vuelta.C.y > oy + ph / 2 ? -1 : 1);
        vuelta.P = limitar({ x: desde.x + (hasta.x - desde.x) * e, y: desde.y + (hasta.y - desde.y) * e + sube });
        pedir();
        if (k < 1) requestAnimationFrame(paso); else { anim = null; fin && fin(); }
      };
      requestAnimationFrame(paso);
    }
    function terminar(completa) {
      const v = vuelta;
      if (!completa) return animar(v.P, v.C, 380, 0, () => { vuelta = null; pedir(); });
      // en simple, ir hacia atrás es la vuelta inversa: la hoja ya está del otro lado y vuelve a su lugar
      animar(v.P, destino(), 520, ph * 0.04, () => {
        pos += doble ? 2 * v.dir : v.dir;
        vuelta = null; avisar(); centrar();
      });
    }
    function centrar() {
      corrMeta = metaCorr();
      if (Math.abs(corrMeta - corr) < .5) { corr = corrMeta; return pedir(); }
      const desde = corr, t0 = performance.now(), dur = sinMov ? 1 : 450;
      const paso = t => { const k = Math.min(1, (t - t0) / dur); corr = desde + (corrMeta - desde) * (1 - Math.pow(1 - k, 3)); pedir(); if (k < 1) requestAnimationFrame(paso); };
      requestAnimationFrame(paso);
    }
    function automatica(dir) {
      if (anim || presion) return;
      if (!doble && dir < 0) {          // simple, hacia atrás: la hoja anterior vuelve desde la izquierda
        if (!empezar(-1, false)) return;
        const v = vuelta, ini = destino();
        v.P = limitar({ ...ini });
        return animar(ini, v.C, 620, ph * 0.12, () => { pos -= 1; vuelta = null; avisar(); pedir(); });
      }
      if (!empezar(dir, false)) return;
      animar(vuelta.C, destino(), 760, ph * 0.12, () => {
        pos += doble ? 2 * dir : dir; vuelta = null; avisar(); centrar();
      });
    }
    function avisar() {
      for (let k = -3; k <= 5; k++) cargar(pos + k);
      cv.setAttribute('aria-label', `Catálogo: ${texto()}`);
      alCambiar && alCambiar(texto(), pos);
    }
    function texto() {
      if (!doble) return `Página ${pos + 1} de ${N}`;
      if (pos === 0) return 'Tapa';
      if (pos >= N) return 'Contratapa';
      return `Páginas ${pos} y ${pos + 1} de ${N}`;
    }

    // ---------- mouse y dedo ----------
    const local = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    cv.addEventListener('pointerdown', e => {
      if (anim) return;
      const p = local(e), sx = lomo();
      if (p.y < oy - 10 || p.y > oy + ph + 10) return;
      let dir;
      if (doble) { if (p.x > sx && p.x < sx + pw) dir = 1; else if (p.x < sx && p.x > sx - pw) dir = -1; else return; }
      else { if (p.x < sx || p.x > sx + pw) return; dir = p.x > sx + pw * 0.33 ? 1 : -1; }
      presion = { dir, ini: p, movio: false, t: performance.now(), base: null };
      if (asomo && vuelta && vuelta.dir === dir) { presion.movio = true; presion.base = { ...vuelta.P }; }   // ya estaba levantada: sigue desde ahí
      else if (vuelta) vuelta = null;
      asomo = null;
      cv.setPointerCapture(e.pointerId);
    });
    cv.addEventListener('pointermove', e => {
      const p = local(e);
      if (presion) {
        const dx = p.x - presion.ini.x, dy = p.y - presion.ini.y;
        if (!presion.movio && Math.hypot(dx, dy) > 6) {
          if (!doble && presion.dir < 0) return;   // en simple, hacia atrás se toca (no se arrastra)
          presion.movio = empezar(presion.dir, presion.ini.y < oy + ph / 2) || 'no';
        }
        if (presion.movio === true) { const b = presion.base || vuelta.C; vuelta.P = limitar({ x: b.x + dx, y: b.y + dy }); pedir(); }
        return;
      }
      // asomo: con el mouse cerca de una punta, la hoja se levanta un poco
      if (e.pointerType !== 'mouse' || anim) return;
      const sx = lomo(), cerca = pw * 0.2;
      const esq = [];
      if (doble ? pos < N : pos < N - 1) esq.push({ dir: 1, x: doble ? sx + pw : sx + pw });
      if (doble && pos > 0) esq.push({ dir: -1, x: sx - pw });
      const hit = esq.map(c => ({ ...c, y: p.y < oy + ph / 2 ? oy : oy + ph })).find(c => Math.hypot(p.x - c.x, p.y - c.y) < cerca);
      if (hit) {
        if (!vuelta || vuelta.dir !== hit.dir || vuelta.C.y !== hit.y) { vuelta = null; empezar(hit.dir, hit.y === oy); }
        const q = { x: vuelta.C.x + (p.x - vuelta.C.x) * 0.9 - hit.dir * 14, y: vuelta.C.y + (p.y - vuelta.C.y) * 0.9 + (hit.y === oy ? 10 : -10) };
        vuelta.P = limitar(q); asomo = true; cv.style.cursor = 'grab'; pedir();
      } else if (asomo) { asomo = null; cv.style.cursor = ''; terminar(false); }
    });
    const soltar = e => {
      if (!presion) return;
      const pr = presion; presion = null;
      if (pr.movio === true) {
        const v = vuelta, sx = lomo();
        const q = local(e), toque = pr.base && Math.hypot(q.x - pr.ini.x, q.y - pr.ini.y) < 6;   // clic sobre la punta levantada: pasa la hoja
        const rapido = toque || ((performance.now() - pr.t) < 250 && Math.abs(q.x - pr.ini.x) > 30);
        terminar(v.dir > 0 ? (v.P.x < sx + (doble ? 0 : pw * 0.5) || rapido) : (v.P.x > sx || rapido));
      } else if (!pr.movio) automatica(pr.dir);
    };
    cv.addEventListener('pointerup', soltar);
    cv.addEventListener('pointercancel', soltar);
    cv.addEventListener('pointerleave', () => { if (asomo && !presion) { asomo = null; cv.style.cursor = ''; terminar(false); } });
    cont.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { automatica(1); e.preventDefault(); } if (e.key === 'ArrowLeft') { automatica(-1); e.preventDefault(); } });

    new ResizeObserver(() => { if (cont.clientWidth !== W) { vuelta = null; anim = null; medir(); } }).observe(cont);
    medir(); avisar();
    return { siguiente: () => automatica(1), anterior: () => automatica(-1),
      actual: () => doble ? Math.max(0, Math.min(N - 1, pos === 0 ? 0 : pos - 1)) : pos };
  };
})();
