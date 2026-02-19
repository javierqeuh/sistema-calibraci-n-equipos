// js/crear-encuesta.js
// Lógica específica para la página de crear encuestas
// solo el usuario con rol usuario podra crear encuestas

document.addEventListener('DOMContentLoaded', () => {
    // Verificar que estamos en la página correcta
    if (document.body.id !== 'page-crear-encuesta') {
        return;
    }

    // === ELEMENTOS DEL DOM ===
    const questionsContainer = document.getElementById('questions-container');
    const addQuestionBtn = document.getElementById('add-question-btn');
    const saveDraftBtn = document.getElementById('save-draft-btn');
    const questionTemplate = document.getElementById('question-template');
    const surveyForm = document.getElementById('survey-form');

    // Validar que existan los elementos necesarios
    if (!questionsContainer || !addQuestionBtn || !questionTemplate || !surveyForm) {
        console.error('❌ Elementos del DOM no encontrados en crear-encuesta.html');
        return;
    }

    // === FUNCIONES ===

    /*** Agrega un nuevo bloque de pregunta al contenedor*/
    const addQuestionBlock = () => {
        const questionClone = questionTemplate.content.cloneNode(true);
        const questionBlock = questionClone.querySelector('.question-block');
        questionsContainer.appendChild(questionBlock);

        // Obtener elementos del nuevo bloque
        const questionTypeSelect = questionBlock.querySelector('.question-type');
        const optionsContainer = questionBlock.querySelector('.options-container');
        const addOptionBtn = questionBlock.querySelector('.add-option-btn');
        const removeQuestionBtn = questionBlock.querySelector('.remove-question-btn');

        // === EVENTO: Cambiar tipo de pregunta ===
        questionTypeSelect.addEventListener('change', () => {
            // Mostrar opciones solo si es opción múltiple
            optionsContainer.style.display = 
                questionTypeSelect.value === 'opcion_multiple' ? 'block' : 'none';
        });

        // === EVENTO: Agregar opción ===
        addOptionBtn.addEventListener('click', () => {
            const optionWrapper = document.createElement('div');
            optionWrapper.style.display = 'flex';
            optionWrapper.style.gap = '10px';
            optionWrapper.style.marginBottom = '5px';
            optionWrapper.innerHTML = `
                <input type="text" class="option-text" placeholder="Texto de la opción" required>
                <button type="button" class="remove-option-btn danger" style="width: auto; padding: 5px 10px;">-</button>
            `;
            addOptionBtn.before(optionWrapper);

            // Evento para eliminar la opción
            optionWrapper.querySelector('.remove-option-btn').addEventListener('click', () => {
                optionWrapper.remove();
            });
        });

        // === EVENTO: Eliminar pregunta ===
        removeQuestionBtn.addEventListener('click', () => {
            questionBlock.remove();
        });
    };

    /** * Valida que haya preguntas y que todas tengan al menos un texto */
    const validateQuestions = () => {
        const questions = document.querySelectorAll('.question-block');
        
        if (questions.length === 0) {
            window.showAppNotification('Debe agregar al menos una pregunta.', 'error');
            return false;
        }

        for (let question of questions) {
            const questionText = question.querySelector('.question-text').value.trim();
            if (!questionText) {
                window.showAppNotification('Todas las preguntas deben tener un texto.', 'error');
                return false;
            }

            // Si es opción múltiple, validar que tenga opciones
            const questionType = question.querySelector('.question-type').value;
            if (questionType === 'opcion_multiple') {
                const options = question.querySelectorAll('.option-text');
                if (options.length === 0) {
                    window.showAppNotification('Las preguntas de opción múltiple deben tener al menos una opción.', 'error');
                    return false;
                }
                
                // Validar que todas las opciones tengan texto
                for (let option of options) {
                    if (!option.value.trim()) {
                        window.showAppNotification('Todas las opciones deben tener un texto.', 'error');
                        return false;
                    }
                }
            }
        }

        return true;
    };

    /*** Recopila los datos del formulario para enviar */
    const collectSurveyData = () => {
        const surveyData = {
            title: document.getElementById('survey-title').value.trim(),
            description: document.getElementById('survey-description').value.trim(),
            deadline: document.getElementById('survey-deadline').value,
            is_mandatory: document.getElementById('survey-is-mandatory').checked,
            questions: []
        };

        // Validar campos básicos
        if (!surveyData.title) {
            window.showAppNotification('El título de la encuesta es obligatorio.', 'error');
            return null;
        }

        // Validar preguntas
        if (!validateQuestions()) {
            return null;
        }

        // Recopilar preguntas
        document.querySelectorAll('.question-block').forEach((block, index) => {
            const question = {
                text: block.querySelector('.question-text').value,
                is_mandatory: block.querySelector('.question-is-mandatory').checked,
                type: block.querySelector('.question-type').value,
                order: index + 1,
                options: []
            };

            // Agregar opciones si es opción múltiple
            if (question.type === 'opcion_multiple') {
                block.querySelectorAll('.option-text').forEach((optionInput, optIndex) => {
                    question.options.push({ 
                        text: optionInput.value,
                        order: optIndex + 1
                    });
                });
            }

            surveyData.questions.push(question);
        });

        return surveyData;
    };

    /*** Publica la encuesta en la API*/
    const publishSurvey = async (surveyData, buttonId) => {
        window.setButtonLoadingState(buttonId, true, 'Publicar');

        try {
            const userToken = localStorage.getItem('userToken');
            if (!userToken) {
                window.showAppNotification('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.', 'error');
                window.location.href = 'index.html';
                return false;
            }

            const response = await fetch('http://localhost:3001/surveys', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userToken}`
                },
                body: JSON.stringify(surveyData)
            });

            const result = await response.json();

            if (response.ok) {
                window.showAppNotification(result.message || 'Encuesta publicada exitosamente.', 'success');
                surveyForm.reset();
                questionsContainer.innerHTML = '';
                addQuestionBlock(); // Volver a agregar una pregunta vacía
                return true;
            } else {
                window.showAppNotification(`Error: ${result.message || 'No se pudo publicar la encuesta'}`, 'error');
                return false;
            }
        } catch (error) {
            console.error('Error al crear la encuesta:', error);
            window.showAppNotification('No se pudo conectar con el servidor.', 'error');
            return false;
        } finally {
            window.setButtonLoadingState(buttonId, false, 'Publicar');
        }
    };

    /** * Guarda un borrador de la encuesta*/
    const saveDraft = (surveyData) => {
        try {
            // Guardar en sessionStorage para no perder datos si recarga
            sessionStorage.setItem('survey-draft', JSON.stringify(surveyData));
            window.showAppNotification('Borrador guardado exitosamente.', 'success');
        } catch (error) {
            console.error('Error al guardar borrador:', error);
            window.showAppNotification('Error al guardar el borrador.', 'error');
        }
    };

    /*** Restaura un borrador si existe*/
    const restoreDraftIfExists = () => {
        try {
            const draft = sessionStorage.getItem('survey-draft');
            if (draft) {
                const surveyData = JSON.parse(draft);
                
                // Restaurar datos básicos
                document.getElementById('survey-title').value = surveyData.title || '';
                document.getElementById('survey-description').value = surveyData.description || '';
                document.getElementById('survey-deadline').value = surveyData.deadline || '';
                document.getElementById('survey-is-mandatory').checked = surveyData.is_mandatory || false;

                // Restaurar preguntas
                questionsContainer.innerHTML = '';
                if (surveyData.questions && surveyData.questions.length > 0) {
                    surveyData.questions.forEach(q => {
                        addQuestionBlock();
                    });
                } else {
                    addQuestionBlock();
                }

                window.showAppNotification('Borrador restaurado.', 'info');
            } else {
                addQuestionBlock();
            }
        } catch (error) {
            console.error('Error al restaurar borrador:', error);
            addQuestionBlock();
        }
    };

    // === EVENTOS ===

    // Agregar pregunta inicial al cargar
    restoreDraftIfExists();

    // Botón "+ Agregar pregunta"
    addQuestionBtn.addEventListener('click', (e) => {
        e.preventDefault();
        addQuestionBlock();
    });

    // Botón "Guardar borrador"
    if (saveDraftBtn) {
        saveDraftBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const surveyData = collectSurveyData();
            if (surveyData) {
                saveDraft(surveyData);
            }
        });
    }

    // Envío del formulario (Publicar)
    surveyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const surveyData = collectSurveyData();
        if (!surveyData) {
            return; // Las funciones ya muestran el error
        }

        // Asignar ID al botón submit para control de estado
        const submitBtn = surveyForm.querySelector('button[type="submit"]');
        submitBtn.id = 'publish-btn-state';

        const success = await publishSurvey(surveyData, 'publish-btn-state');
        if (success) {
            // Limpiar borrador
            sessionStorage.removeItem('survey-draft');
        }
    });
});
