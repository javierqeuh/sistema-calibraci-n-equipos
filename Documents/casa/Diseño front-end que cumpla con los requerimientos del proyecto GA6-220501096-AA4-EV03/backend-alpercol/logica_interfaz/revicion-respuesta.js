/**
 * Lógica para la página: revicion-respuesta.html
 * Responsabilidades:
 * - Cargar listado de encuestas con respuestas
 * - Mostrar detalles de cada respuesta por usuario
 * - Filtrar por encuesta y por respondedor
 * - Ver respuestas completas de cada persona
 * - Agregar comentarios a respuestas
 * - Exportar respuestas detalladas a Excel/PDF
 * - Manejar errores y notificaciones
 */

document.addEventListener('DOMContentLoaded', function () {
    // Verificar que ésta sea la página correcta
    if (document.body.id !== 'page-revicion-respuesta') {
        return;
    }

    // ========== ELEMENTOS DEL DOM ==========
    const container = document.querySelector('.container');

    let surveysData = [];
    let currentSurveyId = null;
    let responsesData = [];

    // ========== FUNCIONES DE UTILIDAD ==========

    /**
     * Obtiene el token de autenticación del localStorage
     * @returns {string} Token JWT del usuario
     */
    const getAuthToken = () => localStorage.getItem('userToken');

    /**
     * Obtiene los datos del usuario autenticado
     * @returns {Object} Objeto con los datos del usuario
     */
    const getUserData = () => {
        const userStr = localStorage.getItem('userToken');
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
     * Carga el listado de encuestas del usuario
     */
    const loadSurveys = async () => {
        if (!checkAuthentication()) return;

        try {
            const userData = getUserData();
            const token = getAuthToken();
            const response = await fetch('http://localhost:3001/surveys', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const result = await response.json();

            if (response.ok) {
                surveysData = result.data || [];
                displaySurveysList();
            } else {
                console.error('Error al cargar encuestas:', result.error);
                window.showAppNotification('Error al cargar las encuestas.', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            window.showAppNotification('No se pudo conectar con el servidor.', 'error');
        }
    };

    /**
     * Muestra la lista de encuestas disponibles
     */
    const displaySurveysList = () => {
        container.innerHTML = '<h1>Revisión de Respuestas</h1>';

        if (surveysData.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'card';
            emptyMessage.innerHTML = '<p style="text-align: center; color: #6c757d;">No hay encuestas disponibles.</p>';
            container.appendChild(emptyMessage);
            return;
        }

        const listHTML = '<div style="display: grid; gap: 15px;">';
        surveysData.forEach(survey => {
            const surveyCard = document.createElement('div');
            surveyCard.className = 'card';
            surveyCard.style.cursor = 'pointer';

            const responseCount = survey.total_respuestas || 0;

            surveyCard.innerHTML = `
                <h3>${survey.titulo}</h3>
                <p>${survey.descripcion}</p>
                <p style="margin: 10px 0;"><strong>Respuestas recibidas:</strong> ${responseCount}</p>
                <div style="display: flex; gap: 10px;">
                    <button class="secondary" onclick="verRespuestas(${survey.id_encuesta})">Ver Respuestas</button>
                    <button class="secondary" onclick="exportarRespuestas(${survey.id_encuesta})">Descargar Excel</button>
                    <button class="secondary" onclick="eliminarEncuesta(${survey.id_encuesta})" style="background-color: #dc3545; color: white;">Eliminar</button>
                </div>
            `;

            container.appendChild(surveyCard);
        });
    };

    /**
     * Carga y muestra las respuestas de una encuesta
     * @param {number} surveyId - ID de la encuesta
     */
    window.verRespuestas = async (surveyId) => {
        if (!checkAuthentication()) return;

        currentSurveyId = surveyId;

        try {
            const token = getAuthToken();
            const response = await fetch(`http://localhost:3001/surveys/${surveyId}/responses`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const result = await response.json();

            if (response.ok) {
                responsesData = result.data || [];
                displayResponses();
            } else {
                window.showAppNotification('Error al cargar respuestas.', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            window.showAppNotification('No se pudo conectar con el servidor.', 'error');
        }
    };

    /**
     * Muestra las respuestas detalladas
     */
    const displayResponses = () => {
        const survey = surveysData.find(s => s.id_encuesta === currentSurveyId);
        if (!survey) return;

        container.innerHTML = `
            <button class="secondary" onclick="volverALista()" style="margin-bottom: 15px;">← Volver</button>
            <h1>Respuestas a: ${survey.titulo}</h1>
        `;

        if (responsesData.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'card';
            emptyMessage.innerHTML = '<p style="text-align: center; color: #6c757d;">No hay respuestas aún.</p>';
            container.appendChild(emptyMessage);
            return;
        }

        // Mostrar tabla resumen de respondedores
        let htmlResumen = `
            <div class="card">
                <h3>Respondedores (${responsesData.length})</h3>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Respondedor</th>
                            <th>Email</th>
                            <th>Fecha de Respuesta</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        responsesData.forEach((response, index) => {
            const fecha = new Date(response.fecha_respuesta).toLocaleDateString('es-ES');
            htmlResumen += `
                <tr>
                    <td>${response.nombre_usuario || 'Anónimo'}</td>
                    <td>${response.email_usuario || 'N/A'}</td>
                    <td>${fecha}</td>
                    <td><span style="color: #4CAF50; font-weight: bold;">Respondida</span></td>
                    <td><button class="secondary" onclick="verDetalleRespuesta(${index})">Ver Detalles</button></td>
                </tr>
            `;
        });

        htmlResumen += `
                    </tbody>
                </table>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', htmlResumen);

        // Mostrar detalles expandibles de cada respuesta
        responsesData.forEach((response, index) => {
            const detailsCard = document.createElement('div');
            detailsCard.className = 'card';
            detailsCard.id = `respuesta-detalles-${index}`;
            detailsCard.style.display = 'none';
            detailsCard.style.marginTop = '15px';

            let detailsHTML = `<h3>Detalles de ${response.nombre_usuario || 'Anónimo'}</h3>`;

            if (response.respuestas_pregunta && response.respuestas_pregunta.length > 0) {
                response.respuestas_pregunta.forEach(pregunta => {
                    detailsHTML += `
                        <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #ddd;">
                            <strong>Pregunta ID: ${pregunta.id_pregunta}</strong><br>
                            <p style="margin: 10px 0; padding: 10px; background-color: #f5f5f5; border-radius: 4px;">
                                ${pregunta.respuesta}
                            </p>
                        </div>
                    `;
                });
            } else if (response.respuestas && response.respuestas.length > 0) {
                 // Fallback para estructura nueva
                 response.respuestas.forEach(r => {
                    detailsHTML += `
                        <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #ddd;">
                            <strong>Pregunta ID: ${r.id_pregunta}</strong><br>
                            <p style="margin: 10px 0; padding: 10px; background-color: #f5f5f5; border-radius: 4px;">
                                ${r.respuesta}
                            </p>
                        </div>
                    `;
                });
            }

            // Agregar sección de comentarios
            detailsHTML += `
                <div style="margin-top: 20px;">
                    <h4>Comentarios</h4>
            `;

            if (response.comentarios && response.comentarios.length > 0) {
                response.comentarios.forEach(comentario => {
                    const fechaComentario = new Date(comentario.fecha).toLocaleString('es-ES');
                    detailsHTML += `
                        <div style="margin-bottom: 10px; padding: 10px; background-color: #f0f0f0; border-radius: 4px;">
                            <strong>${comentario.autor}</strong> - ${fechaComentario}<br>
                            ${comentario.texto}
                        </div>
                    `;
                });
            } else {
                detailsHTML += '<p style="color: #999;">Sin comentarios</p>';
            }

            detailsHTML += `
                    <textarea id="comentario-nuevo-${index}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; margin-top: 10px;" placeholder="Agregar comentario..."></textarea>
                    <button onclick="agregarComentario(${index})" style="margin-top: 10px;">Agregar Comentario</button>
                </div>
            `;

            detailsCard.innerHTML = detailsHTML;
            container.appendChild(detailsCard);
        });
    };

    /**
     * Muestra o oculta los detalles de una respuesta
     * @param {number} index - Índice de la respuesta
     */
    window.verDetalleRespuesta = (index) => {
        const detallesEl = document.getElementById(`respuesta-detalles-${index}`);
        if (detallesEl) {
            detallesEl.style.display = detallesEl.style.display === 'none' ? 'block' : 'none';
        }
    };

    /**
     * Agrega un comentario a una respuesta
     * @param {number} index - Índice de la respuesta
     */
    window.agregarComentario = async (index) => {
        if (!checkAuthentication()) return;

        const response = responsesData[index];
        if (!response) return;

        const textarea = document.getElementById(`comentario-nuevo-${index}`);
        const texto = textarea?.value.trim();

        if (!texto) {
            window.showAppNotification('Por favor, escribe un comentario.', 'error');
            return;
        }

        try {
            const token = getAuthToken();
            const apiResponse = await fetch(`http://localhost:3001/api/surveys/asignaciones/${response.id_asignacion}/comentario`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ texto })
            });

            const result = await apiResponse.json();

            if (apiResponse.ok) {
                window.showAppNotification('Comentario agregado correctamente.', 'success');
                verRespuestas(currentSurveyId);
            } else {
                window.showAppNotification('Error al agregar comentario.', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            window.showAppNotification('No se pudo conectar con el servidor.', 'error');
        }
    };

    /**
     * Exporta las respuestas a Excel
     * @param {number} surveyId - ID de la encuesta
     */
    window.exportarRespuestas = async (surveyId) => {
        if (!checkAuthentication()) return;

        try {
            const token = getAuthToken();
            const response = await fetch(`http://localhost:3001/surveys/${surveyId}/responses`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const result = await response.json();

            if (response.ok) {
                const survey = surveysData.find(s => s.id_encuesta === surveyId);
                const data = result.data || [];

                let csv = 'Respondedor,Email,Fecha de Respuesta\n';

                data.forEach(respuesta => {
                    const fecha = new Date(respuesta.fecha_respuesta).toLocaleDateString('es-ES');
                    csv += `"${respuesta.nombre_usuario || 'Anónimo'}","${respuesta.email_usuario || 'N/A'}","${fecha}"\n`;

                    if (respuesta.respuestas_pregunta) {
                        respuesta.respuestas_pregunta.forEach(pregunta => {
                            csv += `,"${pregunta.texto_pregunta}","${pregunta.respuesta}"\n`;
                        });
                    }
                    csv += '\n';
                });

                // Descargar archivo
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', `respuestas-${survey?.titulo || 'encuesta'}-${new Date().toISOString().split('T')[0]}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                window.showAppNotification('Respuestas exportadas correctamente.', 'success');
            } else {
                window.showAppNotification('Error al descargar respuestas.', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            window.showAppNotification('No se pudo conectar con el servidor.', 'error');
        }
    };

    /**
     * Elimina una encuesta
     * @param {number} surveyId - ID de la encuesta
     */
    window.eliminarEncuesta = async (surveyId) => {
        if (!checkAuthentication()) return;

        if (!confirm('¿Estás seguro de que deseas eliminar esta encuesta? Se borrarán todas las respuestas y asignaciones asociadas.')) {
            return;
        }

        try {
            const token = getAuthToken();
            const response = await fetch(`http://localhost:3001/surveys/${surveyId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const result = await response.json();

            if (response.ok) {
                window.showAppNotification('Encuesta eliminada correctamente.', 'success');
                loadSurveys();
            } else {
                window.showAppNotification(result.message || 'Error al eliminar encuesta.', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            window.showAppNotification('Error de conexión.', 'error');
        }
    };

    /**
     * Vuelve a la lista de encuestas
     */
    window.volverALista = () => {
        currentSurveyId = null;
        responsesData = [];
        displaySurveysList();
    };

    // ========== INICIALIZACIÓN ==========

    loadSurveys();
});
