// Service worker: guarda en el teléfono / la compu lo que ya se bajó, así volver a entrar o pasar de una página
// a otra es casi instantáneo. Lo registra carga.js.
// - Páginas (.html): primero la red (siempre lo último publicado); si no hay conexión, la copia guardada.
// - .css/.js e imágenes con ?v=: primero lo guardado (si cambian, cambia la URL).
// - Imágenes y fuentes sin ?v=: se muestra lo guardado al instante y se actualiza en segundo plano.
// - Videos: no se tocan (el navegador los pide por partes).
// Para invalidar todo: subir VERSION.
// EMERGENCIA: si algo anda mal, poner APAGADO = true y publicar: borra lo guardado y el service worker se da de baja solo.
const APAGADO = false;
const VERSION = 'mr-2026-11-04';
const PAGINAS = 'paginas-' + VERSION, RECURSOS = 'recursos-' + VERSION;
const MAX_RECURSOS = 300;   // tope de archivos guardados (los más viejos se borran)

self.addEventListener('install', e => {
  if (APAGADO) { self.skipWaiting(); return; }
  e.waitUntil(caches.open(PAGINAS).then(c => c.addAll(['./', './index.html', './obras.html', './diseno.html']).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  if (APAGADO) {
    e.waitUntil(caches.keys().then(ks => Promise.all(ks.map(k => caches.delete(k)))).then(() => self.registration.unregister())
      .then(() => self.clients.matchAll()).then(cs => cs.forEach(c => c.navigate(c.url))));
    return;
  }
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== PAGINAS && k !== RECURSOS).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

const esRecurso = url => /\.(webp|jpe?g|png|gif|svg|woff2?|ttf)$/i.test(url.pathname) || (/\.(css|js)$/i.test(url.pathname) && url.searchParams.has('v'));

let guardados = 0;
async function recortar() {
  if (++guardados % 25) return;   // se revisa cada tanto, no en cada imagen
  const c = await caches.open(RECURSOS), ks = await c.keys();
  for (let i = 0; i < ks.length - MAX_RECURSOS; i++) await c.delete(ks[i]);   // los más viejos primero
}

self.addEventListener('fetch', e => {
  if (APAGADO) return;
  const r = e.request;
  if (r.method !== 'GET' || r.headers.has('range')) return;
  const url = new URL(r.url);
  if (url.origin !== location.origin || /\.(mp4|webm|mov)$/i.test(url.pathname)) return;

  if (r.mode === 'navigate' || /\.html$/.test(url.pathname) || url.pathname.endsWith('/')) {
    e.respondWith(fetch(r).then(res => {
      if (res.ok) { const copia = res.clone(); caches.open(PAGINAS).then(c => c.put(r, copia)); }
      return res;
    }).catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || caches.match('./index.html'))));
    return;
  }
  if (esRecurso(url)) {
    const versionado = url.searchParams.has('v');
    e.respondWith(caches.open(RECURSOS).then(c => c.match(r).then(m => {
      const red = () => fetch(r).then(res => { if (res.ok && res.type === 'basic') { c.put(r, res.clone()); recortar(); } return res; });
      if (m) { if (!versionado) { const p = red().catch(() => {}); try { e.waitUntil(p); } catch (err) {} } return m; }   // al instante; sin versión, se refresca atrás
      return red();
    })));
  }
});
