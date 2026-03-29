import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';

import Layout from './components/Layout';
import RoleGuard from './components/RoleGuard';
import { AuthProvider } from './context/AuthContext';

// El Login se importa directamente para que cargue ultra rápido al abrir la web
import Login from './pages/Login';

// Componentes protegidos cargados únicamente bajo demanda (Lazy Loading)
const Administracion = lazy(() => import('./pages/Administracion'));
const Clientes = lazy(() => import('./pages/Clientes'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Documentos = lazy(() => import('./pages/Documentos'));
const Inventario = lazy(() => import('./pages/Inventario'));
const Tareas = lazy(() => import('./pages/Tareas'));
const Trabajadores = lazy(() => import('./pages/Trabajadores'));

const ALL_ROLES = ['ADMINISTRADOR', 'RRHH', 'SUPERVISOR', 'TRABAJADOR'] as const;

const FullScreenLoader = () => (
  <Box display="flex" justifyContent="center" alignItems="center" height="100vh" bgcolor="#f8fafc">
    <CircularProgress size={50} thickness={4} />
  </Box>
);

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<FullScreenLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<RoleGuard rolesPermitidos={[...ALL_ROLES]} />}>
              <Route element={<Layout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/tareas" element={<Tareas />} />

                <Route element={<RoleGuard rolesPermitidos={['ADMINISTRADOR', 'RRHH', 'SUPERVISOR']} />}>
                  <Route path="/trabajadores" element={<Trabajadores />} />
                </Route>

                <Route element={<RoleGuard rolesPermitidos={['ADMINISTRADOR', 'RRHH', 'TRABAJADOR']} />}>
                  <Route path="/documentos" element={<Documentos />} />
                </Route>

                <Route element={<RoleGuard rolesPermitidos={['ADMINISTRADOR', 'RRHH', 'SUPERVISOR']} />}>
                  <Route path="/clientes" element={<Clientes />} />
                </Route>

                <Route element={<RoleGuard rolesPermitidos={['ADMINISTRADOR', 'RRHH', 'SUPERVISOR']} />}>
                  <Route path="/inventario" element={<Inventario />} />
                </Route>

                <Route element={<RoleGuard rolesPermitidos={['ADMINISTRADOR']} />}>
                  <Route path="/admin" element={<Administracion />} />
                </Route>
              </Route>
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
