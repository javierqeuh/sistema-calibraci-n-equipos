import express from 'express';
import authRoutes from './authRoutes.js';
import encuestaRoutes from './encuestaRoutes.js';
import usuarioRoutes from './usuarioRoutes.js';
import notificacionRoutes from './notificacionRoutes.js';
import reporteRoutes from './reporteRoutes.js';

const router = express.Router();

// Rutas Públicas
router.use('/auth', authRoutes); // /api/auth/login, /api/auth/registro

// Rutas Protegidas (El middleware se aplica dentro de cada archivo de ruta o aquí globalmente si se prefiere)
router.use('/surveys', encuestaRoutes); // /api/surveys
router.use('/usuarios', usuarioRoutes); // /api/usuarios
router.use('/notificaciones', notificacionRoutes); // /api/notificaciones
router.use('/dashboard', reporteRoutes); // /api/dashboard

export default router;
