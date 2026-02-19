/**
 * Lógica para cargar la información del usuario en el header
 */
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('userToken');
    
    // Si no hay token, navigation.js se encargará de redirigir, 
    // pero aquí detenemos la ejecución para evitar errores.
    if (!token) return;

    try {
        const response = await fetch('http://localhost:3001/api/auth/me', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const { user } = await response.json();
            
            const nameEl = document.getElementById('header-user-name');
            const roleEl = document.getElementById('header-user-role');
            const statusEl = document.getElementById('header-user-status');

            if (nameEl) nameEl.textContent = `${user.nombre} ${user.apellidos || ''}`.trim();
            if (roleEl) roleEl.textContent = user.rol.charAt(0).toUpperCase() + user.rol.slice(1); // Capitalizar
            if (statusEl) statusEl.textContent = user.activo ? 'Activo' : 'Inactivo';
        } else {
            console.warn('No se pudo obtener la información del usuario.');
        }
    } catch (error) {
        console.error('Error al cargar info del header:', error);
    }
});