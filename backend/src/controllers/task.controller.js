import { z } from 'zod';
import {
  getAllTasks,
  createTask,
  updateTaskStatus,
  editTask,
  deleteTask,
  getAllUsers,
} from '../services/task.service.js';

// ─── Validation schemas ────────────────────────────────────────────────────────

const createTaskSchema = z.object({
  title:       z.string().min(1, 'Title is required').trim(),
  description: z.string().optional().default(''),
  assignedTo:  z.union([z.string(), z.array(z.string())]).transform(v => Array.isArray(v) ? v : [v]).refine(v => v.length > 0, 'assignedTo is required'),
  deadline:    z.preprocess(v => (v === '' || v == null) ? null : v, z.coerce.date().nullable().optional()),
});

const updateStatusSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed'], {
    errorMap: () => ({ message: 'status must be pending, in_progress, or completed' }),
  }),
});

const editTaskSchema = z.object({
  title:       z.string().min(1).trim().optional(),
  description: z.string().optional(),
  assignedTo:  z.union([z.string(), z.array(z.string())]).transform(v => Array.isArray(v) ? v : [v]).optional(),
  deadline:    z.preprocess(v => (v === '' || v == null) ? null : v, z.coerce.date().nullable().optional()),
});

// ─── Controllers ──────────────────────────────────────────────────────────────

export const listTasks = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const validStatuses = ['pending', 'in_progress', 'completed'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status filter', code: 'VALIDATION_ERROR' });
    }
    
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const tasks = await getAllTasks(req.user, status, pageNum, limitNum);
    res.json({ tasks });
  } catch (err) {
    next(err);
  }
};

export const createNewTask = async (req, res, next) => {
  try {
    const parsed = createTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message, code: 'VALIDATION_ERROR' });
    }
    const task = await createTask(parsed.data, req.user.id);
    res.status(201).json({ task });
  } catch (err) {
    next(err);
  }
};

export const patchTaskStatus = async (req, res, next) => {
  try {
    const parsed = updateStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message, code: 'VALIDATION_ERROR' });
    }
    const task = await updateTaskStatus(req.params.id, parsed.data.status, req.user);
    res.json({ task });
  } catch (err) {
    next(err);
  }
};

export const patchTask = async (req, res, next) => {
  try {
    const parsed = editTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message, code: 'VALIDATION_ERROR' });
    }
    const task = await editTask(req.params.id, parsed.data);
    res.json({ task });
  } catch (err) {
    next(err);
  }
};

export const removeTask = async (req, res, next) => {
  try {
    await deleteTask(req.params.id);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    next(err);
  }
};

export const listUsers = async (req, res, next) => {
  try {
    const users = await getAllUsers();
    res.json({ users });
  } catch (err) {
    next(err);
  }
};
