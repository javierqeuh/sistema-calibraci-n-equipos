import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../config/db.js';

export const register = async (req, res) => {
  const { nombre, apellidos, cedula, fecha_nacimiento, email, password, rol } = req.body;

  if (!nombre || !apellidos || !cedula || !fecha_nacimiento || !email || !password || !rol) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [existing] = await connection.execute('SELECT id_usuario FROM usuario WHERE email = ?', [email]);
    if (existing.length > 0) {
      await connection.rollback();
      return res.status(409).json({ message: 'Este correo ya está registrado.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await connection.execute(
      `INSERT INTO usuario (nombre, apellidos, cedula, fecha_nacimiento, email, password_hash, rol, activo, fecha_registro) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURDATE())`,
      [nombre, apellidos, cedula, fecha_nacimiento, email, hashedPassword, rol]
    );

    if (rol === 'trabajador') {
      const id_usuario = result.insertId;
      await connection.execute(
        `INSERT INTO trabajador (numero_cedula, nombre, apellido, area, fecha_ingreso, id_usuario) 
         VALUES (?, ?, ?, ?, CURDATE(), ?)`,
        [cedula, nombre, apellidos, 'Sin asignar', id_usuario]
      );
    }

    await connection.commit();
    res.status(201).json({ message: 'Usuario registrado con éxito.' });
  } catch (error) {
    console.error('Error en registro:', error);
    if (connection) await connection.rollback();
    res.status(500).json({ message: 'Error interno del servidor.' });
  } finally {
    if (connection) connection.release();
  }
};

export const login = async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ message: 'Email, contraseña y rol son obligatorios.' });
  }

  try {
    const [users] = await db.execute(
      'SELECT id_usuario, nombre, apellidos, email, password_hash, rol FROM usuario WHERE email = ?',
      [email]
    );

    if (users.length === 0) return res.status(401).json({ message: 'Email o contraseña incorrectos.' });

    const user = users[0];
    if (user.rol !== role) return res.status(401).json({ message: 'El rol no coincide con el usuario.' });

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) return res.status(401).json({ message: 'Email o contraseña incorrectos.' });

    const token = jwt.sign({ id_usuario: user.id_usuario, rol: user.rol }, process.env.JWT_SECRET || 'secret_key', { expiresIn: '24h' });

    res.status(200).json({ 
      message: 'Autenticación exitosa.',
      user: { id_usuario: user.id_usuario, nombre: user.nombre, apellidos: user.apellidos, email: user.email, rol: user.rol },
      token: token
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

export const getMe = async (req, res) => {
  try {
    const userId = req.user.id_usuario;
    const [rows] = await db.execute(
      'SELECT id_usuario, nombre, apellidos, email, rol, activo FROM usuario WHERE id_usuario = ?',
      [userId]
    );

    if (rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado.' });
    res.json({ user: rows[0] });
  } catch (error) {
    console.error('Error al obtener usuario actual:', error);
    res.status(500).json({ message: 'Error del servidor.' });
  }
};