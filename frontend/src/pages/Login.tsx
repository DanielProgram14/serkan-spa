import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Typography,
  Fade,
  Slide,
} from '@mui/material';
import {
  AlternateEmail,
  BadgeOutlined,
  LockOutlined,
  Visibility,
  VisibilityOff,
  BusinessCenterOutlined,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../hooks/useAuth';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return Boolean(identifier.trim()) && Boolean(password.trim());
  }, [identifier, password]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!canSubmit) {
      setError('Por favor, ingresa usuario y contraseña.');
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/login/', {
        login: identifier.trim(),
        password: password,
      });

      const { token, user } = response.data;

      if (token && user) {
        login(token, {
          id: user.id,
          username: user.username,
          email: user.email,
          rut: user.rut || 'Sin RUT',
          nombres: user.nombres || 'Usuario',
          rol: user.rol || 'TRABAJADOR',
          trabajador_rut: user.trabajador_rut || null,
          area: user.area || null,
        });
        navigate('/dashboard');
      } else {
        setError('El servidor no devolvió los datos del perfil.');
      }
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        err?.response?.data?.message;
      setError(detail || 'Credenciales incorrectas.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#030712',
        backgroundImage: 'radial-gradient(circle at 15% 50%, rgba(37, 99, 235, 0.15), transparent 25%), radial-gradient(circle at 85% 30%, rgba(56, 189, 248, 0.15), transparent 25%)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '"Inter", "Outfit", "Roboto", sans-serif',
      }}
    >
      {/* Animated Background Elements */}
      <Box
        sx={{
          position: 'absolute',
          top: '10%',
          left: '5%',
          width: '40vw',
          height: '40vw',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37, 99, 235, 0.1) 0%, rgba(0,0,0,0) 70%)',
          animation: 'float 10s ease-in-out infinite',
          '@keyframes float': {
            '0%': { transform: 'translateY(0px)' },
            '50%': { transform: 'translateY(-20px)' },
            '100%': { transform: 'translateY(0px)' },
          },
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '10%',
          right: '-5%',
          width: '50vw',
          height: '50vw',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(56, 189, 248, 0.08) 0%, rgba(0,0,0,0) 70%)',
          animation: 'float 12s ease-in-out infinite reverse',
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, px: { xs: 2, sm: 4 } }}>
        <Fade in={true} timeout={1000}>
          <Paper
            elevation={24}
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              borderRadius: '24px',
              overflow: 'hidden',
              minHeight: { xs: 'auto', md: '600px' },
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
              background: 'transparent',
            }}
          >
            {/* Branding / Info Section */}
            <Box
              sx={{
                flex: { xs: 1, md: 1.2 },
                p: { xs: 5, md: 6 },
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(13, 19, 33, 0.98) 100%)',
                backdropFilter: 'blur(20px)',
                color: '#fff',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                borderRight: { md: '1px solid rgba(255, 255, 255, 0.05)' },
              }}
            >
              <Box>
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #2563eb, #38bdf8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 4,
                    boxShadow: '0 10px 20px -5px rgba(37, 99, 235, 0.5)',
                  }}
                >
                  <BusinessCenterOutlined sx={{ fontSize: 32, color: '#fff' }} />
                </Box>

                <Slide direction="up" in={true} timeout={800}>
                  <Box>
                    <Typography variant="h3" fontWeight={800} sx={{ letterSpacing: '-0.5px', mb: 2, background: 'linear-gradient(to right, #ffffff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                      SERKAN SPA
                    </Typography>
                    <Typography variant="subtitle1" sx={{ color: '#94a3b8', lineHeight: 1.6, mb: 5, maxWidth: '400px' }}>
                      Plataforma corporativa de gestión y control. Accede a tu entorno de trabajo seguro.
                    </Typography>
                  </Box>
                </Slide>

                <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ p: 1.2, borderRadius: '12px', bgcolor: 'rgba(56, 189, 248, 0.1)', display: 'flex' }}>
                      <AlternateEmail sx={{ color: '#38bdf8', fontSize: 22 }} />
                    </Box>
                    <Typography variant="body1" sx={{ color: '#cbd5e1', fontWeight: 500 }}>
                      Ingreso rápido con correo institucional
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ p: 1.2, borderRadius: '12px', bgcolor: 'rgba(251, 191, 36, 0.1)', display: 'flex' }}>
                      <BadgeOutlined sx={{ color: '#fbbf24', fontSize: 22 }} />
                    </Box>
                    <Typography variant="body1" sx={{ color: '#cbd5e1', fontWeight: 500 }}>
                      Sincronización automática de roles
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ p: 1.2, borderRadius: '12px', bgcolor: 'rgba(52, 211, 153, 0.1)', display: 'flex' }}>
                      <LockOutlined sx={{ color: '#34d399', fontSize: 22 }} />
                    </Box>
                    <Typography variant="body1" sx={{ color: '#cbd5e1', fontWeight: 500 }}>
                      Conexión encriptada de extremo a extremo
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Typography variant="caption" sx={{ color: '#64748b', mt: { xs: 6, md: 0 }, display: 'block', letterSpacing: '0.5px' }}>
                © {new Date().getFullYear()} SERKAN SPA · Todos los derechos reservados.
              </Typography>
            </Box>

            {/* Login Form Section */}
            <Box
              sx={{
                flex: 1,
                p: { xs: 4, sm: 6, md: 8 },
                bgcolor: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <Typography variant="h4" fontWeight={800} color="#0f172a" sx={{ mb: 1, letterSpacing: '-0.5px' }}>
                Bienvenido
              </Typography>
              <Typography variant="body1" color="#64748b" sx={{ mb: 4, fontSize: '1.1rem' }}>
                Ingresa tus credenciales para continuar
              </Typography>

              {error && (
                <Slide direction="down" in={true}>
                  <Alert severity="error" sx={{ mb: 3, borderRadius: '12px', alignItems: 'center' }}>
                    {error}
                  </Alert>
                </Slide>
              )}

              <Box component="form" onSubmit={handleLogin} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <TextField
                  label="Usuario, correo o RUT"
                  placeholder="usuario@serkan.cl"
                  autoComplete="username"
                  fullWidth
                  variant="outlined"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AlternateEmail color="action" />
                      </InputAdornment>
                    ),
                    sx: { borderRadius: '12px' }
                  }}
                />

                <TextField
                  label="Contraseña"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  fullWidth
                  variant="outlined"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlined color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                    sx: { borderRadius: '12px' }
                  }}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={loading || !canSubmit}
                  sx={{
                    mt: 2,
                    py: 1.8,
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    textTransform: 'none',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                    boxShadow: '0 4px 14px 0 rgba(37, 99, 235, 0.39)',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 6px 20px rgba(37, 99, 235, 0.23)',
                    },
                    '&:disabled': {
                      background: '#cbd5e1',
                      color: '#f8fafc',
                      boxShadow: 'none',
                    }
                  }}
                >
                  {loading ? <CircularProgress size={26} color="inherit" /> : 'Ingresar al sistema'}
                </Button>
              </Box>
            </Box>
          </Paper>
        </Fade>
      </Container>
    </Box>
  );
};

export default Login;
