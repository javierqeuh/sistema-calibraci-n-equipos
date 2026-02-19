import express from 'express';
import * as notificacionController from '../controllers/notificacionController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', authMiddleware, notificacionController.getNotifications);
router.put('/:id/leida', authMiddleware, notificacionController.markAsRead);
router.delete('/:id', authMiddleware, notificacionController.deleteNotification);
router.put('/marcar-todas-leidas', authMiddleware, notificacionController.markAllAsRead);
router.get('/no-leidas/count', authMiddleware, notificacionController.countUnread);

export default router;