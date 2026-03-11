import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { Rol } from '../context/AuthContext';

interface Props {
  rolesPermitidos: Rol[];
}

const RoleGuard = ({ rolesPermitidos }: Props) => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  // Sincronizado: usamos user.rol
  if (!rolesPermitidos.includes(user.rol)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default RoleGuard;