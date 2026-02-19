// Variables de estado
let selectedUserType = null;

// Seleccionar tipo de usuario
document.querySelectorAll('.user-type-btn').forEach(button => {
  button.addEventListener('click', () => {
    // Quitar clase activa de todos
    document.querySelectorAll('.user-type-btn').forEach(btn => btn.classList.remove('active'));
    // Agregar clase activa al clickeado
    button.classList.add('active');
    // Guardar tipo seleccionado
    selectedUserType = button.dataset.type;
  });
});

// Validación de contraseña
function validatePassword(password) {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*]/.test(password);
  return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
}

// Validar correo
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Validar formulario
function validateForm() {
  let isValid = true;

  // Limpiar errores anteriores
  document.querySelectorAll('.error-message').forEach(el => el.textContent = '');

  // Nombre
  const nombre = document.getElementById('nombre').value.trim();
  if (!nombre) {
    document.getElementById('nombre-error').textContent = 'El nombre es obligatorio.';
    isValid = false;
  }

  // Apellidos
  const apellidos = document.getElementById('apellidos').value.trim();
  if (!apellidos) {
    document.getElementById('apellidos-error').textContent = 'Los apellidos son obligatorios.';
    isValid = false;
  }

  // Cédula
const cedula = document.getElementById('cedula').value.trim();
const cedulaRegex = /^\d{6,12}$/; // Solo números, entre 6 y 12 dígitos
if (!cedulaRegex.test(cedula)) {
  document.getElementById('cedula-error').textContent = 'La cédula debe contener solo números (6-12 dígitos).';
  isValid = false;
}

  // Fecha de nacimiento
  const fechaNac = document.getElementById('fecha-nac').value;
  if (!fechaNac) {
    document.getElementById('fecha-nac-error').textContent = 'La fecha de nacimiento es obligatoria.';
    isValid = false;
  }

  // Gmail
  const email = document.getElementById('email').value.trim();
  if (!email || !validateEmail(email)) {
    document.getElementById('email-error').textContent = 'Ingresa un correo válido.';
    isValid = false;
  }

  // Contraseña
  const contraseña = document.getElementById('contraseña').value;
  if (!validatePassword(contraseña)) {
    document.getElementById('contraseña-error').textContent = 'La contraseña no cumple los requisitos.';
    isValid = false;
  }

  // Confirmar contraseña
  const confirmar = document.getElementById('confirmar-contraseña').value;
  if (contraseña !== confirmar) {
    document.getElementById('confirmar-contraseña-error').textContent = 'Las contraseñas no coinciden.';
    isValid = false;
  }

  // Tipo de usuario
  if (!selectedUserType) {
    document.getElementById('user-type-error').textContent = 'Selecciona un tipo de usuario.';
    isValid = false;
  }

  return isValid;
}

// Manejar envío del formulario
document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!validateForm()) return;
  const notificationEl = document.getElementById('form-notification');
  // para evitar barios envios del mismo formulario
  const submitBtn = document.querySelector('.submit-btn');
submitBtn.disabled = true;
submitBtn.textContent = 'Creando cuenta...';

  const formData = {
    nombre: document.getElementById('nombre').value.trim(),
    apellidos: document.getElementById('apellidos').value.trim(),
    cedula: document.getElementById('cedula').value.trim(),
    fecha_nacimiento: document.getElementById('fecha-nac').value,
    email: document.getElementById('email').value.trim(),
    password: document.getElementById('contraseña').value,
    rol: selectedUserType // 'usuario' o 'trabajador'
  };

  try {
    const response = await fetch('/api/registro', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });

    const result = await response.json();

    if  (response.ok) {
      notificationEl.textContent = '¡Registro exitoso! Redirigiendo...';
      notificationEl.style.color = 'green';
      setTimeout(() => window.location.href = 'index.html', 2000); // Redirigir a la página de login
    } else {
      notificationEl.textContent = result.message || 'No se pudo completar el registro.';
      notificationEl.style.color = 'red';
    }
  } catch (error) {
    console.error('Error al conectar con el servidor:', error);
    notificationEl.textContent = 'Error de conexión. Inténtalo de nuevo más tarde.';
    notificationEl.style.color = 'red';
  }

  finally {
  submitBtn.disabled = false;
  submitBtn.textContent = 'Crear Cuenta';
}
});