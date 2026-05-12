import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
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
// login 
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

// 1. SOLICITAR RECUPERACIÓN
export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    // 1. Buscar el usuario
    const [users] = await db.execute('SELECT id_usuario, email FROM usuario WHERE email = ?', [email]);
    
    // Por seguridad, siempre respondemos igual para no revelar si el email existe o no
    if (users.length === 0) {
      return res.status(200).json({ 
        message: "Si el correo existe, se ha enviado un enlace de recuperación." 
      });
    }
    const user = users[0];

    // 2. Generar token aleatorio
    const token = crypto.randomBytes(20).toString('hex');
    const expireDate = new Date(Date.now() + 3600000); // 1 hora

    // 3. Guardar token en la DB (MySQL)
    // await db.execute('UPDATE usuario SET reset_token = ?, reset_expires = ? WHERE id_usuario = ?', [token, expireDate, user.id_usuario]);

    // 4. Construir el enlace de reseteo
    const resetUrl = `http://localhost:3001/reset-password?token=${token}`;

    // 5. Enviar el correo (Requiere configurar nodemailer)
    // Por ahora solo mostramos en consola para depuración
    console.log(`[SIMULACIÓN] Enviar correo a ${email} con token: ${token}`);
    console.log(`[SIMULACIÓN] Link: ${resetUrl}`);

    res.status(200).json({ message: "Correo de recuperación enviado." });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error en el servidor." });
  }
};

// 2. RESTABLECER CONTRASEÑA
export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    // 1. Buscar usuario con el token Y que no haya expirado
    // const [users] = await db.execute('SELECT * FROM usuario WHERE reset_token = ? AND reset_expires > NOW()', [token]);

    // if (users.length === 0) {
    //   return res.status(400).json({ message: "Token inválido o expirado." });
    // }
    // const user = users[0];

    // 2. Actualizar contraseña
    // const hashedPassword = await bcrypt.hash(newPassword, 10);
    // await db.execute('UPDATE usuario SET password_hash = ?, reset_token = NULL, reset_expires = NULL WHERE id_usuario = ?', [hashedPassword, user.id_usuario]);

    res.status(200).json({ message: "Contraseña actualizada con éxito (Simulado)." });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al actualizar la contraseña." });
  }
};
