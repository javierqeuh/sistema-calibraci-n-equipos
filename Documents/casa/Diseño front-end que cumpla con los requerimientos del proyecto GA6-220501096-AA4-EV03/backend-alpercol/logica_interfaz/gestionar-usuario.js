/**
 * Lógica para la página: gestionar-usuario.html
 * Responsabilidades:
 * - Cargar y mostrar listados de usuarios y trabajadores.
 * - Permitir cambiar entre las pestañas de "Usuarios" y "Trabajadores".
 * - Abrir un modal para crear o editar usuarios.
 * - Validar los datos del formulario antes de enviarlos.
 * - Enviar solicitudes a la API para crear, actualizar y eliminar usuarios.
 * - Utilizar delegación de eventos para un manejo eficiente de las acciones de la tabla.
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
    // Almacén centralizado para los datos de ambas pestañas
    const dataStore = {
        usuarios: [],
        trabajadores: []
    };
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
     * Carga los datos (usuarios o trabajadores) desde la API.
     * @param {string} type - El tipo de datos a cargar ('usuarios' o 'trabajadores').
     */
    const loadData = async (type) => {
        if (!checkAuthentication()) return;
        const endpoint = type === 'usuarios' ? '/api/usuarios' : '/api/trabajadores';

        try {
            const token = getAuthToken();
            const response = await fetch(endpoint, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();

            if (response.ok) {
                dataStore[type] = result.data || [];
                renderTable();
            } else {
                window.showAppNotification(`Error: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error(`Error al cargar ${type}:`, error);
            window.showAppNotification('No se pudo conectar con el servidor.', 'error');
        }
    };

    /**
     * Renderiza la tabla con los datos de la pestaña actual.
     */
    const renderTable = () => {
        if (!tableBody) return;

        tableBody.innerHTML = '';
        
        const data = dataStore[currentTab];
        const isUsersTab = currentTab === 'usuarios';
        const headers = isUsersTab 
            ? ['Nombre', 'Email', 'Rol', 'Activo', 'Acciones']
            : ['Nombre', 'Email', 'Departamento', 'Activo', 'Acciones'];

        // Actualizar cabeceras de la tabla
        const headerRow = tableBody.parentElement.querySelector('thead tr');
        if (headerRow) {
            headerRow.innerHTML = headers.map(h => `<th>${h}</th>`).join('');
        }

        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="${headers.length}">No hay ${currentTab} registrados.</td></tr>`;
            return;
        }

        data.forEach(item => {
            const row = document.createElement('tr');
            // Guardamos el ID de usuario en la fila para un acceso fácil
            row.dataset.id = item.id_usuario;

            const statusIcon = item.activo ? '✅' : '❌';
            const name = isUsersTab ? `${item.nombre} ${item.apellidos || ''}` : item.nombre;
            const roleOrDept = isUsersTab ? item.rol : item.departamento;

            row.innerHTML = `
                <td>${name}</td>
                <td>${item.email}</td>
                <td>${roleOrDept}</td>
                <td>${statusIcon}</td>
                <td>
                    <button class="secondary edit-btn" style="padding: 5px 10px; margin-right: 5px;">Editar</button>
                    <button class="danger delete-btn" style="padding: 5px 10px;">Eliminar</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    };

    /**
     * Abre el modal para crear un nuevo usuario
     */
    const openCreateModal = () => {
        editingUserId = null;
        if (modalTitle) modalTitle.textContent = 'Crear Nuevo Usuario';
        if (modalForm) modalForm.reset(); // Limpia todos los campos
        if (userPasswordInput) {
            userPasswordInput.placeholder = 'Crear una contraseña segura';
        }
        if (modalOverlay) modalOverlay.style.display = 'block';
        userRoleSelect.value = 'usuario'; // Valor por defecto
    };

    /**
     * Abre el modal para editar un usuario existente
     * @param {Object} user - Usuario a editar
     */
    const openEditModal = (user) => {
        editingUserId = user.id_usuario;
        if (modalTitle) modalTitle.textContent = 'Editar Usuario';

        if (userNameInput) userNameInput.value = user.nombre;
        if (userLastnameInput) userLastnameInput.value = user.apellidos || '';
        if (userEmailInput) userEmailInput.value = user.email;
        if (userRoleSelect) userRoleSelect.value = user.rol || 'usuario';
        if (userPasswordInput) {
            userPasswordInput.value = '';
            // Es mejor cambiar el placeholder para indicar que es opcional
            userPasswordInput.placeholder = 'Dejar en blanco para no cambiar';
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

        // La contraseña es obligatoria solo al crear un usuario nuevo.
        if (!editingUserId && !password) {
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

        window.setButtonLoadingState('save-user-btn', true, 'Guardar Usuario');

        try {
            const token = getAuthToken();

            const userData = {
                nombre: userNameInput?.value.trim(),
                apellidos: userLastnameInput?.value.trim(),
                email: userEmailInput?.value.trim(),
                rol: userRoleSelect?.value,
            };

            // Solo incluir la contraseña si se ha escrito algo
            if (userPasswordInput?.value) {
                userData.password = userPasswordInput.value;
            }

            const method = editingUserId ? 'PUT' : 'POST';
            const url = editingUserId
                ? `/api/usuarios/${editingUserId}` : '/api/usuarios';

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
                loadData(currentTab); // Recargar la tabla actual
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
     * Elimina un usuario (o trabajador). La API se encarga de la lógica en cascada.
     * @param {number} userId - ID del usuario a eliminar
     */
    const deleteItem = async (userId) => {
        if (!confirm('¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            const token = getAuthToken();
            // BUG CORREGIDO: Siempre se elimina a través de la ruta de usuarios,
            // ya que el backend está configurado para borrar el trabajador asociado.
            const response = await fetch(`/api/usuarios/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const result = await response.json();

            if (response.ok) {
                window.showAppNotification('Usuario eliminado correctamente.', 'success');
                loadData(currentTab); // Recargar la tabla actual
            } else {
                window.showAppNotification(`Error: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Error al eliminar usuario:', error);
            window.showAppNotification('No se pudo conectar con el servidor.', 'error');
        }
    };

    /**
     * Maneja los clics en la tabla usando delegación de eventos.
     * @param {Event} e - El objeto del evento.
     */
    const handleTableClick = (e) => {
        const target = e.target;
        const row = target.closest('tr');
        if (!row || !row.dataset.id) return;

        const userId = parseInt(row.dataset.id, 10);
        const item = dataStore[currentTab].find(d => d.id_usuario === userId);

        if (target.classList.contains('edit-btn')) {
            if (item) openEditModal(item);
        } else if (target.classList.contains('delete-btn')) {
            deleteItem(userId);
        }
    };

    // ========== EVENT LISTENERS ==========

    // Manejador para las pestañas
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            // Remover clase activa de todos los tabs
            tabs.forEach(t => t.classList.remove('active'));

            // Agregar clase activa al tab clickeado
            tab.classList.add('active');

            // Cambiar tab actual
            currentTab = tab.textContent.toLowerCase() === 'usuarios' ? 'usuarios' : 'trabajadores';

            // Cargar datos del tab
            loadData(currentTab);
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

    // Delegación de eventos en la tabla
    if (tableBody) {
        tableBody.addEventListener('click', handleTableClick);
    }

    // Cargar usuarios al abrir la página
    loadData('usuarios');
});
