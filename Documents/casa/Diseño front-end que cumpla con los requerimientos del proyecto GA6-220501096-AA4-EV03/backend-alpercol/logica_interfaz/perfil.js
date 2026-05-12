/**
 * Lógica para la página: perfil.html
 * Responsabilidades:
 * - Cargar datos del perfil del usuario autenticado
 * - Permitir editar nombre, email, teléfono, etc.
 * - Cambiar contraseña del usuario
 * - Validar datos antes de enviar
 * - Enviar cambios al servidor
 * - Manejar errores y notificaciones
 */

document.addEventListener('DOMContentLoaded', function () {
    // Verificar que ésta sea la página correcta
    if (document.body.id !== 'page-perfil') {
        return;
    }

    // ========== ELEMENTOS DEL DOM ==========
    const profileForm = document.getElementById('profile-form');
    const saveProfileBtn = document.getElementById('save-profile-btn');

  


    // Campos del perfil
    const profileNombreInput = document.getElementById('profile-nombre');
    const profileApellidosInput = document.getElementById('profile-apellidos');
    const profileEmailInput = document.getElementById('profile-email');
    const profileRolInput = document.getElementById('profile-rol');
    const profileHeaderName = document.getElementById('profile-header-name');

    // ========== FUNCIONES DE UTILIDAD ==========

    /**
     * Obtiene el token de autenticación del localStorage
     * @returns {string} Token JWT del usuario
     */
    const getAuthToken = () => localStorage.getItem('userToken');

    /**
     * Obtiene los datos del usuario autenticado del token almacenado
     * @returns {Object} Objeto con los datos del usuario
     */
    const getUserData = () => {
        const userStr = localStorage.getItem('userData');
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
     * Valida una dirección de email
     * @param {string} email - Email a validar
     * @returns {boolean} true si es válido
     */
    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    /**
     * Valida que una contraseña cumpla los requisitos
     * @param {string} password - Contraseña a validar
     * @returns {Object} {isValid: boolean, message: string}
     */
    const validatePassword = (password) => {
        if (password.length < 8) {
            return { isValid: false, message: 'La contraseña debe tener al menos 8 caracteres.' };
        }
        if (!/[A-Z]/.test(password)) {
            return { isValid: false, message: 'La contraseña debe contener al menos una mayúscula.' };
        }
        if (!/[0-9]/.test(password)) {
            return { isValid: false, message: 'La contraseña debe contener al menos un número.' };
        }
        return { isValid: true, message: '' };
    };

    /**
     * Carga los datos del perfil del usuario desde localStorage
     */
    const loadUserProfile = async () => {
        if (!checkAuthentication()) return;

        try {
            const token = getAuthToken();
            // Petición real a la API para obtener datos frescos
            const response = await fetch('http://localhost:3001/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('userData', JSON.stringify(data.user)); // Actualizar caché local
                displayUserProfile(data.user);
            }
        } catch (error) {
            console.error('Error al cargar perfil:', error);
            window.showAppNotification('No se pudo cargar los datos del usuario.', 'error');
        }
    };

    /**
     * Muestra los datos del perfil en los campos correspondientes
     * @param {Object} user - Objeto con los datos del usuario
     */
    const displayUserProfile = (user) => {
        // Campos de entrada (modo edición)
        if (profileNombreInput) {
            profileNombreInput.value = user.nombre || '';
        }
        if (profileApellidosInput) {
            // Si no viene apellidos, intenta extraerlo del nombre completo
            let apellidos = user.apellidos || '';
            if (!apellidos && user.nombre) {
                const partes = user.nombre.trim().split(' ');
                if (partes.length > 1) {
                    apellidos = partes.slice(1).join(' ');
                }
            }
            profileApellidosInput.value = apellidos;
        }
        if (profileEmailInput) profileEmailInput.value = user.email || '';
        if (profileRolInput) profileRolInput.value = user.rol || '';

        // Mostrar nombre completo en el encabezado
        if (profileHeaderName) {
            let nombreCompleto = '';
            if (profileNombreInput && profileApellidosInput) {
                const nombre = profileNombreInput.value.trim();
                const apellidos = profileApellidosInput.value.trim();
                nombreCompleto = `${nombre} ${apellidos}`.trim();
            }
            profileHeaderName.textContent = nombreCompleto || 'Mi Perfil';
        }
    };

    /**
     * Activa el modo de edición del perfil
     */
    const activateEditMode = () => {
        // En la interfaz actual, no hay modo lectura/edición separados
        // Los campos siempre están habilitados para edición
    };

    /**
     * Desactiva el modo de edición del perfil
     */
    const deactivateEditMode = () => {
        // En la interfaz actual, no hay modo lectura/edición separados
        loadUserProfile(); // Recargar datos originales
    };

    /**
     * Valida los datos del formulario de perfil
     * @returns {boolean} true si todos los datos son válidos
     */
    const validateProfileForm = () => {
        const nombre = profileNombreInput?.value.trim();
        const apellidos = profileApellidosInput?.value.trim();
        const email = profileEmailInput?.value.trim();

        if (!nombre) {
            window.showAppNotification('El nombre es requerido.', 'error');
            return false;
        }

        if (!apellidos) {
            window.showAppNotification('El apellido es requerido.', 'error');
            return false;
        }

        if (!email) {
            window.showAppNotification('El email es requerido.', 'error');
            return false;
        }

        if (!validateEmail(email)) {
            window.showAppNotification('Por favor, ingresa un email válido.', 'error');
            return false;
        }

        return true;
    };

    /**
     * Guarda los cambios del perfil en localStorage
     */
    const saveProfile = async () => {
        if (!validateProfileForm()) {
            return;
        }

        window.setButtonLoadingState('save-profile-btn', true, 'Guardando...');

        try {
            const userData = getUserData();

            // Datos a enviar al backend
            const updatedData = {
                nombre: profileNombreInput?.value.trim(),
                apellidos: profileApellidosInput?.value.trim(),
                email: profileEmailInput?.value.trim()
            };

            const token = getAuthToken();
            // Petición PUT real a la base de datos
            const response = await fetch(`http://localhost:3001/api/usuarios/${userData.id_usuario}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updatedData)
            });

            if (!response.ok) throw new Error('Error al actualizar en el servidor');

            // Guardar datos actualizados en localStorage
            const newUserData = { ...userData, ...updatedData };
            localStorage.setItem('userData', JSON.stringify(newUserData));

            // Actualizar información visual en el sidebar inmediatamente
            const sidebarNameEl = document.querySelector('.user-info h3');
            if (sidebarNameEl) {
                sidebarNameEl.textContent = `${updatedData.nombre} ${updatedData.apellidos || ''}`.trim();
            }

            window.showAppNotification('Perfil actualizado correctamente.', 'success');
            loadUserProfile();
        } catch (error) {
            console.error('Error al guardar perfil:', error);
            window.showAppNotification('Error al guardar el perfil.', 'error');
        } finally {
            window.setButtonLoadingState('save-profile-btn', false, 'Guardar cambios');
        }
    };

    // agregar foto perfil
     const profilePictureInput = document.getElementById('profile-picture-input');
     const profilePicturePreview = document.getElementById('profile-picture-preview');
        if (profilePictureInput && profilePicturePreview) {
            profilePictureInput.addEventListener('change', function () {
                const file = this.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function (e) {
                        profilePicturePreview.src = e.target.result;
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

    // ========== EVENT LISTENERS ==========

    // Botón para guardar cambios del perfil
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', saveProfile);
    }

    // Cargar perfil al abrir la página
    loadUserProfile();
});
