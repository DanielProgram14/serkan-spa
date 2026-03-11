import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Container, 
  TextField, 
  Typography, 
  Paper, 
  Alert, 
  CircularProgress,
  InputAdornment,
  IconButton
} from '@mui/material';
import { Visibility, VisibilityOff, LockOutlined, EmailOutlined } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios'; // 1. DESCOMENTADO
import { useAuth } from '../hooks/useAuth'; // 2. IMPORTADO

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth(); // 3. EXTRAEMOS LA FUNCIÓN LOGIN
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!email || !password) {
      setError("Por favor, ingresa tus credenciales completas.");
      setLoading(false);
      return;
    }

   try {
    const response = await api.post('/login/', { 
        username: email, 
        password: password 
    });
    
    // Verificamos qué llega por consola para estar seguros
    console.log("Respuesta del servidor:", response.data);

    const { token, user } = response.data;

    // EL ARREGLO: Validamos que 'user' exista antes de leer sus propiedades
    if (token && user) {
        login(token, {
            rut: user.rut || "Sin RUT",
            nombres: user.nombres || "Usuario",
            rol: user.rol || "TRABAJADOR",
            trabajador_rut: user.trabajador_rut || null,
            area: user.area || null
        });
        navigate('/dashboard');
    } else {
        setError("El servidor no devolvió los datos del perfil.");
    }

} catch (err: any) {
    const detail =
      err?.response?.data?.detail ||
      err?.response?.data?.error ||
      err?.response?.data?.message;
    setError(detail || "Credenciales incorrectas.");
} finally {
      setLoading(false);
    }
  };

  return (
    <Box 
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
      }}
    >
      <Container maxWidth="xs">
        <Paper 
          elevation={10} 
          sx={{ 
            p: 4, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            borderRadius: 3
          }}
        >
          <Box 
            sx={{ 
              mb: 2, 
              width: 50, 
              height: 50, 
              bgcolor: 'primary.main', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center'
            }}
          >
            <LockOutlined sx={{ color: 'white', fontSize: 28 }} />
          </Box>

          <Typography component="h1" variant="h5" fontWeight="900" color="primary">
            SERKAN SPA
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Sistema de Administración Interna
          </Typography>

          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleLogin} noValidate sx={{ mt: 1, width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Correo Corporativo"
              name="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailOutlined color="action" />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Contraseña"
              type={showPassword ? 'text' : 'password'}
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ mt: 3, mb: 2, py: 1.5, fontWeight: 'bold', borderRadius: 2 }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'INICIAR SESIÓN'}
            </Button>
            
            <Typography variant="caption" display="block" align="center" color="text.secondary" sx={{ mt: 4 }}>
              © 2026 SERKAN SPA - Antofagasta
              <br />
              Innovación y Desarrollo
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;
