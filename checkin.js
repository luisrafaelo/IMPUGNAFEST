'use strict';

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbytYLIyoXGSt1zsXK-l2keFldjv05plIDVbzkn50cNYWFi2diTwziEQ8o3bLTCjdH7l/exec'; 

const PASS            = 'CEIE-BYTE-2026';

let scanner    = null;
let scannerOn  = false;
let ingresos   = 0;
let procesando = false;

/* ── LOGIN ── */
document.getElementById('pinInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') checkLogin();
});

function checkLogin() {
  const val = document.getElementById('pinInput').value;
  if (val === PASS) {
    sessionStorage.setItem('checkin_auth', '1');
    mostrarMain();
  } else {
    const err = document.getElementById('loginError');
    err.style.display = 'block';
    setTimeout(() => err.style.display = 'none', 2500);
  }
}

function mostrarMain() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('mainScreen').style.display  = 'flex';
  cargarIngresos();
}

if (sessionStorage.getItem('checkin_auth') === '1') mostrarMain();

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
    scannerOn       = true;
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
    scanner         = null;
    scannerOn       = false;
    const btn       = document.getElementById('btnScan');
    btn.textContent = '▶ Iniciar Escáner';
    const st        = document.getElementById('scannerStatus');
    st.textContent  = 'Inactivo';
    st.className    = 'scanner-status inactive';
  });
}

/* ── QR LEÍDO ── */
async function onQRLeido(texto) {
  if (procesando) return;
  procesando = true;
  detenerScanner();

  // Formato QR: SERIAL|TOKEN — solo usamos el serial
  const serial = texto.includes('|') ? texto.split('|')[0] : texto.trim().toUpperCase();
  await procesarSerial(serial);
  procesando = false;
}

/* ── MANUAL ── */
async function buscarManual() {
  const input  = document.getElementById('manualSerial');
  const serial = input.value.trim().toUpperCase();

  if (!serial) {
    mostrarResultado('error', '❌', 'Ingresa un serial', []);
    return;
  }

  input.value = '';
  await procesarSerial(serial);
}

/* ── CORE ── */
async function procesarSerial(serial) {
  // Mostrar loading
  mostrarResultado('warning', '⏳', 'VERIFICANDO...', [
    { label: 'Serial', value: serial }
  ]);

  try {
    const res  = await fetch(APPS_SCRIPT_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'checkIn', serial })
    });
    const data = await res.json();

    if (data.ok) {
      ingresos++;
      document.getElementById('ingresoCount').textContent = ingresos;
      mostrarResultado('success', '✅', '¡ACCESO PERMITIDO!', [
        { label: 'Nombre', value: data.nombre },
        { label: 'Tipo',   value: data.tipo   },
        { label: 'Hora',   value: data.hora   },
        { label: 'Serial', value: serial      }
      ]);
    } else {
      const iconos = {
        ALREADY_CHECKIN:  '🚫',
        SERIAL_NOT_FOUND: '❌',
        NOT_CONFIRMED:    '⏳'
      };
      mostrarResultado(
        data.code === 'NOT_CONFIRMED' ? 'warning' : 'error',
        iconos[data.code] || '❌',
        data.code === 'ALREADY_CHECKIN' ? 'YA INGRESÓ' : 'ACCESO DENEGADO',
        [{ label: 'Motivo', value: data.msg }]
      );
    }
  } catch {
    mostrarResultado('error', '❌', 'Error de conexión', [
      { label: 'Detalle', value: 'Reintenta' }
    ]);
  }
}
async function buscarManual() {
  const input  = document.getElementById('manualSerial');
  const serial = input.value.trim().toUpperCase();
  const btn    = document.querySelector('.manual-inner .btn');

  if (!serial) {
    mostrarResultado('error', '❌', 'Ingresa un serial', []);
    return;
  }

  input.value      = '';
  btn.disabled     = true;
  btn.textContent  = '...';

  await procesarSerial(serial);

  btn.disabled    = false;
  btn.textContent = 'Verificar';
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

  box.className     = `result-box ${tipo}`;
  box.style.display = 'flex';
  box.scrollIntoView({ behavior: 'smooth' });

  if (navigator.vibrate)
    navigator.vibrate(tipo === 'success' ? [100, 50, 100] : [300]);
}

function resetResult() {
  const box     = document.getElementById('resultBox');
  box.style.display = 'none';
  box.className = 'result-box';
}
async function cargarIngresos() {
  try {
    const res  = await fetch(`${APPS_SCRIPT_URL}?action=getCheckIns`);
    const data = await res.json();
    if (data.ok) {
      ingresos = data.total;
      document.getElementById('ingresoCount').textContent = ingresos;
    }
  } catch {}
}