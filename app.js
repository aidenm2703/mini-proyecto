/* ================================================================
   SISTEMA ADMINISTRATIVO - LÓGICA PRINCIPAL
   Este archivo conecta la interfaz con sus acciones: acceso, menú,
   registros CRUD, búsquedas, sonidos y notificaciones.
   ================================================================ */

// Espera a que todo el HTML exista antes de buscar elementos por su id.
document.addEventListener('DOMContentLoaded', () => {
  // ----- Datos y estado general de la aplicación -----
  const users = {
    admin: { password: 'admin123', name: 'Administrador', role: 'Admin' },
    usuario1: { password: 'pass123', name: 'Usuario 1', role: 'Usuario' }
  };
  let failedAttempts = 0;
  let currentUser = null;
  let pendingDelete = null;
  let audioContext;

  // Cada configuración evita repetir el mismo código para los tres módulos CRUD.
  const modules = {
    clientes: { singular: 'cliente', form: 'clienteForm', panel: 'formClientes', title: 'formClientesTitle', id: 'clienteId', body: 'tbodyClientes', count: 'countClientes', search: 'searchClientes', fields: ['Nombre', 'Cedula', 'Email', 'Telefono', 'Direccion', 'Estado'], labels: ['Nombre', 'Cédula', 'Email', 'Teléfono', 'Estado'], status: 'Estado', lowStock: false },
    productos: { singular: 'producto', form: 'productoForm', panel: 'formProductos', title: 'formProductosTitle', id: 'productoId', body: 'tbodyProductos', count: 'countProductos', search: 'searchProductos', fields: ['Nombre', 'Codigo', 'Categoria', 'Precio', 'Stock', 'Estado', 'Descripcion'], labels: ['Nombre', 'Código', 'Categoría', 'Precio', 'Stock', 'Estado'], status: 'Estado', lowStock: true },
    proveedores: { singular: 'proveedor', form: 'proveedorForm', panel: 'formProveedores', title: 'formProveedoresTitle', id: 'proveedorId', body: 'tbodyProveedores', count: 'countProveedores', search: 'searchProveedores', fields: ['Nombre', 'Cedula', 'Telefono', 'Email', 'Direccion', 'Categoria', 'Estado', 'Contacto'], labels: ['Nombre', 'Cédula jurídica', 'Teléfono', 'Email', 'Categoría', 'Estado'], status: 'Estado', lowStock: false }
  };

  // Recupera los registros guardados en el navegador; si no existen, inicia listas vacías.
  const data = Object.fromEntries(Object.keys(modules).map((key) => [key, loadData(key)]));

  // Atajo para obtener nodos del documento sin repetir document.getElementById.
  const $ = (id) => document.getElementById(id);

  /* ----------------------------------------------------------------
     SONIDO
     Web Audio API crea sonidos locales, por lo que no requiere mp3.
     El navegador lo permite tras un clic o envío de formulario.
  ---------------------------------------------------------------- */
  function getAudioContext() {
    audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume();
    return audioContext;
  }

  // Emite un tono breve; se reutiliza al confirmar un registro.
  function playTone(frequency, duration, type = 'sine', volume = 0.08) {
    const context = getAudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  }

  // Sonido agradable que se reproduce al agregar un usuario/cliente nuevo.
  function playSuccessSound() {
    playTone(523.25, 0.12, 'sine');
    window.setTimeout(() => playTone(659.25, 0.18, 'sine'), 120);
  }

  // Alarma alternada que dura exactamente diez segundos al tercer fallo.
  function playAlarmForTenSeconds() {
    const start = Date.now();
    const alarm = window.setInterval(() => {
      if (Date.now() - start >= 10000) return window.clearInterval(alarm);
      playTone(880, 0.22, 'square', 0.06);
      window.setTimeout(() => playTone(660, 0.22, 'square', 0.06), 250);
    }, 500);
  }

  /* ----------------------------------------------------------------
     ACCESO
  ---------------------------------------------------------------- */
  $('loginForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const username = $('loginUser').value.trim().toLowerCase();
    const password = $('loginPass').value;
    const user = users[username];

    if (user && user.password === password) {
      failedAttempts = 0; // Un acceso correcto reinicia el contador de seguridad.
      currentUser = user;
      updateUserInterface();
      $('loginScreen').style.display = 'none';
      $('dashboardScreen').style.display = 'flex';
      showToast(`Bienvenido/a, ${user.name}.`);
      return;
    }

    failedAttempts += 1;
    const remaining = 3 - failedAttempts;
    $('loginErrorText').textContent = remaining > 0
      ? `Credenciales incorrectas. Intentos restantes: ${remaining}.`
      : 'Se detectaron tres intentos fallidos.';
    $('loginError').style.display = 'flex';
    $('loginPass').value = '';
    $('loginPass').focus();

    if (failedAttempts >= 3) showEmergency();
  });

  // Alterna el tipo del input sin modificar el texto escrito por la persona.
  $('btnTogglePass').addEventListener('click', () => {
    const input = $('loginPass');
    const visible = input.type === 'text';
    input.type = visible ? 'password' : 'text';
    $('btnTogglePass').innerHTML = `<i class="fa-solid fa-eye${visible ? '' : '-slash'}"></i>`;
    $('btnTogglePass').setAttribute('aria-label', visible ? 'Mostrar contraseña' : 'Ocultar contraseña');
  });

  function updateUserInterface() {
    const initial = currentUser.name.charAt(0).toUpperCase();
    [['sidebarAvatar', initial], ['headerAvatar', initial], ['sidebarUserName', currentUser.name], ['headerUserName', currentUser.name], ['sidebarUserRole', currentUser.role], ['headerUserRole', currentUser.role]]
      .forEach(([id, value]) => { $(id).textContent = value; });
  }

  // Muestra el aviso y activa la alarma solicitada; cerrar solo oculta el aviso.
  function showEmergency() {
    $('emergencyModal').style.display = 'grid';
    playAlarmForTenSeconds();
  }
  $('btnCloseEmergency').addEventListener('click', () => {
    $('emergencyModal').style.display = 'none';
    failedAttempts = 0;
    $('loginUser').focus();
  });

  /* ----------------------------------------------------------------
     NAVEGACIÓN, MENÚ Y SESIÓN
  ---------------------------------------------------------------- */
  document.querySelectorAll('.sidebar-nav__link').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      changeSection(link.dataset.section);
    });
  });

  function changeSection(section) {
    const names = { dashboard: 'Dashboard', clientes: 'Clientes', productos: 'Productos', proveedores: 'Proveedores' };
    document.querySelectorAll('.content-section').forEach((item) => item.classList.remove('active'));
    document.querySelectorAll('.sidebar-nav__link').forEach((item) => item.classList.toggle('active', item.dataset.section === section));
    $(`sec${section[0].toUpperCase()}${section.slice(1)}`).classList.add('active');
    $('pageTitle').textContent = names[section];
    $('pageBreadcrumb').textContent = `Inicio / ${names[section]}`;
    closeMobileMenu();
  }

  $('sidebarToggle').addEventListener('click', () => $('sidebar').classList.toggle('collapsed'));
  $('mobileMenuBtn').addEventListener('click', () => { $('sidebar').classList.add('mobile-open'); $('sidebarOverlay').classList.add('visible'); });
  $('sidebarOverlay').addEventListener('click', closeMobileMenu);
  function closeMobileMenu() { $('sidebar').classList.remove('mobile-open'); $('sidebarOverlay').classList.remove('visible'); }

  // Ambos botones cierran la sesión y devuelven el sistema al formulario inicial.
  ['btnSidebarLogout', 'btnHeaderLogout'].forEach((id) => $(id).addEventListener('click', logout));
  function logout() {
    currentUser = null;
    $('dashboardScreen').style.display = 'none';
    $('loginScreen').style.display = 'flex';
    $('loginForm').reset();
    $('loginError').style.display = 'none';
    changeSection('dashboard');
    showToast('La sesión se cerró correctamente.');
  }

  // El botón de notificaciones también es funcional: muestra un mensaje contextual.
  $('btnNotifications').addEventListener('click', () => showToast('Tienes 3 notificaciones: revisa los registros y el inventario.'));

  /* ----------------------------------------------------------------
     CRUD GENÉRICO: CREAR, LEER, EDITAR Y ELIMINAR
  ---------------------------------------------------------------- */
  Object.entries(modules).forEach(([key, config]) => setupModule(key, config));

  function setupModule(key, config) {
    const capitalized = key[0].toUpperCase() + key.slice(1);
    // Botones de apertura, cierre y cancelación del formulario.
    $(`btnNuevo${config.singular[0].toUpperCase()}${config.singular.slice(1)}`).addEventListener('click', () => openForm(key));
    $(`btnCerrarForm${capitalized}`).addEventListener('click', () => closeForm(key));
    $(`btnCancelar${config.singular[0].toUpperCase()}${config.singular.slice(1)}`).addEventListener('click', () => closeForm(key));
    $(config.search).addEventListener('input', () => renderTable(key));

    // Guarda tanto altas nuevas como actualizaciones, según exista el id oculto.
    $(config.form).addEventListener('submit', (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!form.checkValidity()) return form.reportValidity();
      const record = getFormRecord(config);
      const recordId = $(config.id).value;
      const isNew = !recordId;

      if (isNew) data[key].unshift({ ...record, id: crypto.randomUUID(), createdAt: new Date().toLocaleString('es-GT') });
      else Object.assign(data[key].find((item) => item.id === recordId), record);

      saveData(key);
      renderEverything();
      closeForm(key);
      if (isNew && key === 'clientes') playSuccessSound();
      showToast(isNew ? `${capitalize(config.singular)} agregado correctamente.` : `${capitalize(config.singular)} actualizado correctamente.`);
    });

    // Delegación: los botones de cada fila se crean dinámicamente en la tabla.
    $(config.body).addEventListener('click', (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;
      const record = data[key].find((item) => item.id === button.dataset.id);
      if (button.dataset.action === 'edit') openForm(key, record);
      if (button.dataset.action === 'delete') askDelete(key, record);
    });
  }

  function getFormRecord(config) {
    return Object.fromEntries(config.fields.map((field) => [field.toLowerCase(), $(`${config.singular}${field}`).value.trim()]));
  }

  function openForm(key, record = null) {
    const config = modules[key];
    $(config.form).reset();
    $(config.id).value = record?.id ?? '';
    $(config.title).textContent = record ? `Editar ${config.singular}` : `Registrar ${config.singular}`;
    if (record) config.fields.forEach((field) => { $(`${config.singular}${field}`).value = record[field.toLowerCase()] ?? ''; });
    $(config.panel).style.display = 'block';
    $(config.panel).scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function closeForm(key) { $(modules[key].panel).style.display = 'none'; }

  function askDelete(key, record) {
    pendingDelete = { key, id: record.id };
    $('confirmModalText').textContent = `¿Desea eliminar a “${record.nombre}”? Esta acción no se puede deshacer.`;
    $('confirmModal').style.display = 'flex';
  }
  $('btnCancelDelete').addEventListener('click', () => { pendingDelete = null; $('confirmModal').style.display = 'none'; });
  $('btnConfirmDelete').addEventListener('click', () => {
    if (!pendingDelete) return;
    const { key, id } = pendingDelete;
    data[key] = data[key].filter((item) => item.id !== id);
    saveData(key);
    renderEverything();
    pendingDelete = null;
    $('confirmModal').style.display = 'none';
    showToast('Registro eliminado.');
  });

  // Redibuja tablas, contadores y el resumen para que siempre coincidan con los datos.
  function renderEverything() { Object.keys(modules).forEach(renderTable); renderDashboard(); }

  function renderTable(key) {
    const config = modules[key];
    const query = $(config.search).value.trim().toLowerCase();
    const visibleRecords = data[key].filter((record) => Object.values(record).some((value) => String(value).toLowerCase().includes(query)));
    $(config.count).textContent = `${visibleRecords.length} registro${visibleRecords.length === 1 ? '' : 's'}`;
    $(config.body).innerHTML = visibleRecords.length ? visibleRecords.map((record) => `
      <tr>${config.labels.map((label) => `<td>${formatCell(record, label, config)}</td>`).join('')}
        <td><button class="btn-row" data-action="edit" data-id="${record.id}" title="Editar"><i class="fa-solid fa-pen"></i></button><button class="btn-row btn-row--delete" data-action="delete" data-id="${record.id}" title="Eliminar"><i class="fa-solid fa-trash"></i></button></td>
      </tr>`).join('') : `<tr class="empty-row"><td colspan="${config.labels.length + 1}">No hay ${key} registrados</td></tr>`;
  }

  function formatCell(record, label, config) {
    const field = label.toLowerCase().replace(' jurídica', '');
    if (label === config.status) return statusBadge(record.estado, config.lowStock ? Number(record.stock) : null);
    if (label === 'Precio') return new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(Number(record.precio));
    return escapeHtml(record[field] ?? '');
  }

  function statusBadge(status, stock) {
    const low = Number.isFinite(stock) && stock <= 5;
    const style = low ? 'warning' : ['activo', 'disponible'].includes(status) ? (status === 'activo' ? 'active' : 'available') : status === 'agotado' ? 'out' : 'inactive';
    const text = low ? `Bajo (${stock})` : capitalize(status || 'Sin estado');
    return `<span class="badge badge--${style}">${escapeHtml(text)}</span>`;
  }

  function renderDashboard() {
    $('statTotalClientes').textContent = data.clientes.length;
    $('statTotalProductos').textContent = data.productos.length;
    $('statTotalProveedores').textContent = data.proveedores.filter((item) => item.estado === 'activo').length;
    $('statBajoStock').textContent = data.productos.filter((item) => Number(item.stock) <= 5).length;
    const recent = Object.entries(data).flatMap(([type, records]) => records.map((record) => ({ type, ...record }))).slice(0, 6);
    $('tbodyUltimos').innerHTML = recent.length ? recent.map((record) => `<tr><td>${capitalize(record.type.slice(0, -1))}</td><td>${escapeHtml(record.nombre)}</td><td>${record.createdAt ?? 'Actualizado'}</td><td>${statusBadge(record.estado, record.type === 'productos' ? Number(record.stock) : null)}</td></tr>`).join('') : '<tr class="empty-row"><td colspan="4">No hay registros aún</td></tr>';
  }

  // localStorage mantiene la demostración al recargar, sin usar una base de datos real.
  function loadData(key) { try { return JSON.parse(localStorage.getItem(`adminSystem_${key}`)) ?? []; } catch { return []; } }
  function saveData(key) { localStorage.setItem(`adminSystem_${key}`, JSON.stringify(data[key])); }
  function capitalize(text) { return text.charAt(0).toUpperCase() + text.slice(1); }
  function escapeHtml(value) { const div = document.createElement('div'); div.textContent = value; return div.innerHTML; }

  /* ----------------------------------------------------------------
     FONDO INTERACTIVO
     Partículas enlazadas reaccionan suavemente al puntero del usuario.
  ---------------------------------------------------------------- */
  function startInteractiveBackground() {
    const canvas = $('interactiveBackground');
    const context = canvas.getContext('2d');
    const mouse = { x: -9999, y: -9999 };
    let particles = [];
    const createParticles = () => Array.from({ length: Math.min(70, Math.floor(innerWidth / 18)) }, () => ({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, vx: (Math.random() - .5) * .45, vy: (Math.random() - .5) * .45, size: Math.random() * 1.8 + .6 }));
    const resize = () => { canvas.width = innerWidth * devicePixelRatio; canvas.height = innerHeight * devicePixelRatio; canvas.style.width = `${innerWidth}px`; canvas.style.height = `${innerHeight}px`; context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0); particles = createParticles(); };
    addEventListener('resize', resize); addEventListener('pointermove', (event) => { mouse.x = event.clientX; mouse.y = event.clientY; }); resize();
    const draw = () => { context.clearRect(0, 0, innerWidth, innerHeight); particles.forEach((particle, index) => { particle.x += particle.vx; particle.y += particle.vy; if (particle.x < 0 || particle.x > innerWidth) particle.vx *= -1; if (particle.y < 0 || particle.y > innerHeight) particle.vy *= -1; const distance = Math.hypot(particle.x - mouse.x, particle.y - mouse.y); if (distance < 130) { particle.vx += (particle.x - mouse.x) / 5000; particle.vy += (particle.y - mouse.y) / 5000; } context.fillStyle = 'rgba(0,234,255,.62)'; context.beginPath(); context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2); context.fill(); particles.slice(index + 1).forEach((other) => { const linkDistance = Math.hypot(particle.x - other.x, particle.y - other.y); if (linkDistance < 110) { context.strokeStyle = `rgba(176,38,255,${.17 * (1 - linkDistance / 110)})`; context.beginPath(); context.moveTo(particle.x, particle.y); context.lineTo(other.x, other.y); context.stroke(); } }); }); requestAnimationFrame(draw); };
    draw();
  }

  renderEverything();
  startInteractiveBackground();
});
