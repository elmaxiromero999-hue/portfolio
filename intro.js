// Intro: el isotipo MR se dibuja primero como vector (contornos, nodos y caja de selección), después se rellena
// bloque por bloque, aparece "MáximoRomero.", hace un glitch cian/magenta y la cortina sube.
// De fondo, la misma retícula del sitio con fragmentos de código que se decodifican, una línea de escaneo
// y un HUD con coordenadas y porcentaje de carga.
// Solo la primera vez por visita (sessionStorage); con un clic, una tecla o scroll se saltea.
// La clase html.con-intro la pone el script corto del <head> (así la página no se ve antes de tiempo).
// Usa window.MARCA (marca.js).
(() => {
  const html = document.documentElement;
  if (!html.classList.contains('con-intro')) return;
  if (!window.MARCA) { html.classList.remove('con-intro'); return; }

  // capa vectorial sobre el isotipo: contorno de cada bloque, nodos en las esquinas y caja de selección (unidades del viewBox 13×10)
  const bloques = [...MARCA.iso.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)].map(m => m.slice(1).map(Number));
  const n = .28, nodo = (x, y) => `<rect class="i-nodo" x="${x - n / 2}" y="${y - n / 2}" width="${n}" height="${n}"/>`;
  const vector = `<g class="i-vec">
    ${bloques.map(([x, y, w, h], k) => `<rect class="i-contorno" style="--k:${k}" x="${x}" y="${y}" width="${w}" height="${h}" pathLength="1"/>`).join('')}
    ${bloques.map(([x, y, w, h]) => nodo(x, y) + nodo(x + w, y) + nodo(x + w, y + h) + nodo(x, y + h)).join('')}
    <g class="i-sel"><rect class="i-sel-caja" x="-.7" y="-.7" width="14.4" height="11.4"/>
      ${[[-.7, -.7], [6.5, -.7], [13.7, -.7], [13.7, 5], [13.7, 10.7], [6.5, 10.7], [-.7, 10.7], [-.7, 5]].map(([x, y]) => `<rect class="i-manija" x="${x - .22}" y="${y - .22}" width=".44" height=".44"/>`).join('')}</g>
  </g>`;
  const isoVector = MARCA.iso.replace('</svg>', vector + '</svg>');
  const sello = `<div class="i-iso">${MARCA.iso}</div><div class="i-palabra">${MARCA.palabra}</div>`;

  const d = document.createElement('div');
  d.id = 'intro'; d.setAttribute('aria-hidden', 'true');
  d.innerHTML = `<canvas class="i-fondo"></canvas>
    <div class="i-hud tl">MR / <b>2026</b> — portfolio</div>
    <div class="i-hud tr">x <span class="i-x">0000</span> · y <span class="i-y">0000</span></div>
    <div class="i-hud bl">cargando <span class="i-p">000</span>%</div>
    <div class="i-hud br">build <span class="i-b">0x00</span></div>
    <div class="lockup">
      <div class="i-iso">${isoVector}</div><div class="i-palabra">${MARCA.palabra}</div>
      <div class="i-g i-g1">${sello}</div><div class="i-g i-g2">${sello}</div>
    </div>
    <p class="bajada">Artista visual · Diseño y motion</p>`;
  document.body.appendChild(d);

  // ---------- fondo: retícula, código y escaneo ----------
  const cv = d.querySelector('.i-fondo'), cx = cv.getContext('2d');
  const dpr = Math.min(devicePixelRatio || 1, 2), W = innerWidth, H = innerHeight;
  cv.width = W * dpr; cv.height = H * dpr;
  const P = 64, CODIGO = ['0x1F', '01', '10', '{ }', '//', 'fn()', '=>', '0xA3', '1101', '::', '&&', '[ ]', 'λ', 'Δ', '0b1', 'ff', '#00', 'MR', '.618', 'px', '++', 'nil'];
  const elige = () => CODIGO[Math.floor(Math.random() * CODIGO.length)];
  const glifos = [];
  const t0 = performance.now();
  const ix = d.querySelector('.i-x'), iy = d.querySelector('.i-y'), ip = d.querySelector('.i-p'), ib = d.querySelector('.i-b');
  function fondo(now) {
    if (!d.isConnected) return;
    const t = now - t0, p = Math.min(1, t / 2300);
    cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, W, H);
    const aparece = Math.min(1, t / 500), scan = (t / 1800 % 1) * (H + 100) - 50;
    cx.lineWidth = 1; cx.strokeStyle = `rgba(255,255,255,${.07 * aparece})`;
    cx.beginPath();
    for (let x = 0; x <= W; x += P * 4) { cx.moveTo(x + .5, 0); cx.lineTo(x + .5, H); }
    for (let y = 0; y <= H; y += P * 4) { cx.moveTo(0, y + .5); cx.lineTo(W, y + .5); }
    cx.stroke();
    for (let y = 0; y <= H; y += P) for (let x = 0; x <= W; x += P) {
      const ds = Math.abs(y - scan), a = (.16 + (ds < 50 ? .3 * (1 - ds / 50) : 0)) * aparece;
      cx.strokeStyle = `rgba(255,255,255,${a})`;
      cx.beginPath(); cx.moveTo(x - 3, y); cx.lineTo(x + 3, y); cx.moveTo(x, y - 3); cx.lineTo(x, y + 3); cx.stroke();
    }
    cx.fillStyle = `rgba(255,255,255,${.22 * aparece})`; cx.fillRect(0, scan, W, 1);
    // fragmentos de código: aparecen en las intersecciones, se decodifican y se apagan
    if (glifos.length < 34 && Math.random() < .55) glifos.push({ x: Math.round(Math.random() * W / P) * P, y: Math.round(Math.random() * H / P) * P, txt: elige(), t: now, vida: 500 + Math.random() * 900 });
    cx.font = '500 11px ui-monospace, SFMono-Regular, Menlo, monospace'; cx.textBaseline = 'top';
    for (let i = glifos.length - 1; i >= 0; i--) {
      const g = glifos[i], e = (now - g.t) / g.vida;
      if (e >= 1) { glifos.splice(i, 1); continue; }
      if (e < .3 && Math.random() < .4) g.txt = elige();
      const env = e < .15 ? e / .15 : e > .7 ? (1 - e) / .3 : 1;
      cx.fillStyle = `rgba(255,255,255,${.45 * env * aparece})`; cx.fillText(g.txt, g.x + 6, g.y + 5);
    }
    // HUD
    ix.textContent = String(Math.round(Math.random() * 9999 * (1 - p) + 1300 * p)).padStart(4, '0');
    iy.textContent = String(Math.round(Math.random() * 9999 * (1 - p) + 1000 * p)).padStart(4, '0');
    ip.textContent = String(Math.round(100 * (1 - (1 - p) ** 2))).padStart(3, '0');
    ib.textContent = '0x' + Math.floor(Math.random() * 255).toString(16).toUpperCase().padStart(2, '0');
    requestAnimationFrame(fondo);
  }
  requestAnimationFrame(fondo);

  let listo = false;
  const timers = [];
  const terminar = () => {
    if (listo) return; listo = true; timers.forEach(clearTimeout);
    try { sessionStorage.setItem('intro-vista', '1'); } catch (e) {}
    html.classList.remove('con-intro');
    d.classList.remove('glitch'); d.classList.add('sale');
    setTimeout(() => d.remove(), 1050);
  };
  // dos cuadros de espera para que el navegador pinte el estado inicial antes de animar
  requestAnimationFrame(() => requestAnimationFrame(() => d.classList.add('entra')));
  timers.push(setTimeout(() => d.classList.add('glitch'), 2150));
  timers.push(setTimeout(() => d.classList.remove('glitch'), 2500));
  timers.push(setTimeout(terminar, 2850));
  d.addEventListener('click', terminar);
  ['keydown', 'wheel', 'touchmove'].forEach(ev => addEventListener(ev, terminar, { once: true, passive: true }));
})();
