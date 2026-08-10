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
    { href: 'politica.html', page: 'politica', label: 'Política interna', icon: 'fa-file-shield' }
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
    const meetings = JSON.parse(localStorage.getItem('aaa_meeting_notifications') || '[]');
    const meetingItems = meetings.slice(0, 5).map((item) => ({ icon: 'fa-video', title: 'Invitación a reunión', text: `${item.title} · ${item.date}`, detail: item.detail, time: item.time }));
    visibleNotifications = [...meetingItems, ...taskUpdates, ...alertItems, ...DEFAULT_NOTIFICATIONS];
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
        <nav class="portal-nav__list">${PAGES.map((page) => page.action
          ? `<button type="button" class="portal-nav__link ${page.page === currentPage ? 'active' : ''}" data-nav-action="${page.action}" title="${esc(t(page.label))}"><i class="fa-solid ${page.icon}"></i><span>${esc(t(page.label))}</span></button>`
          : `<a class="portal-nav__link ${page.page === currentPage ? 'active' : ''}" href="${page.href}" title="${esc(t(page.label))}"><i class="fa-solid ${page.icon}"></i><span>${esc(t(page.label))}</span></a>`).join('')}</nav>
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
        const setLanguage = window.AAAI18n?.setLanguage ? window.AAAI18n.setLanguage(event.target.value) : Promise.resolve();
        setLanguage.then(() => { buildChrome(); window.renderPage?.(); });
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
  // El botón "Volver" de cada módulo oculta el módulo actual y regresa al
  // menú "Mi portal". La navegación por defecto (index.html#miPortal) muestra
  // la sección del menú sin llamar al login ni al logout.
  document.querySelectorAll('.btn-back-home').forEach((btn) => {
    btn.addEventListener('click', () => {
      const module = document.querySelector('.portal-shell');
      if (module) module.style.display = 'none';
    });
  });
  // ================================================================
  //  Generador de PDF autocontenido (sin librerías externas).
  //  Permite abrir/descargar documentos PDF reales incluso sin Internet.
  //  rows = [{ text | parts:[{text,x,bold,size}], x, bold, size, gap, sep, band }]
  // ================================================================
  const latin1 = (text) => String(text ?? '')
    .replace(/₡/g, 'CRC ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, '...')
    .replace(/[−–—]/g, '-')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
  const wrapLines = (text, size, maxChars) => {
    const words = String(text).split(/\s+/);
    const lines = [];
    let line = '';
    for (const word of words) {
      const candidate = line ? line + ' ' + word : word;
      if (candidate.length > maxChars && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
    return lines;
  };
  const buildPdf = (rows) => {
    const parts = ['BT'];
    const W = 612;
    let y = 760;
    for (const row of rows) {
      if (row.band) {
        const h = row.bandHeight || 34;
        parts.push('ET');
        parts.push('0.043 0.082 0.18 rg 0 ' + (y - h).toFixed(1) + ' ' + W + ' ' + h + ' re f');
        parts.push('BT');
        parts.push('1 1 1 rg');
      } else if (row.sep) {
        parts.push('ET');
        parts.push('0.55 0.55 0.6 RG 50 ' + y.toFixed(1) + ' m ' + (W - 50) + ' ' + y.toFixed(1) + ' l S');
        parts.push('BT');
        parts.push('0 0 0 rg');
      } else {
        parts.push('0 0 0 rg');
      }
      const textY = row.band ? y - (row.bandHeight || 34) * 0.5 : y;
      const items = Array.isArray(row.parts) ? row.parts : [{ text: row.text, x: row.x, bold: row.bold, size: row.size }];
      let lineOffset = 0;
      for (const p of items) {
        const font = p.bold ? '/F2' : '/F1';
        const size = p.size || row.size || 11;
        const raw = String(p.text ?? '');
        const wrap = p.wrap || row.wrap;
        const maxChars = p.maxChars || row.maxChars || 95;
        const texts = wrap && raw.length > maxChars ? wrapLines(raw, size, maxChars) : [raw];
        for (const text of texts) {
          const ty = textY - lineOffset;
          const width = p.right != null ? text.length * size * 0.5 : 0;
          const x = p.x != null ? p.x : (p.right != null ? p.right - width : 50);
          parts.push(font + ' ' + size + ' Tf');
          parts.push('1 0 0 1 ' + x.toFixed(1) + ' ' + ty.toFixed(1) + ' Tm');
          parts.push('(' + latin1(text) + ') Tj');
          lineOffset += size + 3;
        }
      }
      y -= (row.gap || 16);
    }
    parts.push('ET');
    const stream = parts.join('\n');
    const objects = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
      '<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream'
    ];
    let pdf = '%PDF-1.4\n';
    const offsets = [];
    for (let i = 0; i < objects.length; i++) {
      offsets[i] = pdf.length;
      pdf += (i + 1) + ' 0 obj\n' + objects[i] + '\nendobj\n';
    }
    const xref = pdf.length;
    pdf += 'xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n';
    for (const o of offsets) pdf += String(o).padStart(10, '0') + ' 00000 n \n';
    pdf += 'trailer\n<< /Size ' + (objects.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF';
    const bytes = new Uint8Array(pdf.length);
    for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xFF;
    return bytes;
  };
  const pdfBlob = (rows) => new Blob([buildPdf(rows)], { type: 'application/pdf' });
  const openPdf = (rows) => {
    const url = URL.createObjectURL(pdfBlob(rows));
    const win = window.open(url, '_blank');
    if (!win) window.location.href = url;
  };
  const downloadPdf = (rows, filename) => {
    const url = URL.createObjectURL(pdfBlob(rows));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  window.AAA.pdf = { open: openPdf, download: downloadPdf };
  // Abre el PDF dentro de una página con barra de herramientas
  // (Imprimir y Volver a la página anterior).
  const openDocument = (rows, options = {}) => {
    const url = URL.createObjectURL(pdfBlob(rows));
    const win = window.open('', '_blank');
    if (!win) { window.location.href = url; return; }
    const title = options.title || 'Documento';
    win.document.write(
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(title) + '</title>' +
      '<style>' +
      'body{margin:0;font-family:Arial,sans-serif;background:#eef1f5;}' +
      '.doc-toolbar{position:sticky;top:0;z-index:10;display:flex;align-items:center;gap:10px;padding:10px 16px;background:#fff;border-bottom:1px solid #d0d7e2;box-shadow:0 1px 4px rgba(0,0,0,.08);}' +
      '.doc-toolbar__title{font-weight:700;color:#1d4ed8;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
      '.doc-toolbar button{border:1px solid #c3cbd8;background:#fff;color:#1d4ed8;font-weight:600;padding:8px 14px;border-radius:8px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;}' +
      '.doc-toolbar button:hover{background:#eef4ff;}' +
      '.doc-toolbar button.primary{background:#1d4ed8;border-color:#1d4ed8;color:#fff;}' +
      'iframe{width:100%;height:calc(100vh - 60px);border:0;display:block;}' +
      '</style></head><body>' +
      '<div class="doc-toolbar"><span class="doc-toolbar__title">' + esc(title) + '</span>' +
      '<button class="primary" onclick="window.print()">Imprimir</button>' +
      '<button onclick="window.history.length > 1 ? window.history.back() : window.close()">Volver a la página anterior</button>' +
      '</div><iframe src="' + url + '"></iframe></body></html>'
    );
    win.document.close();
  };
  window.AAA.pdf.openDocument = openDocument;

  // ================================================================
  //  Llamada simulada estilo videollamada (administrador).
  // ================================================================
  function startCall(names) {
    const people = Array.isArray(names) ? names : [names];
    const overlay = document.createElement('div');
    overlay.className = 'call-modal';
    overlay.innerHTML =
      '<div class="call-modal__box">' +
      '<div class="call-modal__avatar"><i class="fa-solid fa-user-tie"></i></div>' +
      '<p class="call-modal__name">' + esc(people.join(', ')) + '</p>' +
      '<p class="call-modal__status"><i class="fa-solid fa-spinner fa-spin"></i> Conectando…</p>' +
      '<div class="call-modal__actions">' +
      '<button type="button" class="call-modal__btn call-modal__btn--mute" title="Silenciar"><i class="fa-solid fa-microphone"></i></button>' +
      '<button type="button" class="call-modal__btn call-modal__btn--hang" title="Colgar"><i class="fa-solid fa-phone-slash"></i></button>' +
      '<button type="button" class="call-modal__btn call-modal__btn--video" title="Cámara"><i class="fa-solid fa-video"></i></button>' +
      '</div></div>';
    document.body.appendChild(overlay);
    const status = overlay.querySelector('.call-modal__status');
    const hang = overlay.querySelector('.call-modal__btn--hang');
    const mute = overlay.querySelector('.call-modal__btn--mute');
    const video = overlay.querySelector('.call-modal__btn--video');
    const finish = () => { overlay.remove(); showToast('Llamada finalizada.'); };
    const timer = window.setTimeout(() => {
      if (status) status.innerHTML = '<i class="fa-solid fa-phone-volume"></i> En llamada con ' + esc(people.join(', '));
    }, 2600);
    hang.addEventListener('click', () => { window.clearTimeout(timer); finish(); });
    mute.addEventListener('click', () => {
      const muted = mute.classList.toggle('active');
      mute.innerHTML = '<i class="fa-solid fa-microphone' + (muted ? '-slash' : '') + '"></i>';
    });
    video.addEventListener('click', () => {
      const on = video.classList.toggle('active');
      video.innerHTML = '<i class="fa-solid fa-video' + (on ? '-slash' : '') + '"></i>';
    });
    overlay.addEventListener('click', (event) => { if (event.target === overlay) finish(); });
  }

  // Guarda una invitación a reunión y la refleja en las notificaciones.
  function addMeetingNotification(meeting) {
    const list = JSON.parse(localStorage.getItem('aaa_meeting_notifications') || '[]');
    list.unshift({ title: meeting.title, date: meeting.date, time: meeting.time, detail: meeting.detail });
    localStorage.setItem('aaa_meeting_notifications', JSON.stringify(list));
    renderNotifications();
    showToast('Invitación a reunión enviada.');
  }
  window.AAA.startCall = startCall;
  window.AAA.addMeetingNotification = addMeetingNotification;

  // ================================================================
  //  Renderizado del módulo.
  //  IMPORTANTE: el script del módulo (que define window.renderPage)
  //  se ejecuta DESPUÉS de portal.js. La promesa de i18next resuelve
  //  como microtarea entre scripts, cuando renderPage aún no existe;
  //  por eso se vuelve a intentar en DOMContentLoaded (cuando ya está
  //  definida) en lugar de marcar "renderizado" con una llamada vacía.
  // ================================================================
  let rendered = false;
  let chromeBuilt = false;
  const render = () => {
    if (rendered || typeof window.renderPage !== 'function') return;
    rendered = true;
    window.renderPage();
  };
  const boot = () => {
    if (chromeBuilt) {
      render();
      return;
    }
    chromeBuilt = true;
    ensureToast();
    buildChrome();
    render();
  };
  document.addEventListener('DOMContentLoaded', boot);
  if (document.readyState !== 'loading') boot();
  if (window.AAAI18n?.ready) window.AAAI18n.ready.then(boot);
  // Abre la Política Interna en una ventana nueva lista para imprimir.
  function abrirPoliticaPDF() {
    const politicaHTML = `
      <html><head><title>Política Interna - AAA SOFTWARE</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 60px; color: #222; line-height: 1.8; max-width: 800px; margin: 0 auto; }
        h1 { color: #000; text-align: center; border-bottom: 3px solid #0056b3; padding-bottom: 15px; }
        h2 { color: #0056b3; margin-top: 30px; }
        p { text-align: justify; margin-bottom: 15px; }
        .header-img { text-align: center; margin-bottom: 30px; font-size: 24px; font-weight: bold; color: #0056b3; }
        .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #ccc; padding-top: 15px; }
      </style></head><body>
      <div class="header-img">AAA SOFTWARE</div>
      <h1>Política Interna de la Empresa</h1>
      <p><strong>Fecha de emisión:</strong> 01 de Enero 2025<br><strong>Versión:</strong> 1.0</p>
      <h2>1. Política de uso de equipos tecnológicos</h2>
      <p>Todo equipo tecnológico proporcionado por AAA SOFTWARE es para uso exclusivo laboral. Qeda estrictamente prohibida la instalación de software no autorizado por el departamento de TI. El empleado es responsable del cuidado físico del equipo asignado. En caso de daño, robo o pérdida, deberá reportarlo de inmediato mediante el sistema de soporte interno.</p>
      <h2>2. Reglamento interno de trabajo</h2>
      <p>El horario administrativo es de 8:00 AM a 5:00 PM, de lunes a viernes. Se requiere un código de vestimenta Business Casual. Se debe mantener un ambiente de respeto, profesionalismo y cero tolerancia al acoso en todas las áreas físicas y digitales de la empresa.</p>
      <h2>3. Política de vacaciones y permisos</h2>
      <p>Cada empleado tiene derecho a 12 días hábiles de vacaciones anuales. El máximo permitido por solicitud continua es de 4 días. Las solicitudes deben enviarse con al menos 2 semanas de anticipación a través del portal de autoservicio y serán aprobadas según la disponibilidad del equipo.</p>
      <h2>4. Seguridad de la información</h2>
      <p>Toda la información confidencial de AAA SOFTWARE y sus clientes está protegida bajo acuerdos de confidencialidad (NDA). El empleado no debe compartir, copiar o extraer datos sensibles fuera de las instalaciones o redes autorizadas de la empresa.</p>
      <div class="footer">© 2025 AAA SOFTWARE. Todos los derechos reservados. Este documento es de uso interno y confidencial.</div>
      <script>window.print();<\/script></body></html>
    `;
    const nuevaVentana = window.open('', '_blank');
    nuevaVentana.document.write(politicaHTML);
    nuevaVentana.document.close();
  }
  window.abrirPoliticaPDF = abrirPoliticaPDF;
})();
