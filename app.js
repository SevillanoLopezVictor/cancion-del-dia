/* Canción del día — app de ella */
(() => {
'use strict';

const CONFIG = {
  // El JSON que tú publicas. Cámbialo aquí si algún día mueves el Gist.
  fuente: 'https://gist.githubusercontent.com/SevillanoLopezVictor/1a87bf55c8723d98faa20d2b29680131/raw/songs.json',
  clavesLocales: { catalogo: 'cdd_catalogo', progreso: 'cdd_progreso' }
};

/* ---------------------------------------------------------- utilidades */

const $ = s => document.querySelector(s);

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio',
               'agosto','septiembre','octubre','noviembre','diciembre'];
const DIAS = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];

// "2026-09-14" -> Date local a medianoche (nada de UTC, que descuadra el día)
function fecha(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d);
}
function hoyReal() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}
function hoy() {
  if (PREVIA && catalogo) {
    if (PREVIA.tipo === 'fecha') return fecha(PREVIA.valor);
    return sumaDias(fecha(catalogo.startDate), PREVIA.valor - 1);
  }
  return hoyReal();
}
function sumaDias(f, n) {
  const r = new Date(f);
  r.setDate(r.getDate() + n);
  return r;
}
function diasEntre(a, b) {
  return Math.round((b - a) / 86400000);
}
function fechaLarga(f) {
  return `${DIAS[f.getDay()]} ${f.getDate()} de ${MESES[f.getMonth()]}`;
}
function fechaCorta(f) {
  return `${f.getDate()} ${MESES[f.getMonth()].slice(0,3)} ${f.getFullYear()}`;
}
function mayus(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function guardaJSON(clave, valor) {
  try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) {}
}
function leeJSON(clave, porDefecto) {
  try {
    const v = localStorage.getItem(clave);
    return v ? JSON.parse(v) : porDefecto;
  } catch (e) { return porDefecto; }
}

/* ------------------------------------------------------------- estado */

let catalogo = null;
let soloFavoritas = false;

/* Vista previa (solo para ti):
     ?probar=2026-12-25   → ese día
     ?probar=1            → el primer día del diario
   No guarda nada: no ensucia el progreso ni deja rastro. */
const PREVIA = (() => {
  const v = new URLSearchParams(location.search).get('probar');
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return { tipo: 'fecha', valor: v };
  if (/^\d+$/.test(v)) return { tipo: 'dia', valor: Number(v) };
  return null;
})();

let progreso = PREVIA ? {} : leeJSON(CONFIG.clavesLocales.progreso, {});

function guardaProgreso() {
  if (PREVIA) return;                      // en vista previa no se guarda nada
  guardaJSON(CONFIG.clavesLocales.progreso, progreso);
}
function delDia(i) { return progreso[i] || {}; }

/* ------------------------------------------------------------ catálogo */

async function cargaCatalogo() {
  // Primero lo último que descargamos, para que abra al instante y sin datos.
  const guardado = leeJSON(CONFIG.clavesLocales.catalogo, null);
  if (guardado) { catalogo = guardado; pinta(); }

  try {
    const url = CONFIG.fuente + (CONFIG.fuente.includes('?') ? '&' : '?') + 'cb=' + Date.now();
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const nuevo = await r.json();
    if (!nuevo.songs || !nuevo.songs.length) throw new Error('JSON sin canciones');
    if (!guardado || (nuevo.version || 0) >= (guardado.version || 0)) {
      catalogo = nuevo;
      guardaJSON(CONFIG.clavesLocales.catalogo, nuevo);
      pinta();
    }
  } catch (e) {
    if (!catalogo) {
      $('#vista-hoy').innerHTML = `<div class="aviso">
        <span class="grande">📡</span>
        <div class="mensaje">No he podido conectar</div>
        Comprueba que tienes internet y vuelve a abrirla.</div>`;
    }
  }
}

/* Orden de las canciones: el reparto viene fijado en el JSON. */
function cancionDelDia(indice) {
  if (!catalogo) return null;
  const orden = catalogo.order;
  const id = (orden && orden[indice]) || null;
  if (id) return catalogo.songs.find(c => c.id === id) || null;
  return catalogo.songs[indice] || null;   // por si faltara 'order'
}

function inicio() { return fecha(catalogo.startDate); }
function indiceHoy() { return diasEntre(inicio(), hoy()); }
function totalDias() { return (catalogo.order && catalogo.order.length) || catalogo.songs.length; }
function haEmpezado() { return indiceHoy() >= 0; }

function portada(cancion) {
  const a = (cancion.artworkURL || '').trim();
  if (!a) return null;
  return a.startsWith('http') ? a : 'caratulas/' + a;
}

