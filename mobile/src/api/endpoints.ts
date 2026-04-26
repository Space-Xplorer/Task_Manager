import { apiClient } from './client';
import { AuthUser } from '@/stores/authStore';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface Task {
  _id:         string;
  title:       string;
  description: string;
  status:      'pending' | 'in_progress' | 'completed';
  assignedTo:  Array<{ _id: string; name: string; email: string }> | string[];
  createdBy:   { _id: string; name: string; email: string } | string;
  deadline:    string | null;
  createdAt:   string;
  updatedAt:   string;
}

export interface UserProfile {
  _id:       string;
  name:      string;
  email:     string;
  role:      'admin' | 'user';
  createdAt: string;
}

export interface AuthResponse {
  user:         AuthUser;
  accessToken:  string;
  refreshToken: string;
}

// ─── Auth endpoints ────────────────────────────────────────────────────────────

export const apiRegister = (data: { name: string; email: string; password: string }) =>
  apiClient.post<AuthResponse>('/auth/register', data).then((r) => r.data);

export const apiLogin = (data: { email: string; password: string }) =>
  apiClient.post<AuthResponse>('/auth/login', data).then((r) => r.data);

export const apiLogout = (refreshToken: string) =>
  apiClient.post('/auth/logout', { refreshToken }).then((r) => r.data);

// ─── Task endpoints ────────────────────────────────────────────────────────────

export const getTasks = (status?: string) =>
  apiClient
    .get<{ tasks: Task[] }>('/tasks', { params: status ? { status } : undefined })
    .then((r) => r.data.tasks);

export const createTask = (data: { title: string; description: string; assignedTo: string[]; deadline?: string | null }) =>
  apiClient.post<{ task: Task }>('/tasks', data).then((r) => r.data.task);

export const updateTaskStatus = (id: string, status: string) =>
  apiClient.patch<{ task: Task }>(`/tasks/${id}/status`, { status }).then((r) => r.data.task);

export const editTask = (id: string, data: { title?: string; description?: string; assignedTo?: string[]; deadline?: string | null }) =>
  apiClient.patch<{ task: Task }>(`/tasks/${id}`, data).then((r) => r.data.task);

export const deleteTask = (id: string) =>
  apiClient.delete(`/tasks/${id}`).then((r) => r.data);

// ─── User endpoints (admin only) ──────────────────────────────────────────────

export const getUsers = () =>
  apiClient.get<{ users: UserProfile[] }>('/tasks/users').then((r) => r.data.users);

// ─── SSE endpoints ────────────────────────────────────────────────────────────

export const apiGetSSETicket = () =>
  apiClient.post<{ ticket: string }>('/sse/ticket').then((r) => r.data.ticket);
