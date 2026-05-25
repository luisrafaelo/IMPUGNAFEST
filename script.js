'use strict';

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbytYLIyoXGSt1zsXK-l2keFldjv05plIDVbzkn50cNYWFi2diTwziEQ8o3bLTCjdH7l/exec';
/* ─── ESTADO GLOBAL ─── */
const STATE = {
  selectedTicketType: null,
  selectedTicketPrice: null,
  currentStep: 1,
  uploadedFileStaff: null,
  uploadedFileOnline: null,
  staffType:           'promo',
};

/* ══════════════════════════════════════════════════════
   NAVBAR — scroll effect
   ══════════════════════════════════════════════════════ */
const navbar = document.getElementById('navbar');

window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

document.getElementById('navBurger').addEventListener('click', () => {
  const menu   = document.getElementById('navMobileMenu');
  const burger = document.getElementById('navBurger');
  const isOpen = menu.classList.toggle('open');
  burger.classList.toggle('active', isOpen);
});

function closeMobileMenu() {
  document.getElementById('navMobileMenu').classList.remove('open');
  document.getElementById('navBurger').classList.remove('active');
}

// Cerrar al hacer scroll
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 20);
  closeMobileMenu();
}, { passive: true });

/* ══════════════════════════════════════════════════════
   COUNTDOWN
   ══════════════════════════════════════════════════════ */
const EVENT_DATE = new Date('2026-05-29T16:00:00-04:00');

function updateCountdown() {
  const now  = new Date();
  const diff = EVENT_DATE - now;

  if (diff <= 0) {
    ['cd-days','cd-hours','cd-mins','cd-secs'].forEach(id => {
      document.getElementById(id).textContent = '00';
    });
    return;
  }

  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins  = Math.floor((diff % 3600000)  / 60000);
  const secs  = Math.floor((diff % 60000)    / 1000);

  document.getElementById('cd-days').textContent  = String(days).padStart(2,'0');
  document.getElementById('cd-hours').textContent = String(hours).padStart(2,'0');
  document.getElementById('cd-mins').textContent  = String(mins).padStart(2,'0');
  document.getElementById('cd-secs').textContent  = String(secs).padStart(2,'0');
}

updateCountdown();
setInterval(updateCountdown, 1000);

/* ══════════════════════════════════════════════════════
   SCROLL HELPER
   ══════════════════════════════════════════════════════ */
function scrollToSection(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const offset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 72;
  window.scrollTo({ top: el.offsetTop - offset, behavior: 'smooth' });
}

/* ══════════════════════════════════════════════════════
   TICKET SELECTION (hero & cards)
   ══════════════════════════════════════════════════════ */
function selectTicket(type, price) {
  STATE.selectedTicketType  = type;
  STATE.selectedTicketPrice = price;

  // Resaltar card seleccionada
  document.querySelectorAll('.ticket-card').forEach(card => {
    card.classList.toggle('ticket-card--selected', card.dataset.type === type);
  });
if (type === 'inner') {
  showToast('info', '🔮 Preferencial — solo por invitación personal.', 4000);
  return;
}
  if (type === 'vip') {
    showToast('info', '👑 Las entradas VIP son solo por invitación directa.', 4000);
    return;
  }

  scrollToSection('registro');
  switchTab('online');
  selectOnlineTicketByType(type);
  showToast('success', `🎫 ${type === 'preventa' ? 'Preventa' : 'General'} seleccionada — completa tu compra`, 3000);
}

/* ══════════════════════════════════════════════════════
   TABS REGISTRO
   ══════════════════════════════════════════════════════ */
function switchTab(tab) {
  document.querySelectorAll('.reg-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tab);
  });
  document.querySelectorAll('.reg-panel').forEach(p => {
    p.classList.toggle('active', p.id === `panel-${tab}`);
  });

  // Al activar el panel online, asegurar que el step actual esté visible
  if (tab === 'online') {
    document.querySelectorAll('.online-step').forEach(s => s.classList.remove('active'));
    const stepEl = document.getElementById(`step-${STATE.currentStep}`);
    if (stepEl) stepEl.classList.add('active');
    updateStepIndicators(STATE.currentStep);
  }
}