function enlace(cancion) {
  return cancion.spotifyURL || null;
}

/* -------------------------------------------------------------- pintar */

function pinta() {
  if (!catalogo) return;
  $('#titulo-app').textContent = catalogo.appTitle || 'Canción del día';
  pintaAvisoPrevia();

  const i = indiceHoy(), total = totalDias();
  $('#contador').textContent =
    (haEmpezado() && i < total) ? `Canción ${Math.min(i + 1, total)} de ${total}` : '';

  pintaHoy();
  pintaHistorial();
}

function pintaAvisoPrevia() {
  if (!PREVIA) return;
  let barra = document.getElementById('barra-previa');
  if (!barra) {
    barra = document.createElement('div');
    barra.id = 'barra-previa';
    barra.style.cssText =
      'position:fixed;left:0;right:0;top:0;z-index:50;padding:6px 10px;' +
      'padding-top:calc(6px + env(safe-area-inset-top));text-align:center;' +
      'font-size:11px;letter-spacing:.4px;background:#7a4bd0;color:#fff';
    document.body.appendChild(barra);
    document.body.style.paddingTop = '26px';
  }
  barra.innerHTML = `VISTA PREVIA · ${mayus(fechaLarga(hoy()))} · ` +
    `<a href="${location.pathname}" style="color:#fff;text-decoration:underline">salir</a>`;
}

function pintaHoy() {
  const cont = $('#vista-hoy');
  const i = indiceHoy();

  if (!haEmpezado()) {
    const f = inicio();
    cont.innerHTML = `<div class="aviso">
      <span class="grande">🎁</span>
      <div class="mensaje">${catalogo.welcomeMessage || 'Una canción cada día.'}</div>
      Empieza el ${fechaLarga(f)} de ${f.getFullYear()}</div>`;
    return;
  }
  if (i >= totalDias()) {
    cont.innerHTML = `<div class="aviso">
      <span class="grande">❤️</span>
      <div class="mensaje">Se acabaron las canciones</div>
      Pero el historial se queda contigo para siempre.</div>`;
    return;
  }

  const cancion = cancionDelDia(i);
  if (!cancion) { cont.innerHTML = `<div class="aviso">Hoy no hay canción.</div>`; return; }

  if (delDia(i).vista) {
    cont.innerHTML = tarjeta(cancion, i);
    conectaTarjeta(cont, i);
    return;
  }

  const pendientes = pendientesSinVer();
  cont.innerHTML = `
    <div class="centro">
      <div class="fecha-hoy">${mayus(fechaLarga(sumaDias(inicio(), i)))}</div>
      <button class="boton-descubrir" id="btn-descubrir">
        <svg viewBox="0 0 24 24"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3z"/></svg>
        <span>Descubrir<br>canción</span>
      </button>
      <div class="pie-boton">Tu canción de hoy te está esperando</div>
      ${pendientes ? `<div class="pie-boton">Tienes ${pendientes} ${pendientes === 1
          ? 'canción de un día pasado sin descubrir' : 'canciones de días pasados sin descubrir'} en el historial</div>` : ''}
    </div>`;

  $('#btn-descubrir').addEventListener('click', () => {
    if (navigator.vibrate) navigator.vibrate(12);
    progreso[i] = Object.assign({}, delDia(i), { vista: Date.now() });
    guardaProgreso();
    pinta();
  });
}

function pendientesSinVer() {
  const i = indiceHoy();
  let n = 0;
  for (let d = 0; d < i; d++) if (!delDia(d).vista && cancionDelDia(d)) n++;
  return n;
}

function tarjeta(cancion, i) {
  const img = portada(cancion);
  const url = enlace(cancion);
  const p = delDia(i);
  const estrellas = [1,2,3,4,5].map(v =>
    `<button class="estrella ${(p.nota || 0) >= v ? 'on' : ''}" data-nota="${v}"
       aria-label="${v} estrellas">★</button>`).join('');

  return `<div class="tarjeta">
    <div class="fecha">${fechaLarga(sumaDias(inicio(), i))}</div>
    ${url ? `<a class="portada-envoltorio" href="${url}" target="_blank" rel="noopener">` : `<div class="portada-envoltorio">`}
      ${img ? `<img class="portada" src="${img}" alt="" loading="lazy">`
            : `<div class="portada portada-vacia">♪</div>`}
      ${url ? `<div class="icono-salir">↗</div>` : ''}
    ${url ? `</a>` : `</div>`}
    <h2 class="titulo-cancion">${escapa(cancion.title || 'Canción')}</h2>
    ${cancion.artist ? `<p class="artista">${escapa(cancion.artist)}</p>` : ''}
    ${cancion.note ? `<p class="nota">${escapa(cancion.note)}</p>` : ''}
    ${url ? `<a class="boton-spotify" href="${url}" target="_blank" rel="noopener">
        <span>▶</span> Escuchar en Spotify</a>` : ''}
    <div class="pregunta">¿Qué te ha parecido?</div>
    <div class="estrellas" data-dia="${i}">${estrellas}</div>
  </div>`;
}

