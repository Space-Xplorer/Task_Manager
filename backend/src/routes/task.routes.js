import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import {
  listTasks,
  createNewTask,
  patchTaskStatus,
  patchTask,
  removeTask,
  listUsers,
} from '../controllers/task.controller.js';

const router = Router();

// All task routes require authentication
router.use(authenticate);

// GET /api/tasks — admin sees all, user sees own
router.get('/', listTasks);

// POST /api/tasks — admin only
router.post('/', authorize('admin'), createNewTask);

// PATCH /api/tasks/:id/status — admin any, user own only (ownership check in service)
router.patch('/:id/status', patchTaskStatus);

// PATCH /api/tasks/:id — admin only (full edit)
router.patch('/:id', authorize('admin'), patchTask);

// DELETE /api/tasks/:id — admin only
router.delete('/:id', authorize('admin'), removeTask);

// GET /api/tasks/users — admin only (for assign dropdown)
router.get('/users', authorize('admin'), listUsers);

export default router;
