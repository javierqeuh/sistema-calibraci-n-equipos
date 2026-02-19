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

dotenv.config({ path: path.join(__dirname, 'config', '.env') }); // Cargar variables de entorno desde la carpeta config

// Middleware
app.use(cors());
app.use(express.json());

// Servir archivos estáticos de forma segura
// Sirve los archivos HTML desde la carpeta 'html_interfaz' como si estuvieran en la raíz
app.use(express.static(path.join(__dirname, 'html_interfaz'))); 
// Sirve los archivos CSS que están en la raíz del proyecto
app.use(express.static(path.join(__dirname)));
// Sirve los scripts del lado del cliente desde 'logica_interfaz' bajo la ruta /logica_interfaz
app.use('/logica_interfaz', express.static(path.join(__dirname, 'logica_interfaz')));
// Sirve los mismos scripts bajo la ruta /js para compatibilidad con los HTML
app.use('/js', express.static(path.join(__dirname, 'logica_interfaz')));
// Sirve las imágenes desde la carpeta 'img' bajo la ruta /img
app.use('/img', express.static(path.join(__dirname, 'img')));


// Usar las rutas centralizadas
app.use('/api', apiRoutes);

// Ruta de compatibilidad para el dashboard que llama a /surveys directamente
app.use('/surveys', encuestaRoutes);

// Redirección para compatibilidad con frontend existente si llama a /login directamente
app.post('/login', authController.login);
app.post('/api/registro', authController.register);

// Ruta raíz (opcional)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'html_interfaz', 'index.html'));
});

// Iniciar servidor
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
        tipo ENUM('nueva_encuesta','recordatorio','completada'),
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        fecha_lectura DATETIME NULL
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
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📄 Tu formulario: http://localhost:${PORT}/interfasz-ingreso.html`);
  } catch (err) {
    console.error('❌ Error al conectar con MySQL:', err.message);
    process.exit(1); // Salir si la conexión a la base de datos falla
  }
});