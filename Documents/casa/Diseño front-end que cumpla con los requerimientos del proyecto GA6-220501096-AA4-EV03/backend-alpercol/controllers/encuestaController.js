import db from '../config/db.js';

export const createSurvey = async (req, res) => {
  const { title, description, deadline, is_mandatory, questions } = req.body;
  const userId = req.user.id_usuario;

  if (!title || !questions || questions.length === 0) {
    return res.status(400).json({ message: 'Título y preguntas son obligatorios.' });
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [surveyResult] = await connection.execute(
      `INSERT INTO encuesta (titulo, descripcion, fecha_limite, id_usuario_creador, fecha_creacion) VALUES (?, ?, ?, ?, NOW())`,
      [title, description, deadline || null, userId]
    );
    const surveyId = surveyResult.insertId;

    for (const q of questions) {
      const [questionResult] = await connection.execute(
        `INSERT INTO pregunta (id_encuesta, text_pregunta, tipo, obligatoria, orden) VALUES (?, ?, ?, ?, ?)`,
        [surveyId, q.text, q.type, q.is_mandatory ? 1 : 0, q.order]
      );
      const questionId = questionResult.insertId;

      if (q.type === 'opcion_multiple' && q.options && q.options.length > 0) {
        for (const opt of q.options) {
          await connection.execute(
            `INSERT INTO opcion (id_pregunta, texto, orden) VALUES (?, ?, ?)`,
            [questionId, opt.text, opt.order]
          );
        }
      }
    }

    await connection.commit();
    res.status(201).json({ message: 'Encuesta creada exitosamente.', id_encuesta: surveyId });
  } catch (error) {
    console.error('Error creando encuesta:', error);
    if (connection) await connection.rollback();
    res.status(500).json({ message: 'Error al guardar la encuesta.', error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

export const deleteSurvey = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.execute('DELETE FROM encuesta WHERE id_encuesta = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Encuesta no encontrada.' });
    res.json({ message: 'Encuesta eliminada con éxito', id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al eliminar la encuesta' });
  }
};

export const getAllSurveys = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM encuesta ORDER BY fecha_creacion DESC');
    res.json({ data: rows });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener encuestas.' });
  }
};

export const getSurveyById = async (req, res) => {
  const surveyId = req.params.id;
  try {
    const [surveyRows] = await db.execute('SELECT * FROM encuesta WHERE id_encuesta = ?', [surveyId]);
    if (surveyRows.length === 0) return res.status(404).json({ message: 'Encuesta no encontrada.' });
    
    const survey = surveyRows[0];
    const [questions] = await db.execute('SELECT * FROM pregunta WHERE id_encuesta = ? ORDER BY orden ASC', [surveyId]);

    for (const q of questions) {
      if (q.tipo === 'opcion_multiple') {
        const [options] = await db.execute('SELECT * FROM opcion WHERE id_pregunta = ? ORDER BY orden ASC', [q.id_pregunta]);
        q.options = options.map(o => ({ id_opcion: o.id_opcion, text: o.texto }));
      }
      q.text = q.text_pregunta;
      q.type = q.tipo;
      q.is_mandatory = q.obligatoria ? 1 : 0;
    }

    survey.questions = questions;
    survey.title = survey.titulo;
    survey.description = survey.descripcion;
    res.json({ data: survey });
  } catch (error) {
    res.status(500).json({ message: 'Error del servidor.' });
  }
};

export const getSurveyResponses = async (req, res) => {
  const surveyId = req.params.id;
  try {
    const [surveyRows] = await db.execute('SELECT id_encuesta FROM encuesta WHERE id_encuesta = ?', [surveyId]);
    if (surveyRows.length === 0) return res.status(404).json({ message: 'Encuesta no encontrada.' });

    const [answers] = await db.execute(`
      SELECT r.id_asignacion, r.id_pregunta, r.valor_texto, r.valor_escala, o.texto as texto_opcion
      FROM respuesta r
      JOIN encuesta_asignada ea ON r.id_asignacion = ea.id_asignacion
      LEFT JOIN opcion o ON r.id_opcion_seleccionada = o.id_opcion
      WHERE ea.id_encuesta = ? AND ea.estado = 'completada'
    `, [surveyId]);

    const [comments] = await db.execute(`
      SELECT ca.id_asignacion, ca.texto, ca.fecha, u.nombre as autor
      FROM comentario_asignacion ca
      JOIN encuesta_asignada ea ON ca.id_asignacion = ea.id_asignacion
      JOIN usuario u ON ca.id_autor = u.id_usuario
      WHERE ea.id_encuesta = ?
    `, [surveyId]);

    const responsesMap = {};
    answers.forEach(a => {
        if (!responsesMap[a.id_asignacion]) responsesMap[a.id_asignacion] = { id_asignacion: a.id_asignacion, respuestas: [], comentarios: [] };
        let respuestaVal = a.texto_opcion || (a.valor_escala ? a.valor_escala.toString() : a.valor_texto);
        responsesMap[a.id_asignacion].respuestas.push({ id_pregunta: a.id_pregunta, respuesta: respuestaVal });
    });
    
    comments.forEach(c => {
        if (responsesMap[c.id_asignacion]) {
            responsesMap[c.id_asignacion].comentarios.push({ texto: c.texto, fecha: c.fecha, autor: c.autor });
        }
    });

    res.json({ data: Object.values(responsesMap) });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener resultados.' });
  }
};

export const saveResponses = async (req, res) => {
  const surveyId = req.params.id;
  const userId = req.user.id_usuario;
  const { responses } = req.body;

  if (!responses || responses.length === 0) return res.status(400).json({ message: 'No hay respuestas para guardar.' });

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [tRows] = await connection.execute('SELECT id_trabajador FROM trabajador WHERE id_usuario = ?', [userId]);
    if (!tRows || tRows.length === 0) { await connection.rollback(); return res.status(403).json({ message: 'El usuario no es un trabajador válido.' }); }
    const id_trabajador = tRows[0].id_trabajador;

    const [assignRows] = await connection.execute(
      'SELECT id_asignacion, estado FROM encuesta_asignada WHERE id_encuesta = ? AND id_trabajador = ? ORDER BY id_asignacion DESC LIMIT 1',
      [surveyId, id_trabajador]
    );
    if (!assignRows || assignRows.length === 0) { await connection.rollback(); return res.status(403).json({ message: 'No tienes asignada esta encuesta.' }); }
    if (assignRows[0].estado !== 'pendiente') { await connection.rollback(); return res.status(409).json({ message: 'La encuesta ya fue respondida.' }); }

    const [qRows] = await connection.execute('SELECT id_pregunta, tipo FROM pregunta WHERE id_encuesta = ?', [surveyId]);
    const typeMap = new Map(qRows.map(row => [row.id_pregunta, row.tipo]));

    for (const r of responses) {
      const tipo = typeMap.get(r.id_pregunta);
      if (!tipo) { await connection.rollback(); return res.status(400).json({ message: `Pregunta inválida: ${r.id_pregunta}` }); }
      
      let valor_texto = (tipo === 'texto' || tipo === 'si_no') ? r.respuesta : null;
      let id_opcion = (tipo === 'opcion_multiple') ? parseInt(r.respuesta) : null;
      let valor_escala = (tipo === 'escala_1_5') ? parseInt(r.respuesta) : null;

      await connection.execute(
        'INSERT INTO respuesta (id_asignacion, id_pregunta, valor_texto, id_opcion_seleccionada, valor_escala, fecha_respuesta) VALUES (?, ?, ?, ?, ?, NOW())',
        [assignRows[0].id_asignacion, r.id_pregunta, valor_texto, id_opcion, valor_escala]
      );
    }

    await connection.execute('UPDATE encuesta_asignada SET estado = "completada", fecha_completada = NOW() WHERE id_asignacion = ?', [assignRows[0].id_asignacion]);
    
    // Notificar al creador de la encuesta
    const [surveyInfo] = await connection.execute('SELECT titulo, id_usuario_creador FROM encuesta WHERE id_encuesta = ?', [surveyId]);
    if (surveyInfo.length > 0) {
      const { titulo, id_usuario_creador } = surveyInfo[0];
      const [workerInfo] = await connection.execute('SELECT nombre, apellidos FROM usuario WHERE id_usuario = ?', [userId]);
      const workerName = workerInfo.length > 0 ? `${workerInfo[0].nombre} ${workerInfo[0].apellidos || ''}`.trim() : 'Un trabajador';

      await connection.execute(
        'INSERT INTO notificacion (id_usuario, id_trabajador, id_encuesta, titulo, mensaje, tipo, fecha_creacion) VALUES (?, ?, ?, ?, ?, "completada", NOW())',
        [id_usuario_creador, id_trabajador, surveyId, 'Encuesta Completada', `${workerName} ha completado la encuesta "${titulo}".`]
      );
    }

    await connection.commit();
    res.status(201).json({ message: 'Respuestas guardadas correctamente.' });
  } catch (error) {
    console.error('Error guardando respuestas:', error);
    if (connection) await connection.rollback();
    res.status(500).json({ message: 'Error al guardar respuestas.' });
  } finally {
    if (connection) connection.release();
  }
};

