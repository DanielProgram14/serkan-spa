import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import RoleGuard from './components/RoleGuard';
import { AuthProvider } from './context/AuthContext';

import Administracion from './pages/Administracion';
import Clientes from './pages/Clientes';
import Dashboard from './pages/Dashboard';
import Documentos from './pages/Documentos';
import Inventario from './pages/Inventario';
import Login from './pages/Login';
import Tareas from './pages/Tareas';
import Trabajadores from './pages/Trabajadores';

const ALL_ROLES = ['ADMINISTRADOR', 'RRHH', 'SUPERVISOR', 'TRABAJADOR'] as const;

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
