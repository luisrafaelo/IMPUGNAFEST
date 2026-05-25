'use strict';
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwZ1FkZLRtFdIsK0eUvJZ_9AdvFoAL-tPWbg24WrBzX6HDXd6u7YClp0u0qzJXC1vW8/exec';
const PASS = 'CEIE-BYTE-2026';

function checkLogin() {
  const val = document.getElementById('pinInput').value;
  const err = document.getElementById('loginError');

  if (val === PASS) {
    sessionStorage.setItem('dash_auth', '1');
    document.getElementById('loginScreen').style.display    = 'none';
    document.getElementById('dashboardScreen').style.display = 'block';
    animateKPIs();
    initTable();
  } else {
    err.style.display = 'block';
    setTimeout(() => { err.style.display = 'none'; }, 3000);
  }
}

function logout() {
  sessionStorage.removeItem('dash_auth');
  document.getElementById('dashboardScreen').style.display = 'none';
  document.getElementById('loginScreen').style.display     = 'flex';
  document.getElementById('pinInput').value = '';
}

/* Enter key en el input */
document.getElementById('pinInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') checkLogin();
});

/* Persistir sesión en la misma pestaña */
if (sessionStorage.getItem('dash_auth') === '1') {
  document.getElementById('loginScreen').style.display    = 'none';
  document.getElementById('dashboardScreen').style.display = 'block';
  animateKPIs();
  initTable();
}

function animateKPIs() {
  document.querySelectorAll('.kpi-value[data-target]').forEach(el => {
    const target = parseInt(el.dataset.target);
    const start  = performance.now();
    const dur    = 1400;
    function step(now) {
      const p = Math.min((now - start) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(e * target).toLocaleString();
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });
}

function initTable() {
  cargarRegistros();

  document.querySelector('.table-search').addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('#recordsTableBody tr').forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });

  document.querySelector('.table-filter-select').addEventListener('change', e => {
    const val = e.target.value.toLowerCase();
    document.querySelectorAll('#recordsTableBody tr').forEach(row => {
      if (val === 'todos') { row.style.display = ''; return; }
      const badge = row.querySelector('.badge-type');
      row.style.display = badge && badge.textContent.toLowerCase().includes(val) ? '' : 'none';
    });
  });
}

function cargarRegistros() {
  const tbody = document.getElementById('recordsTableBody');
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--c-text-3)">Cargando...</td></tr>';

  fetch(APPS_SCRIPT_URL + '?action=getRegistros')
  .then(r => r.json())
  .then(data => {
    if (!data.ok || !data.rows.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--c-text-3)">Sin registros</td></tr>';
      return;
    }
    tbody.innerHTML = data.rows.map(r => {
      const isPending = r.estado === 'PENDIENTE';
      const badgeClass = isPending ? 'badge-pending' : 'badge-confirmed';
      const badgeText  = isPending ? 'Pendiente' : 'Confirmado';
      const tipoClass  = r.tipo === 'Preventa' ? 'badge-preventa' : r.tipo === 'VIP' ? 'badge-vip' : 'badge-general';
      const accionBtn  = isPending
        ? `<button class="btn-aprobar" onclick="aprobarEntrada('${r.serial}', this)">Aprobar</button>`
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
  })
  .catch(() => {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--c-magenta)">Error al cargar</td></tr>';
  });
}
function aprobarEntrada(serial, btn) {
  if (!confirm(`¿Aprobar entrada ${serial}?`)) return;

  btn.disabled = true;
  btn.textContent = '...';

  fetch(APPS_SCRIPT_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'aprobarEntrada', serial })
  })
  .then(r => r.json())
  .then(data => {
    if (data.ok) {
      btn.closest('tr').querySelector('.badge-status').className = 'badge-status badge-confirmed';
      btn.closest('tr').querySelector('.badge-status').textContent = 'Confirmado';
      // Reemplaza btn.remove() por esto:
btn.remove();

// Abrir WhatsApp con mensaje pregenerado
const rowData = btn.closest('tr');
const nombre  = rowData.cells[1].textContent;
const serial  = rowData.cells[0].querySelector('code').textContent;
const tipo    = rowData.cells[2].textContent.trim();
const tel     = prompt(`📱 Teléfono del comprador (con código país, ej: 59170012345):`);

if (tel) {
  const msg = encodeURIComponent(
    `✅ *IMPUGNA FEST 2026*\n\nHola ${nombre}, tu entrada ha sido *CONFIRMADA* 🎉\n\n` +
    `🎫 Tipo: ${tipo}\n🔑 Serial: ${serial}\n\n` +
    `Guarda este mensaje. Lo necesitarás para ingresar al evento.\n📍 Centro Fabril · 29 Mayo · 4:00 PM`
  );
  window.open(`https://wa.me/${tel}?text=${msg}`, '_blank');
}
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