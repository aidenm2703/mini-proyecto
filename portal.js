/* ================================================================
   PORTAL DEL COLABORADOR - CHROME COMPARTIDO
   Inyecta la barra lateral izquierda, el encabezado, el selector de
   idioma y las notificaciones en las páginas del colaborador.
   Cada página define window.renderPage() para redibujar su contenido.
   ================================================================ */
(() => {
  const t = (source) => (window.AAAI18n?.t ? window.AAAI18n.t(source) : source);
  const esc = (value) => { const node = document.createElement('div'); node.textContent = value; return node.innerHTML; };
  const employeeName = () => (JSON.parse(localStorage.getItem('aaa_current_user') || 'null')?.name) || 'María Fernanda López';

  const PAGES = [
    { href: 'index.html#miPortal', page: 'asistencia', label: 'Mi asistencia', icon: 'fa-calendar-check' },
    { href: 'calendario.html', page: 'calendario', label: 'Calendario laboral', icon: 'fa-calendar-days' },
    { href: 'encuesta-usuario.html', page: 'encuesta', label: 'Mi encuesta', icon: 'fa-square-poll-vertical' },
    { href: 'evaluacion.html', page: 'evaluacion', label: 'Evaluación de desempeño', icon: 'fa-clipboard-check' },
    { href: 'plan-carrera.html', page: 'plan', label: 'Plan de carrera', icon: 'fa-sitemap' },
    { href: 'formacion.html', page: 'formacion', label: 'Cursos y certificaciones', icon: 'fa-graduation-cap' },
    { href: 'permisos.html', page: 'permisos', label: 'Solicitar permiso', icon: 'fa-envelope-open-text' },
    { href: 'noticias.html', page: 'noticias', label: 'Noticias y anuncios', icon: 'fa-newspaper' },
    { href: 'directorio.html', page: 'directorio', label: 'Directorio de empleados', icon: 'fa-address-book' },
    { href: 'eventos.html', page: 'eventos', label: 'Calendario de eventos', icon: 'fa-calendar-days' },
    { href: 'nomina.html', page: 'nomina', label: 'Recibos de nómina', icon: 'fa-file-invoice-dollar' },
    { href: 'documentos.html', page: 'documentos', label: 'Políticas internas', icon: 'fa-folder-open' }
  ];
  const currentPage = document.body.dataset.page || '';

  const DEFAULT_NOTIFICATIONS = [
    { icon: 'fa-list-check', title: 'Tareas pendientes', text: 'Revisa las tareas asignadas al personal.', time: 'Ahora' },
    { icon: 'fa-boxes-stacked', title: 'Inventario', text: 'Hay productos con stock bajo.', time: 'Hoy' },
    { icon: 'fa-shield-halved', title: 'Seguridad', text: 'El acceso está protegido y monitoreado.', time: 'Hoy' }
  ];
  let visibleNotifications = [];

  function buildNotifications() {
    const alerts = JSON.parse(localStorage.getItem('aaa_security_alerts') || '[]');
    const alertItems = alerts.slice(0, 2).map((alert) => ({ icon: 'fa-triangle-exclamation', title: 'Intento de acceso', text: `${alert.attemptedUser} intentó ingresar a las ${alert.time}.`, time: alert.date }));
    const taskUpdates = JSON.parse(localStorage.getItem('aaa_task_notifications') || '[]').slice(0, 5).map((item) => ({ icon: item.done ? 'fa-circle-check' : 'fa-rotate-left', title: item.done ? 'Tarea completada' : 'Tarea reabierta', text: `${item.employee}: ${item.title}`, time: item.time }));
    visibleNotifications = [...taskUpdates, ...alertItems, ...DEFAULT_NOTIFICATIONS];
  }

  function renderNotifications() {
    const badge = document.getElementById('portalBadge');
    const list = document.getElementById('portalNotificationList');
    if (!badge || !list) return;
    buildNotifications();
    list.innerHTML = visibleNotifications.map((notice, index) => `<button type="button" class="notification-item" data-notification="${index}"><i class="fa-solid ${notice.icon}"></i><span><b>${esc(t(notice.title))}</b><small>${esc(t(notice.text))}</small></span><time>${esc(notice.time)}</time></button>`).join('');
    const readCount = Number(localStorage.getItem('aaa_notifications_read') || 0);
    const unread = Math.max(0, visibleNotifications.length - readCount);
    badge.textContent = unread > 0 ? String(unread) : '';
  }

  function buildChrome() {
    const nav = document.getElementById('portalNav');
    if (nav) {
      nav.innerHTML = `
        <div class="portal-nav__brand"><span class="brand-mark"><img src="logo.jpeg" alt="AAA Software"></span><div><b>${esc(t('Mi Portal'))}</b><small>AAA Software</small></div></div>
        <nav class="portal-nav__list">${PAGES.map((page) => `<a class="portal-nav__link ${page.page === currentPage ? 'active' : ''}" href="${page.href}" title="${esc(t(page.label))}"><i class="fa-solid ${page.icon}"></i><span>${esc(t(page.label))}</span></a>`).join('')}</nav>
        <div class="portal-nav__user"><span class="portal-nav__avatar">${esc(employeeName().charAt(0).toUpperCase())}</span><span class="portal-nav__user-name">${esc(employeeName())}</span><a class="portal-nav__logout" href="index.html" title="${esc(t('Cerrar sesión'))}"><i class="fa-solid fa-right-from-bracket"></i></a></div>`;
    }

    const topbar = document.getElementById('portalTopbar');
    const main = document.querySelector('.portal-page');
    if (topbar && main) {
      topbar.innerHTML = `
        <button type="button" class="portal-nav-toggle" id="portalNavToggle" aria-label="${esc(t('Abrir menú'))}"><i class="fa-solid fa-bars"></i></button>
        <img src="logo.jpeg" class="portal-topbar__logo" alt="AAA Software">
        <div class="portal-topbar__titles">
          <p class="eyebrow">${esc(t('PORTAL DEL COLABORADOR'))}</p>
          <h1>${esc(t(main.dataset.title || ''))}</h1>
          <p>${esc(t(main.dataset.subtitle || ''))}</p>
        </div>
        <div class="portal-topbar__tools">
          <label class="language-picker" for="languageSelect" title="${esc(t('Cambiar idioma'))}"><i class="fa-solid fa-language"></i><select id="languageSelect" aria-label="${esc(t('Cambiar idioma'))}"><option value="es">ES</option><option value="en">EN</option></select></label>
          <div class="notification-wrap">
            <button id="btnNotifications" class="header-icon-btn" aria-label="${esc(t('Ver notificaciones'))}"><i class="fa-solid fa-bell"></i><span id="portalBadge" class="header-icon-btn__badge"></span></button>
            <div id="portalNotificationPanel" class="notification-panel" hidden>
              <div class="notification-panel__header"><strong>${esc(t('Notificaciones'))}</strong><button id="btnClearPortalNotifications" type="button">${esc(t('Marcar leídas'))}</button></div>
              <div id="portalNotificationList" class="notification-list"></div>
              <div class="notification-detail" id="portalNotificationDetail">${esc(t('Seleccione una notificación para ver el detalle.'))}</div>
            </div>
          </div>
          <a class="btn-action btn-action--secondary" href="index.html"><i class="fa-solid fa-arrow-left"></i> ${esc(t('Volver'))}</a>
        </div>`;

      const toggle = document.getElementById('portalNavToggle');
      if (toggle) toggle.addEventListener('click', () => document.getElementById('portalNav')?.classList.toggle('portal-nav--open'));

      const languageSelect = document.getElementById('languageSelect');
      languageSelect.value = localStorage.getItem('aaa_language') === 'en' ? 'en' : 'es';
      languageSelect.addEventListener('change', (event) => {
        window.AAAI18n.setLanguage(event.target.value).then(() => { buildChrome(); window.renderPage?.(); });
      });

      const bell = document.getElementById('btnNotifications');
      const panel = document.getElementById('portalNotificationPanel');
      bell.addEventListener('click', (event) => {
        event.stopPropagation();
        panel.hidden = !panel.hidden;
        bell.setAttribute('aria-expanded', String(!panel.hidden));
      });
      document.getElementById('portalNotificationList').addEventListener('click', (event) => {
        const item = event.target.closest('[data-notification]');
        if (!item) return;
        const notice = visibleNotifications[Number(item.dataset.notification)];
        document.getElementById('portalNotificationDetail').innerHTML = `<b>${esc(t(notice.title))}</b><span>${esc(t(notice.detail || notice.text))}</span>`;
      });
      document.getElementById('btnClearPortalNotifications').addEventListener('click', () => {
        localStorage.setItem('aaa_notifications_read', String(visibleNotifications.length));
        renderNotifications();
        panel.hidden = true;
      });
      document.addEventListener('click', (event) => { if (!event.target.closest('.notification-wrap')) panel.hidden = true; });
    }
    renderNotifications();
  }

  function ensureToast() {
    if (document.getElementById('portalToast')) return;
    const toast = document.createElement('div');
    toast.id = 'portalToast';
    toast.className = 'toast';
    toast.innerHTML = '<i class="fa-solid fa-circle-check"></i><span></span>';
    document.body.appendChild(toast);
  }
  function showToast(message, isError = false) {
    ensureToast();
    const toast = document.getElementById('portalToast');
    toast.querySelector('span').textContent = message;
    toast.querySelector('i').className = `fa-solid ${isError ? 'fa-circle-xmark' : 'fa-circle-check'}`;
    toast.classList.toggle('error', isError);
    toast.classList.add('show');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 4200);
  }

  window.AAA = { t, employeeName, esc, showToast };
  window.AAAI18n.ready.then(() => {
    ensureToast();
    buildChrome();
    window.renderPage?.();
  });
})();
