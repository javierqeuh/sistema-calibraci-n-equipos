/**
 * Lógica para la página de inicio de sesión (index.html).
 * Responsabilidades:
 * - Validar los campos del formulario (email, contraseña, rol).
 * - Enviar las credenciales a la API para autenticación.
 * - Manejar la respuesta del servidor (éxito o error).
 * - Almacenar el token y los datos del usuario en localStorage en caso de éxito.
 * - Redirigir al usuario al dashboard tras un inicio de sesión exitoso.
 */
document.addEventListener('DOMContentLoaded', () => {
  // === CONFIGURACIÓN CENTRALIZADA (diccionarios) ===
  const CONFIG = {
    // Credenciales permitidas (SOLO PARA PROTOTIPO – reemplazar con API en producción)
    // Mensajes de error y UI (fácil de traducir)
    MESSAGES: {
      errors: {
        emailRequired: 'El email es obligatorio.',
        emailInvalid: 'Formato de email inválido.',
        passwordRequired: 'La contraseña es obligatoria.',
        roleRequired: 'Seleccione un rol.'
      },
      success: {
        loginSuccess: '✅ ¡Inicio de sesión exitoso!'
      },
      ui: {
        buttonDefault: 'Iniciar Sesión',
        buttonLoading: 'Verificando...'
      }
    },

    // Validación de email (regex reutilizable)
    VALIDATION: {
      emailRegex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },

    // Redirección tras login exitoso
    REDIRECT_URL: 'dashboard.html',
    API_BASE_URL: 'http://localhost:3001'
  };

  // === SELECTORES Y ELEMENTOS DEL DOM ===
  const SELECTORS = {
    form: '#login-form',
    fields: {
      email: '#email',
      password: '#password',
      role: '#role'
    },
    errors: {
      email: '#email-error',
      password: '#password-error',
      role: '#role-error'
    },
    submitBtn: '#submit-btn'
  };

  // === OBTENER ELEMENTOS ===
  const form = document.querySelector(SELECTORS.form);
  if (!form) return;

  const elements = {
    inputs: {
      email: document.querySelector(SELECTORS.fields.email),
      password: document.querySelector(SELECTORS.fields.password),
      role: document.querySelector(SELECTORS.fields.role)
    },
    errors: {
      email: document.querySelector(SELECTORS.errors.email),
      password: document.querySelector(SELECTORS.errors.password),
      role: document.querySelector(SELECTORS.errors.role)
    },
    submitBtn: document.querySelector(SELECTORS.submitBtn)
  };

  // Verificar que todos los elementos existan
  const allElementsExist = Object.values(elements.inputs).every(el => el) &&
                           Object.values(elements.errors).every(el => el) &&
                           elements.submitBtn;

  if (!allElementsExist) {
    console.error('⚠️ Uno o más elementos del formulario no se encontraron en el DOM.');
    return;
  }

  // === FUNCIONES AUXILIARES ===

  /**
   * Muestra u oculta un mensaje de error para un campo específico.
   * @param {string} field - La clave del campo (ej. 'email', 'password').
   * @param {string} [message=''] - El mensaje de error a mostrar. Si está vacío, se oculta.
   */
  function showError(field, message = '') {
    const errorEl = elements.errors[field];
    if (!errorEl) return;
    errorEl.textContent = message;
    errorEl.style.display = message ? 'block' : 'none';
  }

  /**
   * Limpia todos los mensajes de error del formulario.
   */
  function clearAllErrors() {
    Object.keys(elements.errors).forEach(field => showError(field, ''));
  }

  /**
   * Valida si una cadena tiene el formato de un email.
   * @param {string} email - El email a validar.
   * @returns {boolean} - `true` si el formato es válido, `false` en caso contrario.
   */
  function isValidEmail(email) {
    return CONFIG.VALIDATION.emailRegex.test(email);
  }

  /**
   * Valida todos los campos del formulario de inicio de sesión.
   * @param {string} email - El valor del campo de email.
   * @param {string} password - El valor del campo de contraseña.
   * @param {string} role - El valor del campo de rol.
   * @returns {{ isValid: boolean, errors: Object }}
   */
  function validateForm(email, password, role) {
    const errors = {};
    let isValid = true;

    if (!email) {
      errors.email = CONFIG.MESSAGES.errors.emailRequired;
      isValid = false;
    } else if (!isValidEmail(email)) {
      errors.email = CONFIG.MESSAGES.errors.emailInvalid;
      isValid = false;
    }

    if (!password) {
      errors.password = CONFIG.MESSAGES.errors.passwordRequired;
      isValid = false;
    }

    if (!role) {
      errors.role = CONFIG.MESSAGES.errors.roleRequired;
      isValid = false;
    }

    return { isValid, errors };
  }

  /**
   * Envía las credenciales al endpoint de login de la API.
   * @param {string} email - El email del usuario.
   * @param {string} password - La contraseña del usuario.
   * @param {string} role - El rol seleccionado por el usuario.
   * @returns {Promise<{ok: boolean, data: any}>} - Una promesa que resuelve con el estado de la respuesta y los datos.
   */
  async function authenticateUser(email, password, role) {
    const response = await fetch(`${CONFIG.API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password, role })
    });

    const data = await response.json();

    return { ok: response.ok, data };
  }

  /**
   * Controla el estado visual y de habilitación del botón de envío.
   * @param {boolean} [loading=false] - `true` para mostrar el estado de carga, `false` para el estado normal.
   */
  function setButtonState(loading = false) {
    const btn = elements.submitBtn;
    if (!btn) return;
    btn.disabled = loading;
    btn.textContent = loading
      ? CONFIG.MESSAGES.ui.buttonLoading
      : CONFIG.MESSAGES.ui.buttonDefault;
  }

  // === MANEJADOR DEL FORMULARIO ===
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllErrors();

    const email = elements.inputs.email.value.trim();
    const password = elements.inputs.password.value.trim();
    const role = elements.inputs.role.value.trim();

    // Validación
    const { isValid, errors } = validateForm(email, password, role);
    if (!isValid) {
      Object.entries(errors).forEach(([field, message]) => {
        showError(field, message);
      });
      return;
    }

    // Iniciar estado de carga
    setButtonState(true);

    try {
      // Autenticación
      const { ok, data } = await authenticateUser(email, password, role);

      if (ok) {
        alert(CONFIG.MESSAGES.success.loginSuccess);

        // Almacenamiento de usuario:
        // El servidor devuelve { message, user: { id_usuario, nombre, email, rol } }
        // Guardamos la información del usuario en localStorage para acceso posterior
        // NOTA: Guardamos el token JWT en 'userToken' para las peticiones API
        // y los datos del usuario en 'userData' para la interfaz.
        localStorage.setItem('userToken', data.token);
        localStorage.setItem('userData', JSON.stringify(data.user || {}));
        
        // También guardamos el rol y nombre para verificaciones rápidas
        if (data.user) {
          localStorage.setItem('userRole', data.user.rol);
          localStorage.setItem('userName', data.user.nombre);
        }

        window.location.href = CONFIG.REDIRECT_URL;
      } else {
        // Si las credenciales no coinciden, muestra un error general de login
        showError('email', data.message || 'Credenciales incorrectas.');
        showError('password', ''); // Limpia el error específico de contraseña si existía
        showError('role', '');     // Limpia el error específico de rol si existía
      }
    } catch (error) {
      console.error('Error durante la autenticación:', error);
      alert('No se pudo conectar con el servidor. Inténtalo de nuevo.');
    } finally {
      setButtonState(false); // Restaurar estado del botón
    }
  });
});