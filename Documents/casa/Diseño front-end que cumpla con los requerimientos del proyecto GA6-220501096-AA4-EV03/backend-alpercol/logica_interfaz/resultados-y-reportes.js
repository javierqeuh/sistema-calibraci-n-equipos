/**
 * Lógica para la página: resultados-y-reportes.html
 * Responsabilidad: Consumir los endpoints separados de estructura y datos para generar reportes.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Verificar que estamos en la página correcta
    const reportContainer = document.getElementById('report-results-container');
    const surveySelect = document.getElementById('survey-select');
    
    // Si no existen los elementos clave, no ejecutar el script
    if (!surveySelect && !reportContainer) return;

    const exportBtn = document.getElementById('export-excel-btn');
    
    let currentSurvey = null;
    let currentStats = null;
    let currentTotalResponses = 0;

    const BASE_URL = 'http://localhost:3001';

    // 1. Cargar lista de encuestas al inicio
    loadSurveysList();

    // 2. Evento cambio de encuesta
    if (surveySelect) {
        surveySelect.addEventListener('change', (e) => {
            const surveyId = e.target.value;
            if (surveyId) {
                loadSurveyReport(surveyId);
            } else {
                clearReport();
            }
        });
    }

    // 3. Evento exportar
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            if (currentSurvey && currentStats) {
                exportToExcel(currentSurvey, currentStats, currentTotalResponses);
            } else {
                window.showAppNotification('Selecciona una encuesta primero.', 'warning');
            }
        });
    }

    // --- Funciones Principales ---

    async function loadSurveysList() {
        try {
            const token = localStorage.getItem('userToken');
            const response = await fetch(`${BASE_URL}/surveys`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Error al cargar encuestas');
            
            const result = await response.json();
            const surveys = result.data || [];

            // Llenar select
            if (surveySelect) {
                surveySelect.innerHTML = '<option value="">-- Selecciona una encuesta --</option>';
                surveys.forEach(s => {
                    const option = document.createElement('option');
                    option.value = s.id_encuesta;
                    option.textContent = s.titulo;
                    surveySelect.appendChild(option);
                });

                // Verificar si hay una encuesta preseleccionada desde el historial o notificaciones
                const preSelectedId = sessionStorage.getItem('selectedSurveyId') || sessionStorage.getItem('selectedReportId');
                if (preSelectedId) {
                    surveySelect.value = preSelectedId;
                    if (surveySelect.value === preSelectedId) { // Confirmar que existe en la lista
                        loadSurveyReport(preSelectedId);
                    }
                    sessionStorage.removeItem('selectedSurveyId');
                    sessionStorage.removeItem('selectedReportId');
                }
            }
        } catch (error) {
            console.error(error);
            window.showAppNotification('Error cargando lista de encuestas', 'error');
        }
    }

    async function loadSurveyReport(surveyId) {
        const container = document.getElementById('report-results-container');
        if (container) container.innerHTML = '<div class="loading-spinner" style="text-align:center; padding:20px;">Cargando datos...</div>';
        
        try {
            const token = localStorage.getItem('userToken');

            // PASO A: Obtener Estructura de la Encuesta (Preguntas y Opciones)
            // Usamos el endpoint de detalle que ya existía
            const structureResponse = await fetch(`${BASE_URL}/surveys/${surveyId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!structureResponse.ok) throw new Error('Error cargando estructura');
            const structureData = await structureResponse.json();
            currentSurvey = structureData.data;

            // PASO B: Obtener Datos de Respuestas (Endpoint modificado)
            // Ahora este endpoint solo devuelve el array de respuestas limpias
            const dataResponse = await fetch(`${BASE_URL}/surveys/${surveyId}/responses`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!dataResponse.ok) throw new Error('Error cargando respuestas');
            const responseData = await dataResponse.json();
            const responses = responseData.data; // Array de asignaciones con respuestas

            // PASO C: Procesar y Agrupar Datos en el Cliente
            currentTotalResponses = responses.length;
            currentStats = processSurveyData(currentSurvey, responses);

            // PASO D: Renderizar
            displayResults(currentSurvey, currentStats, currentTotalResponses);

        } catch (error) {
            console.error(error);
            window.showAppNotification('Error generando el reporte', 'error');
            if (container) container.innerHTML = '<p class="error-message" style="text-align:center; color:red;">No se pudieron cargar los resultados.</p>';
        }
    }

    function processSurveyData(survey, responses) {
        // Inicializar estructura de estadísticas basada en las preguntas de la encuesta
        const stats = {};
        
        survey.questions.forEach(q => {
            stats[q.id_pregunta] = {
                questionText: q.text,
                type: q.type,
                totalResponses: 0,
                counts: {}, // Para opciones/escala: { "Opción A": 5, "Opción B": 3 }
                textAnswers: [] // Para texto abierto
            };
        });

        // Recorrer cada envío (asignación completada) recibido del backend
        responses.forEach(submission => {
            if (submission.respuestas && Array.isArray(submission.respuestas)) {
                submission.respuestas.forEach(ans => {
                    const qStat = stats[ans.id_pregunta];
                    // Solo procesamos si la pregunta existe en la estructura actual
                    if (qStat) {
                        qStat.totalResponses++;
                        
                        if (qStat.type === 'texto') {
                            if (ans.respuesta) qStat.textAnswers.push(ans.respuesta);
                        } else {
                            // Opción múltiple, escala, si/no
                            // Usamos un valor por defecto si viene vacío
                            const val = ans.respuesta || 'Sin respuesta';
                            qStat.counts[val] = (qStat.counts[val] || 0) + 1;
                        }
                    }
                });
            }
        });

        return stats;
    }

    function displayResults(survey, stats, totalCount = 0) {
        const container = document.getElementById('report-results-container');
        if (!container) return;

        container.innerHTML = '';

        // Encabezado del reporte
        const header = document.createElement('div');
        header.className = 'report-header';
        header.style.textAlign = 'center';
        header.innerHTML = `
            <h2 style="color: #306E40; font-size: 2rem; margin-bottom: 10px;">${survey.title}</h2>
            <div style="display: inline-block; background: #e8f5e9; color: #2e7d32; padding: 8px 20px; border-radius: 50px; font-weight: bold; border: 1px solid #c8e6c9; margin-bottom: 20px;">
                Total de respuestas: ${totalCount}
            </div>
            <hr style="margin: 20px 0; border: 0; border-top: 2px solid #eee;">
        `;
        container.appendChild(header);

        // Renderizar cada pregunta
        survey.questions.forEach((q, index) => {
            const qStat = stats[q.id_pregunta];
            const card = document.createElement('div');
            card.className = 'card'; // Usamos la clase card existente en CSS
            card.style.marginBottom = '20px';
            
            let contentHtml = `<h3 style="font-size: 1.1rem; margin-bottom: 15px;">${index + 1}. ${q.text}</h3>`;
            
            if (qStat.totalResponses === 0) {
                contentHtml += '<p style="color: #666; font-style: italic;">Aún no hay respuestas para esta pregunta.</p>';
            } else if (q.type === 'texto') {
                // Mostrar respuestas de texto
                contentHtml += '<ul style="list-style: none; padding: 0;">';
                qStat.textAnswers.forEach(txt => {
                    contentHtml += `<li style="background: #f9f9f9; padding: 10px; margin-bottom: 5px; border-radius: 5px; border-left: 3px solid #306E40;">"${txt}"</li>`;
                });
                contentHtml += '</ul>';
            } else {
                // Gráfico de Barras (Bar Chart)
                contentHtml += generateBarChart(qStat.counts, qStat.totalResponses);
            }

            card.innerHTML = contentHtml;
            container.appendChild(card);
        });
    }

    function generateBarChart(counts, total) {
    let html = '<div style="padding: 10px;">';
    
    for (const [label, count] of Object.entries(counts)) {
        const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
        
        html += `
            <div style="margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 0.95rem;">
                    <span style="font-weight: 600; color: #333;">${label}</span>
                    <span style="font-weight: 600; color: #306E40;">${percentage}%</span>
                </div>
                <div style="background-color: #f1f1f1; border-radius: 10px; height: 25px; width: 100%; overflow: hidden; box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);">
                    <div style="height: 100%; width: ${percentage}%; transition: width 0.6s ease; border-radius: 10px; background: linear-gradient(90deg, #306E40, #4CAF50);"></div>
                </div>
            </div>
        `;
    }
    html += '</div>';
    return html;
}

    function clearReport() {
        const container = document.getElementById('report-results-container');
        if (container) container.innerHTML = '<p style="text-align: center; color: #666; margin-top: 50px;">Selecciona una encuesta arriba para ver los resultados.</p>';
        currentSurvey = null;
        currentStats = null;
        currentTotalResponses = 0;
    }

    function exportToExcel(survey, stats, totalCount = 0) {
        let csvContent = "data:text/csv;charset=utf-8,";
        // BOM para que Excel reconozca caracteres latinos
        csvContent += "\uFEFF"; 
        csvContent += `Reporte de Encuesta: ${survey.title}\n`;
        csvContent += `Total de respuestas: ${totalCount}\n\n`;

        survey.questions.forEach((q, index) => {
            const qStat = stats[q.id_pregunta];
            csvContent += `Pregunta ${index + 1}: ${q.text}\n`;
            csvContent += `Tipo: ${q.type}\n`;
            csvContent += `Total Respuestas: ${qStat.totalResponses}\n`;

            if (q.type === 'texto') {
                csvContent += "Respuestas:\n";
                qStat.textAnswers.forEach(txt => {
                    const safeText = txt ? txt.replace(/"/g, '""').replace(/\n/g, ' ') : '';
                    csvContent += `"${safeText}"\n`;
                });
            } else {
                csvContent += "Opción,Cantidad\n";
                for (const [label, count] of Object.entries(qStat.counts)) {
                    csvContent += `"${label}",${count}\n`;
                }
            }
            csvContent += "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `reporte_${survey.id_encuesta}_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
});

// Lógica de la barra de estadísticas para resultados-y-reportes
(function(){
  const token = localStorage.getItem('token') || localStorage.getItem('userToken');
  const BASE = (typeof BASE_URL !== 'undefined') ? BASE_URL : 'http://localhost:3001';

  async function loadStats(){
    try{
      const res = await fetch(`${BASE}/api/dashboard/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if(!res.ok){ 
        throw new Error('No se pudieron cargar las estadísticas'); 
      }
      
      const data = await res.json();
      
      // Calcular porcentaje de preguntas restantes
      const active = data.active ?? 0;
      const pending = data.pending ?? 0;
      const completed = data.completed ?? 0;
      
      const total = active + pending + completed;
      const remaining = active + pending;
      const percentage = total > 0 ? Math.round((remaining / total) * 100) : 0;
      
      // Mostrar solo el porcentaje
      const percentageEl = document.getElementById('stat-percentage');
      const percentageCard = percentageEl?.closest('.percentage-card');
      
      if (percentageEl) {
        percentageEl.textContent = `${percentage}%`;
        
        // Agregar clase según el porcentaje
        if (percentageCard) {
          // Remover todas las clases primero
          percentageCard.classList.remove('high', 'medium', 'low', 'error');
          
          if (percentage > 70) {
            percentageCard.classList.add('high');
          } else if (percentage > 30) {
            percentageCard.classList.add('medium');
          } else if (percentage > 0) {
            percentageCard.classList.add('low');
          }
        }
      }
    } catch(err){
      console.error('Error cargando estadísticas:', err);
      
      const percentageEl = document.getElementById('stat-percentage');
      const percentageCard = percentageEl?.closest('.percentage-card');
      
      if(percentageEl) {
        percentageEl.textContent = '0%';
      }
      
      if (percentageCard) {
        percentageCard.classList.remove('high', 'medium', 'low');
        percentageCard.classList.add('error');
      }
    }
  }

  // Cargar estadísticas cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadStats);
  } else {
    loadStats();
  }
})();