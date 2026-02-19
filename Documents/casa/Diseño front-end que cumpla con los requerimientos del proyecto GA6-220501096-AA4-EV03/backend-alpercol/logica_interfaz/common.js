// js/common.js

/**
 * Controla el estado de un botón durante una operación asíncrona.
 * @param {string} buttonId - El ID del elemento del botón.
 * @param {boolean} isLoading - Si el estado de carga está activo.
 * @param {string} defaultText - El texto original del botón para restaurarlo.
 */
window.setButtonLoadingState = (buttonId, isLoading, defaultText = 'Enviar') => {
    const button = document.getElementById(buttonId);
    if (!button) {
        console.error(`Button with ID "${buttonId}" not found.`);
        return;
    }

    if (isLoading) {
        // Guardar el texto original si no se ha guardado ya
        if (!button.dataset.originalText) {
            button.dataset.originalText = button.textContent;
        }
        button.disabled = true;
        button.textContent = 'Guardando...';
    } else {
        // Restaurar el texto original
        button.disabled = false;
        button.textContent = button.dataset.originalText || defaultText;
    }
};

/**
 * Muestra una notificación flotante en la aplicación.
 * @param {string} message - El mensaje a mostrar.
 * @param {string} type - El tipo de notificación ('success', 'error', 'info').
 */
window.showAppNotification = (message, type = 'info') => {
    // Crear el contenedor de notificaciones si no existe
    let notificationsContainer = document.getElementById('app-notifications-container');
    if (!notificationsContainer) {
        notificationsContainer = document.createElement('div');
        notificationsContainer.id = 'app-notifications-container';
        notificationsContainer.style.position = 'fixed';
        notificationsContainer.style.top = '20px';
        notificationsContainer.style.right = '20px';
        notificationsContainer.style.zIndex = '9999';
        notificationsContainer.style.display = 'flex';
        notificationsContainer.style.flexDirection = 'column';
        notificationsContainer.style.gap = '10px';
        document.body.appendChild(notificationsContainer);
    }

    const notification = document.createElement('div');
    notification.className = `app-notification notification-${type}`;
    notification.textContent = message;

    // Estilos básicos
    notification.style.padding = '15px 20px';
    notification.style.borderRadius = '8px';
    notification.style.color = '#fff';
    notification.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100%)';
    notification.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    
    // Colores por tipo
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        info: '#17a2b8'
    };
    notification.style.backgroundColor = colors[type] || colors.info;

    // Añadir al contenedor
    notificationsContainer.appendChild(notification);

    // Animación de entrada
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    }, 10);

    // Desaparecer después de 5 segundos
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        notification.addEventListener('transitionend', () => notification.remove());
    }, 5000);
};