/* ══════════════════════════════════════════════════════
   FORMULARIO STAFF — Validación y submit
   ══════════════════════════════════════════════════════ */
async function submitStaffForm(e) {
  e.preventDefault();

  const nombre    = document.getElementById('staffName').value.trim();
  const telefono  = document.getElementById('staffPhone').value.trim();
  const serial    = document.getElementById('staffSerial').value.trim().toUpperCase();
  const staffCode = document.getElementById('staffCode').value.trim().toUpperCase();
  const file      = document.getElementById('staffFile').files[0];

  if (!nombre || !telefono || !serial || !staffCode) {
    showValidationResult('staffResult', 'error', '⚠️ Todos los campos son obligatorios.');
    return;
  }
  if (!staffCode.startsWith('STAFF-')) {
    showValidationResult('staffResult', 'warning', '⚠️ Formato incorrecto. Ej: STAFF-001');
    return;
  }
  if (!file) {
    showValidationResult('staffResult', 'warning', '📎 Debes subir el comprobante.');
    return;
  }

  showLoader(true);
  const b64 = await fileToBase64(file);

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'validarStaff',
        nombre, telefono, serial, staffCode,
        tipoEntrada: STATE.staffType,
        comprobanteB64: b64.split(',')[1],
        fileName: file.name
      })
    });

    const data = await res.json();
    showLoader(false);
    const tipo = data.ok ? 'success' : (data.code === 'PENDING' ? 'warning' : 'error');
    showValidationResult('staffResult', tipo, data.msg);

  } catch (err) {
    showLoader(false);
    showValidationResult('staffResult', 'error', '❌ Error de conexión. Intenta de nuevo.');
  }
}

// Utilidad base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ══════════════════════════════════════════════════════
   FLUJO ONLINE — Steps
   ══════════════════════════════════════════════════════ */
function selectOnlineTicket(el) {
  document.querySelectorAll('.online-ticket').forEach(t => t.classList.remove('selected'));
  el.classList.add('selected');

  const type  = el.dataset.type;
  const price = el.dataset.price;

  STATE.selectedTicketType  = type;
  STATE.selectedTicketPrice = parseInt(price);

  updateOnlineSummary();
}

function selectOnlineTicketByType(type) {
  const el = document.querySelector(`.online-ticket[data-type="${type}"]`);
  if (el) selectOnlineTicket(el);
}

function updateOnlineSummary() {
  if (!STATE.selectedTicketType) return;
  const isPromo = STATE.selectedTicketType === 'preventa';
  const label   = isPromo ? 'Promo 2x25 — 25 Bs.' : 'General — 15 Bs.';
  document.getElementById('summaryText').textContent = `Tipo seleccionado: ${label}`;

  const payment = document.getElementById('paymentAmount');
  const pType   = document.getElementById('paymentType');
  if (payment) payment.textContent = `${STATE.selectedTicketPrice} Bs.`;
  if (pType)   pType.textContent   = isPromo ? 'Promo 2x25' : 'General';

  // Mostrar/ocultar campos persona 2
  const row2 = document.getElementById('rowPersona2');
  if (row2) {
    row2.style.display = isPromo ? '' : 'none';
    document.getElementById('onlineName2').required  = isPromo;
    document.getElementById('onlinePhone2').required = isPromo;
  }
}