function conectaTarjeta(raiz, i) {
  raiz.querySelectorAll('.estrella').forEach(b => {
    b.addEventListener('click', () => {
      const v = Number(b.dataset.nota);
      const p = delDia(i);
      progreso[i] = Object.assign({}, p, { nota: p.nota === v ? null : v });
      guardaProgreso();
      pinta();
      if ($('#modal').classList.contains('abierto')) abreDia(i);
    });
  });
}

function escapa(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

/* ---------------------------------------------------------- historial */

function pintaHistorial() {
  const cont = $('#vista-historial');
  const tope = Math.min(indiceHoy(), totalDias() - 1);

  if (!haEmpezado() || tope < 0) {
    cont.innerHTML = `<div class="aviso"><span class="grande">🕘</span>
      Aquí se irán guardando todas tus canciones.</div>`;
    return;
  }

  let dias = [];
  for (let d = tope; d >= 0; d--) if (cancionDelDia(d)) dias.push(d);
  if (soloFavoritas) dias = dias.filter(d => delDia(d).favorita);

  const vistas = Object.values(progreso).filter(p => p.vista).length;

  cont.innerHTML = `
    <div class="cabecera-lista">
      <span>${vistas === 1 ? '1 descubierta' : vistas + ' descubiertas'}</span>
      <button id="filtro-fav">${soloFavoritas ? '☰ Todas' : '♥ Favoritas'}</button>
    </div>
    <ul class="lista">${dias.map(fila).join('')}</ul>`;

  $('#filtro-fav').addEventListener('click', () => { soloFavoritas = !soloFavoritas; pintaHistorial(); });
  cont.querySelectorAll('.fila').forEach(f =>
    f.addEventListener('click', () => abreDia(Number(f.dataset.dia))));
}

function fila(d) {
  const c = cancionDelDia(d), p = delDia(d), img = portada(c);
  const vista = !!p.vista;
  return `<li><button class="fila" data-dia="${d}">
    ${vista && img ? `<img src="${img}" alt="" loading="lazy">`
                   : `<div class="sin">${vista ? '♪' : '🎁'}</div>`}
    <div class="info">
      <div class="f-fecha">${fechaCorta(sumaDias(inicio(), d))}</div>
      <div class="f-titulo ${vista ? '' : 'pendiente'}">${vista ? escapa(c.title || '') : 'Sin descubrir'}</div>
      ${vista && p.nota ? `<div class="f-estrellas">${'★'.repeat(p.nota)}</div>` : ''}
    </div>
    ${p.favorita ? '<span style="color:var(--acento)">♥</span>' : ''}
  </button></li>`;
}

function abreDia(i) {
  const c = cancionDelDia(i);
  if (!c) return;
  if (!delDia(i).vista) {
    progreso[i] = Object.assign({}, delDia(i), { vista: Date.now() });
    guardaProgreso();
  }
  const p = delDia(i);
  $('#modal-contenido').innerHTML = tarjeta(c, i) +
    `<div style="text-align:center;margin-top:6px">
       <button id="btn-fav" style="background:none;border:0;color:var(--acento);font-size:26px;cursor:pointer">
         ${p.favorita ? '♥' : '♡'}</button></div>`;
  conectaTarjeta($('#modal-contenido'), i);
  $('#btn-fav').addEventListener('click', () => {
    progreso[i] = Object.assign({}, delDia(i), { favorita: !delDia(i).favorita });
    guardaProgreso(); abreDia(i); pintaHistorial();
  });
  $('#modal').classList.add('abierto');
  $('#modal').scrollTop = 0;
}

/* ------------------------------------------------------------ arranque */

document.querySelectorAll('.pestana').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.pestana').forEach(x => x.classList.remove('activa'));
    document.querySelectorAll('.vista').forEach(x => x.classList.remove('activa'));
    b.classList.add('activa');
    $('#vista-' + b.dataset.vista).classList.add('activa');
  });
});

$('#cerrar-modal').addEventListener('click', () => {
  $('#modal').classList.remove('abierto');
  pintaHistorial();
});

cargaCatalogo();

// Al volver a la app, comprobamos si hay cambios o si ha cambiado el día.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) cargaCatalogo();
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

})();
