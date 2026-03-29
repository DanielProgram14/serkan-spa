import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Container,
  Dialog,
  DialogContent,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  TextField,
  InputAdornment,
  DialogActions,
  Alert
} from '@mui/material';
import { 
  KeyboardArrowDown, 
  Close, 
  PersonOutline, 
  BadgeOutlined, 
  WorkOutline, 
  AccountBoxOutlined, 
  Logout, 
  EmailOutlined,
  Edit,
  VpnKey,
  Save,
  ArrowBack
} from '@mui/icons-material';

import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AssignmentIcon from '@mui/icons-material/Assignment';
import BusinessIcon from '@mui/icons-material/Business';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DescriptionIcon from '@mui/icons-material/Description';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import PeopleIcon from '@mui/icons-material/People';

import { useAuth } from '../hooks/useAuth';
import api from '../api/axios';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, login } = useAuth();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [openProfile, setOpenProfile] = useState(false);
  
  // Edición de perfil
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [errorProfile, setErrorProfile] = useState('');
  const [successProfile, setSuccessProfile] = useState('');

  const menuItems = [
    { label: 'Dashboard', path: '/dashboard', icon: <DashboardIcon />, roles: ['ADMINISTRADOR', 'RRHH', 'SUPERVISOR', 'TRABAJADOR'] },
    { label: 'Trabajadores', path: '/trabajadores', icon: <PeopleIcon />, roles: ['ADMINISTRADOR', 'RRHH', 'SUPERVISOR'] },
    { label: 'Documentos', path: '/documentos', icon: <DescriptionIcon />, roles: ['ADMINISTRADOR', 'RRHH', 'TRABAJADOR'] },
    { label: 'Clientes', path: '/clientes', icon: <BusinessIcon />, roles: ['ADMINISTRADOR', 'RRHH', 'SUPERVISOR'] },
    { label: 'Inventario', path: '/inventario', icon: <Inventory2Icon />, roles: ['ADMINISTRADOR', 'RRHH', 'SUPERVISOR'] },
    { label: 'Tareas', path: '/tareas', icon: <AssignmentIcon />, roles: ['ADMINISTRADOR', 'RRHH', 'SUPERVISOR', 'TRABAJADOR'] },
    { label: 'Administración', path: '/admin', icon: <AdminPanelSettingsIcon />, roles: ['ADMINISTRADOR'] },
  ];

  const filteredItems = menuItems.filter((item) => user && item.roles.includes(user.rol));

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleOpenProfile = () => {
    handleClose();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userAny = user as any;
    setEditEmail(userAny?.email || userAny?.username || '');
    setEditPassword('');
    setErrorProfile('');
    setSuccessProfile('');
    setIsEditingProfile(false);
    setOpenProfile(true);
  };

  const handleLogout = () => {
    handleClose();
    logout();
    navigate('/login');
  };

  const handleSaveProfile = async () => {
    setErrorProfile('');
    setSuccessProfile('');
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: any = {};
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userAny = user as any;
      if (editEmail && editEmail !== (userAny?.email || userAny?.correo)) {
        payload.email = editEmail;
      }
      if (editPassword) {
        payload.password = editPassword;
      }
      
      if (Object.keys(payload).length === 0) {
        setErrorProfile('No has realizado ningún cambio.');
        return;
      }
      
      const res = await api.patch('/auth/me/', payload);
      setSuccessProfile(res.data.detail || 'Perfil actualizado con éxito');
      
      if (payload.email) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updatedUser = { ...user, email: payload.email, username: payload.email, correo: payload.email } as any;
        login(localStorage.getItem('serkan_token') || '', updatedUser);
      }
      
      setTimeout(() => {
        setIsEditingProfile(false);
        setSuccessProfile('');
      }, 2000);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setErrorProfile(err.response?.data?.detail || 'Ocurrió un error al actualizar');
    }
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
              sx={{ mt: '50px' }}
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleClose}
              anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
              PaperProps={{ sx: { borderRadius: 3, minWidth: 220, boxShadow: '0 12px 30px rgba(0,0,0,0.12)', mt: 1.5 } }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ bgcolor: '#e0f2fe', color: '#0369a1', width: 40, height: 40, fontWeight: 'bold' }}>
                  {user ? getInitials(user.nombres) : '??'}
                </Avatar>
                <Box>
                  <Typography variant="body2" fontWeight="bold" color="#0f172a" sx={{ lineHeight: 1.2 }}>
                    {user?.nombres || 'Usuario'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {user?.username || 'Sin correo asociado'}
                  </Typography>
                </Box>
              </Box>
              <Divider sx={{ my: 0.5, borderColor: '#f1f5f9' }} />
              <MenuItem onClick={handleOpenProfile} sx={{ py: 1, px: 2, '&:hover': { bgcolor: '#f8fafc' } }}>
                <ListItemIcon><PersonOutline fontSize="small" sx={{ color: '#475569' }} /></ListItemIcon>
                <Typography variant="body2" color="#334155" fontWeight={500}>Mi Perfil</Typography>
              </MenuItem>
              <Divider sx={{ my: 0.5, borderColor: '#f1f5f9' }} />
              <MenuItem onClick={handleLogout} sx={{ py: 1, px: 2, color: '#ef4444', '&:hover': { bgcolor: '#fef2f2' } }}>
                <ListItemIcon><Logout fontSize="small" sx={{ color: '#ef4444' }} /></ListItemIcon>
                <Typography variant="body2" fontWeight={600}>Cerrar Sesión</Typography>
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </Container>

      {/* MODAL MI PERFIL REDISEÑADO CON EDICIÓN */}
      <Dialog 
        open={openProfile} 
        onClose={() => setOpenProfile(false)} 
        maxWidth="xs" 
        fullWidth
        PaperProps={{ sx: { borderRadius: 4, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' } }}
      >
        <Box sx={{ position: 'relative', pt: 4, pb: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', borderBottom: '1px solid #cbd5e1' }}>
          
          {isEditingProfile && (
            <IconButton onClick={() => setIsEditingProfile(false)} sx={{ position: 'absolute', top: 10, left: 10, bgcolor: 'rgba(255,255,255,0.5)', '&:hover': { bgcolor: 'white' } }}>
              <ArrowBack fontSize="small" />
            </IconButton>
          )}

          <IconButton onClick={() => setOpenProfile(false)} sx={{ position: 'absolute', top: 10, right: 10, bgcolor: 'rgba(255,255,255,0.5)', '&:hover': { bgcolor: 'white' } }}>
            <Close fontSize="small" />
          </IconButton>
          
          <Avatar sx={{ width: 80, height: 80, fontSize: '2rem', mb: 2, bgcolor: '#2563eb', boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)', border: '4px solid white' }}>
            {user ? getInitials(user.nombres) : '??'}
          </Avatar>
          
          <Typography variant="h6" fontWeight="800" color="#0f172a">
            {user?.nombres || 'Usuario Sin Nombre'}
          </Typography>
          
          <Chip 
            label={user?.rol || 'SIN ROL DEFINIDO'} 
            color={user?.rol === 'ADMINISTRADOR' ? 'secondary' : 'primary'}
            size="small" 
            sx={{ mt: 1, fontWeight: 'bold', fontSize: '0.7rem', px: 1, textTransform: 'uppercase' }} 
          />
        </Box>

        <DialogContent sx={{ p: isEditingProfile ? 3 : 0, pb: isEditingProfile ? 2 : 0 }}>
          {isEditingProfile ? (
            <Box sx={{ mt: 1 }}>
              <Typography variant="subtitle2" color="text.secondary" mb={2} textAlign="center">
                Actualiza tus datos de acceso
              </Typography>
              
              {errorProfile && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{errorProfile}</Alert>}
              {successProfile && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>{successProfile}</Alert>}
              
              <TextField
                fullWidth
                label="Correo Electrónico"
                variant="outlined"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                margin="normal"
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailOutlined color="action" />
                    </InputAdornment>
                  ),
                }}
              />
              
              <TextField
                fullWidth
                label="Nueva Contraseña"
                type="password"
                variant="outlined"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="Dejar en blanco para no cambiarla"
                margin="normal"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <VpnKey color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
          ) : (
            <List sx={{ p: 2 }}>
              <ListItem sx={{ py: 1.5, px: 2, bgcolor: '#f8fafc', mb: 1, borderRadius: 2 }}>
                <ListItemIcon sx={{ minWidth: 40 }}><EmailOutlined sx={{ color: '#64748b' }} /></ListItemIcon>
                <ListItemText 
                  primary={<Typography variant="caption" color="text.secondary" fontWeight={600}>USUARIO (CORREO DE ACCESO)</Typography>} 
                  secondary={<Typography variant="body2" color="#0f172a" fontWeight={500}>{user?.username || 'No registrado'}</Typography>} 
                />
              </ListItem>
              
              <ListItem sx={{ py: 1.5, px: 2, bgcolor: '#f8fafc', mb: 1, borderRadius: 2 }}>
                <ListItemIcon sx={{ minWidth: 40 }}><BadgeOutlined sx={{ color: '#64748b' }} /></ListItemIcon>
                <ListItemText 
                  primary={<Typography variant="caption" color="text.secondary" fontWeight={600}>RUT / IDENTIFICACIÓN</Typography>} 
                  secondary={<Typography variant="body2" color="#0f172a" fontWeight={500}>{user?.rut || 'Sin RUT asignado'}</Typography>} 
                />
              </ListItem>
              
              
              
              <ListItem sx={{ py: 1.5, px: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
                <ListItemIcon sx={{ minWidth: 40 }}><WorkOutline sx={{ color: '#64748b' }} /></ListItemIcon>
                <ListItemText 
                  primary={<Typography variant="caption" color="text.secondary" fontWeight={600}>ÁREA ASIGNADA</Typography>} 
                  secondary={<Typography variant="body2" color="#0f172a" fontWeight={500}>{user?.area || 'Sin área específica'}</Typography>} 
                />
              </ListItem>
            </List>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 2, pt: 0, justifyContent: 'center' }}>
          {isEditingProfile ? (
            <Button 
              variant="contained" 
              color="primary" 
              fullWidth 
              onClick={handleSaveProfile}
              startIcon={<Save />}
              sx={{ borderRadius: 2, py: 1, fontWeight: 'bold' }}
            >
              Guardar Cambios
            </Button>
          ) : (
            <Button 
              variant="outlined" 
              color="primary" 
              fullWidth 
              onClick={() => setIsEditingProfile(true)}
              startIcon={<Edit />}
              sx={{ borderRadius: 2, py: 1, fontWeight: 'bold' }}
            >
              Editar Mis Datos
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </AppBar>
  );
};

export default Navbar;
