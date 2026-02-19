/**
 * Lógica para la página: historia-envio.html
 * Responsabilidades:
 * - Cargar historial de encuestas enviadas por el usuario
 * - Mostrar información de envíos (fecha, cantidad de respuestas, estado)
 * - Filtrar por rango de fechas
 * - Filtrar por usuario/estado
 * - Reenviar encuestas
 * - Exportar historial a Excel
 * - Manejar errores y notificaciones
 */

document.addEventListener('DOMContentLoaded', function () {
    if (document.body.id !== 'page-historia-envio') return;

    const BASE_URL = 'http://localhost:3001';
    const token = localStorage.getItem('userToken');
    let historyData = [];
    let filteredData = [];

    if (!token) {
        window.showAppNotification('Tu sesión ha expirado.', 'error');
        return setTimeout(() => window.location.href = 'index.html', 1000);
    }

    // Inicialización
    setupUI();
    loadHistory();

    // --- Funciones Principales ---

    function setupUI() {
        const container = document.querySelector('.container');
        let filterCard = container.querySelector('.card');

        // Inyectar filtros si no existen
        if (!filterCard || !filterCard.querySelector('input')) {
            if (!filterCard) {
                filterCard = document.createElement('div');
                filterCard.className = 'card';
                container.prepend(filterCard);
            }
            filterCard.innerHTML = `
                <div style="display: flex; gap: 15px; align-items: flex-end; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 150px;"><label>Desde:</label><input type="date" id="filter-date-from" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;"></div>
                    <div style="flex: 1; min-width: 150px;"><label>Hasta:</label><input type="date" id="filter-date-to" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;"></div>
                    <div style="flex: 1; min-width: 150px;"><label>Estado:</label>
                        <select id="filter-status" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
                            <option value="">Todos</option><option value="pendiente">Pendiente</option><option value="en_progreso">En progreso</option><option value="cerrada">Cerrada</option>
                        </select>
                    </div>
                    <button id="apply-filters-btn" class="secondary">Filtrar</button>
                    <button id="export-btn" class="secondary">Exportar Excel</button>
                </div>`;
            
            document.getElementById('apply-filters-btn').onclick = applyFilters;
            document.getElementById('export-btn').onclick = exportToExcel;
        }

        // Inyectar tabla si no existe
        if (!document.querySelector('table')) {
            container.insertAdjacentHTML('beforeend', `
                <table class="table" style="margin-top: 20px;">
                    <thead><tr><th>Encuesta</th><th>Creación</th><th>Envío</th><th>Asignados</th><th>Respondidos</th><th>%</th><th>Estado</th><th>Acciones</th></tr></thead>
                    <tbody id="history-table-body"></tbody>
                </table>`);
        }
    }

    async function loadHistory() {
        try {
            const res = await fetch(`${BASE_URL}/api/dashboard/historial-envios`, { headers: { 'Authorization': `Bearer ${token}` } });
            const json = await res.json();
            if (res.ok) {
                historyData = json.data || [];
                filteredData = [...historyData];
                renderTable(filteredData);
            } else throw new Error(json.error || 'Error cargando historial');
        } catch (e) { console.error(e); window.showAppNotification(e.message, 'error'); }
    }

    function renderTable(data) {
        const tbody = document.getElementById('history-table-body');
        if (!data.length) return tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px;">No hay registros.</td></tr>';

        const isWorker = localStorage.getItem('userRole') === 'trabajador';
        const colors = { 'pendiente': '#FF9800', 'en_progreso': '#2196F3', 'cerrada': '#4CAF50', 'enviada': '#28a745' };

        tbody.innerHTML = data.map(r => {
            const pct = Math.round((r.total_respondidos / r.total_asignados) * 100) || 0;
            return `
                <tr>
                    <td>${r.titulo_encuesta}</td>
                    <td>${new Date(r.fecha_creacion).toLocaleDateString()}</td>
                    <td>${new Date(r.fecha_envio).toLocaleDateString()}</td>
                    <td>${r.total_asignados}</td>
                    <td>${r.total_respondidos}</td>
                    <td>${pct}%</td>
                    <td><span style="color:${colors[r.estado] || '#666'}; font-weight:bold;">${r.estado.replace('_', ' ').toUpperCase()}</span></td>
                    <td>
                        ${!isWorker ? `<button class="secondary" onclick="reenviarEncuesta(${r.id_encuesta})" style="margin-right:5px;">Reenviar</button>` : ''}
                        <button class="secondary" onclick="verDetalles(${r.id_envio})">Detalles</button>
                    </td>
                </tr>`;
        }).join('');
    }

    function applyFilters() {
        const from = document.getElementById('filter-date-from').value;
        const to = document.getElementById('filter-date-to').value;
        const status = document.getElementById('filter-status').value;

        filteredData = historyData.filter(r => {
            const d = new Date(r.fecha_envio);
            if (from && d < new Date(from)) return false;
            if (to && d > new Date(to + 'T23:59:59')) return false;
            if (status && r.estado !== status) return false;
            return true;
        });
        renderTable(filteredData);
        window.showAppNotification('Filtros aplicados', 'success');
    }

    function exportToExcel() {
        if (!filteredData.length) return window.showAppNotification('No hay datos para exportar', 'error');
        const csv = ['Encuesta,Creación,Envío,Asignados,Respondidos,%,Estado', ...filteredData.map(r => 
            `"${r.titulo_encuesta}","${new Date(r.fecha_creacion).toLocaleDateString()}","${new Date(r.fecha_envio).toLocaleDateString()}",${r.total_asignados},${r.total_respondidos},${Math.round((r.total_respondidos/r.total_asignados)*100)}%,"${r.estado}"`
        )].join('\n');
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
        link.download = `historial-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    }

    // --- Funciones Globales para HTML ---
    window.reenviarEncuesta = async (id) => {
        if (!confirm('¿Reenviar encuesta?')) return;
        try {
            const res = await fetch(`${BASE_URL}/api/dashboard/reenviar/${id}`, {
                method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            });
            if (res.ok) { window.showAppNotification('Reenviada correctamente', 'success'); loadHistory(); }
            else throw new Error((await res.json()).error);
        } catch (e) { window.showAppNotification(e.message || 'Error de conexión', 'error'); }
    };

    window.verDetalles = (id) => {
        sessionStorage.setItem('selectedSurveyId', id);
        window.location.href = 'resultados-y-reportes.html';
    };
});