function goToStep(step) {
  /* Validar paso 1 */
  if (step === 2 && !STATE.selectedTicketType) {
    showToast('error', '⚠️ Selecciona un tipo de entrada primero.', 3000);
    return;
  }

  /* Validar paso 2 */
if (step === 3) {
    const name  = document.getElementById('onlineName').value.trim();
    const phone = document.getElementById('onlinePhone').value.trim();
    const isPromo = STATE.selectedTicketType === 'preventa';

    if (!name || !phone) {
      showToast('error', '⚠️ Completa todos los campos.', 3000);
      return;
    }
    if (isPromo) {
      const name2  = document.getElementById('onlineName2').value.trim();
      const phone2 = document.getElementById('onlinePhone2').value.trim();
      if (!name2 || !phone2) {
        showToast('error', '⚠️ Completa los datos de la persona 2.', 3000);
        return;
      }
    }
    updateOnlineSummary();
    document.getElementById('paymentAmount').textContent = `${STATE.selectedTicketPrice} Bs.`;
    document.getElementById('qrImagen').src = STATE.selectedTicketType === 'preventa' ? 'qr-promo.png' : 'qr-general.png';
  }

  /* Mostrar el paso */
  document.querySelectorAll('.online-step').forEach(s => s.classList.remove('active'));
  document.getElementById(`step-${step}`).classList.add('active');
  STATE.currentStep = step;

  /* Actualizar step indicators */
  updateStepIndicators(step);
}

function updateStepIndicators(activeStep) {
  const panel = document.getElementById('panel-online');
  const dots  = panel.querySelectorAll('.step-dot');
  const labels = panel.querySelectorAll('.step-label');

  dots.forEach((dot, i) => {
    dot.classList.remove('active', 'done');
    if (i + 1 < activeStep) dot.classList.add('done');
    else if (i + 1 === activeStep) dot.classList.add('active');
  });

  labels.forEach((label, i) => {
    label.classList.toggle('active', i + 1 === activeStep);
  });
}

async function processOnlinePayment() {
  const file = document.getElementById('onlineFile').files[0];
  if (!file) {
    showToast('error', '📎 Debes subir el comprobante de pago.', 3000);
    return;
  }

  showLoader(true);
  const b64      = await fileToBase64(file);
  const isPromo  = STATE.selectedTicketType === 'preventa';
  const nombre1  = document.getElementById('onlineName').value.trim();
  const telefono1= document.getElementById('onlinePhone').value.trim();
  const nombre2  = isPromo ? document.getElementById('onlineName2').value.trim()  : '';
  const telefono2= isPromo ? document.getElementById('onlinePhone2').value.trim() : '';

  try {
    const res  = await fetch(APPS_SCRIPT_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action:         'compraOnline',
        nombre:         nombre1,
        telefono:       telefono1,
        nombre2,
        telefono2,
        tipo:           STATE.selectedTicketType,
        comprobanteB64: b64.split(',')[1],
        fileName:       file.name
      })
    });

    const data = await res.json();
    showLoader(false);

    if (!data.ok) {
      showToast('error', '❌ Error al procesar. Intenta de nuevo.', 4000);
      return;
    }

    // Ticket 1
    document.getElementById('tgName').textContent   = nombre1;
    document.getElementById('tgType').textContent   = data.tipo;
    document.getElementById('tgSerial').textContent = data.serial;
    document.getElementById('tgToken').textContent  = data.token;

    const qr1 = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(data.serial + '|' + data.token)}`;
    const area1 = document.getElementById('qrArea1');
    const mockEl1 = area1.querySelector('.qr-mock--small');
    if (mockEl1) mockEl1.style.display = 'none';
    const oldImg1 = area1.querySelector('img');
    if (oldImg1) oldImg1.remove();
    area1.insertAdjacentHTML('beforeend', `<img src="${qr1}" style="width:100px;border-radius:8px;" />`);

    // Ticket 2 (solo promo)
    const ticket2 = document.getElementById('tgTicket2');
    if (isPromo && data.serial2) {
      ticket2.style.display = '';
      document.getElementById('tgName2').textContent   = nombre2;
      document.getElementById('tgType2').textContent   = data.tipo;
      document.getElementById('tgSerial2').textContent = data.serial2;
      document.getElementById('tgToken2').textContent  = data.token2;

      const qr2 = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(data.serial2 + '|' + data.token2)}`;
      const area2 = document.getElementById('qrArea2');
      const mockEl2 = area2.querySelector('.qr-mock--small');
      if (mockEl2) mockEl2.style.display = 'none';
      const oldImg2 = area2.querySelector('img');
      if (oldImg2) oldImg2.remove();
      area2.insertAdjacentHTML('beforeend', `<img src="${qr2}" style="width:100px;border-radius:8px;" />`);
    } else {
      ticket2.style.display = 'none';
    }

    const warning = document.querySelector('.tg-warning p');
    if (warning) warning.textContent = '⏳ Tu entrada está PENDIENTE de aprobación. Recibirás confirmación pronto. Guarda tu serial y token.';

    goToStep(4);
    showToast('info', '⏳ Compra recibida — pendiente de aprobación.', 6000);
  } catch (err) {
    showLoader(false);
    showToast('error', '❌ Error de conexión. Intenta de nuevo.', 4000);
  }
}

