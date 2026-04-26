import React from 'react';
import { useAuthStore } from '@/stores/authStore';

interface Props {
  role:     'admin' | 'user' | 'any';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * RoleGate — renders children only if the current user's role matches.
 * role="any" renders for any authenticated user.
 */
export const RoleGate: React.FC<Props> = ({ role, children, fallback = null }) => {
  const user = useAuthStore((s) => s.user);
  if (!user) return <>{fallback}</>;
  if (role === 'any') return <>{children}</>;
  if (user.role !== role) return <>{fallback}</>;
  return <>{children}</>;
};
