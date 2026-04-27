import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTasks,
  updateTaskStatus,
  createTask,
  editTask,
  deleteTask,
} from '@/api/endpoints';

export const TASKS_KEY = ['tasks'] as const;

export const useTasks = (statusFilter?: string) =>
  useQuery({
    queryKey: [...TASKS_KEY, statusFilter],
    queryFn:  () => getTasks(statusFilter),
    staleTime: 10_000,
    refetchInterval: 8_000, // poll every 8s (Vercel-compatible, replaces SSE)
  });

export const useUpdateStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateTaskStatus(id, status),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: TASKS_KEY });
      const previousTasks = qc.getQueryData<any[]>(TASKS_KEY);
      
      qc.setQueriesData({ queryKey: TASKS_KEY }, (old: any) => {
        if (!old) return;
        return old.map((t: any) => t._id === id ? { ...t, status } : t);
      });
      
      return { previousTasks };
    },
    onError: (err, variables, context) => {
      if (context?.previousTasks) {
        qc.setQueryData(TASKS_KEY, context.previousTasks);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: TASKS_KEY });
    },
  });
};

export const useCreateTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createTask,
    onSuccess:  () => qc.invalidateQueries({ queryKey: TASKS_KEY }),
  });
};

export const useEditTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; title?: string; description?: string; assignedTo?: string[]; deadline?: string | null }) =>
      editTask(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: TASKS_KEY }),
  });
};

export const useDeleteTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteTask,
    onSuccess:  () => qc.invalidateQueries({ queryKey: TASKS_KEY }),
  });
};
