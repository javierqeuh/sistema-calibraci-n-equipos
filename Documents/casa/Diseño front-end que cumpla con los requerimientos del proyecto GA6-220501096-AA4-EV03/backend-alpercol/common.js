// js/common.js
// Funciones auxiliares compartidas y protección de rutas

// --- Función auxiliar para mostrar notificaciones (toasts) ---
const showAppNotification = (message, type = 'info', duration = 3000) => {
    let notification = document.querySelector('.app-notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.classList.add('app-notification');
        document.body.appendChild(notification);
    }
    notification.className = 'app-notification'; // Reset
    notification.classList.add(`app-notification--${type}`);
    notification.textContent = message;
    notification.classList.add('show');
    setTimeout(() => {
        notification.classList.remove('show');
    }, duration);
};

// --- Función auxiliar para establecer el estado de carga del botón ---
const setButtonLoadingState = (buttonId, isLoading, defaultText) => {
    const button = document.getElementById(buttonId);
    if (button) {
        button.disabled = isLoading;
        button.textContent = isLoading ? 'Cargando...' : defaultText;
    }
};

// --- Función auxiliar para mostrar errores en formularios ---
const showFormError = (elementId, message) => {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = message ? 'block' : 'none';
    }
};

// --- Función auxiliar para borrar todos los errores del formulario ---
const clearAllFormErrors = (formId) => {
    const form = document.getElementById(formId);
    if (form) {
        form.querySelectorAll('.error-message').forEach(span => {
            span.textContent = '';
            span.style.display = 'none';
        });
    }
};

// --- Hacer funciones globales para que los otros scripts las puedan usar ---
// Esto las adjunta al objeto `window`, haciéndolas accesibles desde cualquier script.
window.showAppNotification = showAppNotification;
window.setButtonLoadingState = setButtonLoadingState;
window.showFormError = showFormError;
window.clearAllFormErrors = clearAllFormErrors;

// --- Guardián de rutas: Proteger páginas del panel ---
document.addEventListener('DOMContentLoaded', () => {
    // Excluimos las páginas públicas como el login o el registro.
    const publicPages = ['index.html', 'registro.html', 'interfasz-ingreso.html'];
    const currentPage = window.location.pathname.split('/').pop();

    if (!publicPages.includes(currentPage)) {
        const token = localStorage.getItem('userToken');
        if (!token) {
            window.location.href = 'index.html'; // Redirigir al login si no hay token
        }
    }
});