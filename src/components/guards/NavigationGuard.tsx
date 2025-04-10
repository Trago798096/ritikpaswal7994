import { FC, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { performanceMonitor } from '@/utils/performance';
import { handleError } from '@/utils/error-handler';
import { SecureData } from '@/utils/secure-data';

interface Props {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  publicOnly?: boolean;
}

export const NavigationGuard: FC<Props> = ({
  children,
  requireAuth = false,
  requireAdmin = false,
  publicOnly = false,
}) => {
  const { user, isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const endMeasure = performanceMonitor.startMeasure('navigationGuard');

    try {
      // Don't check during initial load
      if (isLoading) return;

      // Store intended destination for post-login redirect
      const currentPath = location.pathname + location.search;
      
      // Check for public-only routes (login, register)
      if (publicOnly && user) {
        navigate('/', { replace: true });
        return;
      }

      // Check authentication requirement
      if (requireAuth && !user) {
        SecureData.setItem('redirectAfterLogin', currentPath);
        navigate('/login', { 
          replace: true,
          state: { from: currentPath }
        });
        return;
      }

      // Check admin requirement
      if (requireAdmin && !isAdmin) {
        handleError(new Error('Unauthorized: Admin access required'));
        navigate('/', { replace: true });
        return;
      }

      // Handle expired sessions
      const token = SecureData.getItem<string>('session');
      if (token && !SecureData.validateToken(token)) {
        handleError(new Error('Session expired. Please login again.'));
        navigate('/login', { 
          replace: true,
          state: { from: currentPath }
        });
        return;
      }

    } catch (error) {
      handleError(error, 'Navigation error occurred');
      navigate('/', { replace: true });
    } finally {
      endMeasure();
    }
  }, [user, isAdmin, isLoading, location, navigate]);

  // Show nothing during initial load
  if (isLoading) {
    return null;
  }

  return <>{children}</>;
};

// HOC for protected routes
export function withNavigationGuard(
  WrappedComponent: React.ComponentType<any>,
  options: Omit<Props, 'children'> = {}
) {
  return function WithNavigationGuard(props: any) {
    return (
      <NavigationGuard {...options}>
        <WrappedComponent {...props} />
      </NavigationGuard>
    );
  };
}

// Route components for different access levels
export const PublicRoute: FC<{ element: React.ReactNode }> = ({ element }) => (
  <NavigationGuard publicOnly>{element}</NavigationGuard>
);

export const PrivateRoute: FC<{ element: React.ReactNode }> = ({ element }) => (
  <NavigationGuard requireAuth>{element}</NavigationGuard>
);

export const AdminRoute: FC<{ element: React.ReactNode }> = ({ element }) => (
  <NavigationGuard requireAuth requireAdmin>{element}</NavigationGuard>
);

// Custom hook for route protection
export function useRouteProtection(options: Omit<Props, 'children'> = {}) {
  const { user, isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const endMeasure = performanceMonitor.startMeasure('routeProtection');

    try {
      if (isLoading) return;

      const { requireAuth, requireAdmin, publicOnly } = options;
      const currentPath = location.pathname + location.search;

      if (publicOnly && user) {
        navigate('/', { replace: true });
        return;
      }

      if (requireAuth && !user) {
        SecureData.setItem('redirectAfterLogin', currentPath);
        navigate('/login', { 
          replace: true,
          state: { from: currentPath }
        });
        return;
      }

      if (requireAdmin && !isAdmin) {
        handleError(new Error('Unauthorized: Admin access required'));
        navigate('/', { replace: true });
        return;
      }

    } catch (error) {
      handleError(error, 'Route protection error');
      navigate('/', { replace: true });
    } finally {
      endMeasure();
    }
  }, [user, isAdmin, isLoading, location, navigate, options]);

  return { isLoading };
}
