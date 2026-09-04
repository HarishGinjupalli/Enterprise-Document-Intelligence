import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import DocumentDetail from './pages/DocumentDetail';
import Chat from './pages/Chat';
import Evaluations from './pages/Evaluations';
import Metrics from './pages/Metrics';
import Settings from './pages/Settings';

export default function App() {
  const { loading } = useAuth();

  if (loading) return <LoadingSpinner />;

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
        <Route path="/documents" element={<Layout><Documents /></Layout>} />
        <Route path="/documents/:id" element={<Layout><DocumentDetail /></Layout>} />
        <Route path="/chat" element={<Layout><Chat /></Layout>} />
        <Route path="/evaluations" element={<Layout><Evaluations /></Layout>} />
        <Route path="/metrics" element={<Layout><Metrics /></Layout>} />
        <Route path="/settings" element={<Layout><Settings /></Layout>} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
