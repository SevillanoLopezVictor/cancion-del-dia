/* Panel de "añadir a la pantalla de inicio".
   iOS no deja lanzar el instalador desde la web, así que en iPhone
   enseñamos los dos pasos. En Android/escritorio sí hay instalador
   de verdad y usamos ese. */
(() => {
'use strict';

const CFG = window.INSTALAR || {};
const TITULO = CFG.titulo || 'Añádela a tu pantalla de inicio';
const TEXTO  = CFG.texto  || 'Así la tendrás como una app más, a un toque.';
const CLAVE  = 'cdd_instalar_' + (CFG.id || 'app');
const DIAS_SILENCIO = 7;

const ua = navigator.userAgent;
const esIOS = /iPad|iPhone|iPod/.test(ua) ||
              (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const esSafari = esIOS && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
const otroNavegadorIOS = esIOS && !esSafari;

const yaInstalada = window.navigator.standalone === true ||
                    window.matchMedia('(display-mode: standalone)').matches;

let promptDiferido = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  promptDiferido = e;
  if (!yaInstalada && !silenciado()) muestra();
});

function silenciado() {
  try {
    const t = Number(localStorage.getItem(CLAVE) || 0);
    return Date.now() - t < DIAS_SILENCIO * 864e5;
  } catch (e) { return false; }
}
function silencia() {
  try { localStorage.setItem(CLAVE, String(Date.now())); } catch (e) {}
}

const ICONO_COMPARTIR =
  '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" ' +
  'stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M12 15V3"/><path d="m8 7 4-4 4 4"/>' +
  '<path d="M20 14v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5"/></svg>';
const ICONO_MAS =
  '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" ' +
  'stroke-width="1.9" stroke-linecap="round"><path d="M12 5v14M5 12h14"/>' +
  '<rect x="3" y="3" width="18" height="18" rx="4" stroke-width="1.5"/></svg>';

function muestra() {
  if (document.getElementById('panel-instalar')) return;

  const pasos = otroNavegadorIOS
    ? `<p class="ins-nota">Estás en otro navegador. Abre este enlace
         <strong>en Safari</strong> para poder añadirla.</p>`
    : esIOS
      ? `<ol class="ins-pasos">
           <li><span class="ins-ico">${ICONO_COMPARTIR}</span>
               Pulsa <strong>Compartir</strong>, abajo en la barra de Safari</li>
           <li><span class="ins-ico">${ICONO_MAS}</span>
               Elige <strong>Añadir a pantalla de inicio</strong></li>
         </ol>`
      : `<p class="ins-nota">Instálala para tenerla siempre a mano.</p>
         <button class="ins-btn" id="ins-instalar">Instalar</button>`;

  const panel = document.createElement('div');
  panel.id = 'panel-instalar';
  panel.innerHTML = `
    <div class="ins-fondo"></div>
    <div class="ins-hoja" role="dialog" aria-label="${TITULO}">
      <img class="ins-icono" src="icon-180.png" alt="">
      <h2>${TITULO}</h2>
      <p class="ins-sub">${TEXTO}</p>
      ${pasos}
      <button class="ins-cerrar" id="ins-cerrar">Ahora no</button>
    </div>`;
  document.body.appendChild(panel);
  requestAnimationFrame(() => panel.classList.add('visible'));

  const cierra = () => { silencia(); panel.classList.remove('visible');
                         setTimeout(() => panel.remove(), 300); };
  panel.querySelector('#ins-cerrar').addEventListener('click', cierra);
  panel.querySelector('.ins-fondo').addEventListener('click', cierra);

  const btn = panel.querySelector('#ins-instalar');
  if (btn) btn.addEventListener('click', async () => {
    if (!promptDiferido) return cierra();
    promptDiferido.prompt();
    await promptDiferido.userChoice;
    promptDiferido = null;
    cierra();
  });
}

if (!yaInstalada && !silenciado() && esIOS) {
  setTimeout(muestra, 1400);
}

})();
