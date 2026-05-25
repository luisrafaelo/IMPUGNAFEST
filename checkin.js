'use strict';

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwROYWaTJC_OE8scI7wcIEAo5-3TngkiJ5WWgGwLaUkNAGuHnuE1xiqI3F7BzFnqwus/exec'; // misma del script.js
const PASS            = 'CEIE-BYTE-2026';

let scanner     = null;
let scannerOn   = false;
let ingresos    = 0;
let procesando  = false;

/* ── LOGIN ── */
document.getElementById('pinInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') checkLogin();
});

function checkLogin() {
  const val = document.getElementById('pinInput').value;
  if (val === PASS) {
    sessionStorage.setItem('checkin_auth', '1');
    document.getElementById('loginScreen').style.display = 'none';
    const main = document.getElementById('mainScreen');
    main.style.display = 'flex';
  } else {
    const err = document.getElementById('loginError');
    err.style.display = 'block';
    setTimeout(() => err.style.display = 'none', 2500);
  }
}

if (sessionStorage.getItem('checkin_auth') === '1') {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('mainScreen').style.display  = 'flex';
}

/* ── SCANNER ── */
function toggleScanner() {
  scannerOn ? detenerScanner() : iniciarScanner();
}

function iniciarScanner() {
  const btn = document.getElementById('btnScan');
  const st  = document.getElementById('scannerStatus');

  scanner = new Html5Qrcode('qr-reader');
  scanner.start(
    { facingMode: 'environment' },
    { fps: 10, qrbox: { width: 220, height: 220 } },
    onQRLeido,
    () => {}
  ).then(() => {
    scannerOn = true;
    btn.textContent = '⏹ Detener Escáner';
    st.textContent  = 'Activo';
    st.className    = 'scanner-status active';
  }).catch(err => {
    alert('No se pudo acceder a la cámara: ' + err);
  });
}

function detenerScanner() {
  if (!scanner) return;
  scanner.stop().then(() => {
    scanner.clear();
    scanner   = null;
    scannerOn = false;
    document.getElementById('btnScan').textContent = '▶ Iniciar Escáner';
    const st = document.getElementById('scannerStatus');
    st.textContent = 'Inactivo';
    st.className   = 'scanner-status inactive';
  });
}

/* ── QR LEÍDO ── */
async function onQRLeido(texto) {
  if (procesando) return;
  procesando = true;
  detenerScanner();

  // Formato esperado: SERIAL|TOKEN
  const partes = texto.split('|');
  if (partes.length !== 2) {
    mostrarResultado('error', '❌', 'QR Inválido', [{ label: 'Detalle', value: 'Formato no reconocido' }]);
    procesando = false;
    return;
  }

  const [serial, token] = partes;

  try {
    const res  = await fetch(APPS_SCRIPT_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'checkIn', serial, token })
    });
    const data = await res.json();

    if (data.ok) {
      ingresos++;
      document.getElementById('ingresoCount').textContent = ingresos;
      mostrarResultado('success', '✅', '¡ACCESO PERMITIDO!', [
        { label: 'Nombre', value: data.nombre },
        { label: 'Tipo',   value: data.tipo   },
        { label: 'Serial', value: serial       }
      ]);
    } else {
      const iconos = {
        ALREADY_USED:      '🚫',
        SERIAL_NOT_FOUND:  '❌',
        TOKEN_INVALID:     '🔐',
        NOT_CONFIRMED:     '⏳'
      };
      mostrarResultado(
        data.code === 'NOT_CONFIRMED' ? 'warning' : 'error',
        iconos[data.code] || '❌',
        data.code === 'ALREADY_USED' ? 'YA INGRESÓ' : 'ACCESO DENEGADO',
        [{ label: 'Motivo', value: data.msg }]
      );
    }
  } catch {
    mostrarResultado('error', '❌', 'Error de conexión', [{ label: 'Detalle', value: 'Reintenta' }]);
  }

  procesando = false;
}

/* ── UI ── */
function mostrarResultado(tipo, icono, titulo, filas) {
  const box    = document.getElementById('resultBox');
  const detail = document.getElementById('resultDetail');

  document.getElementById('resultIcon').textContent  = icono;
  document.getElementById('resultTitle').textContent = titulo;

  detail.innerHTML = filas.map(f =>
    `<div class="result-row"><span>${f.label}</span><span>${f.value}</span></div>`
  ).join('');

  box.className    = `result-box ${tipo}`;
  box.style.display = 'flex';
  box.scrollIntoView({ behavior: 'smooth' });

  // Vibrar en móvil
  if (navigator.vibrate) {
    navigator.vibrate(tipo === 'success' ? [100, 50, 100] : [300]);
  }
}

function resetResult() {
  const box = document.getElementById('resultBox');
  box.style.display = 'none';
  box.className = 'result-box';
}