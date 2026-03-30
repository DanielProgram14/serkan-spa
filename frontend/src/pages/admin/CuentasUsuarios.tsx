import { useState, useEffect } from 'react';
import { 
    Box, Typography, Button, Paper, Table, TableBody, TableCell, TableHead, TableRow, 
    Chip, IconButton, Dialog, DialogContent, Stack, TextField, MenuItem, Alert, 
    DialogTitle, DialogActions, Avatar, CircularProgress ,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Add, Visibility, DeleteOutline, Person } from '@mui/icons-material';
import api from '../../api/axios';

// Definimos los tipos para mejorar la seguridad y legibilidad
interface Perfil {
    trabajador_nombre?: string;
    rol?: string;
}

interface User {
    id: number;
    username: string;
    perfil?: Perfil;
}

interface Worker {
    rut: string;
    nombres: string;
    apellidos: string;
}

const CuentasUsuarios = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [users, setUsers] = useState<User[]>([]);
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    
    const [openCreate, setOpenCreate] = useState(false);
    const [openDetail, setOpenDetail] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const [form, setForm] = useState({
        username: '', 
        password: '', 
        role: 'TRABAJADOR', 
        trabajador_id: ''
    });

    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            const [resUsers, resWorkers] = await Promise.all([
                api.get('/users/'),
                api.get('/trabajadores/')
            ]);
            setUsers(resUsers.data);
            setWorkers(resWorkers.data);
        } catch(e) { 
            setError("Error al cargar datos. Verifica la conexión con el servidor.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleCreate = async () => {
        if (!form.username.includes('@') || form.password.length < 4) {
            alert("Por favor, ingresa un correo válido y una contraseña de al menos 4 caracteres.");
            return;
        }

        setIsCreating(true);
        try {
            const payload = {
                username: form.username.trim(),
                password: form.password,
                rol: form.role,
                trabajador_id: form.trabajador_id || null
            };
            
            await api.post('/users/', payload);
            
            setOpenCreate(false);
            setForm({ username: '', password: '', role: 'TRABAJADOR', trabajador_id: '' });
            fetchData();
            alert("¡Acceso creado con éxito!");
        } catch (e: any) { 
            console.error(e);
            const errorMsg = e.response?.data?.username ? "Este correo ya está registrado." : "Error al crear el acceso.";
            alert(errorMsg);
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (userId: number, username: string) => {
        if (window.confirm(`⚠️ ¿Eliminar el acceso para ${username}?`)) {
            try {
                await api.delete(`/users/${userId}/`);
                fetchData();
            } catch (e) {
                alert("No se pudo eliminar el usuario.");
            }
        }
    };

    const handleView = (user: User) => {
        setSelectedUser(user);
        setOpenDetail(true);
    };

    const getRoleColor = (rol?: string): 'primary' | 'secondary' | 'warning' | 'success' | 'default' => {
        switch(rol) {
            case 'ADMINISTRADOR': return 'primary';
            case 'RRHH': return 'secondary';
            case 'SUPERVISOR': return 'warning';
            case 'TRABAJADOR': return 'success';
            default: return 'default';
        }
    };

    return (
        <Box>
             <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h5" fontWeight="900">CUENTAS AUTORIZADAS</Typography>
                    <Typography variant="caption" color="text.secondary">VINCULACIÓN DE PERSONAL CON ROLES DE SISTEMA</Typography>
                </Box>
                <Button variant="contained" startIcon={<Add />} onClick={() => setOpenCreate(true)} sx={{ borderRadius: 2, fontWeight: 'bold' }}>
                    NUEVO ACCESO
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                <Table>
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', color: '#64748b' }}>TRABAJADOR</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', color: '#64748b' }}>CORREO (ID ACCESO)</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', color: '#64748b' }}>ROL</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold', color: '#64748b' }}>ACCIONES</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={4} align="center"><CircularProgress size={30} sx={{ my: 2 }} /></TableCell></TableRow>
                        ) : (
                            users.map((u: User) => (
                                <TableRow key={u.id} hover>
                                    <TableCell sx={{ fontWeight: 'bold' }}>
                                        {u.perfil?.trabajador_nombre?.toUpperCase() || <Chip label="EXTERNO" size="small" variant="outlined" />}
                                    </TableCell>
                                    <TableCell sx={{ color: '#2563eb', fontWeight: '500' }}>{u.username}</TableCell>
                                    <TableCell>
                                        <Chip 
                                            label={u.perfil?.rol || 'SIN ROL'} 
                                            size="small" 
                                            color={getRoleColor(u.perfil?.rol)} 
                                            sx={{ fontWeight: 'bold', fontSize: '0.7rem' }} 
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton size="small" color="primary" onClick={() => handleView(u)}><Visibility /></IconButton>
                                        <IconButton size="small" color="error" onClick={() => handleDelete(u.id, u.username)}><DeleteOutline /></IconButton>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Paper>

            {/* MODAL CREAR */}
            <Dialog open={openCreate} onClose={() => setOpenCreate(false)} fullScreen={isMobile} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
                <DialogContent sx={{ p: 4 }}>
                    <Typography variant="h6" fontWeight="900" sx={{ mb: 3 }}>Nuevo Acceso de Sistema</Typography>
                    <Stack spacing={3}>
                        <Box>
                            <Typography variant="caption" fontWeight="bold">ASIGNAR TRABAJADOR</Typography>
                            <TextField 
                                select fullWidth size="small" 
                                value={form.trabajador_id} 
                                onChange={(e) => setForm({...form, trabajador_id: e.target.value})}
                                helperText="El usuario se vinculará a este registro (RUT)"
                            >
                                <MenuItem value=""><em>-- Usuario sin ficha laboral (Externo) --</em></MenuItem>
                                {workers.map((w: Worker) => (
                                    <MenuItem key={w.rut} value={w.rut}>{w.nombres} {w.apellidos} ({w.rut})</MenuItem>
                                ))}
                            </TextField>
                        </Box>
                        <Stack direction="row" spacing={2}>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="caption" fontWeight="bold">CORREO CORPORATIVO (ID ACCESO)*</Typography>
                                <TextField 
                                    fullWidth size="small" 
                                    placeholder="ejemplo@serkan.cl"
                                    value={form.username} 
                                    onChange={(e) => setForm({...form, username: e.target.value})} 
                                />
                            </Box>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="caption" fontWeight="bold">ROL*</Typography>
                                <TextField select fullWidth size="small" value={form.role} onChange={(e) => setForm({...form, role: e.target.value})}>
                                    <MenuItem value="ADMINISTRADOR">Administrador</MenuItem>
                                    <MenuItem value="RRHH">RRHH</MenuItem>
                                    <MenuItem value="SUPERVISOR">Supervisor</MenuItem>
                                    <MenuItem value="TRABAJADOR">Trabajador</MenuItem>
                                </TextField>
                            </Box>
                        </Stack>
                        <Box>
                            <Typography variant="caption" fontWeight="bold">CONTRASEÑA TEMPORAL*</Typography>
                            <TextField type="password" fullWidth size="small" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} />
                        </Box>
                        <Button 
                            variant="contained" 
                            size="large" 
                            onClick={handleCreate} 
                            disabled={isCreating}
                            sx={{ mt: 2, bgcolor: '#2563eb', fontWeight: 'bold' }}
                        >
                            {isCreating ? <CircularProgress size={24} color="inherit" /> : 'ACTIVAR CREDENCIALES'}
                        </Button>
                    </Stack>
                </DialogContent>
            </Dialog>

            {/* MODAL DETALLE */}
            <Dialog open={openDetail} onClose={() => setOpenDetail(false)} fullScreen={isMobile} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
                {selectedUser && (
                    <>
                        <DialogTitle sx={{ textAlign: 'center', pt: 4 }}>
                            <Avatar sx={{ width: 64, height: 64, margin: '0 auto', bgcolor: '#2563eb', mb: 1 }}>
                                <Person fontSize="large" />
                            </Avatar>
                            <Typography variant="h6" fontWeight="900">{selectedUser.username}</Typography>
                            <Chip 
                                label={selectedUser.perfil?.rol || 'SIN ROL'} 
                                size="small" 
                                color={getRoleColor(selectedUser.perfil?.rol)} 
                                sx={{ mt: 1, fontWeight: 'bold' }} 
                            />
                        </DialogTitle>
                        <DialogContent sx={{ textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary">Vínculo: {selectedUser.perfil?.trabajador_nombre || 'Ninguno'}</Typography>
                        </DialogContent>
                        <DialogActions sx={{ p: 3 }}>
                            <Button fullWidth variant="outlined" onClick={() => setOpenDetail(false)} sx={{ borderRadius: 2 }}>Cerrar</Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </Box>
    );
};
export default CuentasUsuarios;
