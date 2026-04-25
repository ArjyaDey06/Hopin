import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdminDashboard from './pages/AdminDashboard';
import CreateEvent from './pages/CreateEvent';
import EventRegistration from './pages/EventRegistration';
import EventDetails from './pages/EventDetails';
import QRScanner from './pages/QRScanner';
import ManageAdmins from './pages/ManageAdmins';
import FeedbackForm from './pages/FeedbackForm';
import './index.css';

const ProtectedRoute = ({ children }) => {
  const { user, profile, loading } = useAuth();

  // Show spinner while: (1) initial load, OR (2) user is logged in but profile not fetched yet
  if (loading || (user && profile === null)) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ width: '40px', height: '40px', border: '4px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading your session...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!user || !['admin', 'superadmin'].includes(profile?.role)) {
    return <Navigate to="/login" />;
  }

  return children;
};

// Inner component so we can use hooks inside Router
function AppInner() {
  const location = useLocation();
  const hideNavbar =
    location.pathname === '/' ||
    location.pathname === '/login' ||
    location.pathname === '/signup' ||
    location.pathname.startsWith('/event/') ||
    location.pathname.startsWith('/feedback/');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {!hideNavbar && <Navbar />}
      <Routes>
        {/* Default Route */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/event/:id" element={<EventRegistration />} />
        <Route path="/feedback/:id" element={<FeedbackForm />} />

        {/* Protected Admin Routes */}
        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/event/new" element={
          <ProtectedRoute>
            <CreateEvent />
          </ProtectedRoute>
        } />
        <Route path="/admin/event/:id" element={
          <ProtectedRoute>
            <EventDetails />
          </ProtectedRoute>
        } />
        <Route path="/admin/scan/:id" element={
          <ProtectedRoute>
            <QRScanner />
          </ProtectedRoute>
        } />
        <Route path="/admin/manage" element={
          <ProtectedRoute>
            <ManageAdmins />
          </ProtectedRoute>
        } />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppInner />
      </Router>
    </AuthProvider>
  );
}

export default App;
