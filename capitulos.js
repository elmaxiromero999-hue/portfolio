// Diseño se navega por capítulos, como carpetas: la portada muestra el índice y cada capítulo se abre solo
// (los demás quedan ocultos). Adentro hay una barra fija (← Índice · capítulo actual · anterior / siguiente)
// y al final un bloque "Siguiente capítulo". El historial del navegador acompaña: Atrás vuelve al índice a la
// misma altura; diseno.html#fit abre directo ese capítulo. Esc también vuelve al índice.
// Qué capítulo se ve lo decide html[data-cap] (lo pone el <head> si la URL trae uno, y después este script);
// los estilos están en capitulos.css. transicion.js, si está activa, anima la entrada y llama a CAPS.ir().
(() => {
  const html = document.documentElement;
  const indice = document.getElementById('indice');
  if (!indice || !html.classList.contains('dis-nav')) return;
  const caps = [...indice.querySelectorAll('ol a[href^="#"]')].map(a => ({
    id: a.getAttribute('href').slice(1), vista: a.dataset.vista,
    n: a.querySelector('.n').textContent, nombre: a.querySelector('b').textContent, q: (a.querySelector('.q') || {}).textContent || '',
  })).filter(c => document.getElementById(c.id));
  const ids = caps.map(c => c.id), total = String(caps.length).padStart(2, '0');
  const abrir = id => document.querySelectorAll('.capitulo').forEach(sec => sec.classList.toggle('abierta', sec.id === id));
  if (html.dataset.cap && !ids.includes(html.dataset.cap)) delete html.dataset.cap;   // el <head> pone cualquier hash
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- barra fija dentro del capítulo ----------
  const barra = document.createElement('nav');
  barra.className = 'cap-barra'; barra.setAttribute('aria-label', 'Capítulos de Diseño');
  barra.innerHTML = `<a class="cb-indice" href="#indice"><span class="cb-rejilla" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="cb-txt">Índice</span></a>
    <span class="cb-puntos">${caps.map(c => `<a class="cb-punto" href="#${esc(c.id)}" aria-label="${esc(c.n + ' ' + c.nombre)}"><b>${esc(c.n)}</b><span class="cb-pnombre">${esc(c.nombre)}</span></a>`).join('')}</span>
    <span class="cb-pasos"><a class="cb-ant" href="#"><span aria-hidden="true">←</span><span class="cb-txt cb-antn"></span></a><a class="cb-sig" href="#"><span class="cb-txt cb-sign"></span><span aria-hidden="true">→</span></a></span>`;
  document.getElementById(ids[0]).before(barra);

  // ---------- cierre de cada capítulo ----------
  const fin = document.createElement('div');
  fin.className = 'cap-fin';
  fin.innerHTML = `<a class="cf-sig" href="#"><span class="cf-et">Siguiente capítulo</span><span class="cf-n"></span><b class="cf-nombre"></b><span class="cf-q"></span><span class="cf-flecha" aria-hidden="true">→</span></a>
    <a class="cf-indice" href="#indice"><span aria-hidden="true">←</span> Volver al índice</a>`;
  document.getElementById(ids[ids.length - 1]).after(fin);

  const enlazar = (a, c) => { a.setAttribute('href', '#' + c.id); a.dataset.vista = c.vista; a.hidden = false; };
  function pintar(id) {
    const i = ids.indexOf(id), c = caps[i], ant = caps[i - 1], sig = caps[i + 1];
    // el capítulo actual se destaca y no se puede "reabrir" (sin data-vista, transicion.js no lo anima)
    barra.querySelectorAll('.cb-punto').forEach((p, k) => {
      const actual = k === i; p.classList.toggle('actual', actual);
      if (actual) { p.setAttribute('aria-current', 'page'); delete p.dataset.vista; } else { p.removeAttribute('aria-current'); p.dataset.vista = caps[k].vista; }
    });
    barra.querySelector('.cb-antn').textContent = ant ? ant.nombre : '';
    barra.querySelector('.cb-sign').textContent = sig ? sig.nombre : '';
    const a = barra.querySelector('.cb-ant'), s = barra.querySelector('.cb-sig'), f = fin.querySelector('.cf-sig');
    if (ant) { enlazar(a, ant); a.setAttribute('aria-label', `Anterior: ${ant.nombre}`); } else a.hidden = true;
    if (sig) {
      enlazar(s, sig); s.setAttribute('aria-label', `Siguiente: ${sig.nombre}`);
      enlazar(f, sig);
      f.querySelector('.cf-n').textContent = sig.n; f.querySelector('.cf-nombre').textContent = sig.nombre; f.querySelector('.cf-q').textContent = sig.q;
    } else { s.hidden = true; f.hidden = true; }
  }

  // ---------- ir a un capítulo / volver al índice ----------
  // salto instantáneo explícito: html tiene scroll-behavior: smooth y cambiarlo al vuelo no alcanza en Chrome
  const saltoA = y => scrollTo({ top: y, behavior: 'instant' });
  const avisar = () => dispatchEvent(new Event('resize'));   // abanico, libro y galerías se re-miden al aparecer
  let yIndice = null;   // altura del índice al salir, para volver al mismo lugar aunque se pase por varios capítulos
  function ir(id, { push = true } = {}) {
    if (!ids.includes(id)) return;
    if (!html.dataset.cap) yIndice = scrollY;
    if (push && location.hash !== '#' + id) {
      const desdeIndice = !html.dataset.cap;
      if (desdeIndice) history.replaceState({ y: scrollY }, '');   // altura del índice, para volver al mismo lugar
      history.pushState({ cap: id, desdeIndice }, '', '#' + id);
    }
    html.dataset.cap = id; abrir(id); pintar(id);
    saltoA(0);
    avisar();
    const sec = document.getElementById(id);
    if (!sec.hasAttribute('tabindex')) sec.tabIndex = -1;
    sec.focus({ preventScroll: true });
  }
  function alIndice({ push = true, y = null } = {}) {
    const desde = html.dataset.cap;
    if (push) history.pushState(null, '', location.pathname + location.search);
    delete html.dataset.cap; abrir(null);
    avisar();
    if (y == null) y = yIndice;
    if (y != null) saltoA(y); else indice.scrollIntoView({ behavior: 'instant' });
    // el foco vuelve al renglón del capítulo que se dejó (si no, teclado y lector de pantalla quedan en <body>)
    if (desde && window.RUEDA && !indice.classList.contains('modo-lista')) RUEDA.volverA('#' + desde);   // la rueda queda mirando ese capítulo
    else { const fila = desde && indice.querySelector(`ol a[href="#${desde}"]`); if (fila) fila.focus({ preventScroll: true }); }
  }
  let volviendo = false;
  const volver = () => {
    if (volviendo) return;   // history.back() es asíncrono: un segundo clic o Esc no debe salir de la página
    // si se entró desde el índice, Atrás lo deja exactamente donde estaba
    if (history.state && history.state.desdeIndice) { volviendo = true; history.back(); } else alIndice();
  };
  window.CAPS = { ir, alIndice, volver, ids };

  addEventListener('popstate', e => {
    volviendo = false;
    const h = location.hash.slice(1);
    if (ids.includes(h)) ir(h, { push: false });
    else alIndice({ push: false, y: e.state && typeof e.state.y === 'number' ? e.state.y : null });
  });

  // clics: lo que no animó transicion.js (o si está desactivada) se resuelve acá
  document.addEventListener('click', e => {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const a = e.target.closest('a'); if (!a) return;
    const href = a.getAttribute('href') || '';
    if (href === '#indice' && (a.closest('.cap-barra') || a.closest('.cap-fin'))) { e.preventDefault(); volver(); return; }
    if (a.classList.contains('cb-punto') && a.classList.contains('actual')) { e.preventDefault(); saltoA(0); return; }
    if (html.dataset.cap && a.closest('header') && /(^|\/)diseno\.html$/.test(href)) { e.preventDefault(); volver(); return; }
    if (ids.includes(href.slice(1)) && (a.closest('#indice') || a.closest('.cap-barra') || a.closest('.cap-fin'))) { e.preventDefault(); ir(href.slice(1)); }
  });
  addEventListener('keydown', e => {
    if (e.key !== 'Escape' || e.repeat || !html.dataset.cap || e.defaultPrevented) return;
    if (document.querySelector('#visor.abierto, .trans') || html.classList.contains('menu-abierto')) return;
    volver();
  }, true);   // en captura: se fija si el visor estaba abierto ANTES de que su propio Esc lo cierre

  // arranque: si la URL trae un capítulo, ya está visible (lo puso el <head>); falta la barra y el historial
  const inicial = location.hash.slice(1);
  if (ids.includes(inicial)) {
    abrir(inicial); pintar(inicial);
    // al recargar dentro de un capítulo se conserva el historial (desdeIndice) y la altura que restaura el navegador
    const yaEstaba = history.state && history.state.cap === inicial;
    if (!yaEstaba) { history.replaceState({ cap: inicial, desdeIndice: false }, ''); setTimeout(() => saltoA(0), 0); }
  }
  else if (inicial === 'indice') setTimeout(() => indice.scrollIntoView({ behavior: 'instant' }), 0);
})();
