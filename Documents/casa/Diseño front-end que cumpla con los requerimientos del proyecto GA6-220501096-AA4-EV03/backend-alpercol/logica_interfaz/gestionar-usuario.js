/**
 * Lógica para la página: gestionar-usuario.html
 * Responsabilidades:
 * - Cargar listado de usuarios y trabajadores
 * - Crear nuevos usuarios
 * - Editar usuarios existentes
 * - Eliminar usuarios
 * - Cambiar estado de usuarios (activo/inactivo)
 * - Validar datos antes de enviar
 * - Manejar errores y notificaciones
 */

document.addEventListener('DOMContentLoaded', function () {
    // Verificar que ésta sea la página correcta
    if (document.body.id !== 'page-gestionar-usuario') {
        return;
    }

    // ========== ELEMENTOS DEL DOM ==========
    const tabs = document.querySelectorAll('.tab');
    const addUserBtn = document.querySelector('button:first-of-type');
    const tableBody = document.querySelector('table tbody');
    const modalOverlay = document.getElementById('user-modal');
    const modalForm = document.getElementById('user-form');
    const modalTitle = document.getElementById('modal-title');
    const saveUserBtn = document.getElementById('save-user-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');

    // Campos del modal
    const userNameInput = document.getElementById('user-name-input');
    const userLastnameInput = document.getElementById('user-lastname-input');
    const userEmailInput = document.getElementById('user-email-input');
    const userRoleSelect = document.getElementById('user-role-select');
    const userPasswordInput = document.getElementById('user-password-input');

    let currentTab = 'usuarios'; // usuarios o trabajadores
    let editingUserId = null;
    let allUsers = [];
    let allWorkers = [];

    // ========== FUNCIONES DE UTILIDAD ==========

    /**
     * Obtiene el token de autenticación del localStorage
     * @returns {string} Token JWT del usuario
     */
    const getAuthToken = () => localStorage.getItem('userToken');

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
     * Carga el listado de usuarios
     */
    const loadUsers = async () => {
        if (!checkAuthentication()) return;

        try {
            const token = getAuthToken();
            const response = await fetch('http://localhost:3001/api/usuarios', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const result = await response.json();

            if (response.ok) {
                allUsers = result.data || [];
                displayUsers();
            } else {
                window.showAppNotification(`Error: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Error al cargar usuarios:', error);
            window.showAppNotification('No se pudo conectar con el servidor.', 'error');
        }
    };

    /**
     * Carga el listado de trabajadores
     */
    const loadWorkers = async () => {
        if (!checkAuthentication()) return;

        try {
            const token = getAuthToken();
            const response = await fetch('http://localhost:3001/api/trabajadores', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const result = await response.json();

            if (response.ok) {
                allWorkers = result.data || [];
                displayWorkers();
            } else {
                window.showAppNotification(`Error: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Error al cargar trabajadores:', error);
            window.showAppNotification('No se pudo conectar con el servidor.', 'error');
        }
    };

    /**
     * Muestra los usuarios en la tabla
     */
    const displayUsers = () => {
        if (!tableBody) return;

        tableBody.innerHTML = '';

        if (allUsers.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5">No hay usuarios registrados.</td></tr>';
            return;
        }

        allUsers.forEach(user => {
            const row = document.createElement('tr');
            const statusIcon = user.activo ? '✅' : '❌';

            row.innerHTML = `
                <td>${user.nombre} ${user.apellidos || ''}</td>
                <td>${user.email}</td>
                <td>${user.rol}</td>
                <td>${statusIcon}</td>
                <td>
                    <button class="secondary" style="padding: 5px 10px; margin-right: 5px;">Editar</button>
                    <button class="danger" style="padding: 5px 10px;">Eliminar</button>
                </td>
            `;

            // Botón Editar
            row.querySelector('.secondary').addEventListener('click', () => {
                openEditModal(user);
            });

            // Botón Eliminar
            row.querySelector('.danger').addEventListener('click', () => {
                deleteUser(user.id_usuario);
            });

            tableBody.appendChild(row);
        });
    };

    /**
     * Muestra los trabajadores en la tabla
     */
    const displayWorkers = () => {
        if (!tableBody) return;

        tableBody.innerHTML = '';

        if (allWorkers.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5">No hay trabajadores registrados.</td></tr>';
            return;
        }

        allWorkers.forEach(worker => {
            const row = document.createElement('tr');
            const statusIcon = worker.activo ? '✅' : '❌';

            row.innerHTML = `
                <td>${worker.nombre}</td>
                <td>${worker.email}</td>
                <td>${worker.departamento}</td>
                <td>${statusIcon}</td>
                <td>
                    <button class="secondary" style="padding: 5px 10px; margin-right: 5px;">Editar</button>
                    <button class="danger" style="padding: 5px 10px;">Eliminar</button>
                </td>
            `;

            // Botón Editar
            row.querySelector('.secondary').addEventListener('click', () => {
                openEditModal(worker);
            });

            // Botón Eliminar
            row.querySelector('.danger').addEventListener('click', () => {
                deleteWorker(worker.id_trabajador);
            });

            tableBody.appendChild(row);
        });
    };

    /**
     * Abre el modal para crear un nuevo usuario
     */
    const openCreateModal = () => {
        editingUserId = null;
        if (modalTitle) modalTitle.textContent = 'Crear Nuevo Usuario';
        if (modalForm) modalForm.reset();
        if (userLastnameInput) userLastnameInput.value = '';
        if (userPasswordInput) userPasswordInput.style.display = 'block';
        if (modalOverlay) modalOverlay.style.display = 'block';
    };

    /**
     * Abre el modal para editar un usuario existente
     * @param {Object} user - Usuario a editar
     */
    const openEditModal = (user) => {
        editingUserId = user.id_usuario || user.id_trabajador;
        if (modalTitle) modalTitle.textContent = 'Editar Usuario';

        if (userNameInput) userNameInput.value = user.nombre;
        if (userLastnameInput) userLastnameInput.value = user.apellidos || user.apellido || '';
        if (userEmailInput) userEmailInput.value = user.email;
        if (userRoleSelect) userRoleSelect.value = user.rol || '';
        if (userPasswordInput) {
            userPasswordInput.value = '';
            userPasswordInput.style.display = 'none'; // No mostrar contraseña en edición
        }

        if (modalOverlay) modalOverlay.style.display = 'block';
    };

    /**
     * Cierra el modal
     */
    const closeModal = () => {
        if (modalOverlay) modalOverlay.style.display = 'none';
        editingUserId = null;
        if (modalForm) modalForm.reset();
    };

    /**
     * Valida el formulario del modal
     * @returns {boolean} true si es válido
     */
    const validateUserForm = () => {
        const name = userNameInput?.value.trim();
        const lastname = userLastnameInput?.value.trim();
        const email = userEmailInput?.value.trim();
        const password = userPasswordInput?.value;

        if (!name) {
            window.showAppNotification('El nombre es requerido.', 'error');
            return false;
        }

        if (!lastname) {
            window.showAppNotification('Los apellidos son requeridos.', 'error');
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

        // Si es creación (no edición), validar contraseña
        if (!editingUserId && password) {
            const passwordValidation = validatePassword(password);
            if (!passwordValidation.isValid) {
                window.showAppNotification(passwordValidation.message, 'error');
                return false;
            }
        }

        return true;
    };

    /**
     * Guarda un usuario (creación o edición)
     */
    const saveUser = async () => {
        if (!validateUserForm()) {
            return;
        }

        window.setButtonLoadingState('save-user-btn', true, 'Guardando...');

        try {
            const token = getAuthToken();

            const userData = {
                nombre: userNameInput?.value.trim(),
                apellidos: userLastnameInput?.value.trim(),
                email: userEmailInput?.value.trim(),
                rol: userRoleSelect?.value,
                password: userPasswordInput?.value
            };

            const method = editingUserId ? 'PUT' : 'POST';
            const url = editingUserId
                ? `http://localhost:3001/api/usuarios/${editingUserId}`
                : 'http://localhost:3001/api/usuarios';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(userData)
            });

            const result = await response.json();

            if (response.ok) {
                const message = editingUserId ? 'Usuario actualizado correctamente.' : 'Usuario creado correctamente.';
                window.showAppNotification(message, 'success');
                closeModal();
                if (currentTab === 'usuarios') {
                    loadUsers();
                } else {
                    loadWorkers();
                }
            } else {
                window.showAppNotification(`Error: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Error al guardar usuario:', error);
            window.showAppNotification('No se pudo conectar con el servidor.', 'error');
        } finally {
            window.setButtonLoadingState('save-user-btn', false, 'Guardar Usuario');
        }
    };

    /**
     * Elimina un usuario
     * @param {number} userId - ID del usuario a eliminar
     */
    const deleteUser = async (userId) => {
        if (!confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
            return;
        }

        try {
            const token = getAuthToken();
            const response = await fetch(`http://localhost:3001/api/usuarios/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const result = await response.json();

            if (response.ok) {
                window.showAppNotification('Usuario eliminado correctamente.', 'success');
                loadUsers();
            } else {
                window.showAppNotification(`Error: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Error al eliminar usuario:', error);
            window.showAppNotification('No se pudo conectar con el servidor.', 'error');
        }
    };

    /**
     * Elimina un trabajador
     * @param {number} workerId - ID del trabajador a eliminar
     */
    const deleteWorker = async (workerId) => {
        if (!confirm('¿Estás seguro de que deseas eliminar este trabajador?')) {
            return;
        }

        try {
            const token = getAuthToken();
            const response = await fetch(`http://localhost:3001/api/trabajadores/${workerId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const result = await response.json();

            if (response.ok) {
                window.showAppNotification('Trabajador eliminado correctamente.', 'success');
                loadWorkers();
            } else {
                window.showAppNotification(`Error: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Error al eliminar trabajador:', error);
            window.showAppNotification('No se pudo conectar con el servidor.', 'error');
        }
    };

    // ========== EVENT LISTENERS ==========

    // Tabs
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            // Remover clase activa de todos los tabs
            tabs.forEach(t => t.classList.remove('active'));

            // Agregar clase activa al tab clickeado
            tab.classList.add('active');

            // Cambiar tab actual
            currentTab = tab.textContent.toLowerCase() === 'usuarios' ? 'usuarios' : 'trabajadores';

            // Cargar datos del tab
            if (currentTab === 'usuarios') {
                loadUsers();
            } else {
                loadWorkers();
            }
        });
    });

    // Botón para crear usuario
    if (addUserBtn) {
        addUserBtn.addEventListener('click', openCreateModal);
    }

    // Botón para guardar usuario (en modal)
    if (saveUserBtn) {
        saveUserBtn.addEventListener('click', saveUser);
    }

    // Botón para cerrar modal
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }

    // Cerrar modal al hacer clic fuera
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                closeModal();
            }
        });
    }

    // Cargar usuarios al abrir la página
    loadUsers();
});
