// Pantalla de carga breve entre secciones (cuando la intro ya se vio en esta visita) y salida animada al ir
// a otra página del sitio. El MR se arma bloque por bloque, abajo el nombre de la sección y el porcentaje.
// La clase html.con-carga la pone el <head> (tapa del color del fondo) y se va sola a los 3 s si esto no carga.
// También: botón "Copiar mail" de Contacto.
(() => {
  const de = document.documentElement;
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NOMBRES = { 'index.html': 'Inicio', 'obras.html': 'Obra', 'diseno.html': 'Diseño y motion' };
  const archivo = url => new URL(url, location.href).pathname.split('/').pop() || 'index.html';
  const CODIGO = ['0x1F', 'fn()', '=>', 'λ', '0b1', '#00', '::', '++', 'MR', '.618', 'px', 'rgb', '[ ]', 'nil', '&&'];

  function crear(nombre) {
    const c = document.createElement('div');
    c.id = 'carga'; c.setAttribute('aria-hidden', 'true');
    c.innerHTML = `<div class="ca-centro"><div class="ca-iso">${window.MARCA ? MARCA.iso : ''}</div>
      <p class="ca-nombre">${nombre}</p><p class="ca-barra"><span class="ca-pista"><i></i></span><b class="ca-pct">000</b>%</p></div>
      <p class="ca-log"></p>`;
    document.body.appendChild(c);
    return c;
  }
  const log = c => { const l = c.querySelector('.ca-log'); if (l) l.textContent = Array.from({ length: 6 }, () => CODIGO[Math.floor(Math.random() * CODIGO.length)]).join('  '); };

  // ---------- entrada ----------
  if (de.classList.contains('con-carga')) {
    const c = crear(NOMBRES[archivo(location.href)] || '');
    const pista = c.querySelector('.ca-pista i'), pct = c.querySelector('.ca-pct');
    let cargado = document.readyState === 'complete';
    addEventListener('load', () => { cargado = true; }, { once: true });
    const t0 = performance.now();
    requestAnimationFrame(() => c.classList.add('arma'));
    (function paso(now) {
      const t = now - t0;
      // avanza con el tiempo; si la página todavía no cargó, se queda cerca del final hasta que cargue
      const p = cargado ? Math.min(1, t / 650) : Math.min(.92, t / 1100);
      pista.style.transform = `scaleX(${p})`; pct.textContent = String(Math.round(p * 100)).padStart(3, '0');
      if (Math.random() < .25) log(c);
      if ((p >= 1 && t >= 650) || t > 2400) {
        c.classList.add('sale'); de.classList.remove('con-carga');
        setTimeout(() => c.remove(), 600);
        return;
      }
      requestAnimationFrame(paso);
    })(t0);
  }

  // ---------- salida: al ir a otra página del sitio, la tapa baja y recién ahí se cambia de página ----------
  let saliendo = false;
  document.addEventListener('click', e => {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]'); if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || !/\.html$|\/$/.test(url.pathname)) return;
    if (archivo(url.href) === archivo(location.href)) return;   // misma página (también / ↔ index.html): nada
    e.preventDefault();
    if (saliendo) return;   // doble clic: una sola salida
    saliendo = true;
    if (quieto) { location.href = url.href; return; }
    const c = crear(NOMBRES[archivo(url.href)] || ''); c.classList.add('cubre'); log(c);
    window.SFX && SFX.barrido();
    setTimeout(() => { location.href = url.href; }, 420);
  });
  // volver con "atrás" desde la caché del navegador: sin tapa
  addEventListener('pageshow', e => { if (e.persisted) { de.classList.remove('con-carga'); document.querySelectorAll('#carga').forEach(n => n.remove()); saliendo = false; } });

  // ---------- Copiar mail ----------
  document.addEventListener('click', e => {
    const b = e.target.closest('.ct-copiar'); if (!b) return;
    const mail = b.dataset.mail, txt = b.querySelector('.ct-copiar-txt');
    const listo = () => { b.classList.add('ok'); txt.textContent = 'Copiado ✓'; window.SFX && SFX.ok(); clearTimeout(b._t); b._t = setTimeout(() => { b.classList.remove('ok'); txt.textContent = 'Copiar mail'; }, 2200); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(mail).then(listo, () => { location.href = 'mailto:' + mail; });
    else location.href = 'mailto:' + mail;
  });
})();
