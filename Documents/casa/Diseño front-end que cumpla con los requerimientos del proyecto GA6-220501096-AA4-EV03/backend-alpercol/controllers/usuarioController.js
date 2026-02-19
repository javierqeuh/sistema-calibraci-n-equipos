import db from '../config/db.js';
import bcrypt from 'bcrypt';
// otener usuarios
export const getAllUsers = async (req, res) => {
  try {
    const [users] = await db.execute('SELECT id_usuario, nombre, apellidos, email, rol, activo FROM usuario');
    res.json({ data: users });
  } catch (error) {
    res.status(500).json({ message: 'Error obteniendo usuarios.' });
  }
};
// obtener trabajadores
export const getAllWorkers = async (req, res) => {
  try {
    const [workers] = await db.execute(`
      SELECT t.id_trabajador, t.nombre, t.apellido, t.area as departamento, u.email, u.activo, u.id_usuario, u.rol
      FROM trabajador t
      JOIN usuario u ON t.id_usuario = u.id_usuario`);
    res.json({ data: workers });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener trabajadores.' });
  }
};
// informacion para perfil
export const getUserById = async (req, res) => {
  try {
    const [users] = await db.execute('SELECT id_usuario, nombre, apellidos, cedula, fecha_nacimiento, email, rol, activo FROM usuario WHERE id_usuario = ?', [req.params.id]);
    if (users.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json({ data: users[0] });
  } catch (error) {
    res.status(500).json({ message: 'Error obteniendo perfil.' });
  }
};
// atualizar usuario
export const updateUser = async (req, res) => {
  const { nombre, apellidos, email, rol, password } = req.body;
  try {
    let query = 'UPDATE usuario SET nombre = ?, apellidos = ?, email = ?';
    const params = [nombre, apellidos, email];
    
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += ', password_hash = ?';
      params.push(hashedPassword);
    }

    if (rol) { query += ', rol = ?'; params.push(rol); }
    query += ' WHERE id_usuario = ?';
    params.push(req.params.id);
    await db.execute(query, params);
    res.json({ message: 'Usuario actualizado correctamente.' });
  } catch (error) {
    res.status(500).json({ message: 'Error actualizando usuario.' });
  }
};
// crear usuario 
export const createUser = async (req, res) => {
  const { nombre, apellidos, email, password, rol } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.execute('INSERT INTO usuario (nombre, apellidos, email, password_hash, rol, activo, fecha_registro) VALUES (?, ?, ?, ?, ?, 1, CURDATE())', [nombre, apellidos, email, hashedPassword, rol]);
    
    if (rol === 'trabajador') {
      const id_usuario = result.insertId;
      // Se inserta con datos básicos en trabajador. La cédula es obligatoria en BD usualmente, se usa un placeholder si no viene del front.
      await db.execute(
        'INSERT INTO trabajador (numero_cedula, nombre, apellido, area, fecha_ingreso, id_usuario) VALUES (?, ?, ?, ?, CURDATE(), ?)',
        ['000000', nombre, apellidos, 'Sin asignar', id_usuario]
      );
    }
    
    res.status(201).json({ message: 'Usuario creado exitosamente.' });
  } catch (error) {
    res.status(500).json({ message: 'Error creando usuario.' });
  }
};
// eliminar usuario 
export const deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    await db.execute('DELETE FROM trabajador WHERE id_usuario = ?', [id]);
    const [result] = await db.execute('DELETE FROM usuario WHERE id_usuario = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Usuario no encontrado.' });
    res.status(200).json({ message: 'Usuario eliminado correctamente.' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar el usuario.' });
  }
};
// eliminar trabajador
export const deleteWorker = async (req, res) => {
  const { id } = req.params;
  try {
    await db.execute('DELETE FROM trabajador WHERE id_trabajador = ?', [id]);
    res.json({ message: 'Trabajador eliminado correctamente.' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar trabajador.' });
  }
};