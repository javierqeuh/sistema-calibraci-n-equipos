import express from 'express';
import * as usuarioController from '../controllers/usuarioController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', authMiddleware, usuarioController.getAllUsers);
router.post('/', authMiddleware, usuarioController.createUser);
router.get('/:id', authMiddleware, usuarioController.getUserById);
router.put('/:id', authMiddleware, usuarioController.updateUser);
router.delete('/:id', authMiddleware, usuarioController.deleteUser);

// Trabajadores
router.get('/trabajadores', authMiddleware, usuarioController.getAllWorkers); // Ojo con la ruta base
router.delete('/trabajadores/:id', authMiddleware, usuarioController.deleteWorker);

export default router;