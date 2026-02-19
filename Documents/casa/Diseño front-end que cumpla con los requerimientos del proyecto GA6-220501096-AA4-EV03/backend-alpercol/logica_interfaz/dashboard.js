// js/dashboard.js
// Conecta el dashboard con la base de datos mediante la API
// solo el usuario con rol usuario podra ver el dashboard

// Fallback para notificaciones si common.js no está cargado
const safeShowNotification = (message, type) => {
    if (window.showAppNotification) window.showAppNotification(message, type);
    else alert(message);
};

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Dashboard cargado');
    
    // Obtener el token del localStorage
    const token = localStorage.getItem('userToken');
    console.log('Token encontrado:', !!token);

    if (!token) {
        console.error('No se encontró token. Por favor inicia sesión.');
        safeShowNotification('Debes iniciar sesión para ver el dashboard.', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }

    // Cargar estadísticas del dashboard
    await loadDashboardStats(token);
    
    // Cargar últimas encuestas
    await loadLatestSurveys(token);
});

// Función para cargar estadísticas
async function loadDashboardStats(token) {
    try {
        console.log('Cargando estadísticas del dashboard...');
        const response = await fetch('http://localhost:3001/api/dashboard/stats', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Respuesta del servidor (stats):', response.status);

        if (!response.ok) {
            console.error('Error en respuesta:', response.status, response.statusText);
            const errorText = await response.text();
            console.error('Detalle del error:', errorText);
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Datos recibidos:', data);

        // Actualizar los elementos del dashboard
        const statActive = document.getElementById('stat-active');
        const statPending = document.getElementById('stat-pending');
        const statUsers = document.getElementById('stat-users');
        const statCompleted = document.getElementById('stat-completed');

        if (statActive) statActive.textContent = data.active || 0;
        if (statPending) statPending.textContent = data.pending || 0;
        if (statUsers) statUsers.textContent = data.users || 0;
        if (statCompleted) statCompleted.textContent = data.completed || 0;

        console.log('Estadísticas actualizadas');

    } catch (error) {
        console.error('Error cargando estadísticas:', error);
        safeShowNotification('Error al cargar las estadísticas: ' + error.message, 'error');
    }
}

// Función para cargar últimas encuestas
async function loadLatestSurveys(token) {
    try {
        console.log('Cargando encuestas...');
        const response = await fetch('http://localhost:3001/surveys', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Respuesta del servidor (surveys):', response.status);

        if (!response.ok) {
            console.error('Error en respuesta:', response.status, response.statusText);
            const errorText = await response.text();
            console.error('Detalle del error:', errorText);
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Encuestas recibidas:', data);

        const surveys = data.data || [];

        // Llenar la tabla con las encuestas
        const tableBody = document.getElementById('dashboard-surveys-table');
        if (!tableBody) {
            console.error('No se encontró el elemento dashboard-surveys-table');
            return;
        }

        tableBody.innerHTML = ''; // Limpiar tabla anterior

        // Mostrar solo las últimas 5 encuestas
        const latestSurveys = surveys.slice(0, 5);

        if (latestSurveys.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="3" style="text-align: center;">No hay encuestas aún.</td></tr>';
            return;
        }

        latestSurveys.forEach(survey => {
            // Validar que el ID exista
            if (!survey.id_encuesta) {
                console.warn('Encuesta sin ID encontrada:', survey);
                return;
            }

            const row = document.createElement('tr');
            
            // Determinar el estado basado en la fecha límite
            let estado = 'Activa';
            if (survey.fecha_limite) {
                const deadline = new Date(survey.fecha_limite);
                if (deadline < new Date()) {
                    estado = 'Vencida';
                }
            }

            const bgColor = estado === 'Activa' ? '#d4edda' : '#f8d7da';
            const textColor = estado === 'Activa' ? '#155724' : '#721c24';

            row.innerHTML = `
                <td>${survey.titulo}</td>
                <td>${survey.fecha_creacion ? new Date(survey.fecha_creacion).toLocaleDateString('es-ES') : 'N/A'}</td>
                <td><span style="padding: 5px 10px; border-radius: 5px; background: ${bgColor}; color: ${textColor};">${estado}</span></td>
                <td>
                    <button onclick="eliminarEncuestaDashboard(${survey.id_encuesta})" style="padding: 5px 10px; font-size: 0.8rem; background-color: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">Eliminar</button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        console.log('Tabla de encuestas actualizada');

    } catch (error) {
        console.error('Error cargando encuestas:', error);
        safeShowNotification('Error al cargar las encuestas: ' + error.message, 'error');
    }
}

/**
 * Elimina una encuesta desde el dashboard
 * @param {number} surveyId 
 */
window.eliminarEncuestaDashboard = async (surveyId) => {
    console.log('Intentando eliminar encuesta ID:', surveyId);

    if (!surveyId) {
        safeShowNotification('Error: ID de encuesta no válido.', 'error');
        return;
    }

    if (!confirm('¿Estás seguro de que deseas eliminar esta encuesta? Se borrarán todos los datos asociados.')) {
        return;
    }

    const token = localStorage.getItem('userToken');
    try {
        const response = await fetch(`http://localhost:3001/surveys/${surveyId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            safeShowNotification('Encuesta eliminada correctamente.', 'success');
            loadDashboardStats(token);
            loadLatestSurveys(token);
        } else {
            const result = await response.json();
            safeShowNotification(result.message || 'Error al eliminar.', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        safeShowNotification('Error de conexión.', 'error');
    }
};