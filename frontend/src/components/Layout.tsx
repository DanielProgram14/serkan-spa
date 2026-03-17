import { Box, Container, Typography } from '@mui/material';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

const Layout = () => {
  return (
    <Box
      sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}
    >
      <Navbar />

      {/* Contenido principal */}
      <Box component="main" 
      sx={{
          flexGrow: 1, overflow: 'auto', width: '100%', py: 4,}} >
        <Container maxWidth="xl" sx={{ px: { xs: 2, md: 4 },}} 
          ><Outlet />
        </Container>
      </Box>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          py: 3,
          textAlign: 'center',
          bgcolor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Container maxWidth="sm">
          <Typography variant="caption" color="text.secondary" fontWeight="500" >
            © {new Date().getFullYear()} SERKAN SPA — Gestión Profesional de Servicios
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default Layout;
