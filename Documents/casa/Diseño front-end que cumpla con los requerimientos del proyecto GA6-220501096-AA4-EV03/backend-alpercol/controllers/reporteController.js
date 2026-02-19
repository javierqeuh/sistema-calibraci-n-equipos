import db from '../config/db.js';

export const getDashboardStats = async (req, res) => {
  try {
    const [activeSurveys] = await db.execute('SELECT COUNT(*) as count FROM encuesta WHERE fecha_limite >= NOW() OR fecha_limite IS NULL');
    const [totalUsers] = await db.execute('SELECT COUNT(*) as count FROM usuario');
    const [completedResponses] = await db.execute('SELECT COUNT(*) as count FROM respuesta');
    const [pendingResponses] = await db.execute('SELECT COUNT(*) as count FROM encuesta_asignada WHERE estado = "pendiente"');
    
    res.json({
      active: activeSurveys[0].count,
      pending: pendingResponses[0].count,
      users: totalUsers[0].count,
      completed: completedResponses[0].count
    });
  } catch (error) {
    res.status(500).json({ message: 'Error obteniendo estadísticas.' });
  }
};

export const getAssignmentsHistory = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT a.id_asignacion, e.titulo, u.email, a.fecha_asignacion, a.estado 
      FROM encuesta_asignada a
      JOIN encuesta e ON a.id_encuesta = e.id_encuesta
      JOIN trabajador t ON a.id_trabajador = t.id_trabajador
      JOIN usuario u ON t.id_usuario = u.id_usuario
      ORDER BY a.fecha_asignacion DESC
    `);
    res.json({ data: rows });
  } catch (error) {
    res.status(500).json({ message: 'Error obteniendo historial.' });
  }
};

export const getSendHistory = async (req, res) => {
  const userId = req.user.id_usuario;
  const userRole = req.user.rol;

  try {
    if (userRole === 'trabajador') {
      const [rows] = await db.execute(`
        SELECT e.id_encuesta, e.titulo as titulo_encuesta, e.fecha_creacion, ea.fecha_completada as fecha_envio, 1 as total_asignados, 1 as total_respondidos, 'enviada' as estado, e.id_encuesta as id_envio
        FROM encuesta_asignada ea
        JOIN encuesta e ON ea.id_encuesta = e.id_encuesta
        JOIN trabajador t ON ea.id_trabajador = t.id_trabajador
        WHERE t.id_usuario = ? AND ea.estado = 'completada'
        ORDER BY ea.fecha_completada DESC
      `, [userId]);
      return res.json({ data: rows });
    }

    const [rows] = await db.execute(`
      SELECT e.id_encuesta, e.titulo as titulo_encuesta, e.fecha_creacion, MAX(ea.fecha_asignacion) as fecha_envio, COUNT(ea.id_asignacion) as total_asignados, SUM(CASE WHEN ea.estado = 'completada' THEN 1 ELSE 0 END) as total_respondidos,
      CASE WHEN e.fecha_limite IS NOT NULL AND e.fecha_limite < NOW() THEN 'cerrada' WHEN COUNT(ea.id_asignacion) > 0 AND COUNT(ea.id_asignacion) = SUM(CASE WHEN ea.estado = 'completada' THEN 1 ELSE 0 END) THEN 'cerrada' ELSE 'en_progreso' END as estado,
      e.id_encuesta as id_envio
      FROM encuesta e
      JOIN encuesta_asignada ea ON e.id_encuesta = ea.id_encuesta
      WHERE e.id_usuario_creador = ?
      GROUP BY e.id_encuesta
      ORDER BY fecha_envio DESC
    `, [userId]);
    res.json({ data: rows });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener historial.' });
  }
};

export const resendSurvey = async (req, res) => {
  const surveyId = req.params.id;
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [pending] = await connection.execute(`
      SELECT ea.id_asignacion, ea.id_trabajador, u.id_usuario, e.titulo
      FROM encuesta_asignada ea JOIN encuesta e ON ea.id_encuesta = e.id_encuesta JOIN trabajador t ON ea.id_trabajador = t.id_trabajador JOIN usuario u ON t.id_usuario = u.id_usuario
      WHERE ea.id_encuesta = ? AND ea.estado = 'pendiente'
    `, [surveyId]);

    if (pending.length === 0) { await connection.rollback(); return res.json({ message: 'No hay usuarios pendientes.' }); }

    for (const p of pending) {
      await connection.execute('INSERT INTO notificacion (id_usuario, id_trabajador, id_encuesta, titulo, mensaje, tipo, fecha_creacion) VALUES (?, ?, ?, ?, ?, "recordatorio", NOW())', [p.id_usuario, p.id_trabajador, surveyId, `Recordatorio: ${p.titulo}`, `Recuerda responder la encuesta "${p.titulo}".`]);
    }
    await connection.commit();
    res.json({ message: `Recordatorio enviado a ${pending.length} usuarios.` });
  } catch (error) {
    if (connection) await connection.rollback();
    res.status(500).json({ message: 'Error al reenviar encuesta.' });
  } finally { if (connection) connection.release(); }
};