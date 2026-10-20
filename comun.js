// Funciones comunes a las páginas del sitio.

// Altura real del menú fijo: en celular ocupa dos líneas, y el contenido tiene que empezar debajo.
(() => {
  const h = document.querySelector('header'); if (!h) return;
  const fijar = () => document.documentElement.style.setProperty('--menu-h', h.offsetHeight + 'px');
  fijar(); addEventListener('resize', fijar); addEventListener('load', fijar);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fijar);
})();

// Deslizar el dedo a izquierda/derecha sobre un elemento (visores de imágenes).
window.deslizar = (el, alIzquierda, alDerecha) => {
  let x0 = null, y0 = 0;
  el.addEventListener('touchstart', e => { const t = e.touches[0]; x0 = t.clientX; y0 = t.clientY; }, { passive: true });
  el.addEventListener('touchend', e => {
    if (x0 === null) return;
    const t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0; x0 = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) (dx < 0 ? alIzquierda : alDerecha)();
  }, { passive: true });
};

// Visor accesible: lleva el foco adentro al abrir, lo mantiene con Tab y lo devuelve al cerrar.
window.foco = {
  entrar(visor, primero) { visor._opener = document.activeElement; (primero || visor.querySelector('button')).focus({ preventScroll: true }); },
  salir(visor) { const o = visor._opener; if (o && o.focus) o.focus({ preventScroll: true }); },
  atrapar(e, visor) {
    if (e.key !== 'Tab') return;
    const f = [...visor.querySelectorAll('button')].filter(b => b.offsetParent !== null); if (!f.length) return;
    const a = f[0], z = f[f.length - 1];
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  }
};

// Evita inyectar HTML desde los textos de las obras.
window.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
