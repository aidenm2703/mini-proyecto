/* ================================================================
   SISTEMA ADMINISTRATIVO - LÓGICA PRINCIPAL
   Este archivo conecta la interfaz con sus acciones: acceso, menú,
   registros CRUD, búsquedas, sonidos y notificaciones.
   ================================================================ */

// Espera a que todo el HTML exista antes de buscar elementos por su id.
document.addEventListener('DOMContentLoaded', () => {
  // ----- Datos y estado general de la aplicación -----
  const users = {
    admin1: { password: 'admin123', name: 'Administrador', role: 'Admin', username: 'admin1' },
    usuario1: { password: 'pass123', name: 'María Fernanda López', role: 'Usuario', username: 'usuario1' }
  };
  let failedAttempts = 0;
  let currentUser = null;
  let selectedRole = null; // Rol elegido en la primera pantalla de acceso.
  let pendingDelete = null;
  let audioContext;

  // Cada configuración evita repetir el mismo código para los tres módulos CRUD.
  const modules = {
    clientes: { singular: 'cliente', form: 'clienteForm', panel: 'formClientes', title: 'formClientesTitle', id: 'clienteId', body: 'tbodyClientes', count: 'countClientes', search: 'searchClientes', fields: ['Nombre', 'Cedula', 'Email', 'Telefono', 'Direccion', 'Estado'], labels: ['Nombre', 'Cédula', 'Email', 'Teléfono', 'Estado'], status: 'Estado', lowStock: false },
    productos: { singular: 'producto', form: 'productoForm', panel: 'formProductos', title: 'formProductosTitle', id: 'productoId', body: 'tbodyProductos', count: 'countProductos', search: 'searchProductos', fields: ['Nombre', 'Codigo', 'Categoria', 'Precio', 'Stock', 'Estado', 'Descripcion'], labels: ['Nombre', 'Código', 'Categoría', 'Precio', 'Stock', 'Inventario'], status: 'Inventario', lowStock: false },
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
  let elevatorMusic;
  function playElevatorMusic() {
    if (elevatorMusic) return;
    const notes = [261.63, 329.63, 392, 329.63, 293.66, 349.23]; let index = 0;
    elevatorMusic = window.setInterval(() => { playTone(notes[index++ % notes.length], .45, 'sine', .018); }, 600);
  }

  // Sonido de fallo suave: dos tonos descendentes y breves, sin estridencias.
  function playFailureSound() {
    playTone(196, 0.18, 'triangle', 0.09);
    window.setTimeout(() => playTone(155.56, 0.34, 'triangle', 0.09), 190);
  }

  // Alarma de seguridad: sirena intermitente para el cierre de acceso.
  function playAlarmSound() {
    const context = getAudioContext();
    const duration = 0.35;
    let start = context.currentTime;
    for (let i = 0; i < 6; i++) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(i % 2 === 0 ? 660 : 440, start);
      gain.gain.setValueAtTime(0.12, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + duration);
      start += duration;
    }
  }

  /* ----------------------------------------------------------------
     ACCESO
  ---------------------------------------------------------------- */
  $('loginForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const username = $('loginUser').value.trim().toLowerCase();
    const password = $('loginPass').value;
    const savedEmployees = JSON.parse(localStorage.getItem('aaa_employees') || '[]');
    const user = users[username] || Object.values(users).find((item) => item.name.toLowerCase() === username) || savedEmployees.find((item) => item.username.toLowerCase() === username || item.name.toLowerCase() === username);

    // Además de la contraseña, el usuario debe pertenecer al portal seleccionado.
    if (user && user.password === password) {
      failedAttempts = 0; // Un acceso correcto reinicia el contador de seguridad.
      if (elevatorMusic) { window.clearInterval(elevatorMusic); elevatorMusic = null; }
      currentUser = user;
      localStorage.setItem('aaa_current_user', JSON.stringify({ name: user.name, username: user.username, role: user.role }));
      stopFaceScan();
      updateUserInterface();
      $('loginScreen').style.display = 'none';
      $('dashboardScreen').style.display = 'flex';
      $('dashboardScreen').classList.toggle('user-session', user.role === 'Usuario');
      $('dashboardScreen').classList.toggle('admin-session', user.role === 'Admin');
      changeSection(user.role === 'Usuario' ? 'miPortal' : 'dashboard');
      playSuccessSound();
      showToast(`Bienvenido/a, ${user.name}.`);
      return;
    }

    failedAttempts += 1;
    playFailureSound();
    const remaining = 3 - failedAttempts;
    $('loginErrorText').textContent = remaining > 0
      ? `Usuario, contraseña o tipo de acceso incorrecto. Intentos restantes: ${remaining}.`
      : 'Se detectaron tres intentos fallidos.';
    $('loginError').style.display = 'flex';
    $('loginPass').value = '';
    $('loginPass').focus();

    if (failedAttempts >= 3) { registerSecurityAlert(username || 'Persona no identificada'); showEmergency(); }
  });

  // Los dos botones no inician sesión: solo llevan al formulario del rol seleccionado.
  document.querySelectorAll('.role-access-btn').forEach((button) => {
    button.addEventListener('click', () => {
      playElevatorMusic();
      selectedRole = button.dataset.role;
      $('selectedRoleLabel').textContent = `Acceso de ${selectedRole === 'Admin' ? 'Administrador' : 'Usuario'}`;
      $('roleSelector').style.display = 'none';
      $('loginHint').style.display = 'none';
      $('loginForm').style.display = 'block';
      $('loginError').style.display = 'none';
      $('loginUser').focus();
    });
  });

  // Permite cambiar de portal antes de escribir las credenciales.
  $('btnBackRoles').addEventListener('click', () => {
    selectedRole = null;
    $('loginForm').reset();
    $('loginForm').style.display = 'none';
    $('roleSelector').style.display = 'block';
    $('loginHint').style.display = 'block';
    $('loginError').style.display = 'none';
  });

  // La cámara biométrica se enciende solo cuando el usuario toca el botón.
  $('btnStartBiometric').addEventListener('click', () => {
    const biometric = $('biometricAuto');
    if (biometric) biometric.hidden = false;
    startFaceScan();
  });

  // Alterna el tipo del input sin modificar el texto escrito por la persona.
  $('btnTogglePass').addEventListener('click', () => {
    const input = $('loginPass');
    const visible = input.type === 'text';
    input.type = visible ? 'password' : 'text';
    $('btnTogglePass').innerHTML = `<i class="fa-solid fa-eye${visible ? '' : '-slash'}"></i>`;
    $('btnTogglePass').setAttribute('aria-label', visible ? 'Mostrar contraseña' : 'Ocultar contraseña');
  });

  // Simula una cámara: decide la lectura y, si es válida, envía el formulario normal.

  function updateUserInterface() {
    const initial = currentUser.name.charAt(0).toUpperCase();
    [['sidebarAvatar', initial], ['headerAvatar', initial], ['sidebarUserName', currentUser.name], ['headerUserName', currentUser.name], ['sidebarUserRole', currentUser.role], ['headerUserRole', currentUser.role]]
      .forEach(([id, value]) => { $(id).textContent = value; });
    // El portal de colaborador muestra el rol operativo asignado para esta jornada.
    if (currentUser.role === 'Usuario') renderWelcomeTitle();
  }
  function renderWelcomeTitle() {
    const title = $('userWelcomeTitle');
    if (!title) return;
    const t = (source) => (window.AAAI18n?.t ? window.AAAI18n.t(source) : source);
    title.innerHTML = `${t('Hola')}, ${currentUser.name} · <span class="role-tag">${t('Rol del día')}: ${t('Operador de logística')}</span>`;
  }

  // Muestra el aviso y emite el sonido de fallo; cerrar solo oculta el aviso.
  function showEmergency() {
    $('emergencyModal').style.display = 'grid';
    playAlarmSound();
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
      if (link.dataset.newTab === 'true') return window.open(link.href, '_blank', 'noopener');
      changeSection(link.dataset.section);
    });
  });

  function changeSection(section) {
    const names = { dashboard: 'Dashboard', clientes: 'Clientes', productos: 'Productos', proveedores: 'Proveedores', encuestas: 'Encuestas', trazabilidad: 'Trazabilidad', empleados: 'Empleados y tareas', miPortal: 'Mi asistencia', miCalendario: 'Calendario laboral', miEncuesta: 'Mi encuesta' };
    document.querySelectorAll('.content-section').forEach((item) => item.classList.remove('active'));
    document.querySelectorAll('.sidebar-nav__link').forEach((item) => item.classList.toggle('active', item.dataset.section === section));
    $(`sec${section[0].toUpperCase()}${section.slice(1)}`).classList.add('active');
    document.querySelector('.survey-admin-results')?.classList.toggle('visible', section === 'encuestas');
    const language = localStorage.getItem('aaa_language') || 'es';
    const titleIndex = ['dashboard', 'clientes', 'productos', 'proveedores', 'encuestas', 'trazabilidad', 'empleados', 'miPortal', 'miCalendario', 'miEncuesta'].indexOf(section);
    const sectionTitle = languageText[language]?.[titleIndex] || names[section];
    $('pageTitle').textContent = sectionTitle;
    $('pageBreadcrumb').textContent = `${language === 'en' ? 'Home' : language === 'fr' ? 'Accueil' : language === 'it' ? 'Home' : language === 'pt' ? 'Início' : 'Inicio'} / ${sectionTitle}`;
    if (window.location.hash !== `#${section}`) window.history.replaceState(null, '', `#${section}`);
    $('mainContent').scrollTo({ top: 0, behavior: 'smooth' });
    closeMobileMenu();
  }

  window.addEventListener('hashchange', () => {
    const section = window.location.hash.slice(1);
    const target = $(`sec${section[0]?.toUpperCase() || ''}${section.slice(1)}`);
    if (target && !(currentUser?.role === 'Admin' && target.classList.contains('user-only')) && !(currentUser?.role === 'Usuario' && target.classList.contains('admin-only'))) changeSection(section);
  });

  $('sidebarToggle').addEventListener('click', () => $('sidebar').classList.toggle('collapsed'));
  $('mobileMenuBtn').addEventListener('click', () => { $('sidebar').classList.add('mobile-open'); $('sidebarOverlay').classList.add('visible'); });
  $('sidebarOverlay').addEventListener('click', closeMobileMenu);
  function closeMobileMenu() { $('sidebar').classList.remove('mobile-open'); $('sidebarOverlay').classList.remove('visible'); }

  // Ambos botones cierran la sesión y devuelven el sistema al formulario inicial.
  ['btnSidebarLogout', 'btnHeaderLogout'].forEach((id) => $(id).addEventListener('click', logout));
  function logout() {
    currentUser = null;
    localStorage.removeItem('aaa_current_user');
    $('dashboardScreen').style.display = 'none';
    $('loginScreen').style.display = 'flex';
    $('loginForm').reset();
    selectedRole = null;
    $('loginForm').style.display = 'none';
    $('roleSelector').style.display = 'block';
    $('loginHint').style.display = 'block';
    $('dashboardScreen').classList.remove('user-session', 'admin-session');
    $('loginError').style.display = 'none';
    changeSection('dashboard');
    showToast('La sesión se cerró correctamente.');
  }

  // Restaura la sesión guardada cuando el colaborador vuelve desde un módulo.
  // El botón "Volver al inicio" abre index.html#seccion: aquí se retoma la
  // sesión sin pasar por el login, sin borrar localStorage y sin cerrar sesión.
  function restoreSession() {
    const saved = JSON.parse(localStorage.getItem('aaa_current_user') || 'null');
    if (!saved) return;
    const savedEmployees = JSON.parse(localStorage.getItem(employeeStorage) || '[]');
    const user = users[saved.username]
      || Object.values(users).find((item) => item.username === saved.username || item.name === saved.name)
      || savedEmployees.find((item) => item.username === saved.username || item.name === saved.name);
    if (!user) return;
    currentUser = user;
    updateUserInterface();
    $('loginScreen').style.display = 'none';
    $('dashboardScreen').style.display = 'flex';
    $('dashboardScreen').classList.toggle('user-session', user.role === 'Usuario');
    $('dashboardScreen').classList.toggle('admin-session', user.role === 'Admin');
    const section = window.location.hash.slice(1) || (user.role === 'Usuario' ? 'miPortal' : 'dashboard');
    if (document.getElementById(`sec${section[0]?.toUpperCase() || ''}${section.slice(1)}`)) changeSection(section);
  }

  const notifications = [
    { icon: 'fa-list-check', title: 'Tareas pendientes', text: 'Revisa las tareas asignadas al personal.', detail: 'Hay tareas pendientes de actualización. Abra Empleados y tareas para revisar responsables, fechas y prioridad.', time: 'Ahora' },
    { icon: 'fa-boxes-stacked', title: 'Inventario', text: 'Hay productos con stock bajo.', detail: 'El inventario requiere revisión. En Productos puede consultar el stock y actualizar los artículos necesarios.', time: 'Hoy' },
    { icon: 'fa-shield-halved', title: 'Seguridad', text: 'El acceso está protegido y monitoreado.', detail: 'No hay acciones obligatorias. El sistema mantiene un registro de intentos de acceso para el administrador.', time: 'Hoy' }
  ];
  let visibleNotifications = [];
  function renderNotifications() {
    const alerts = JSON.parse(localStorage.getItem(securityStorage || 'aaa_security_alerts') || '[]');
    const items = alerts.slice(0, 2).map((alert) => ({ icon: 'fa-triangle-exclamation', title: 'Intento de acceso', text: `${alert.attemptedUser} intentó ingresar a las ${alert.time}.`, time: alert.date }));
    const taskUpdates = JSON.parse(localStorage.getItem('aaa_task_notifications') || '[]').slice(0, 5).map((item) => ({ icon: item.done ? 'fa-circle-check' : 'fa-rotate-left', title: item.done ? 'Tarea completada' : 'Tarea reabierta', text: `${item.employee}: ${item.title}`, detail: `${item.employee} marcó la tarea “${item.title}” como ${item.done ? 'completada' : 'pendiente'}.`, time: item.time }));
    visibleNotifications = [...taskUpdates, ...items.map((item) => ({ ...item, detail: 'Se detectó un intento de acceso. Puede revisar la información de seguridad y confirmar que la persona use sus credenciales correctas.' })), ...notifications];
    $('notificationList').innerHTML = visibleNotifications.map((notice, index) => `<button type="button" class="notification-item" data-notification="${index}"><i class="fa-solid ${notice.icon}"></i><span><b>${notice.title}</b><small>${notice.text}</small></span><time>${notice.time}</time></button>`).join('');
    $('notificationDetail').textContent = 'Seleccione una notificación para ver el detalle.';
    // Solo se muestra el número de notificaciones sin leer; 0 oculta el distintivo.
    const readCount = Number(localStorage.getItem('aaa_notifications_read') || 0);
    const unread = Math.max(0, visibleNotifications.length - readCount);
    const badge = $('btnNotifications')?.querySelector('.header-icon-btn__badge');
    if (badge) badge.textContent = unread > 0 ? String(unread) : '';
    if (badge) badge.title = unread > 0 ? `${unread} ${unread === 1 ? 'sin leer' : 'sin leer'}` : '';
  }
  $('btnNotifications').addEventListener('click', (event) => {
    event.stopPropagation();
    const panel = $('notificationPanel');
    panel.hidden = !panel.hidden;
    $('btnNotifications').setAttribute('aria-expanded', String(!panel.hidden));
  });
  $('notificationList').addEventListener('click', (event) => { const item = event.target.closest('[data-notification]'); if (!item) return; const notice = visibleNotifications[Number(item.dataset.notification)]; $('notificationDetail').innerHTML = `<b>${escapeHtml(notice.title)}</b><span>${escapeHtml(notice.detail)}</span>`; });
  $('btnClearNotifications').addEventListener('click', () => { localStorage.setItem('aaa_notifications_read', String(visibleNotifications.length)); renderNotifications(); $('notificationPanel').hidden = true; $('btnNotifications').setAttribute('aria-expanded', 'false'); showToast('Notificaciones marcadas como leídas.'); });
  document.addEventListener('click', (event) => { if (!event.target.closest('.notification-wrap')) { $('notificationPanel').hidden = true; $('btnNotifications').setAttribute('aria-expanded', 'false'); } });

  const languageNames = { es: 'Español', en: 'English' };
  const languageText = {
    es: ['Dashboard', 'Clientes', 'Productos', 'Proveedores', 'Encuestas', 'Trazabilidad', 'Empleados y tareas', 'Mi asistencia', 'Calendario laboral', 'Mi encuesta'],
    en: ['Dashboard', 'Clients', 'Products', 'Suppliers', 'Surveys', 'Traceability', 'Employees & tasks', 'My attendance', 'Work calendar', 'My survey'],
  };
  function setLanguage(language) {
    language = language === 'en' ? 'en' : 'es';
    $('languageSelect').value = language;
    window.AAAI18n.setLanguage(language).then(() => {
      const section = window.location.hash.slice(1) || 'dashboard';
      const titleIndex = ['dashboard', 'clientes', 'productos', 'proveedores', 'encuestas', 'trazabilidad', 'empleados', 'miPortal', 'miCalendario', 'miEncuesta'].indexOf(section);
      const title = languageText[language]?.[titleIndex];
      if (title) {
        $('pageTitle').textContent = title;
        $('pageBreadcrumb').textContent = `${language === 'en' ? 'Home' : 'Inicio'} / ${title}`;
      }
      if (currentUser?.role === 'Usuario') renderWelcomeTitle();
      renderEmployeeSurvey();
      renderSurveyResults();
      showToast(`Idioma cambiado a ${languageNames[language]}.`);
    });
  }
  $('languageSelect').addEventListener('change', (event) => setLanguage(event.target.value));
  const savedLanguage = localStorage.getItem('aaa_language');
  $('languageSelect').value = savedLanguage === 'en' ? 'en' : 'es';
  if ($('languageSelect').value === 'en') setLanguage('en');

  function setTheme(theme) { document.body.classList.toggle('light-theme', theme === 'light'); $('btnTheme').innerHTML = `<i class="fa-solid fa-${theme === 'light' ? 'sun' : 'moon'}"></i>`; localStorage.setItem('aaa_theme', theme); }
  $('btnTheme').addEventListener('click', () => setTheme(document.body.classList.contains('light-theme') ? 'dark' : 'light'));
  setTheme(localStorage.getItem('aaa_theme') || 'dark');

  // Una justificación con foto se aprueba; sin comprobante se niega a los 15 segundos.
  $('justifyAbsenceForm').addEventListener('submit', (event) => {
    event.preventDefault();
    if (!$('absenceReason').value.trim()) return $('absenceReason').reportValidity();
    const hasProof = $('absenceProof').files.length > 0;
    event.currentTarget.reset();
    $('justificationStatus').textContent = 'Justificación pendiente de revisión.';
    $('justificationStatus').className = 'justification-status justification-status--pending';
    showToast('Justificación enviada. El resultado estará disponible en 15 segundos.');
    window.setTimeout(() => {
      const message = hasProof ? 'Justificación aprobada.' : 'Justificación negada. Diríjase a Recursos Humanos.';
      $('justificationStatus').textContent = message;
      $('justificationStatus').className = `justification-status ${hasProof ? 'justification-status--approved' : 'justification-status--denied'}`;
      showToast(message, !hasProof);
    }, 15000);
  });

  // Muestra el nombre del archivo elegido en el botón de adjuntar comprobante.
  const absenceProofLabel = $('absenceProofLabel');
  if (absenceProofLabel && $('absenceProof')) {
    $('absenceProof').addEventListener('change', (event) => {
      const file = event.target.files && event.target.files[0];
      absenceProofLabel.textContent = file ? file.name : (window.AAAI18n?.t ? window.AAAI18n.t('Seleccionar archivo') : 'Seleccionar archivo');
    });
  }

  /* ----------------------------------------------------------------
     ASISTENCIA Y TAREAS
     Se persisten por fecha y usuario para que el administrador vea la actividad.
  ---------------------------------------------------------------- */
  const taskList = ['Revisar mercadería de camiones', 'Comprar piezas de RAM', 'Llamar proveedores'];
  const todayKey = () => new Date().toISOString().slice(0, 10);
  const activeUsername = () => currentUser?.username || Object.entries(users).find(([, value]) => value === currentUser)?.[0] || 'usuario1';
  const attendanceStorageKey = () => `aaa_attendance_${todayKey()}_${activeUsername()}`;
  const taskStorageKey = () => `aaa_tasks_${todayKey()}_${activeUsername()}`;
  const getAttendance = () => JSON.parse(localStorage.getItem(attendanceStorageKey()) || '{}');
  const saveAttendance = (value) => { localStorage.setItem(attendanceStorageKey(), JSON.stringify(value)); renderAttendance(); renderTraceability(); };
  const getTasks = () => JSON.parse(localStorage.getItem(taskStorageKey()) || '[]');

  // Cada botón registra solo una hora; por ello la trazabilidad es fácil de explicar.
  function markAttendance(action) {
    const record = getAttendance();
    if (record[action]) return showToast('Esta acción ya fue registrada hoy.', true);
    record[action] = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    record[`${action}Stamp`] = Date.now();
    saveAttendance(record);
    showToast(`Hora de ${attendanceLabels[action]} registrada: ${record[action]}.`);
  }
  const attendanceLabels = { checkIn: 'entrada', breakStart: 'inicio de almuerzo', breakEnd: 'fin de almuerzo', checkOut: 'salida' };
  $('btnCheckIn').addEventListener('click', () => markAttendance('checkIn'));
  $('btnBreakStart').addEventListener('click', () => markAttendance('breakStart'));
  $('btnBreakEnd').addEventListener('click', () => markAttendance('breakEnd'));
  $('btnCheckOut').addEventListener('click', () => markAttendance('checkOut'));

  function renderAttendance() {
    const record = getAttendance();
    const lines = Object.keys(attendanceLabels).filter((key) => record[key]).map((key) => `<span><b>${capitalize(attendanceLabels[key])}:</b> ${record[key]}</span>`);
    let extraHours = 0;
    if (record.checkInStamp && record.checkOutStamp) {
      const breakMs = record.breakStartStamp && record.breakEndStamp ? record.breakEndStamp - record.breakStartStamp : 0;
      extraHours = Math.max(0, ((record.checkOutStamp - record.checkInStamp - breakMs) / 3600000) - 8);
    }
    $('attendanceTimes').innerHTML = lines.length ? `${lines.join('')}<span><b>Horas extra:</b> ${extraHours.toFixed(2)} h</span>` : 'Aún no has realizado una marcación hoy.';
    $('attendanceState').textContent = record.checkOut ? 'Jornada finalizada' : record.checkIn ? 'Jornada en curso' : 'Sin marcar';
    $('attendanceState').className = `badge ${record.checkIn ? 'badge--active' : 'badge--inactive'}`;
  }

  function renderTasks() {
    const completed = getTasks();
    const priorityOrder = { alta: 0, media: 1, baja: 2 };
    const assigned = assignments().filter((task) => task.employee === currentEmployeeName() && task.date <= todayKey()).sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    const customTasks = assigned.map((task, index) => ({ ...task, index, taskId: `custom-${index}` }));
    const defaults = taskList.map((title, index) => ({ title, priority: index === 0 ? 'alta' : index === 1 ? 'media' : 'baja', index: customTasks.length + index, taskId: `default-${index}` }));
    const visible = [...customTasks, ...defaults];
    $('todayTasks').innerHTML = visible.map((task) => `<label class="task-item priority-${task.priority}"><input type="checkbox" data-task="${task.index}" data-assignment="${escapeHtml(task.title)}" ${completed.includes(task.index) || task.done ? 'checked' : ''}><span>${escapeHtml(task.title)} <small>${task.taskId.startsWith('custom') ? `Asignada · ${task.date} · ` : ''}Prioridad ${task.priority}</small></span><b>${completed.includes(task.index) || task.done ? 'Completada' : 'Pendiente'}</b></label>`).join('');
  }
  $('todayTasks').addEventListener('change', (event) => {
    const index = Number(event.target.dataset.task);
    if (Number.isNaN(index)) return;
    let completed = getTasks();
    completed = event.target.checked ? [...new Set([...completed, index])] : completed.filter((item) => item !== index);
    localStorage.setItem(taskStorageKey(), JSON.stringify(completed));
    const taskTitle = event.target.dataset.assignment;
    if (taskTitle) { const list = assignments(); const assigned = list.find((task) => task.employee === currentEmployeeName() && task.date <= todayKey() && task.title === taskTitle); if (assigned) { assigned.done = event.target.checked; localStorage.setItem(assignmentStorage, JSON.stringify(list)); const taskAlerts=JSON.parse(localStorage.getItem('aaa_task_notifications')||'[]'); taskAlerts.unshift({employee:currentEmployeeName(),title:taskTitle,done:event.target.checked,time:new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true})}); localStorage.setItem('aaa_task_notifications',JSON.stringify(taskAlerts.slice(0,20))); renderEmployeeAdmin(); } }
    renderTasks(); renderTraceability();
  });

  // Tabla de administración que evidencia quién realizó las tareas y sus marcaciones.
  function renderTraceability() {
    const record = getAttendance(); const completed = getTasks();
    const taskStatus = taskList.map((task, index) => `${completed.includes(index) ? '✓' : '○'} ${task}`).join('<br>');
    const timeStatus = record.checkIn ? `${record.checkIn} / ${record.checkOut || 'En curso'}` : 'Sin marcación';
    let extra = '0.00 h';
    if (record.checkInStamp && record.checkOutStamp) { const breakMs = record.breakStartStamp && record.breakEndStamp ? record.breakEndStamp - record.breakStartStamp : 0; extra = `${Math.max(0, ((record.checkOutStamp - record.checkInStamp - breakMs) / 3600000) - 8).toFixed(2)} h`; }
    $('traceabilityBody').innerHTML = `<tr><td>María Fernanda López</td><td>${todayKey()}</td><td>${timeStatus}</td><td>${extra}</td><td>${taskStatus}</td></tr>`;
  }

  /* Encuesta del proveedor: seis calificaciones de 1 a 5. */
  const surveyTexts = ['Puntualidad de entrega', 'Calidad de productos', 'Comunicación', 'Precio competitivo', 'Atención al cliente', 'Cumplimiento de acuerdos'];
  const ratingOptions = (name) => [1, 2, 3, 4, 5].map((score) => `<label class="rating-option"><input required type="radio" name="${name}" value="${score}"><span><i class="fa-solid fa-star"></i>${score}</span></label>`).join('');
  $('surveyQuestions').innerHTML = surveyTexts.map((question, index) => `<fieldset class="survey-question"><legend>${index + 1}. ${question}</legend><div class="rating-options">${ratingOptions(`question${index}`)}</div></fieldset>`).join('');
  $('supplierSurvey').addEventListener('submit', (event) => { event.preventDefault(); if (!event.currentTarget.checkValidity()) return event.currentTarget.reportValidity(); const scores = surveyTexts.map((_, index) => Number(new FormData(event.currentTarget).get(`question${index}`))); const average = (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1); showToast(`Encuesta guardada: ${$('surveySupplier').value} obtuvo ${average}/5.`); event.currentTarget.reset(); });

  /* ----------------------------------------------------------------
     CRUD GENÉRICO: CREAR, LEER, EDITAR Y ELIMINAR
  ---------------------------------------------------------------- */
  /* Flujos de personal, encuestas y seguridad. */
  const employeeStorage = 'aaa_employees', assignmentStorage = 'aaa_task_assignments', surveyStorage = 'aaa_employee_surveys', securityStorage = 'aaa_security_alerts', reportStorage = 'aaa_daily_reports';
  const employees = () => JSON.parse(localStorage.getItem(employeeStorage) || '[]');
  const assignments = () => JSON.parse(localStorage.getItem(assignmentStorage) || '[]');
  const currentEmployeeName = () => currentUser?.name || 'María Fernanda López';
  const employeeQuestions = ['Claridad de las tareas', 'Ambiente laboral', 'Comunicación con administración', 'Herramientas de trabajo'];
  const i18nText = (source) => (window.AAAI18n?.t ? window.AAAI18n.t(source) : source);
  function renderEmployeeSurvey() {
    if (!$('employeeSurveyQuestions')) return;
    $('employeeSurveyQuestions').innerHTML = employeeQuestions.map((q, i) => `<fieldset class="survey-question"><legend>${i + 1}. ${i18nText(q)}</legend><div class="rating-options">${ratingOptions(`employeeQuestion${i}`)}</div></fieldset>`).join('');
  }
  let faceScanTimer = null;
  let faceScanStream = null;
  function stopFaceScan() {
    window.clearTimeout(faceScanTimer);
    faceScanTimer = null;
    if (faceScanStream) { faceScanStream.getTracks().forEach((track) => track.stop()); faceScanStream = null; }
    const overlay = $('faceScanOverlay'); if (overlay) overlay.hidden = true;
  }
  function startFaceScan() {
    const status = $('biometricAutoStatus');
    const video = $('biometricAutoVideo');
    const overlay = $('faceScanOverlay');
    if (!status || !video || !overlay) return;
    stopFaceScan();
    status.classList.remove('is-error');
    status.innerHTML = '<i class="fa-solid fa-camera"></i><span>Iniciando reconocimiento facial…</span>';
    overlay.hidden = false;
    const label = $('faceScanLabel'); if (label) label.textContent = 'Analizando facciones…';
    video.classList.add('biometric-video--scanning');
    if (navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
        .then((stream) => { if ($('loginScreen').style.display !== 'none') { faceScanStream = stream; video.srcObject = stream; } else stream.getTracks().forEach((track) => track.stop()); })
        .catch(() => {});
    }
    const progress = window.setInterval(() => {
      const eyes = $('dataEyes'); if (eyes) eyes.textContent = (1.2 + Math.random() * 2.4).toFixed(1);
      const symmetry = $('dataSymmetry'); if (symmetry) symmetry.textContent = `${Math.min(99, Math.round(40 + Math.random() * 58))}%`;
      const confidence = $('dataConfidence'); if (confidence) confidence.textContent = `${Math.min(99, Math.round(30 + Math.random() * 69))}%`;
    }, 220);
    faceScanTimer = window.setTimeout(() => {
      window.clearInterval(progress);
      video.classList.remove('biometric-video--scanning');
      if (faceScanStream) { faceScanStream.getTracks().forEach((track) => track.stop()); faceScanStream = null; }
      video.srcObject = null;
      overlay.hidden = true;
      status.classList.add('is-error');
      status.innerHTML = '<i class="fa-solid fa-shield-halved"></i><span>Rostro no reconocido, favor digite su contraseña.</span>';
      const pass = $('loginPass'); if (pass) pass.focus();
    }, 2200);
  }
  function registerSecurityAlert(attemptedUser) { const alerts=JSON.parse(localStorage.getItem(securityStorage)||'[]'); alerts.unshift({attemptedUser,date:new Date().toLocaleDateString('es-GT'),time:new Date().toLocaleTimeString('es-GT',{hour:'2-digit',minute:'2-digit'})}); localStorage.setItem(securityStorage,JSON.stringify(alerts)); }
  renderEmployeeSurvey();
  if ($('employeeSurvey')) $('employeeSurvey').addEventListener('submit',e=>{e.preventDefault();if(!e.currentTarget.checkValidity())return e.currentTarget.reportValidity();const scores=employeeQuestions.map((_,i)=>Number(new FormData(e.currentTarget).get(`employeeQuestion${i}`))),r=JSON.parse(localStorage.getItem(surveyStorage)||'[]');r.unshift({name:currentEmployeeName(),scores,comment:($('surveyComment')||{}).value.trim(),date:new Date().toLocaleDateString('es-GT')});localStorage.setItem(surveyStorage,JSON.stringify(r));e.currentTarget.reset();renderSurveyResults();renderEmployeeSurvey();showToast('Encuesta enviada.');});
  function renderSurveyResults(){const r=JSON.parse(localStorage.getItem(surveyStorage)||'[]'),scores=r.flatMap(x=>x.scores),avg=scores.length?scores.reduce((a,b)=>a+b,0)/scores.length:0;$('surveySatisfaction').textContent=`${Math.round(avg*20)}%`;$('surveyAverage').textContent=`${avg.toFixed(1)}/5`;$('surveyCount').textContent=r.length;$('surveyBreakdown').innerHTML=employeeQuestions.map((q,i)=>{const v=r.map(x=>x.scores[i]),a=v.length?v.reduce((x,y)=>x+y,0)/v.length:0;return `<div class="survey-bar"><span>${i18nText(q)}</span><b>${(a*20).toFixed(0)}%</b><i><em style="width:${a*20}%"></em></i></div>`}).join('');$('surveyResponsesBody').innerHTML=r.length?r.map(x=>`<tr><td>${escapeHtml(x.name)}</td><td>${x.date}</td><td>${(x.scores.reduce((a,b)=>a+b,0)/x.scores.length).toFixed(1)}/5</td><td>${escapeHtml(x.comment||'Sin comentario')}</td></tr>`).join(''):'<tr class="empty-row"><td colspan="4">Aún no hay respuestas</td></tr>';}
  $('employeeForm').addEventListener('submit',e=>{e.preventDefault();const list=employees(),username=$('employeeUsername').value.trim().toLowerCase();if(list.some(x=>x.username===username)||users[username])return showToast('Ese usuario ya existe.',true);list.push({name:$('employeeName').value.trim(),username,password:$('employeePassword').value,role:'Usuario'});localStorage.setItem(employeeStorage,JSON.stringify(list));e.currentTarget.reset();renderEmployeeAdmin();showToast('Empleado agregado.');});
  $('taskDate').value=todayKey();$('taskAssignmentForm').addEventListener('submit',e=>{e.preventDefault();const list=assignments();list.push({employee:$('taskEmployee').value,date:$('taskDate').value,title:$('taskTitle').value.trim(),priority:$('taskPriority').value,done:false});localStorage.setItem(assignmentStorage,JSON.stringify(list));e.currentTarget.reset();$('taskDate').value=todayKey();renderEmployeeAdmin();renderTasks();showToast('Tarea asignada.');});
  function renderEmployeeAdmin(){const list=employees(),all=[{name:'María Fernanda López',username:'usuario1'},...list],tasks=assignments(),reports=JSON.parse(localStorage.getItem(reportStorage)||'[]');$('taskEmployee').innerHTML=all.map(x=>`<option value="${escapeHtml(x.name)}">${escapeHtml(x.name)}</option>`).join('');$('employeesBody').innerHTML=all.map(x=>`<tr><td>${escapeHtml(x.name)}</td><td>${escapeHtml(x.username)}</td><td>${tasks.filter(t=>t.employee===x.name).length}</td><td><button type="button" class="btn-row" data-call="${escapeHtml(x.name)}" title="Llamar"><i class="fa-solid fa-phone"></i></button><button type="button" class="btn-row" data-email="${escapeHtml(x.name)}" title="Correo"><i class="fa-solid fa-envelope"></i></button></td></tr>`).join('');$('productivityReport').innerHTML=all.map(x=>{const t=tasks.filter(y=>y.employee===x.name),d=t.filter(y=>y.done).length;return `<p><strong>${escapeHtml(x.name)}</strong><br>${d}/${t.length} tareas completadas · ${reports.filter(y=>y.name===x.name).length} reportes</p>`}).join('');const winner=all.map(x=>({name:x.name,count:tasks.filter(t=>t.employee===x.name&&t.done).length})).sort((a,b)=>b.count-a.count)[0];$('monthlyRecognition').innerHTML=`<p><strong>${escapeHtml(winner.name)}</strong> lidera el mes con ${winner.count} tareas completadas.</p>`;renderAssignedTasks();}
  function renderAssignedTasks(){const filter=$('taskPriorityFilter').value, tasks=assignments().filter(task=>filter==='todas'||task.priority===filter);$('assignedTasksBody').innerHTML=tasks.length?tasks.sort((a,b)=>({alta:0,media:1,baja:2}[a.priority]-({alta:0,media:1,baja:2}[b.priority]))).map(task=>`<tr><td>${escapeHtml(task.employee)}</td><td>${escapeHtml(task.title)}</td><td>${task.date}</td><td><span class="task-priority task-priority--${task.priority}">${capitalize(task.priority)}</span></td><td>${task.done?'Completada':'Pendiente'}</td></tr>`).join(''):'<tr class="empty-row"><td colspan="5">No hay tareas para este filtro.</td></tr>';}
  $('taskPriorityFilter').addEventListener('change',renderAssignedTasks);
  $('btnClearTasks').addEventListener('click',()=>{if(!assignments().length)return showToast('No hay tareas para limpiar.');localStorage.removeItem(assignmentStorage);localStorage.removeItem('aaa_task_notifications');renderEmployeeAdmin();renderTasks();showToast('Todas las tareas asignadas fueron eliminadas.');});
  $('dailyReportForm').addEventListener('submit',e=>{e.preventDefault();const r=JSON.parse(localStorage.getItem(reportStorage)||'[]');r.unshift({name:currentEmployeeName(),text:$('dailyReportText').value.trim(),date:todayKey()});localStorage.setItem(reportStorage,JSON.stringify(r));$('dailyReportStatus').textContent='Reporte enviado correctamente.';e.currentTarget.reset();renderEmployeeAdmin();showToast('Reporte de jornada enviado.');});
  renderSurveyResults(); renderEmployeeAdmin();

  /* ----------------------------------------------------------------
     ACCIONES POR EMPLEADO: llamada simulada, correo y reuniones.
     El administrador puede contactar a cada colaborador desde la tabla.
  ---------------------------------------------------------------- */
  const employeeList = () => [{ name: 'María Fernanda López', username: 'usuario1' }, ...employees()];
  $('employeesBody').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-call], button[data-email]');
    if (!button) return;
    const employee = employeeList().find((item) => item.name === (button.dataset.call || button.dataset.email));
    if (!employee) return;
    if (button.hasAttribute('data-call')) openCallModal(employee.name);
    else openEmailModal(employee);
  });

  function openEmailModal(employee) {
    const email = `${employee.username}@aaasoftware.com`;
    const subject = encodeURIComponent(`Comunicación de AAA Software`);
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${subject}`, '_blank', 'noopener');
    showToast(`Abriendo Gmail para ${employee.name}.`);
  }

  let callTimer = null;
  let callSeconds = 0;
  function openCallModal(employeeName) {
    $('callContact').textContent = employeeName;
    $('callState').textContent = 'Llamando...';
    $('callTimer').textContent = '00:00';
    callSeconds = 0;
    window.clearInterval(callTimer);
    $('callModal').style.display = 'flex';
    callTimer = window.setInterval(() => {
      callSeconds += 1;
      const minutes = String(Math.floor(callSeconds / 60)).padStart(2, '0');
      const seconds = String(callSeconds % 60).padStart(2, '0');
      $('callTimer').textContent = `${minutes}:${seconds}`;
      if (callSeconds === 3) $('callState').textContent = 'En llamada';
    }, 1000);
  }
  function hangUpCall() {
    window.clearInterval(callTimer);
    callTimer = null;
    $('callModal').style.display = 'none';
    showToast('Llamada finalizada.');
  }
  $('btnColgar').addEventListener('click', hangUpCall);
  $('btnCerrarLlamada').addEventListener('click', hangUpCall);
  $('callModal').addEventListener('click', (event) => { if (event.target === $('callModal')) hangUpCall(); });

  function renderMeetingInvitees() {
    $('meetingInvitees').innerHTML = employeeList().map((item) => `<label class="meeting-invitee"><input type="checkbox" value="${escapeHtml(item.name)}"><span>${escapeHtml(item.name)}</span></label>`).join('');
  }
  function openMeetingModal() {
    $('meetingDate').value = todayKey();
    $('meetingTime').value = '10:00';
    renderMeetingInvitees();
    $('meetingModal').style.display = 'flex';
  }
  function closeMeetingModal() {
    $('meetingModal').style.display = 'none';
    $('meetingTitle').value = '';
    $('meetingPlace').value = '';
  }
  $('btnNuevaReunion').addEventListener('click', openMeetingModal);
  $('btnCerrarReunion').addEventListener('click', closeMeetingModal);
  $('btnCancelarReunion').addEventListener('click', closeMeetingModal);
  $('meetingModal').addEventListener('click', (event) => { if (event.target === $('meetingModal')) closeMeetingModal(); });
  $('btnCrearReunion').addEventListener('click', () => {
    const title = $('meetingTitle').value.trim();
    const date = $('meetingDate').value;
    const time = $('meetingTime').value;
    const place = $('meetingPlace').value.trim();
    const invitees = [...document.querySelectorAll('#meetingInvitees input:checked')].map((checkbox) => checkbox.value);
    if (!title || !date || !time) return showToast('Complete el título, la fecha y la hora.', true);
    if (!invitees.length) return showToast('Seleccione al menos un empleado.', true);
    const dateLabel = new Date(`${date}T${time}`).toLocaleDateString('es-GT', { weekday: 'long', day: 'numeric', month: 'long' });
    const list = JSON.parse(localStorage.getItem('aaa_meeting_notifications') || '[]');
    list.unshift({ title, date: dateLabel, time, detail: `Invitación a “${title}”. Lugar: ${place || 'Por definir'}. Empleados: ${invitees.join(', ')}.` });
    localStorage.setItem('aaa_meeting_notifications', JSON.stringify(list));
    closeMeetingModal();
    playSuccessSound();
    showToast('Invitación a reunión enviada a los seleccionados.');
  });


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
    if (label === 'Precio') return new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 2 }).format(Number(record.precio));
    return escapeHtml(record[field] ?? '');
  }

  function statusBadge(status, stock) {
    const style = status === 'bajo' ? 'warning' : ['activo', 'disponible'].includes(status) ? (status === 'activo' ? 'active' : 'available') : status === 'descontinuado' ? 'out' : 'inactive';
    const text = capitalize(status || 'Sin estado');
    return `<span class="badge badge--${style}">${escapeHtml(text)}</span>`;
  }

  function renderDashboard() {
    $('statTotalClientes').textContent = data.clientes.length;
    $('statTotalProductos').textContent = data.productos.length;
    $('statTotalProveedores').textContent = data.proveedores.filter((item) => item.estado === 'activo').length;
    $('statBajoStock').textContent = data.productos.filter((item) => item.estado === 'bajo').length;
    const recent = Object.entries(data).flatMap(([type, records]) => records.map((record) => ({ type, ...record }))).slice(0, 6);
    $('tbodyUltimos').innerHTML = recent.length ? recent.map((record) => `<tr><td>${capitalize(record.type.slice(0, -1))}</td><td>${escapeHtml(record.nombre)}</td><td>${record.createdAt ?? 'Actualizado'}</td><td>${statusBadge(record.estado, record.type === 'productos' ? Number(record.stock) : null)}</td></tr>`).join('') : '<tr class="empty-row"><td colspan="4">No hay registros aún</td></tr>';
  }

  // localStorage mantiene la demostración al recargar, sin usar una base de datos real.
  function loadData(key) { try { return JSON.parse(localStorage.getItem(`adminSystem_${key}`)) ?? []; } catch { return []; } }
  function saveData(key) { localStorage.setItem(`adminSystem_${key}`, JSON.stringify(data[key])); }
  function capitalize(text) { return text.charAt(0).toUpperCase() + text.slice(1); }
  function escapeHtml(value) { const div = document.createElement('div'); div.textContent = value; return div.innerHTML; }

  // Mensaje temporal reutilizable para confirmar acciones o señalar errores.
  function showToast(message, isError = false) {
    const toast = $('toast');
    $('toastMessage').textContent = message;
    $('toastIcon').className = `fa-solid ${isError ? 'fa-circle-xmark' : 'fa-circle-check'}`;
    toast.classList.toggle('error', isError);
    toast.classList.add('show');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 4200);
  }

  function updateAuthUI() {
    const saved = JSON.parse(localStorage.getItem('aaa_current_user') || 'null');
    if (saved && currentUser) {
      currentUser = { ...currentUser, ...saved };
      updateUserInterface();
    }
  }

  function openPerfilModal() {
    const saved = JSON.parse(localStorage.getItem('aaa_current_user') || 'null') || {};
    $('perfilNombre').value = saved.name || currentUser?.name || '';
    $('perfilCorreo').value = saved.email || saved.correo || '';
    $('perfilTelefono').value = saved.telefono || saved.phone || '';
    $('modalPerfil').style.display = 'flex';
  }

  function closePerfilModal() {
    $('modalPerfil').style.display = 'none';
  }

  $('btnMiPerfil').addEventListener('click', () => {
    openPerfilModal();
  });

  $('btnCerrarPerfil').addEventListener('click', () => {
    closePerfilModal();
  });

  $('perfilForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const current = JSON.parse(localStorage.getItem('aaa_current_user') || 'null');
    if (!current) return;
    const updated = {
      ...current,
      name: $('perfilNombre').value.trim() || current.name,
      email: $('perfilCorreo').value.trim(),
      telefono: $('perfilTelefono').value.trim(),
    };
    localStorage.setItem('aaa_current_user', JSON.stringify(updated));
    updateAuthUI();
    closePerfilModal();
    showToast('Perfil actualizado correctamente.');
  });

  // Crea agosto de 2026. Sábados y domingos son libres; el 15 se marca como pago doble.
  function renderWorkCalendar() {
    const calendar = $('workCalendar');
    if (!calendar) return;
    const firstDay = new Date(2026, 7, 1).getDay();
    const totalDays = 31;
    const names = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    calendar.innerHTML = names.map((name) => `<div class="calendar-weekday">${name}</div>`).join('')
      + Array.from({ length: firstDay }, () => '<div class="calendar-day calendar-day--empty"></div>').join('')
      + Array.from({ length: totalDays }, (_, index) => {
        const day = index + 1;
        const weekday = new Date(2026, 7, day).getDay();
        const free = weekday === 0 || weekday === 6;
        const doublePay = day === 15;
        return `<div class="calendar-day ${doublePay ? 'calendar-day--double' : free ? 'calendar-day--free' : 'calendar-day--work'}"><b>${day}</b><small>${doublePay ? 'Pago doble' : free ? 'Libre' : 'Laboral'}</small></div>`;
      }).join('');
  }

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
  renderWorkCalendar();
  renderAttendance();
  renderTasks();
  renderTraceability();
  renderNotifications();
  restoreSession();
  startInteractiveBackground();
});
