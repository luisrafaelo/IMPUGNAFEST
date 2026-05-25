'use strict';
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx-2X6XdfW4ExNLt9v2pmB-f-N6xBQMe6ctGiT0SK7JRVnutS2J2Pl5kVrciZp6OuPR/exec';
const PASS = 'CEIE-BYTE-2026';
const TOTAL_ENTRADAS = 700;

const STAFF_NOMBRES = {
  'STAFF-JAN': 'Jandrito',
  'STAFF-CRI': 'Cristian',
  'STAFF-NAT': 'Natalia',
  'STAFF-MAR': 'Mariela',
  'STAFF-CAR': 'Carlos',
  'STAFF-FLA': 'Flavia',
  'STAFF-BLE': 'Bleymar',
  'STAFF-MIC': 'Micaela',
  'STAFF-MRV': 'Marvin',
  'STAFF-ABE': 'Abel',
  'STAFF-PAU': 'Paul',
  'STAFF-JAZ': 'Jazmín',
  'STAFF-ITA': 'Itamar',
  'STAFF-CRL': 'Carla',
  'STAFF-CRT': 'Cortesías',
  'STAFF-RAF': 'Rafael',
  'ONLINE':    'Online',
};
const STATE_DASH = { ticket: null };

function imprimirTicketStaff() {
  const t = STATE_DASH.ticket;
  if (!t) return;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=108x108&data=${encodeURIComponent(t.serial + '|' + t.token)}`;
  descargarTicketPDF(t.nombre, t.serial, t.token, qrUrl, t.tipo, 'ENTRADA FÍSICA');
}
/* ── LOGIN ── */
function checkLogin() {
  const val = document.getElementById('pinInput').value;
  const err = document.getElementById('loginError');
  if (val === PASS) {
    sessionStorage.setItem('dash_auth', '1');
    mostrarDashboard();
  } else {
    err.style.display = 'block';
    setTimeout(() => err.style.display = 'none', 3000);
  }
}

function logout() {
  sessionStorage.removeItem('dash_auth');
  document.getElementById('dashboardScreen').style.display = 'none';
  document.getElementById('loginScreen').style.display     = 'flex';
  document.getElementById('pinInput').value = '';
}

function mostrarDashboard() {
  document.getElementById('loginScreen').style.display     = 'none';
  document.getElementById('dashboardScreen').style.display = 'block';
  cargarTodo();
}

document.getElementById('pinInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') checkLogin();
});

if (sessionStorage.getItem('dash_auth') === '1') mostrarDashboard();

/* ── CARGA ÚNICA ── */
let filtrosIniciados = false;

function cargarTodo() {
  ['kpi-vendidas','kpi-disponibles','kpi-ingresos','kpi-validacion'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '—';
  });

  const tbody = document.getElementById('recordsTableBody');
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--c-text-3)">Cargando...</td></tr>';

  fetch(APPS_SCRIPT_URL + '?action=getTodo')
  .then(r => r.json())
  .then(d => {
    if (!d.ok) return;

    animarNumero('kpi-vendidas',    d.vendidas);
    animarNumero('kpi-disponibles', TOTAL_ENTRADAS - d.vendidas);
    animarNumero('kpi-ingresos',    d.ingresos);
    animarNumero('kpi-validacion',  d.tasaValidacion);
    renderStaff(d.staff);
    renderDist(d.dist);

    if (!d.rows.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--c-text-3)">Sin registros</td></tr>';
    } else {
      tbody.innerHTML = d.rows.map(r => {
        const isPending  = r.estado === 'PENDIENTE';
        const badgeClass = isPending ? 'badge-pending' : 'badge-confirmed';
        const badgeText  = isPending ? 'Pendiente' : 'Confirmado';
        const tipoClass = r.tipo === 'Preventa'     ? 'badge-preventa'
                        : r.tipo === 'Promo'        ? 'badge-preventa'
                        : r.tipo === 'VIP'          ? 'badge-vip'
                        : r.tipo === 'Preferencial' ? 'badge-preferencial'
                        : 'badge-general';
        const accionBtn = isPending
          ? `<button class="btn-aprobar" onclick="aprobarEntrada('${r.serial}','${r.telefono}','${r.nombre}','${r.tipo}',this)">Aprobar</button>
            <button class="btn-rechazar" onclick="rechazarEntrada('${r.serial}',this)" style="margin-left:6px">Rechazar</button>`
          : '—';
        return `<tr>
          <td><code>${r.serial}</code></td>
          <td>${r.nombre}</td>
          <td><span class="badge-type ${tipoClass}">${r.tipo}</span></td>
          <td>${r.staff}</td>
          <td><span class="badge-status ${badgeClass}">${badgeText}</span></td>
          <td>${r.fecha}</td>
          <td>${accionBtn}</td>
        </tr>`;
      }).join('');
    }

    // Iniciar filtros solo la primera vez
    if (!filtrosIniciados) {
      initFiltros();
      filtrosIniciados = true;
    }
  })
  .catch(() => {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--c-magenta)">Error al cargar</td></tr>';
  });
}

function initFiltros() {
  const search = document.querySelector('.table-search');
  const filter = document.querySelector('.table-filter-select');

  if (search) search.addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('#recordsTableBody tr').forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });

  if (filter) filter.addEventListener('change', e => {
    const val = e.target.value.toLowerCase();
    document.querySelectorAll('#recordsTableBody tr').forEach(row => {
      if (val === 'todos') { row.style.display = ''; return; }
      const badge = row.querySelector('.badge-type');
      row.style.display = badge && badge.textContent.toLowerCase().includes(val) ? '' : 'none';
    });
  });
}

/* ── KPIs ── */
function animarNumero(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const dur = 1400, start = performance.now();
  function step(now) {
    const p = Math.min((now - start) / dur, 1);
    el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * target).toLocaleString();
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function renderStaff(staff) {
  const el = document.getElementById('staffRanking');
  if (!el || !staff?.length) { if(el) el.innerHTML = '<p style="color:var(--c-text-3);font-size:0.8rem;padding:8px">Sin ventas registradas aún</p>'; return; }
  const max = staff[0].ventas || 1;
  const medals = ['staff-item--1','staff-item--2','staff-item--3'];
  el.innerHTML = staff.map((s, i) => `
    <div class="staff-item ${medals[i] || ''}">
      <div class="staff-rank">${i + 1}</div>
      <div class="staff-info">
        <span class="staff-name">${STAFF_NOMBRES[s.code] || s.code}</span>
        <span class="staff-code">${s.code}</span>
      </div>
      <div class="staff-sales">
        <div class="staff-bar-wrap">
          <div class="staff-bar" style="width:${Math.round(s.ventas/max*100)}%"></div>
        </div>
        <span class="staff-count">${s.ventas} ventas</span>
      </div>
    </div>`).join('');
}

function renderDist(dist) {
  if (!dist) return;
  const total = (dist.preventa || 0) + (dist.promo || 0) + (dist.general || 0) + (dist.preferencial || 0) + (dist.vip || 0) || 1;
  const max   = Math.max(dist.preventa || 0, dist.promo || 0, dist.general || 0, dist.preferencial || 0, dist.vip || 0, 1);

  [
    { id: 'dist-preventa',    count: dist.preventa    || 0 },
    { id: 'dist-promo',       count: dist.promo       || 0 },
    { id: 'dist-general',     count: dist.general     || 0 },
    { id: 'dist-preferencial',count: dist.preferencial || 0 },
    { id: 'dist-vip',         count: dist.vip         || 0 },
  ].forEach(item => {
    const wrap = document.getElementById(item.id);
    if (!wrap) return;
    wrap.querySelector('.dist-bar').style.height  = Math.round(item.count / max * 100) + '%';
    wrap.querySelector('.dist-count').textContent = item.count;
    wrap.querySelector('.dist-pct').textContent   = Math.round(item.count / total * 100) + '%';
  });
}

/* ── APROBAR ── */
function aprobarEntrada(serial, telefono, nombre, tipo, btn) {
  if (!confirm(`¿Aprobar entrada ${serial}?`)) return;
  btn.disabled = true;
  btn.textContent = '...';

  fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'aprobarEntrada', serial })
  })
  .then(r => r.json())
  .then(data => {
    if (data.ok) {
      const tr = btn.closest('tr');
      tr.querySelector('.badge-status').className   = 'badge-status badge-confirmed';
      tr.querySelector('.badge-status').textContent = 'Confirmado';
      tr.cells[6].innerHTML = '—';

      const tel = prompt('📱 Teléfono (ej: 70012345):');
      if (tel) {
        const msg =
          `✅ *IMPUGNA FEST 2026*\n\n` +
          `Hola ${nombre}, tu entrada ha sido *CONFIRMADA* 🎉\n\n` +
          `🎫 Tipo: ${tipo}\n🔑 Serial: ${serial}\n\n` +
          `Guarda este mensaje. Lo necesitarás para ingresar.\n` +
          `📍 Centro Fabril · 29 Mayo · 4:00 PM`;
        window.open(`https://wa.me/591${tel}?text=${encodeURIComponent(msg)}`, '_blank');
        navigator.clipboard.writeText(msg).catch(() => {});
      }
      cargarTodo();
    } else {
      alert(data.msg);
      btn.disabled = false;
      btn.textContent = 'Aprobar';
    }
  })
  .catch(() => {
    alert('Error de conexión');
    btn.disabled = false;
    btn.textContent = 'Aprobar';
  });
}