/* ══════════════════════════════════════════════════════
   GENERACIÓN DE SERIAL Y TOKEN
   ══════════════════════════════════════════════════════ */

/**
 * Genera un serial único no predecible.
 * Formato: NX-YYYY-XXXXXXXX (alfanumérico aleatorio)
 * En FASE 4 esto será generado y validado en el backend.
 */
function generateSerial() {
  const year    = new Date().getFullYear();
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sin O, 0, I, 1 — evita confusión visual
  let   random  = '';

  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  arr.forEach(b => { random += charset[b % charset.length]; });

  return `NX-${year}-${random}`;
}

/**
 * Genera un token secreto aleatorio de 8 caracteres.
 * Combinado con el serial forma la doble autenticación.
 */
function generateToken() {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let   token   = '';

  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  arr.forEach(b => { token += charset[b % charset.length]; });

  return token;
}

/* ══════════════════════════════════════════════════════
   FILE UPLOAD
   ══════════════════════════════════════════════════════ */
function handleFileSelect(event, uploadAreaId) {
  const file = event.target.files[0];
  const area = document.getElementById(uploadAreaId);
  if (!file) return;

  const MAX_MB = 5;
  if (file.size > MAX_MB * 1024 * 1024) {
    showToast('error', `❌ Archivo muy grande. Máximo ${MAX_MB}MB.`, 3000);
    event.target.value = '';
    return;
  }

  area.classList.add('has-file');
  area.querySelector('.file-upload-icon').textContent = '✅';
  area.querySelector('.file-upload-text').textContent = file.name;
  area.querySelector('.file-upload-hint').textContent = `${(file.size / 1024).toFixed(1)} KB`;

  if (uploadAreaId === 'staffFileUpload')  STATE.uploadedFileStaff  = file;
  if (uploadAreaId === 'onlineFileUpload') STATE.uploadedFileOnline = file;
}

/* ══════════════════════════════════════════════════════
   TOAST NOTIFICATIONS
   ══════════════════════════════════════════════════════ */
const TOAST_ICONS = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

function showToast(type, message, duration = 4000) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${TOAST_ICONS[type] || '💬'}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideInRight 0.3s ease reverse both';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/* ══════════════════════════════════════════════════════
   VALIDATION RESULT DISPLAY
   ══════════════════════════════════════════════════════ */
function showValidationResult(elementId, type, message) {
  const el = document.getElementById(elementId);
  if (!el) return;

  el.className = `validation-result ${type}`;
  el.innerHTML = `<span>${message}</span>`;
  el.style.display = 'flex';
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* ══════════════════════════════════════════════════════
   LOADER
   ══════════════════════════════════════════════════════ */
function showLoader(visible) {
  document.getElementById('globalLoader').classList.toggle('active', visible);
}

/* ══════════════════════════════════════════════════════
   UTILS
   ══════════════════════════════════════════════════════ */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* ══════════════════════════════════════════════════════
   TABLA DE REGISTROS — Filtro de búsqueda
   ══════════════════════════════════════════════════════ */
const tableSearch = document.querySelector('.table-search');
if (tableSearch) {
  tableSearch.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    document.querySelectorAll('#recordsTableBody tr').forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(query) ? '' : 'none';
    });
  });
}

