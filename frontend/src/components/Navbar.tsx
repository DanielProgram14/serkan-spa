import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from '@mui/material';
import { KeyboardArrowDown } from '@mui/icons-material';

import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AssignmentIcon from '@mui/icons-material/Assignment';
import BusinessIcon from '@mui/icons-material/Business';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DescriptionIcon from '@mui/icons-material/Description';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import PeopleIcon from '@mui/icons-material/People';

import { useAuth } from '../hooks/useAuth';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [openProfile, setOpenProfile] = useState(false);

  const menuItems = [
    { label: 'Dashboard', path: '/dashboard', icon: <DashboardIcon />, roles: ['ADMINISTRADOR', 'RRHH', 'SUPERVISOR', 'TRABAJADOR'] },
    { label: 'Trabajadores', path: '/trabajadores', icon: <PeopleIcon />, roles: ['ADMINISTRADOR', 'RRHH', 'SUPERVISOR'] },
    { label: 'Documentos', path: '/documentos', icon: <DescriptionIcon />, roles: ['ADMINISTRADOR', 'RRHH', 'TRABAJADOR'] },
    { label: 'Clientes', path: '/clientes', icon: <BusinessIcon />, roles: ['ADMINISTRADOR', 'RRHH', 'SUPERVISOR'] },
    { label: 'Inventario', path: '/inventario', icon: <Inventory2Icon />, roles: ['ADMINISTRADOR', 'RRHH', 'SUPERVISOR'] },
    { label: 'Tareas', path: '/tareas', icon: <AssignmentIcon />, roles: ['ADMINISTRADOR', 'RRHH', 'SUPERVISOR', 'TRABAJADOR'] },
    { label: 'Cuentas', path: '/admin', icon: <AdminPanelSettingsIcon />, roles: ['ADMINISTRADOR'] },
  ];

  const filteredItems = menuItems.filter((item) => user && item.roles.includes(user.rol));

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleOpenProfile = () => {
    handleClose();
    setOpenProfile(true);
  };

  const handleLogout = () => {
    handleClose();
    logout();
    navigate('/login');
  };

  const getInitials = (name: string) => name.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2);

  return (
    <AppBar
      position="sticky"
      sx={{ bgcolor: '#fff', borderBottom: '1px solid #e2e8f0', boxShadow: 'none', zIndex: (theme) => theme.zIndex.drawer + 1 }}
    >
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ height: 70 }}>
          <Typography
            variant="h6"
            sx={{ mr: 6, fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
            onClick={() => navigate('/dashboard')}
          >
            SERKAN SPA
          </Typography>

          <Box sx={{ flexGrow: 1, display: 'flex', gap: 0.5 }}>
            {filteredItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Button
                  key={item.label}
                  onClick={() => navigate(item.path)}
                  startIcon={item.icon}
                  sx={{
                    color: isActive ? '#2563eb' : '#64748b',
                    bgcolor: isActive ? '#eff6ff' : 'transparent',
                    fontWeight: isActive ? 'bold' : '500',
                    px: 2,
                    borderRadius: 2,
                    textTransform: 'none',
                    '&:hover': { bgcolor: '#f1f5f9' },
                  }}
                >
                  {item.label}
                </Button>
              );
            })}
          </Box>

          <Box sx={{ flexGrow: 0 }}>
            <Button onClick={handleMenu} endIcon={<KeyboardArrowDown sx={{ color: '#94a3b8' }} />} sx={{ textTransform: 'none', borderRadius: 3, p: 1 }}>
              <Box sx={{ textAlign: 'right', mr: 1.5, display: { xs: 'none', md: 'block' } }}>
                <Typography variant="body2" color="#0f172a" fontWeight="bold">
                  {user?.nombres || 'Usuario'}
                </Typography>
                <Typography variant="caption" color="#64748b" sx={{ display: 'block', textTransform: 'uppercase' }}>
                  {user?.rol || 'SIN ROL'}
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: '#2563eb', width: 38, height: 38, fontSize: 14 }}>{user ? getInitials(user.nombres) : '??'}</Avatar>
            </Button>

            <Menu
              sx={{ mt: '45px' }}
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleClose}
              anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
              PaperProps={{ sx: { borderRadius: 3, minWidth: 180, boxShadow: '0 10px 25px rgba(0,0,0,0.1)' } }}
            >
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Conectado como:
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {user?.rut}
                </Typography>
              </Box>
              <MenuItem onClick={handleOpenProfile}>Mi Perfil</MenuItem>
              <MenuItem onClick={handleLogout} sx={{ color: '#ef4444' }}>
                Cerrar Sesion
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </Container>

      <Dialog open={openProfile} onClose={() => setOpenProfile(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Mi Perfil</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2">
            <b>Nombre:</b> {user?.nombres || '-'}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            <b>Rol:</b> {user?.rol || '-'}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            <b>Usuario/RUT:</b> {user?.rut || '-'}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            <b>Trabajador vinculado:</b> {user?.trabajador_rut || 'No vinculado'}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            <b>Area:</b> {user?.area || 'Sin area'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenProfile(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </AppBar>
  );
};

export default Navbar;
