import { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { toast } from "sonner";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, AlertTriangle } from "lucide-react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { checkRequiredEnvVars } from '@/utils/env-check';

// Create a wrapper for lazy loaded components
const lazyLoad = (importFn: () => Promise<any>, componentName: string) => {
  return lazy(() => 
    importFn().catch(err => {
      console.error(`Failed to load component ${componentName}:`, err);
      return { 
        default: () => (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-4">
            <AlertTriangle className="w-16 h-16 text-yellow-500 mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Failed to load {componentName}</h2>
            <p className="text-gray-600 mb-4">Please try refreshing the page</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
            >
              Refresh
            </button>
          </div>
        )
      };
    })
  );
};

// Lazy load the pages for better performance
const Index = lazyLoad(() => import("@/pages/Index"), "Home Page");
const EventDetail = lazyLoad(() => import("@/pages/EventDetail"), "Event Details");
const BookingPage = lazyLoad(() => import("@/pages/BookingPageNew"), "Booking Page");
const BookingConfirmation = lazyLoad(() => import("@/pages/BookingConfirmation"), "Booking Confirmation");
const PaymentPage = lazyLoad(() => import("@/pages/PaymentPage"), "Payment Page");
const TicketsPage = lazyLoad(() => import("@/pages/TicketsPage"), "Tickets Page");
const LoginPage = lazyLoad(() => import("@/pages/auth/LoginPage"), "Login Page");
const RegisterPage = lazyLoad(() => import("@/pages/auth/RegisterPage"), "Register Page");
const PasswordReset = lazyLoad(() => import("@/components/auth/PasswordReset"), "Password Reset");
const ResetPasswordConfirm = lazyLoad(() => import("@/components/auth/ResetPasswordConfirm"), "Reset Password Confirmation");
const ProfilePage = lazyLoad(() => import("@/pages/ProfilePage"), "Profile Page");
const MyBookings = lazyLoad(() => import("@/pages/MyBookings"), "My Bookings");
const MoviesPage = lazyLoad(() => import("@/pages/MoviesPage"), "Movies Page");
const LiveEventsPage = lazyLoad(() => import("@/pages/LiveEventsPage"), "Live Events Page");
const AdminDashboard = lazyLoad(() => import("@/pages/admin/Dashboard"), "Admin Dashboard");
const AdminEvents = lazyLoad(() => import("@/pages/admin/Events"), "Admin Events");
const AdminUsers = lazyLoad(() => import("@/pages/admin/Users"), "Admin Users");
const AdminBookings = lazyLoad(() => import("@/pages/admin/Bookings"), "Admin Bookings");
const AdminReports = lazyLoad(() => import("@/pages/admin/Reports"), "Admin Reports");
const AdminSettings = lazyLoad(() => import("@/pages/admin/Settings"), "Admin Settings");

// Loading spinner for lazy-loaded components
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="w-8 h-8 animate-spin" />
  </div>
);

// Create a wrapper component for admin routes
const AdminRoute = ({ element }: { element: React.ReactNode }) => {
  const { isAdmin, isLoading } = useAuth();
  
  if (isLoading) {
    return <PageLoader />;
  }
  
  if (!isAdmin) {
    toast.error('Unauthorized Access', {
      description: 'You do not have permission to access this page'
    });
    return <Navigate to="/" replace />;
  }
  
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        {element}
      </Suspense>
    </ErrorBoundary>
  );
};

// Create a wrapper component for user routes
const UserRoute = ({ element }: { element: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <PageLoader />;
  }
  
  if (!user) {
    toast.error('Authentication Required', {
      description: 'Please log in to access this page'
    });
    return <Navigate to="/login" replace />;
  }
  
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        {element}
      </Suspense>
    </ErrorBoundary>
  );
};

// Create a wrapper component for public routes
const PublicRoute = ({ element }: { element: React.ReactNode }) => {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        {element}
      </Suspense>
    </ErrorBoundary>
  );
};

// Create a wrapper component for auth routes
const AuthRoute = ({ element }: { element: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <PageLoader />;
  }
  
  if (user) {
    return <Navigate to="/" replace />;
  }
  
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        {element}
      </Suspense>
    </ErrorBoundary>
  );
};

// Create a wrapper component for not found routes
const NotFoundRoute = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-4xl font-bold mb-4">404</h1>
      <p className="text-xl mb-8">Page not found</p>
      <button
        onClick={() => window.history.back()}
        className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
      >
        Go Back
      </button>
    </div>
  );
};

// Create a wrapper component for error routes
const ErrorRoute = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-4xl font-bold mb-4">500</h1>
      <p className="text-xl mb-8">Something went wrong</p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
      >
        Reload Page
      </button>
    </div>
  );
};

// Create a wrapper component for the app
const App = () => {
  const queryClient = new QueryClient();
  
  useEffect(() => {
    // Check if required environment variables are set
    checkRequiredEnvVars();
    
    // Log app initialization
    console.log('App initialized');
  }, []);
  
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<PublicRoute element={<Index />} />} />
              <Route path="/movies" element={<PublicRoute element={<MoviesPage />} />} />
              <Route path="/events" element={<PublicRoute element={<LiveEventsPage />} />} />
              <Route path="/event/:id" element={<PublicRoute element={<EventDetail />} />} />
              
              {/* Auth Routes */}
              <Route path="/login" element={<AuthRoute element={<LoginPage />} />} />
              <Route path="/register" element={<AuthRoute element={<RegisterPage />} />} />
              <Route path="/reset-password" element={<AuthRoute element={<PasswordReset />} />} />
              <Route path="/reset-password/:token" element={<AuthRoute element={<ResetPasswordConfirm />} />} />
              
              {/* User Routes */}
              <Route path="/profile" element={<UserRoute element={<ProfilePage />} />} />
              <Route path="/my-bookings" element={<UserRoute element={<MyBookings />} />} />
              <Route path="/booking/:id" element={<UserRoute element={<BookingPage />} />} />
              <Route path="/booking/:id/confirmation" element={<UserRoute element={<BookingConfirmation />} />} />
              <Route path="/payment/:id" element={<UserRoute element={<PaymentPage />} />} />
              <Route path="/tickets/:id" element={<UserRoute element={<TicketsPage />} />} />
              
              {/* Admin Routes */}
              <Route path="/admin" element={<AdminRoute element={<AdminDashboard />} />} />
              <Route path="/admin/events" element={<AdminRoute element={<AdminEvents />} />} />
              <Route path="/admin/users" element={<AdminRoute element={<AdminUsers />} />} />
              <Route path="/admin/bookings" element={<AdminRoute element={<AdminBookings />} />} />
              <Route path="/admin/reports" element={<AdminRoute element={<AdminReports />} />} />
              <Route path="/admin/settings" element={<AdminRoute element={<AdminSettings />} />} />
              
              {/* Error Routes */}
              <Route path="/error" element={<ErrorRoute />} />
              <Route path="*" element={<NotFoundRoute />} />
            </Routes>
          </BrowserRouter>
          <Toaster />
          <Sonner />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
