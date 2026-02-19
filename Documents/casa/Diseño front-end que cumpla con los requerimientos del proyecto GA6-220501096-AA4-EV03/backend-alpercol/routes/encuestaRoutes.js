import express from 'express';
import * as encuestaController from '../controllers/encuestaController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/mis-asignaciones', authMiddleware, encuestaController.getMyAssignments);
router.post('/asignaciones/:id/comentario', authMiddleware, encuestaController.addAssignmentComment);
router.post('/asignaciones', authMiddleware, encuestaController.assignSurvey); // Originalmente /api/asignaciones

router.post('/', authMiddleware, encuestaController.createSurvey); // /surveys
router.get('/', authMiddleware, encuestaController.getAllSurveys);
router.get('/:id', authMiddleware, encuestaController.getSurveyById);
router.delete('/:id', authMiddleware, encuestaController.deleteSurvey);
router.get('/:id/responses', authMiddleware, encuestaController.getSurveyResponses);
router.post('/:id/responses', authMiddleware, encuestaController.saveResponses);

export default router;