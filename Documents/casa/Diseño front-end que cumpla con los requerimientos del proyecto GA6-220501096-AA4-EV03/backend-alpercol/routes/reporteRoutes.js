import express from 'express';
import * as reporteController from '../controllers/reporteController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/stats', authMiddleware, reporteController.getDashboardStats);
router.get('/assignments', authMiddleware, reporteController.getAssignmentsHistory);
router.get('/historial-envios', authMiddleware, reporteController.getSendHistory);
router.post('/reenviar/:id', authMiddleware, reporteController.resendSurvey);

export default router;