import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const ProtectedRoute = ({ children, requiredRole = null, requiredRoles = null, requireAdmin = false }) => {
  const { currentUser, userProfile, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Check if admin is required
  if (requireAdmin && !isAdmin()) {
    return <Navigate to="/" replace />;
  }

  // Check role-based access if requiredRole is specified (single role)
  if (requiredRole && userProfile?.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  // Check role-based access if requiredRoles is specified (multiple roles)
  if (requiredRoles && Array.isArray(requiredRoles) && !requiredRoles.includes(userProfile?.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;

