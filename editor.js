/* Editor — solo para ti. Lee y publica el catálogo en el Gist. */
(() => {
'use strict';

const GIST_ID = '1a87bf55c8723d98faa20d2b29680131';
const ARCHIVO = 'songs.json';
const RAW = `https://gist.githubusercontent.com/SevillanoLopezVictor/${GIST_ID}/raw/${ARCHIVO}`;

const $ = s => document.querySelector(s);
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio',
               'agosto','septiembre','octubre','noviembre','diciembre'];

let catalogo = null, token = '', filtro = 'sin', busqueda = '', editando = null;

/* ------------------------------------------------------------- fechas */
function fecha(iso){ const [a,m,d] = iso.split('-').map(Number); return new Date(a,m-1,d); }
function hoy(){ const n=new Date(); return new Date(n.getFullYear(),n.getMonth(),n.getDate()); }
function sumaDias(f,n){ const r=new Date(f); r.setDate(r.getDate()+n); return r; }
function diasEntre(a,b){ return Math.round((b-a)/86400000); }
function corta(f){ return `${f.getDate()} ${MESES[f.getMonth()].slice(0,3)} ${f.getFullYear()}`; }
function iso(f){ return `${f.getFullYear()}-${String(f.getMonth()+1).padStart(2,'0')}-${String(f.getDate()).padStart(2,'0')}`; }
function esc(s){ return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function diaDe(id){ const i = (catalogo.order||[]).indexOf(id); return i < 0 ? null : i; }
function fechaDe(id){ const i = diaDe(id); return i === null ? null : sumaDias(fecha(catalogo.startDate), i); }

function muestra(id){
  document.querySelectorAll('.vista').forEach(v=>v.classList.remove('activa'));
  $(id).classList.add('activa');
  window.scrollTo(0,0);
}
function aviso(el, texto, clase){ el.className = 'estado ' + clase; el.textContent = texto; }

/* ------------------------------------------------------------- acceso */

async function descarga(){
  const r = await fetch(RAW + '?cb=' + Date.now(), { cache:'no-store' });
  if (!r.ok) throw new Error('No he podido leer el Gist (HTTP ' + r.status + ')');
  return r.json();
}

async function compruebaToken(t){
  const r = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    headers: { Authorization: 'Bearer ' + t, Accept: 'application/vnd.github+json' }
  });
  if (r.status === 401) throw new Error('El token no es válido.');
  if (r.status === 404) throw new Error('El token no tiene permiso sobre este Gist.');
  if (!r.ok) throw new Error('GitHub respondió ' + r.status);
  return true;
}

$('#btn-entrar').addEventListener('click', async () => {
  const el = $('#estado-acceso');
  const t = $('#token').value.trim();
  if (!t) { aviso(el,'Pega el token primero.','mal'); return; }
  aviso(el,'Comprobando…','info');
  try {
    await compruebaToken(t);
    token = t;
    localStorage.setItem('cdd_token', t);
    catalogo = await descarga();
    pintaLista();
    muestra('#v-lista');
  } catch (e) { aviso(el, e.message, 'mal'); }
});

/* -------------------------------------------------------------- lista */

