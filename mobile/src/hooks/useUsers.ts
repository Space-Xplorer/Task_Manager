import { useQuery } from '@tanstack/react-query';
import { getUsers } from '@/api/endpoints';

export const USERS_KEY = ['users'] as const;

export const useUsers = (enabled = true) =>
  useQuery({
    queryKey: USERS_KEY,
    queryFn:  getUsers,
    enabled,
    staleTime: 1000 * 60 * 5, // 5 min — user list changes rarely
  });
