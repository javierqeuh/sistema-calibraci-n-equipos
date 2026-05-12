/**
 * Lógica de navegación compartida para todas las páginas del panel de administración.
 * Responsabilidades:
 * - Manejar la redirección de los elementos del menú de navegación.
 * - Gestionar el cierre de sesión del usuario.
 * - Actualizar periódicamente el contador de notificaciones no leídas en el menú.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Obtener todos los elementos de navegación
    const navItems = document.querySelectorAll('.nav-bar .nav-item');
    const logoutBtn = document.querySelector('.logout-btn');

    /**
     * Obtiene el número de notificaciones no leídas desde la API
     * y actualiza el badge en el menú de navegación.
     */
    const updateNotificationBadge = async () => {
        try {
            const token = localStorage.getItem('userToken');
            if (!token) return;

            // Usar rutas relativas para mayor portabilidad
            const response = await fetch('/api/notificaciones/no-leidas/count', {
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
                    // Estilo verde para el contador
                    badge.style.backgroundColor = '#28a745';
                    badge.style.color = '#ffffff';
                }
            }
        } catch (error) {
            console.error('Error al actualizar badge:', error);
        }
    };
    
    // Llama a la función una vez al cargar la página
    updateNotificationBadge();
    
    // Actualiza el contador periódicamente para mantenerlo sincronizado
    setInterval(updateNotificationBadge, 15000); // 15 segundos es un intervalo más razonable que 5

    // Agregar evento de click a cada nav-item
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            // Evitar activación si el click fue en un subElement (como el badge)
            if (e.target.closest('.badge')) {
                return;
            }
            
            // Obtener la URL del atributo data-target
            const targetUrl = item.getAttribute('data-target');

            if (targetUrl) {
                window.location.href = targetUrl;
            } else {
                console.warn('URL no definida para el elemento de navegación:', item.textContent);
            }
        });
    });

    // Evento para cerrar sesión
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            // Limpiar datos de sesión
            localStorage.removeItem('userToken');
            sessionStorage.clear();
            
            // Mostrar notificación si window.showAppNotification existe
            if (window.showAppNotification) {
                window.showAppNotification('Sesión cerrada exitosamente.', 'success');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            } else {
                // Fallback si common.js no se cargó
                alert('Sesión cerrada.');
                window.location.href = 'index.html';
            }
        });
    }
});
