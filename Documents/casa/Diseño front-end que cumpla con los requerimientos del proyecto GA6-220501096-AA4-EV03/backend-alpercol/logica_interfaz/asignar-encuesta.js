/**
 * Lógica para la página: asignar-encuesta.html
 * Responsabilidades:
 * - Cargar listado de encuestas disponibles
 * - Cargar listado de trabajadores/usuarios
 * - Permitir seleccionar encuesta y trabajadores
 * - Asignar encuestas a trabajadores
 * - Generar tokens de acceso público
 * - Validar datos antes de enviar
 * - Manejar errores y notificaciones
 * - solo el usuario con rol usuario podra crear encuestas 
 */

document.addEventListener('DOMContentLoaded', function () {
    // Verificar que ésta sea la página correcta
    if (document.body.id !== 'page-asignar-encuesta') {
        return;
    }

    // ========== ELEMENTOS DEL DOM ==========
    const surveySelect = document.querySelector('select');
    const workerSearchInput = document.querySelector('input[placeholder="Buscar trabajador..."]');
    const checkboxesContainer = document.querySelector('div:has(label input[type="checkbox"])');
    const assignmentDateInput = document.querySelector('input[type="datetime-local"]');
    const publicTokenCheckbox = document.querySelector('label input[type="checkbox"]');
    const tokenDisplay = document.querySelector('div[style*="display: none"]');
    const assignBtn = document.querySelector('button');

    let selectedWorkers = [];
    let availableSurveys = [];
    let availableWorkers = [];
    let currentSelectedSurvey = null;

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
     * Carga el listado de encuestas disponibles
     */
    const loadSurveys = async () => {
        if (!checkAuthentication()) return;

        try {
            const token = getAuthToken();
            const response = await fetch('http://localhost:3001/surveys', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const result = await response.json();

            if (response.ok) {
                availableSurveys = result.data || [];

                // Llenar el select de encuestas
                if (surveySelect) {
                    surveySelect.innerHTML = ''; // Limpiar opciones
                    if (availableSurveys.length === 0) {
                        const option = document.createElement('option');
                        option.value = '';
                        option.textContent = 'No hay encuestas disponibles';
                        option.disabled = true;
                        surveySelect.appendChild(option);
                        // Opcional: Deshabilitar el botón de asignar
                        if(assignBtn) assignBtn.disabled = true;
                    } else {
                        const defaultOption = document.createElement('option');
                        defaultOption.value = '';
                        defaultOption.textContent = 'Seleccionar encuesta';
                        surveySelect.appendChild(defaultOption);

                        availableSurveys.forEach(survey => {
                            const option = document.createElement('option');
                            option.value = survey.id_encuesta;
                            option.textContent = survey.titulo; // Asegúrate que el campo es 'titulo'
                            surveySelect.appendChild(option);
                        });

                        if(assignBtn) assignBtn.disabled = false;
                    }
                }
            } else {
                window.showAppNotification(`Error: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Error al cargar encuestas:', error);
            window.showAppNotification('No se pudo conectar con el servidor.', 'error');
        }
    };

    /**
     * Carga el listado de trabajadores/usuarios disponibles
     */
    const loadWorkers = async () => {
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
                availableWorkers = result.data || [];
                displayWorkersList(availableWorkers);
            } else {
                window.showAppNotification(`Error: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Error al cargar trabajadores:', error);
            window.showAppNotification('No se pudo conectar con el servidor.', 'error');
        }
    };

    /**
     * Muestra el listado de trabajadores con checkboxes
     * @param {Array} workers - Lista de trabajadores a mostrar
     */
    const displayWorkersList = (workers) => {
        if (!checkboxesContainer) return;

        // Limpiar checkboxes previos (pero dejar el título)
        const existingCheckboxes = checkboxesContainer.querySelectorAll('label');
        existingCheckboxes.forEach(label => label.remove());

        workers.forEach(worker => {
            const label = document.createElement('label');
            label.style.display = 'block';
            label.style.margin = '8px 0';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = worker.id_usuario;
            checkbox.dataset.workerName = worker.nombre;
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    selectedWorkers.push({
                        id_usuario: worker.id_usuario,
                        nombre: worker.nombre
                    });
                } else {
                    selectedWorkers = selectedWorkers.filter(w => w.id_usuario !== worker.id_usuario);
                }
            });

            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(` ${worker.nombre} (${worker.rol})`));
            checkboxesContainer.appendChild(label);
        });
    };

    /**
     * Filtra los trabajadores según el término de búsqueda
     * @param {string} searchTerm - Término para filtrar
     */
    const filterWorkers = (searchTerm) => {
        if (!searchTerm) {
            displayWorkersList(availableWorkers);
            return;
        }

        const filtered = availableWorkers.filter(worker =>
            worker.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            worker.email.toLowerCase().includes(searchTerm.toLowerCase())
        );

        displayWorkersList(filtered);
    };

    /**
     * Genera un token de acceso público para la encuesta
     */
    const generatePublicToken = () => {
        if (!currentSelectedSurvey) {
            window.showAppNotification('Debes seleccionar una encuesta primero.', 'error');
            return;
        }

        // Generar un token aleatorio (en producción, esto debería venir del servidor)
        const randomToken = Math.random().toString(36).substring(2, 15) +
                           Math.random().toString(36).substring(2, 15);
        const publicUrl = `https://sistema.com/encuesta/public/${randomToken}`;

        if (tokenDisplay) {
            tokenDisplay.style.display = 'block';
            const codeElement = tokenDisplay.querySelector('code');
            if (codeElement) {
                codeElement.textContent = publicUrl;
            }
        }

        return randomToken;
    };

    /**
     * Valida que se hayan seleccionado encuesta y trabajadores
     * @returns {boolean} true si es válido
     */
    const validateAssignment = () => {
        if (!currentSelectedSurvey) {
            window.showAppNotification('Debes seleccionar una encuesta.', 'error');
            return false;
        }

        if (selectedWorkers.length === 0) {
            window.showAppNotification('Debes seleccionar al menos un trabajador.', 'error');
            return false;
        }

        return true;
    };

    /** *Envía la asignación al servidor*/
    const submitAssignment = async () => {
        if (!validateAssignment()) {
            return;
        }

        window.setButtonLoadingState('assign-btn', true, 'Asignando...');

        try {
            const token = getAuthToken();
            if (!token) {
                window.showAppNotification('Tu sesión ha expirado.', 'error');
                window.location.href = 'index.html';
                return;
            }

            const assignmentData = {
                id_encuesta: currentSelectedSurvey,
                usuarios: selectedWorkers.map(w => w.id_usuario),
                fecha_asignacion: assignmentDateInput?.value || new Date().toISOString(),
                generar_token_publico: publicTokenCheckbox?.checked || false
            };

            const response = await fetch('http://localhost:3001/api/surveys/asignaciones', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(assignmentData)
            });

            const result = await response.json();

            if (response.ok) {
                window.showAppNotification('¡Encuesta asignada correctamente!', 'success');

                // Limpiar formulario
                selectedWorkers = [];
                currentSelectedSurvey = null;
                if (surveySelect) surveySelect.value = '';
                if (publicTokenCheckbox) publicTokenCheckbox.checked = false;
                if (tokenDisplay) tokenDisplay.style.display = 'none';

                // Recargar trabajadores para desmarcar checkboxes
                loadWorkers();
            } else {
                window.showAppNotification(`Error: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Error al asignar encuesta:', error);
            window.showAppNotification('No se pudo conectar con el servidor.', 'error');
        } finally {
            window.setButtonLoadingState('assign-btn', false, 'Asignar seleccionados');
        }
    };

    // ========== EVENT LISTENERS ==========

    // Cambio en select de encuestas
    if (surveySelect) {
        surveySelect.addEventListener('change', (e) => {
            currentSelectedSurvey = e.target.value ? parseInt(e.target.value) : null;
            if (tokenDisplay) {
                tokenDisplay.style.display = 'none';
            }
        });
    }

    // Búsqueda de trabajadores
    if (workerSearchInput) {
        workerSearchInput.addEventListener('input', (e) => {
            filterWorkers(e.target.value);
        });
    }

    // Checkbox para generar token público
    if (publicTokenCheckbox) {
        publicTokenCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                generatePublicToken();
            } else if (tokenDisplay) {
                tokenDisplay.style.display = 'none';
            }
        });
    }

    // Botón de asignar
    if (assignBtn) {
        assignBtn.id = 'assign-btn';
        assignBtn.addEventListener('click', submitAssignment);
    }

    // Cargar datos iniciales
    loadSurveys();
    loadWorkers();
});