const tableFilter = document.querySelector('.table-filter-select');
if (tableFilter) {
  tableFilter.addEventListener('change', (e) => {
    const val = e.target.value.toLowerCase();
    document.querySelectorAll('#recordsTableBody tr').forEach(row => {
      if (val === 'todos') { row.style.display = ''; return; }
      const typeCell = row.querySelector('.badge-type');
      if (!typeCell) return;
      row.style.display = typeCell.textContent.toLowerCase().includes(val) ? '' : 'none';
    });
  });
}

/* ══════════════════════════════════════════════════════
   INIT
   ══════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  /* Activar el primer step del panel online */
  updateStepIndicators(1);

  /* Animar cards con IntersectionObserver */
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }, i * 100);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.ticket-card, .kpi-card, .dash-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
  });

  console.log('%c⬡ NEXUS EVENT — FASE 1 cargada correctamente', 'color: #00dcff; font-family: monospace; font-size: 14px;');
  console.log('%c🔐 Serial de demo: NX-2025-DEMO01 | Token: ABC12345', 'color: #00ff88; font-family: monospace;');
  console.log('%c📌 FASE 2: Conectar Google Apps Script', 'color: #888; font-family: monospace;');
});
async function verificarEntrada() {
  const serial = document.getElementById('verSerial').value.trim().toUpperCase();
  const token  = document.getElementById('verToken').value.trim().toUpperCase();

  if (!serial || !token) {
    showValidationResult('verResult', 'error', '⚠️ Ingresa tu serial y token.');
    return;
  }

  showLoader(true);

  try {
    const res  = await fetch(`${APPS_SCRIPT_URL}?action=verificar&serial=${serial}&token=${token}`);
    const data = await res.json();
    showLoader(false);

    if (!data.ok) {
      showValidationResult('verResult', 'error', `❌ ${data.msg}`);
      return;
    }

    const icons = { CONFIRMADO: '✅', PENDIENTE: '⏳', ACTIVO: '✅' };
    const icon  = icons[data.estado] || 'ℹ️';
    showValidationResult('verResult', data.estado === 'PENDIENTE' ? 'warning' : 'success',
      `${icon} <strong>${data.nombre}</strong> · Tipo: ${data.tipo} · Estado: <strong>${data.estado}</strong>`);

  } catch {
    showLoader(false);
    showValidationResult('verResult', 'error', '❌ Error de conexión.');
  }
}
function resetOnlineFlow() {
  document.getElementById('formOnline').reset();
  document.getElementById('onlineFile').value = '';

  const area = document.getElementById('onlineFileUpload');
  area.classList.remove('has-file');
  area.querySelector('.file-upload-icon').textContent = '📎';
  area.querySelector('.file-upload-text').textContent = 'Subir comprobante';
  area.querySelector('.file-upload-hint').textContent = 'PNG, JPG, PDF · Max 5MB';

  document.querySelectorAll('.online-ticket').forEach(t => t.classList.remove('selected'));
  STATE.selectedTicketType  = null;
  STATE.selectedTicketPrice = null;

  // Reset QR ticket 1
  const area1 = document.getElementById('qrArea1');
  const mock1 = area1.querySelector('.qr-mock--small');
  if (mock1) mock1.style.display = '';
  const img1 = area1.querySelector('img');
  if (img1) img1.remove();

  // Reset QR ticket 2
  const area2 = document.getElementById('qrArea2');
  const mock2 = area2.querySelector('.qr-mock--small');
  if (mock2) mock2.style.display = '';
  const img2 = area2.querySelector('img');
  if (img2) img2.remove();

  document.getElementById('tgTicket2').style.display = 'none';
  document.getElementById('rowPersona2').style.display = 'none';
}
const STAFF_TYPE_DESC = {
  promo:        '2 entradas por 25 Bs. — registra cada serial por separado.',
  general:      'Entrada individual — 15 Bs.',
  preferencial: 'Entrada de invitado — acceso preferencial sin costo.'
};

function selectStaffType(btn) {
  document.querySelectorAll('.stt-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  STATE.staffType = btn.dataset.stype;
  document.getElementById('staffTypeDesc').textContent = STAFF_TYPE_DESC[STATE.staffType];
}