/* ── MODAL STAFF ── */
function abrirModalStaff() {
  document.getElementById('modalStaff').style.display = 'flex';
  document.getElementById('formStaffDash').reset();
  document.getElementById('staffDashResult').style.display = 'none';
  const btn = document.querySelector('#formStaffDash button[type="submit"]');
  btn.disabled    = false;
  btn.textContent = 'Validar y Registrar';
}

function cerrarModalStaff() {
  document.getElementById('modalStaff').style.display = 'none';
  document.getElementById('formStaffDash').reset();
  document.getElementById('staffDashResult').style.display = 'none';
  const btn = document.querySelector('#formStaffDash button[type="submit"]');
  btn.disabled    = false;
  btn.textContent = 'Validar y Registrar';
  document.getElementById('btnImprimirStaff').style.display = 'none';
STATE_DASH.ticket = null;
}

async function registrarStaffDash(e) {
  e.preventDefault();
  const serial    = document.getElementById('sdSerial').value.trim().toUpperCase();
  const nombre    = document.getElementById('sdNombre').value.trim();
  const telefono  = document.getElementById('sdTelefono').value.trim();
  const staffCode   = document.getElementById('sdStaff').value.trim().toUpperCase();
  const tipoEntrada = document.getElementById('sdTipo').value;
  const res       = document.getElementById('staffDashResult');
  res.style.display = 'none';
  const submitBtn = document.querySelector('#formStaffDash button[type="submit"]');
submitBtn.disabled    = true;
submitBtn.textContent = 'Validando...';

  try {
    const r = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
body: JSON.stringify({
  action: 'validarStaff',
  nombre, telefono, serial, staffCode,
  tipoEntrada,
  comprobanteB64: '', fileName: 'dash-manual'
})
    });
    const data = await r.json();
    res.style.display = 'flex';
    res.className     = `staffdash-result ${data.ok ? 'success' : data.code === 'PENDING' ? 'warning' : 'error'}`;
    res.textContent   = data.msg;
    if (data.ok) {
  cargarTodo();
  // Generar ticket visual
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=108x108&data=${encodeURIComponent(serial + '|' + (data.token || ''))}`;
  descargarTicketPDF(nombre, serial, data.token || '—', qrUrl, data.tipo || tipoEntrada, 'ENTRADA FÍSICA');
  setTimeout(cerrarModalStaff, 2500);
}
  } catch {
    res.style.display = 'flex';
    res.className     = 'staffdash-result error';
    res.textContent   = '❌ Error de conexión.';
  } finally {
    const btn = document.querySelector('#formStaffDash button[type="submit"]');
    if (!document.getElementById('staffDashResult').classList.contains('success')) {
      btn.disabled    = false;
      btn.textContent = 'Validar y Registrar';
    }
  }
}
let invTipoSeleccionado = 'vip';

function selectInvTipo(tipo) {
  invTipoSeleccionado = tipo;
  document.getElementById('inv-opt-vip').classList.toggle('active', tipo === 'vip');
  document.getElementById('inv-opt-preferencial').classList.toggle('active', tipo === 'preferencial');
}

function abrirModalInvitado() {
  document.getElementById('modalInvitado').style.display = 'flex';
  document.getElementById('formInvitado').reset();
  document.getElementById('invResult').style.display = 'none';
  const btn = document.querySelector('#formInvitado button[type="submit"]');
  btn.disabled    = false;
  btn.textContent = 'Registrar Invitado';
  invTipoSeleccionado = 'vip';
  selectInvTipo('vip');
}

function cerrarModalInvitado() {
  document.getElementById('modalInvitado').style.display = 'none';
  document.getElementById('formInvitado').reset();
  document.getElementById('invResult').style.display = 'none';
  const btn = document.querySelector('#formInvitado button[type="submit"]');
  btn.disabled    = false;
  btn.textContent = 'Registrar Invitado';
}

async function registrarInvitado(e) {
  e.preventDefault();

  const nombre      = document.getElementById('invNombre').value.trim();
  const telefono    = document.getElementById('invTelefono').value.trim();
  const invitadoPor = document.getElementById('invInvitadoPor').value.trim();
  const res         = document.getElementById('invResult');
  const submitBtn   = document.querySelector('#formInvitado button[type="submit"]');

  // Confirmación antes de enviar
  if (!confirm(`¿Registrar a ${nombre} como ${invTipoSeleccionado === 'vip' ? 'VIP' : 'Preferencial'}?`)) return;

  // Bloquear botón
  submitBtn.disabled    = true;
  submitBtn.textContent = 'Registrando...';
  res.style.display     = 'none';

  try {
    const r    = await fetch(APPS_SCRIPT_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'registrarInvitado',
        nombre, telefono, invitadoPor,
        tipo: invTipoSeleccionado
      })
    });
    const data = await r.json();

    res.style.display = 'flex';
    res.className     = `staffdash-result ${data.ok ? 'success' : 'error'}`;
    res.textContent   = data.ok
      ? `✅ ${data.nombre} registrado como ${data.tipo} · Serial: ${data.serial}`
      : `❌ ${data.msg}`;

    if (data.ok) {
  cargarTodo();
  STATE_DASH.ticket = { nombre, serial, token: data.token || '—', tipo: data.tipo || tipoEntrada };
  document.getElementById('btnImprimirStaff').style.display = 'block';
}else {
      // Reactivar si hay error
      submitBtn.disabled    = false;
      submitBtn.textContent = 'Registrar Invitado';
    }
  } catch {
    res.style.display     = 'flex';
    res.className         = 'staffdash-result error';
    res.textContent       = '❌ Error de conexión.';
    submitBtn.disabled    = false;
    submitBtn.textContent = 'Registrar Invitado';
  }
}
function rechazarEntrada(serial, btn) {
  if (!confirm(`¿Rechazar y liberar la entrada ${serial}? Esto la dejará disponible nuevamente.`)) return;
  btn.disabled = true;
  const siblingAprobar = btn.previousElementSibling;
  if (siblingAprobar) siblingAprobar.disabled = true;

  fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'rechazarEntrada', serial })
  })
  .then(r => r.json())
  .then(data => {
    if (data.ok) {
      cargarTodo();
    } else {
      alert(data.msg);
      btn.disabled = false;
      if (siblingAprobar) siblingAprobar.disabled = false;
    }
  })
  .catch(() => {
    alert('Error de conexión');
    btn.disabled = false;
    if (siblingAprobar) siblingAprobar.disabled = false;
  });
}
function descargarTicketPDF(nombre, serial, token, qrUrl, tipo, persona) {
  const w = 400, h = 220;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');

  // Fondo oscuro
  ctx.fillStyle = '#0d1526';
  ctx.fillRect(0, 0, w, h);

  // Borde naranja
  ctx.strokeStyle = '#ff6a00';
  ctx.lineWidth = 2;
  ctx.strokeRect(4, 4, w - 8, h - 8);

  // Línea perforada vertical
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = 'rgba(255,106,0,0.4)';
  ctx.beginPath();
  ctx.moveTo(w - 130, 4);
  ctx.lineTo(w - 130, h - 4);
  ctx.stroke();
  ctx.setLineDash([]);

  // Semicírculos perforados
  ctx.fillStyle = '#050810';
  ctx.beginPath(); ctx.arc(w - 130, 0,   10, 0, Math.PI); ctx.fill();
  ctx.beginPath(); ctx.arc(w - 130, h,   10, Math.PI, 0); ctx.fill();

  // Título evento
  ctx.fillStyle = '#ff6a00';
  ctx.font = 'bold 11px monospace';
  ctx.fillText('IMPUGNA FEST 2026', 16, 28);

  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '9px monospace';
  ctx.fillText('29 MAYO · SALÓN FABRIL · LA PAZ', 16, 42);

  // Separador
  ctx.strokeStyle = 'rgba(255,106,0,0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(16, 50); ctx.lineTo(w - 140, 50); ctx.stroke();

  // Nombre
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '8px monospace';
  ctx.fillText('TITULAR', 16, 66);
  ctx.fillStyle = '#f5ede8';
  ctx.font = 'bold 12px monospace';
  ctx.fillText(nombre.toUpperCase().substring(0, 22), 16, 80);

  // Tipo
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '8px monospace';
  ctx.fillText('TIPO', 16, 100);
  ctx.fillStyle = '#ff6a00';
  ctx.font = 'bold 11px monospace';
  ctx.fillText(tipo.toUpperCase(), 16, 114);

  // Serial
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '8px monospace';
  ctx.fillText('SERIAL', 16, 134);
  ctx.fillStyle = '#00dcff';
  ctx.font = 'bold 11px monospace';
  ctx.fillText(serial, 16, 148);

  // Token
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '8px monospace';
  ctx.fillText('TOKEN SECRETO', 16, 168);
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 13px monospace';
  ctx.fillText(token, 16, 184);

  // Persona label
  ctx.fillStyle = 'rgba(255,106,0,0.6)';
  ctx.font = '8px monospace';
  ctx.fillText(persona, 16, 208);

  // QR
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    ctx.drawImage(img, w - 122, 14, 108, 108);

    // Label QR
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('QR DE ACCESO', w - 68, 136);
    ctx.fillText('NO COMPARTIR', w - 68, 147);
    ctx.textAlign = 'left';

    // Descargar
    const link = document.createElement('a');
    link.download = `ticket-${serial}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };
  img.onerror = () => {
    // Si falla el QR, descarga sin él
    const link = document.createElement('a');
    link.download = `ticket-${serial}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };
  img.src = qrUrl || `https://api.qrserver.com/v1/create-qr-code/?size=108x108&data=${encodeURIComponent(serial + '|' + token)}`;
}