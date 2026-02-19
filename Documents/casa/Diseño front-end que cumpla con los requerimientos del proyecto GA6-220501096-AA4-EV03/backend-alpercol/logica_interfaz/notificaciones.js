/**
 * Lógica para la página: notificaciones.html
 * Responsabilidades:
 * - Cargar lista de notificaciones del usuario
 * - Mostrar encuestas pendientes de responder al rol trabajador 
 * - Mostrar asignaciones de encuestas
 * - Marcar notificaciones como leídas al darle responder encuestas al rol trabajador
 * - Eliminar notificaciones para rol usuario y trabajador
 * - Redirigir a la encuesta correspondiente para el rol trabajdor 
 */

document.addEventListener('DOMContentLoaded', function () {
    // Verificar que ésta sea la página correcta
    if (document.body.id !== 'page-notificaciones') {
        return;
    }

    // ========== ELEMENTOS DEL DOM ==========
    const notificationContainer = document.querySelector('.container');
    const tabs = document.querySelectorAll('.tab');
    const cards = document.querySelectorAll('.card');

    let currentTab = 'todas';
    let notificationsData = [];

    // ========== FUNCIONES DE UTILIDAD ==========

    /**
     * Obtiene el token de autenticación del localStorage
     * @returns {string} Token JWT del usuario
     */
    const getAuthToken = () => localStorage.getItem('userToken');

    /**
     * Obtiene los datos del usuario autenticado
     * @returns {Object} Objeto con los datos del usuario
     */
    const getUserData = () => {
        const userStr = localStorage.getItem('userToken');
        try {
            return JSON.parse(userStr);
        } catch {
            return null;
        }
    };

    /**
     * Verifica que el usuario esté autenticado
     * @returns {boolean} true si existe token, false en caso contrario
     */
    const checkAuthentication = () => {
        const token = getAuthToken();
        if (!token) {
            window.showAppNotification('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.', 'error');
            window.location.href = 'index.html';
            return false;
        }
        return true;
    };

    /**
     * Carga el listado de notificaciones desde el servidor
     */
    const loadNotifications = async () => {
        if (!checkAuthentication()) return;

        try {
            const userData = getUserData();
            const token = getAuthToken();
            const response = await fetch(`http://localhost:3001/api/notificaciones?t=${new Date().getTime()}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const result = await response.json();

            if (response.ok) {
                notificationsData = result.data || [];
                displayNotifications();
                updateNotificationBadge();
            } else {
                console.error('Error al cargar notificaciones:', result.error);
                window.showAppNotification('Error al cargar notificaciones.', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            window.showAppNotification('No se pudo conectar con el servidor.', 'error');
        }
    };

    /**
     * Muestra las notificaciones en la página según el filtro activo
     */
    const displayNotifications = () => {
        const container = document.querySelector('.container');
        let filteredNotifications = notificationsData;

        // Filtrar según la pestaña activa
        if (currentTab === 'no-leidas') {
            filteredNotifications = notificationsData.filter(n => !n.leida);
        } else if (currentTab === 'leidas') {
            filteredNotifications = notificationsData.filter(n => n.leida);
        }

        // Limpiar contenedor (excepto título y pestañas)
        const cardElements = container.querySelectorAll('.card');
        cardElements.forEach(card => card.remove());

        if (filteredNotifications.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'card';
            emptyMessage.innerHTML = '<p style="text-align: center; color: #6c757d;">No hay notificaciones</p>';
            container.appendChild(emptyMessage);
            return;
        }

        // Crear tarjetas para cada notificación
        filteredNotifications.forEach(notification => {
            const card = document.createElement('div');
            card.className = 'card';
            if (notification.leida) {
                card.style.opacity = '0.6';
            }

            const icon = getIconForType(notification.tipo);
            const fecha = new Date(notification.fecha_creacion).toLocaleString('es-ES');

            // Determinar botón de acción según el tipo
            let actionButton = '';
            if (notification.tipo === 'asignacion' || notification.tipo === 'encuesta' || notification.tipo === 'nueva_encuesta') {
                actionButton = `<button class="secondary" onclick="irAEncuesta(${notification.id_encuesta}, ${notification.id_notificacion})">Responder Encuesta</button>`;
            } else if (notification.tipo === 'resultado') {
                actionButton = `<button class="secondary" onclick="verResultados(${notification.id_encuesta})">Ver Resultados</button>`;
            }

            card.innerHTML = `
                <h3>${icon} ${notification.titulo}</h3>
                <p>${notification.mensaje}</p>
                <small>${fecha}</small>
                <div style="margin-top: 10px;">
                    ${!notification.leida ? `<button class="secondary" onclick="marcarComoLeida(${notification.id_notificacion})" style="margin-right: 10px;">Marcar como leída</button>` : ''}
                    ${actionButton}
                    <button class="secondary" onclick="eliminarNotificacion(${notification.id_notificacion})" style="margin-left: 10px; background-color: #dc3545;">Eliminar</button>
                </div>
            `;

            container.appendChild(card);
        });
    };

    /**
     * Obtiene el icono apropiado según el tipo de notificación
     * @param {string} tipo - Tipo de notificación
     * @returns {string} Icono emoji
     */
    const getIconForType = (tipo) => {
        const icons = {
            'encuesta': '📋',
            'nueva_encuesta': '📋',
            'asignacion': '📧',
            'resultado': '📊',
            'respuesta': '✅'
        };
        return icons[tipo] || '🔔';
    };

    /**
     * Marca una notificación como leída
     * @param {number} notificationId - ID de la notificación
     */
    window.marcarComoLeida = async (notificationId) => {
        if (!checkAuthentication()) return;

        try {
            const token = getAuthToken();
            const response = await fetch(`http://localhost:3001/api/notificaciones/${notificationId}/leida`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (response.ok) {
                // Actualizar dato local
                const notification = notificationsData.find(n => n.id_notificacion === notificationId);
                if (notification) {
                    notification.leida = true;
                }
                
                // Actualizar visualmente la tarjeta para que se quede "en gris" y no desaparezca de la vista actual
                const btn = document.querySelector(`button[onclick="marcarComoLeida(${notificationId})"]`);
                if (btn) {
                    const card = btn.closest('.card');
                    if (card) {
                        card.style.opacity = '0.6';
                        btn.remove(); // Eliminar botón de "Marcar como leída"
                    }
                } else {
                    displayNotifications();
                }

                updateNotificationBadge();
                window.showAppNotification('Notificación marcada como leída.', 'success');
            } else {
                window.showAppNotification('Error al marcar como leída.', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            window.showAppNotification('No se pudo conectar con el servidor.', 'error');
        }
    };

    /**
     * Elimina una notificación
     * @param {number} notificationId - ID de la notificación
     */
    window.eliminarNotificacion = async (notificationId) => {
        if (!checkAuthentication()) return;

        if (!confirm('¿Deseas eliminar esta notificación?')) {
            return;
        }

        try {
            const token = getAuthToken();
            const response = await fetch(`http://localhost:3001/api/notificaciones/${notificationId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const result = await response.json();

            if (response.ok) {
                // Eliminar del array local
                notificationsData = notificationsData.filter(n => n.id_notificacion !== notificationId);
                displayNotifications();
                updateNotificationBadge();
                window.showAppNotification('Notificación eliminada.', 'success');
            } else {
                window.showAppNotification('Error al eliminar notificación.', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            window.showAppNotification('No se pudo conectar con el servidor.', 'error');
        }
    };

    /**
     * Redirige a la encuesta correspondiente
     * @param {number} surveyId - ID de la encuesta
     * @param {number} [notificationId] - ID de la notificación para marcar como leída
     */
    window.irAEncuesta = async (surveyId, notificationId) => {
        if (!surveyId) {
            window.showAppNotification('No se pudo obtener la encuesta.', 'error');
            return;
        }

        // Si se proporciona un ID de notificación, marcarla como leída antes de redirigir
        if (notificationId) {
            try {
                const token = getAuthToken();
                await fetch(`http://localhost:3001/api/notificaciones/${notificationId}/leida`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
            } catch (error) {
                console.error('Error al marcar notificación como leída:', error);
            }
        }
        // Guardar el ID de la encuesta en sessionStorage para que responder-encuesta.js lo use
        sessionStorage.setItem('selectedSurveyId', surveyId);
        window.location.href = 'responder-encuesta.html';
    };

    /**
     * Redirige a la página de resultados
     * @param {number} surveyId - ID de la encuesta
     */
    window.verResultados = (surveyId) => {
        if (!surveyId) return;
        // Guardar el ID para que resultados-y-reportes.js lo use si es necesario
        // O simplemente redirigir y dejar que el usuario busque
        sessionStorage.setItem('selectedReportId', surveyId);
        window.location.href = 'resultados-y-reportes.html';
    };

    /**
     * Actualiza el badge de notificaciones no leídas en el menú
     */
    const updateNotificationBadge = async () => {
        try {
            const token = getAuthToken();
            const response = await fetch('http://localhost:3001/api/notificaciones/no-leidas/count', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const result = await response.json();

            if (response.ok) {
                const badge = document.querySelector('.notification-badge .badge');
                if (badge) {
                    const count = result.data.count || 0;
                    badge.textContent = count;
                    badge.style.display = count > 0 ? 'inline-block' : 'none';
                }
            }
        } catch (error) {
            console.error('Error al actualizar badge:', error);
        }
    };

    /**
     * Marca todas las notificaciones como leídas al abrir la página
     */
    const markAllAsRead = async () => {
        if (!checkAuthentication()) return;
        try {
            const token = getAuthToken();
            const response = await fetch('http://localhost:3001/api/notificaciones/marcar-todas-leidas', {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const badge = document.querySelector('.notification-badge .badge');
                if (badge) badge.style.display = 'none';
                notificationsData.forEach(n => n.leida = true);
                displayNotifications();
            }
        } catch (error) {
            console.error('Error al marcar todas como leídas:', error);
        }
    };

    // ========== EVENT LISTENERS ==========

    /**
     * Cambia el filtro cuando se hace clic en una pestaña
     */
    tabs.forEach(tab => {
        tab.addEventListener('click', function () {
            // Remover clase activa de todas las pestañas
            tabs.forEach(t => t.classList.remove('active'));
            // Agregar clase activa a la pestaña clickeada
            this.classList.add('active');
            // Actualizar el filtro actual
            const tabText = this.textContent.toLowerCase();
            if (tabText.includes('todas')) {
                currentTab = 'todas';
            } else if (tabText.includes('no leídas')) {
                currentTab = 'no-leidas';
            } else if (tabText.includes('leídas')) {
                currentTab = 'leidas';
            }
            displayNotifications();
        });
    });

    // ========== INICIALIZACIÓN ==========

    // Cargar notificaciones al abrir la página
    loadNotifications().then(() => {
        markAllAsRead();
    });

    // Actualizar notificaciones cada 30 segundos
    setInterval(loadNotifications, 30000);
});