function pintaLista(){
  const total = catalogo.songs.length;
  const conNota = catalogo.songs.filter(c => (c.note||'').trim()).length;
  $('#sub').textContent = `versión ${catalogo.version} · ${conNota}/${total} con texto`;

  let lista = catalogo.songs.slice();
  if (filtro === 'sin') lista = lista.filter(c => !(c.note||'').trim());
  if (filtro === 'con') lista = lista.filter(c => (c.note||'').trim());
  if (busqueda) {
    const q = busqueda.toLowerCase();
    lista = lista.filter(c => `${c.title} ${c.artist} ${c.note}`.toLowerCase().includes(q));
  }
  lista.sort((a,b) => (diaDe(a.id) ?? 1e9) - (diaDe(b.id) ?? 1e9));

  $('#v-lista').innerHTML = `
    <div class="resumen">
      <div><b>${total}</b><span>canciones</span></div>
      <div><b>${conNota}</b><span>con texto</span></div>
      <div><b>${total - conNota}</b><span>por escribir</span></div>
    </div>
    <div class="filtros">
      <button data-f="sin" class="${filtro==='sin'?'on':''}">Sin texto</button>
      <button data-f="con" class="${filtro==='con'?'on':''}">Con texto</button>
      <button data-f="todas" class="${filtro==='todas'?'on':''}">Todas</button>
    </div>
    <input id="buscar" placeholder="Buscar…" value="${esc(busqueda)}" style="margin-bottom:10px">
    <ul class="lista">${lista.slice(0,150).map(f => filaHTML(f)).join('')}</ul>
    ${lista.length>150?`<p class="aviso-caja">Mostrando 150 de ${lista.length}. Usa el buscador.</p>`:''}
    <button class="btn gris" id="btn-salir">Cerrar sesión</button>`;

  $('#v-lista').querySelectorAll('.filtros button').forEach(b =>
    b.addEventListener('click', () => { filtro = b.dataset.f; pintaLista(); }));
  const inp = $('#buscar');
  inp.addEventListener('input', () => {
    busqueda = inp.value;
    const pos = inp.selectionStart;
    pintaLista();
    const n = $('#buscar'); n.focus(); n.setSelectionRange(pos,pos);
  });
  $('#v-lista').querySelectorAll('.fila').forEach(f =>
    f.addEventListener('click', () => abre(f.dataset.id)));
  $('#btn-salir').addEventListener('click', () => {
    localStorage.removeItem('cdd_token'); location.reload();
  });
}

function filaHTML(c){
  const f = fechaDe(c.id);
  const img = (c.artworkURL||'').startsWith('http') ? c.artworkURL
            : (c.artworkURL ? 'caratulas/'+c.artworkURL : null);
  const tieneNota = (c.note||'').trim();
  return `<li><button class="fila" data-id="${c.id}">
    ${img?`<img src="${img}" alt="" loading="lazy">`:`<div class="sin">♪</div>`}
    <div class="info">
      <div class="f-fecha">${f?corta(f):'sin fecha'} · ${c.id}</div>
      <div class="f-titulo">${esc(c.title)}</div>
      <div class="f-fecha">${esc(c.artist)}</div>
    </div>
    <span style="color:${tieneNota?'var(--spotify)':'var(--acento)'};font-size:18px">${tieneNota?'✓':'✎'}</span>
  </button></li>`;
}

/* ------------------------------------------------------------ edición */

