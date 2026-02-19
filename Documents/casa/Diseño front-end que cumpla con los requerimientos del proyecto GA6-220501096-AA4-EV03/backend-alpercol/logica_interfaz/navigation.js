// js/navigation.js
// Script compartido de navegación para todas las páginas

document.addEventListener('DOMContentLoaded', () => {
    // Obtener todos los elementos de navegación
    const navItems = document.querySelectorAll('.nav-bar .nav-item');
    const logoutBtn = document.querySelector('.logout-btn');

    // Función para actualizar el badge de notificaciones
    const updateNotificationBadge = async () => {
        try {
            const token = localStorage.getItem('userToken');
            if (!token) return;

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
                    // Estilo verde para el contador
                    badge.style.backgroundColor = '#28a745';
                    badge.style.color = '#ffffff';
                }
            }
        } catch (error) {
            console.error('Error al actualizar badge:', error);
        }
    };
    updateNotificationBadge();
    
    // Actualizar el contador cada 5 segundos para que aparezca apenas llegue la notificación
    setInterval(updateNotificationBadge, 5000);

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
