import { Task } from '../models/Task.js';
import { User } from '../models/User.js';
import { sseManager } from './sse.service.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Removed getAdminIds() as SSE Manager tracks admins automatically


// ─── Service methods ──────────────────────────────────────────────────────────

export const getAllTasks = async (requestingUser, statusFilter, page = 1, limit = 20) => {
  const query = {};

  // Users only see their own tasks; admins see all
  if (requestingUser.role !== 'admin') {
    query.assignedTo = requestingUser.id;
  }

  if (statusFilter) query.status = statusFilter;

  const skip = (page - 1) * limit;

  const tasks = await Task.find(query)
    .populate('assignedTo', 'id name email')
    .populate('createdBy', 'id name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return tasks;
};

export const createTask = async ({ title, description, assignedTo, deadline }, createdBy) => {
  const assignees = Array.isArray(assignedTo) ? assignedTo : [assignedTo];
  const count = await User.countDocuments({ _id: { $in: assignees } });
  if (count !== assignees.length) throw Object.assign(new Error('One or more assigned users not found'), { status: 404, code: 'USER_NOT_FOUND' });

  const task = await Task.create({ title, description, assignedTo: assignees, createdBy, deadline: deadline ?? null });
  const populated = await task.populate([
    { path: 'assignedTo', select: 'id name email' },
    { path: 'createdBy',  select: 'id name email' },
  ]);

  assignees.forEach(uid => {
    sseManager.sendToUser(String(uid), 'task:assigned', {
      taskId: String(task._id),
      title: task.title,
      message: `You have been assigned a new task: "${task.title}"`,
    });
  });

  return populated;
};

export const updateTaskStatus = async (taskId, status, requestingUser) => {
  const task = await Task.findById(taskId);
  if (!task) throw Object.assign(new Error('Task not found'), { status: 404, code: 'TASK_NOT_FOUND' });

  // Users can only update tasks assigned to them
  if (requestingUser.role !== 'admin') {
    const assigneeIds = task.assignedTo.map(a => String(a._id || a));
    if (!assigneeIds.includes(requestingUser.id)) {
      throw Object.assign(new Error('You can only update your own tasks'), { status: 403, code: 'FORBIDDEN' });
    }
  }

  task.status = status;
  await task.save();

  await task.populate([
    { path: 'assignedTo', select: 'id name email' },
    { path: 'createdBy',  select: 'id name email' },
  ]);

  // SSE: notify all admins of the status change (Optimized - no DB query)
  sseManager.sendToAdmins('task:updated', {
    taskId: String(task._id),
    title: task.title,
    status: task.status,
    updatedBy: requestingUser.id,
  });

  return task;
};

export const editTask = async (taskId, updates) => {
  const task = await Task.findById(taskId);
  if (!task) throw Object.assign(new Error('Task not found'), { status: 404, code: 'TASK_NOT_FOUND' });

  const previousAssignees = task.assignedTo.map(String);

  if (updates.title       !== undefined) task.title       = updates.title;
  if (updates.description !== undefined) task.description = updates.description;
  if (updates.deadline    !== undefined) task.deadline    = updates.deadline;
  
  if (updates.assignedTo !== undefined) {
    const assignees = Array.isArray(updates.assignedTo) ? updates.assignedTo : [updates.assignedTo];
    const count = await User.countDocuments({ _id: { $in: assignees } });
    if (count !== assignees.length) throw Object.assign(new Error('One or more assigned users not found'), { status: 404, code: 'USER_NOT_FOUND' });
    task.assignedTo = assignees;
  }

  await task.save();
  await task.populate([
    { path: 'assignedTo', select: 'id name email' },
    { path: 'createdBy',  select: 'id name email' },
  ]);

  // SSE: notify new assignees
  if (updates.assignedTo) {
    const newAssignees = task.assignedTo.map(a => String(a._id));
    const addedAssignees = newAssignees.filter(id => !previousAssignees.includes(id));
    
    addedAssignees.forEach(uid => {
      sseManager.sendToUser(uid, 'task:assigned', {
        taskId: String(task._id),
        title: task.title,
        message: `You have been assigned a task: "${task.title}"`,
      });
    });
  }

  return task;
};

export const deleteTask = async (taskId) => {
  const task = await Task.findByIdAndDelete(taskId);
  if (!task) throw Object.assign(new Error('Task not found'), { status: 404, code: 'TASK_NOT_FOUND' });

  // SSE: notify the previously assigned users
  const assignees = task.assignedTo.map(a => String(a._id || a));
  assignees.forEach(uid => {
    sseManager.sendToUser(uid, 'task:deleted', {
      taskId: String(task._id),
      title: task.title,
      message: `Task "${task.title}" has been deleted`,
    });
  });

  return task;
};

export const getAllUsers = async () => {
  return User.find({}, 'id name email role createdAt').lean();
};