function abre(id){
  const c = catalogo.songs.find(x => x.id === id);
  if (!c) return;
  editando = id;
  const f = fechaDe(id);
  const img = (c.artworkURL||'').startsWith('http') ? c.artworkURL
            : (c.artworkURL ? 'caratulas/'+c.artworkURL : null);

  $('#v-editar').innerHTML = `
    <button class="btn gris" id="btn-volver" style="margin-bottom:14px">← Volver</button>
    <div class="caja" style="display:flex;gap:12px;align-items:center">
      ${img?`<img src="${img}" style="width:70px;height:70px;border-radius:10px;object-fit:cover">`
           :`<div style="width:70px;height:70px;border-radius:10px;background:rgba(255,255,255,.08);
                display:flex;align-items:center;justify-content:center">♪</div>`}
      <div style="min-width:0">
        <div style="font-weight:600">${esc(c.title)}</div>
        <div style="font-size:13px;color:var(--acento-suave)">${esc(c.artist)}</div>
        <div style="font-size:11px;color:var(--texto-tenue)">Sale el ${f?corta(f):'—'}</div>
      </div>
    </div>

    <div class="caja">
      <label>Tu texto (lo que verá ella)</label>
      <textarea id="e-nota" placeholder="Por qué has elegido esta canción…">${esc(c.note)}</textarea>

      <label>Título</label><input id="e-titulo" value="${esc(c.title)}">
      <label>Artista</label><input id="e-artista" value="${esc(c.artist)}">
      <label>Enlace de Spotify</label><input id="e-url" value="${esc(c.spotifyURL)}">
      <label>Carátula (URL, o nombre del archivo)</label><input id="e-art" value="${esc(c.artworkURL||'')}">

      <label>Cambiar el día en que sale</label>
      <input type="date" id="e-fecha" value="${f?iso(f):''}">
      <p class="aviso-caja">Si eliges otra fecha, esta canción y la que había ese día
      intercambian su sitio. Los días que ya han pasado no se pueden tocar.</p>

      <button class="btn" id="btn-guardar">Guardar cambios</button>
      <div class="estado" id="estado-editar"></div>
    </div>

    <div class="caja">
      <button class="btn verde" id="btn-publicar">Publicar en el Gist</button>
      <div class="estado" id="estado-publicar"></div>
      <p class="aviso-caja">Guarda todos los cambios y sube el número de versión.
      En su móvil aparecerá la próxima vez que abra la app (puede tardar un minuto).</p>
    </div>`;

  $('#btn-volver').addEventListener('click', () => { pintaLista(); muestra('#v-lista'); });
  $('#btn-guardar').addEventListener('click', guarda);
  $('#btn-publicar').addEventListener('click', publica);
  muestra('#v-editar');
}

function guarda(){
  const el = $('#estado-editar');
  const c = catalogo.songs.find(x => x.id === editando);
  c.note = $('#e-nota').value;
  c.title = $('#e-titulo').value.trim();
  c.artist = $('#e-artista').value.trim();
  c.spotifyURL = $('#e-url').value.trim();
  const art = $('#e-art').value.trim();
  if (art) c.artworkURL = art; else delete c.artworkURL;

  const nueva = $('#e-fecha').value;
  if (nueva) {
    const destino = diasEntre(fecha(catalogo.startDate), fecha(nueva));
    const actual = diaDe(c.id);
    const hoyIdx = diasEntre(fecha(catalogo.startDate), hoy());
    if (destino !== actual) {
      if (destino < 0 || destino >= catalogo.order.length) {
        aviso(el,'Esa fecha queda fuera del año del diario.','mal'); return;
      }
      if (destino <= hoyIdx || actual <= hoyIdx) {
        aviso(el,'No puedo mover días que ya han pasado (o el de hoy).','mal'); return;
      }
      const otro = catalogo.order[destino];
      catalogo.order[destino] = c.id;
      catalogo.order[actual] = otro;
      aviso(el,'Guardado. Canción movida (intercambiada con la que había ese día).','ok');
      setTimeout(() => abre(editando), 700);
      return;
    }
  }
  aviso(el,'Guardado en este dispositivo. Recuerda publicar.','ok');
}

async function publica(){
  const el = $('#estado-publicar');
  aviso(el,'Publicando…','info');
  try {
    catalogo.version = (catalogo.version || 0) + 1;
    const r = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer ' + token,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      body: JSON.stringify({ files: { [ARCHIVO]: { content: JSON.stringify(catalogo, null, 2) } } })
    });
    if (!r.ok) {
      catalogo.version -= 1;
      const t = await r.text();
      throw new Error(`GitHub respondió ${r.status}. ${t.slice(0,140)}`);
    }
    aviso(el, `Publicado como versión ${catalogo.version}.`, 'ok');
  } catch (e) {
    aviso(el, e.message, 'mal');
  }
}

/* ----------------------------------------------------------- arranque */

(async () => {
  const guardado = localStorage.getItem('cdd_token');
  if (!guardado) return;
  $('#token').value = guardado;
  try {
    await compruebaToken(guardado);
    token = guardado;
    catalogo = await descarga();
    pintaLista();
    muestra('#v-lista');
  } catch (e) { aviso($('#estado-acceso'), e.message, 'mal'); }
})();

})();