export const assignSurvey = async (req, res) => {
  const { id_encuesta, usuarios, fecha_asignacion } = req.body;

  if (!id_encuesta || !usuarios || usuarios.length === 0) return res.status(400).json({ message: 'Datos incompletos.' });

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [surveyRows] = await connection.execute('SELECT titulo FROM encuesta WHERE id_encuesta = ?', [id_encuesta]);
    if (!surveyRows.length) { await connection.rollback(); return res.status(404).json({ message: 'Encuesta no encontrada.' }); }
    const surveyTitle = surveyRows[0].titulo;

    for (const userId of usuarios) {
      const [trabajadorRows] = await connection.execute('SELECT id_trabajador FROM trabajador WHERE id_usuario = ?', [userId]);
      if (trabajadorRows.length === 0) continue;
      
      const id_trabajador = trabajadorRows[0].id_trabajador;
      const [existing] = await connection.execute('SELECT id_asignacion FROM encuesta_asignada WHERE id_encuesta = ? AND id_trabajador = ?', [id_encuesta, id_trabajador]);

      if (existing.length === 0) {
        const assignmentDate = new Date(fecha_asignacion || Date.now()).toISOString().slice(0, 19).replace('T', ' ');
        await connection.execute(
          'INSERT INTO encuesta_asignada (id_encuesta, id_trabajador, fecha_completada, estado, fecha_asignacion) VALUES (?, ?, NULL, "pendiente", ?)',
          [id_encuesta, id_trabajador, assignmentDate]
        );
        await connection.execute(
          'INSERT INTO notificacion (id_usuario, id_trabajador, id_encuesta, titulo, mensaje, tipo, fecha_creacion) VALUES (?, ?, ?, ?, ?, "nueva_encuesta", NOW())',
          [userId, id_trabajador, id_encuesta, `Nueva Asignación: ${surveyTitle}`, `Se te ha asignado la encuesta "${surveyTitle}".`]
        );
      }
    }
    await connection.commit();
    res.status(201).json({ message: 'Asignaciones creadas correctamente.' });
  } catch (error) {
    if (connection) await connection.rollback();
    res.status(500).json({ message: 'Error al asignar encuesta.' });
  } finally {
    if (connection) connection.release();
  }
};

export const getMyAssignments = async (req, res) => {
  try {
    const [rows] = await db.execute(`SELECT a.id_asignacion, a.estado, a.fecha_asignacion, e.id_encuesta, e.titulo, e.descripcion, e.fecha_limite FROM encuesta_asignada a JOIN trabajador t ON a.id_trabajador = t.id_trabajador JOIN encuesta e ON a.id_encuesta = e.id_encuesta WHERE t.id_usuario = ? ORDER BY a.fecha_asignacion DESC`, [req.user.id_usuario]);
    res.json({ data: rows });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener asignaciones.' });
  }
};

export const addAssignmentComment = async (req, res) => {
  const { id } = req.params; // id_asignacion
  const { texto } = req.body;
  const userId = req.user.id_usuario;

  try {
    await db.execute('INSERT INTO comentario_asignacion (id_asignacion, id_autor, texto, fecha) VALUES (?, ?, ?, NOW())', [id, userId, texto]);
    res.json({ message: 'Comentario agregado.' });
  } catch (error) {
    res.status(500).json({ message: 'Error al agregar comentario.' });
  }
};