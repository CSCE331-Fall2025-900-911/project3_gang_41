import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CustomerProvider } from './contexts/CustomerContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Cashier from './Cashier';
import LoginPage from './Login';
import Kiosk from './Kiosk';
import Manager from './Manager';
import Menuboards from './Menuboards';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CustomerProvider>
          <Routes>
          {/* Public routes */}
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/kiosk" element={<Kiosk />} />
          <Route path="/menuboards" element={<Menuboards />} />

          {/* Protected routes - require authentication */}
          <Route
            path="/cashier"
            element={
              <ProtectedRoute>
                <Cashier />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manager"
            element={
              <ProtectedRoute>
                <Manager />
              </ProtectedRoute>
            }
          />
          </Routes>
        </CustomerProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
