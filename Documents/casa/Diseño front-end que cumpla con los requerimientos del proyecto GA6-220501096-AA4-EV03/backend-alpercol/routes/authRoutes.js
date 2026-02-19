import express from 'express';
import * as authController from '../controllers/authController.js';
import authMiddleware from '../middlewares/authMiddleware.js'; // Asumiendo que authMiddleware está en la raíz

const router = express.Router();

router.post('/registro', authController.register);
router.post('/login', authController.login); // Nota: En server.js original era /login, aquí lo agrupamos bajo /api/auth si se desea, o se monta en raíz
router.get('/me', authMiddleware, authController.getMe);

export default router;