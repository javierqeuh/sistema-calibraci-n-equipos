// server.js
import express from 'express';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import dotenv from 'dotenv'; // Import dotenv
import db from './config/db.js'; // Import the database pool from db.js
import apiRoutes from './routes/index.js';
import * as authController from './controllers/authController.js';
import encuestaRoutes from './routes/encuestaRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

// 1. Configuración de variables de entorno
dotenv.config({ path: path.join(__dirname, 'config', '.env') }); // Cargar variables de entorno desde la carpeta config

// 2. Middlewares Generales
app.use(cors());
app.use(express.json());


// 3. Configuración de Seguridad (CSP)
// Permite scripts propios, estilos en línea y conexiones a localhost (soluciona el error de DevTools)
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; font-src 'self' https://cdnjs.cloudflare.com; img-src 'self' data:; connect-src 'self' http://localhost:*"
  );
  next();
});

// 4. Redirección automática de .htm a .html
app.use((req, res, next) => {
  if (req.path.endsWith('.htm')) {
    return res.redirect(301, req.path.replace(/\.htm$/, '.html'));
  }
  next();
});

// 5. Configuración de Archivos Estáticos
// Sirve los archivos HTML desde la carpeta 'html_interfaz' como si estuvieran en la raíz
app.use(express.static(path.join(__dirname, 'html_interfaz'))); 
// Sirve los imágenes desde la carpeta 'img' bajo la ruta /img
app.use('/img', express.static(path.join(__dirname, 'img')));
// Sirve la lógica de la interfaz (JS)
app.use('/logica_interfaz', express.static(path.join(__dirname, 'logica_interfaz')));


// 6. Rutas de la API (Centralizadas)
app.use('/api', apiRoutes);

// 7. Rutas de Encuestas (Compatibilidad)
// Ruta de compatibilidad para el dashboard que llama a /surveys directamente
app.use('/surveys', encuestaRoutes);

// 8. Rutas de Autenticación
// Redirección para compatibilidad con frontend existente si llama a /login directamente
app.post('/login', authController.login);
app.post('/api/registro', authController.register);
app.post('/forgot-password', authController.forgotPassword);
app.post('/reset-password', authController.resetPassword);

// 9. Ruta Raíz
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'html_interfaz', 'index.html'));
});

// 10. Inicialización del Servidor y Base de Datos
app.listen(PORT, async () => {
  try {
    // Probar la conexión a la base de datos al iniciar el servidor
    const connection = await db.getConnection();
    
    // Crear tabla de notificaciones si no existe
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS notificacion (
        id_notificacion INT AUTO_INCREMENT PRIMARY KEY,
        id_usuario INT NOT NULL,
        id_trabajador INT,
        id_encuesta INT,
        titulo VARCHAR(100),
        mensaje TEXT,
        tipo ENUM('nueva_encuesta', 'asignacion', 'respuesta', 'resultado', 'recordatorio', 'completada', 'encuesta'),
        leida BOOLEAN NOT NULL DEFAULT FALSE,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Crear tabla de comentarios si no existe
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS comentario_asignacion (
        id_comentario INT AUTO_INCREMENT PRIMARY KEY,
        id_asignacion INT NOT NULL,
        id_autor INT NOT NULL,
        texto TEXT NOT NULL,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_asignacion) REFERENCES encuesta_asignada(id_asignacion) ON DELETE CASCADE,
        FOREIGN KEY (id_autor) REFERENCES usuario(id_usuario)
      )
    `);

    console.log('✅ Conectado a MySQL');
    connection.release(); // Liberar la conexión de vuelta al pool
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log(`Tu formulario: http://localhost:${PORT}/interfasz-ingreso.html`);
  } catch (err) {
    console.error('Error al conectar con MySQL:', err.message);
    process.exit(1); // Salir si la conexión a la base de datos falla
  }
});