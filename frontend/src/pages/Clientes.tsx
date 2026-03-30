import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
  Drawer,
  Tabs,
  Tab,
  Avatar,
  Divider,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { 
  Add, Close, CloudUpload, DeleteOutline, Download, EditOutlined, 
  Search, VisibilityOutlined, TrendingUp, TrendingDown,
  MonetizationOn, Business, ContactPhone, Assessment, Assignment, Folder
} from '@mui/icons-material';
import api from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import { showSuccess, showError, showWarning, confirmAction } from '../utils/alerts';

interface Cliente {
  rut: string;
  nombre: string;
  razon_social: string;
  telefono: string;
  correo: string;
  descripcion: string;
}

interface DocumentoCliente {
  id: number;
  nombre_original: string;
  extension: string;
  tamano_bytes: number;
  fecha_carga: string;
  descripcion: string | null;
  cargado_por_username: string | null;
}

interface Movimiento {
  id: number;
  tipo_movimiento: 'COSTO' | 'INGRESO';
  monto: string;
  fecha: string;
  descripcion: string | null;
  creado_por_username: string | null;
}

interface Resumen {
  total_ingresos: string;
  total_costos: string;
  ganancia_neta: string;
  total_movimientos: number;
}

interface Tarea {
  id: number;
  nombre: string;
  informacion: string | null;
  comentario_gestion: string | null;
  fecha_limite: string;
  prioridad: 'ALTA' | 'MEDIA' | 'BAJA';
  estado: 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADA' | 'CANCELADA';
  responsable: string;
}

const ALLOWED_EXTS = ['pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx', 'xls', 'xlsx', 'txt'];
const MAX_DOC_SIZE = 10 * 1024 * 1024;
const todayISO = () => new Date().toISOString().split('T')[0];
const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

const parseAmount = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const formatBytes = (bytes: number) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB'];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(i ? 1 : 0)} ${units[i]}`;
};

const normalizeClientePayload = (form: Cliente) => ({
  rut: form.rut.trim(),
  nombre: form.nombre.trim(),
  razon_social: form.razon_social.trim(),
  telefono: form.telefono.trim() || null,
  correo: form.correo.trim() || null,
  descripcion: form.descripcion.trim() || null,
});

const formatApiError = (error: unknown) => {
  const maybeResponse = (error as { response?: { data?: unknown } })?.response;
  const data = maybeResponse?.data ?? (error as { data?: unknown })?.data;
  if (!data) return 'No se pudo guardar el cliente.';
  if (typeof data === 'string') return data;
  if (typeof data === 'object' && data && 'detail' in data) {
    return String((data as { detail?: unknown }).detail ?? 'No se pudo guardar el cliente.');
  }
  if (typeof data === 'object') {
    const entries = Object.entries(data as Record<string, unknown>);
    if (!entries.length) return 'No se pudo guardar el cliente.';
    return entries
      .map(([field, value]) => {
        const msg = Array.isArray(value) ? value.join(' ') : String(value ?? '');
        return `${field}: ${msg}`;
      })
      .join(' | ');
  }
  return 'No se pudo guardar el cliente.';
};

// Panel Auxiliar para Tabs
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}
function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
      style={{ height: '100%', overflowY: 'auto' }}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const Clientes = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();
  const canManageClientes = user?.rol === 'ADMINISTRADOR' || user?.rol === 'RRHH';
  const canCreateDocs = ['ADMINISTRADOR', 'RRHH', 'SUPERVISOR'].includes(user?.rol ?? '');
  const canDeleteDocs = user?.rol === 'ADMINISTRADOR' || user?.rol === 'RRHH';
  const canCreateMov = ['ADMINISTRADOR', 'RRHH', 'SUPERVISOR'].includes(user?.rol ?? '');
  const canDeleteMov = user?.rol === 'ADMINISTRADOR' || user?.rol === 'RRHH';

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selected, setSelected] = useState<Cliente | null>(null);
  const [docs, setDocs] = useState<DocumentoCliente[]>([]);
  const [movs, setMovs] = useState<Movimiento[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [tareas, setTareas] = useState<Tarea[]>([]);

  const [loadingClientes, setLoadingClientes] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Modals & Drawer state
  const [openCliente, setOpenCliente] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);

  const [saveError, setSaveError] = useState<string | null>(null);

  const [clienteForm, setClienteForm] = useState<Cliente>({
    rut: '',
    nombre: '',
    razon_social: '',
    telefono: '',
    correo: '',
    descripcion: '',
  });
  
  const [docForm, setDocForm] = useState({ archivo: null as File | null, descripcion: '' });
  const [movForm, setMovForm] = useState({
    tipo_movimiento: 'INGRESO' as 'INGRESO' | 'COSTO',
    monto: '',
    fecha: todayISO(),
    descripcion: '',
  });

  const fetchClientes = useCallback(async () => {
    setLoadingClientes(true);
    try {
      const res = await api.get('/clientes/');
      setClientes(res.data ?? []);
    } finally {
      setLoadingClientes(false);
    }
  }, []);

  const fetchDetail = useCallback(async (rut: string) => {
    setLoadingDetail(true);
    try {
      const [docsRes, movsRes, resumenRes, tareasRes] = await Promise.allSettled([
        api.get(`/documentos-cliente/?cliente=${encodeURIComponent(rut)}`),
        api.get(`/movimientos-financieros/?cliente=${encodeURIComponent(rut)}`),
        api.get(`/movimientos-financieros/resumen/?cliente=${encodeURIComponent(rut)}`),
        api.get(`/tareas/?cliente=${encodeURIComponent(rut)}`),
      ]);

      const docsData: DocumentoCliente[] = docsRes.status === 'fulfilled' ? docsRes.value.data : [];
      const movsData: Movimiento[] = movsRes.status === 'fulfilled' ? movsRes.value.data : [];
      const tareasData: Tarea[] = tareasRes.status === 'fulfilled' ? tareasRes.value.data : [];
      setDocs(docsData);
      setMovs(movsData);
      setTareas(tareasData);

      if (resumenRes.status === 'fulfilled') {
        setResumen(resumenRes.value.data as Resumen);
      } else {
        const totalIngresos = movsData.filter((m) => m.tipo_movimiento === 'INGRESO').reduce((a, m) => a + parseAmount(m.monto), 0);
        const totalCostos = movsData.filter((m) => m.tipo_movimiento === 'COSTO').reduce((a, m) => a + parseAmount(m.monto), 0);
        setResumen({
          total_ingresos: totalIngresos.toFixed(2),
          total_costos: totalCostos.toFixed(2),
          ganancia_neta: (totalIngresos - totalCostos).toFixed(2),
          total_movimientos: movsData.length,
        });
      }
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    void fetchClientes();
  }, [fetchClientes]);

  const handleOpenDrawer = (c: Cliente) => {
    setSelected(c);
    setDrawerOpen(true);
    setTabIndex(0);
    void fetchDetail(c.rut);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    // Don't clear selected immediately so exit animation works smoothly
    setTimeout(() => {
        setSelected(null);
        setDocs([]);
        setMovs([]);
        setResumen(null);
    }, 300);
  };

  const handleOpenCreate = () => {
    if (!canManageClientes) return;
    setClienteForm({ rut: '', nombre: '', razon_social: '', telefono: '', correo: '', descripcion: '' });
    setSaveError(null);
    setIsEdit(false);
    setOpenCliente(true);
  };

  const handleOpenEdit = (c: Cliente) => {
    if (!canManageClientes) return;
    setClienteForm(c);
    setSaveError(null);
    setIsEdit(true);
    setOpenCliente(true);
  };

  const handleSaveCliente = async () => {
    if (!canManageClientes) return;
    setSaveError(null);
    const payload = normalizeClientePayload(clienteForm);
    if (!payload.rut || !payload.nombre || !payload.razon_social) {
      showWarning('Campos obligatorios', 'RUT, Nombre y Razón Social son obligatorios.');
      return;
    }
    try {
      if (isEdit) await api.put(`/clientes/${payload.rut}/`, payload);
      else await api.post('/clientes/', payload);
      await fetchClientes();
      showSuccess(isEdit ? 'Cliente actualizado' : 'Cliente creado');
      setOpenCliente(false);
      
      // Update selected if we are editing the currently open client
      if (isEdit && selected?.rut === payload.rut) {
          setSelected(payload as Cliente);
      }
    } catch (error) {
      setSaveError(formatApiError(error));
    }
  };

  const handleDeleteCliente = async (rut: string) => {
    if (!canManageClientes) return;
    const isConfirmed = await confirmAction('¿Eliminar cliente?', 'Esta acción no se puede deshacer.', 'Sí, eliminar');
    if (!isConfirmed) return;
    try {
      await api.delete(`/clientes/${rut}/`);
      showSuccess('Cliente eliminado');
      await fetchClientes();
      if (selected?.rut === rut) handleCloseDrawer();
    } catch (e) {
      showError('Error', 'No se pudo eliminar el cliente.');
    }
  };

  const handleDocFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() ?? '' : '';
    if (!ALLOWED_EXTS.includes(ext)) {
      showWarning('Tipo no permitido', `Formatos válidos: ${ALLOWED_EXTS.join(', ')}`);
      return;
    }
    if (file.size > MAX_DOC_SIZE) {
      showWarning('Archivo muy grande', 'El tamaño máximo es de 10 MB.');
      return;
    }
    setDocForm((prev) => ({ ...prev, archivo: file }));
  };

  const handleUploadDoc = async () => {
    if (!canCreateDocs || !selected || !docForm.archivo) return;
    const form = new FormData();
    form.append('cliente', selected.rut);
    form.append('archivo', docForm.archivo);
    form.append('descripcion', docForm.descripcion);
    await api.post('/documentos-cliente/', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    showSuccess('Documento cargado');
    setDocForm({ archivo: null, descripcion: '' });
    await fetchDetail(selected.rut);
  };

  const handleDeleteDoc = async (id: number) => {
    if (!canDeleteDocs || !selected) return;
    const isConfirmed = await confirmAction('¿Eliminar documento?', 'Se borrará el archivo permanentemente.', 'Sí, eliminar');
    if (!isConfirmed) return;
    try {
      await api.delete(`/documentos-cliente/${id}/`);
      showSuccess('Documento eliminado');
      await fetchDetail(selected.rut);
    } catch (e) {
      showError('Error', 'No se pudo eliminar el documento.');
    }
  };

  const handleDownloadDoc = async (doc: DocumentoCliente) => {
    const res = await api.get(`/documentos-cliente/${doc.id}/descargar/`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.nombre_original || `documento_${doc.id}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleCreateMov = async () => {
    if (!canCreateMov || !selected) return;
    if (!movForm.monto || Number(movForm.monto) <= 0) {
      showWarning('Monto inválido', 'El monto debe ser mayor a 0.');
      return;
    }
    await api.post('/movimientos-financieros/', { cliente: selected.rut, ...movForm });
    showSuccess('Movimiento registrado');
    setMovForm({ tipo_movimiento: 'INGRESO', monto: '', fecha: todayISO(), descripcion: '' });
    await fetchDetail(selected.rut);
  };

  const handleDeleteMov = async (id: number) => {
    if (!canDeleteMov || !selected) return;
    const isConfirmed = await confirmAction('¿Eliminar movimiento?', 'Se borrará el registro financiero.', 'Sí, eliminar');
    if (!isConfirmed) return;
    try {
      await api.delete(`/movimientos-financieros/${id}/`);
      showSuccess('Movimiento eliminado');
      await fetchDetail(selected.rut);
    } catch (e) {
      showError('Error', 'No se pudo eliminar el movimiento.');
    }
  };

  const filtered = useMemo(
    () => clientes.filter((c) => c.nombre.toLowerCase().includes(searchText.toLowerCase()) || c.rut.includes(searchText)),
    [clientes, searchText]
  );

  const totalIngresos = parseAmount(resumen?.total_ingresos);
  const totalCostos = parseAmount(resumen?.total_costos);
  const neta = parseAmount(resumen?.ganancia_neta);
  const barMax = Math.max(totalIngresos, totalCostos, 1);

  const clienteCols: GridColDef[] = [
    { field: 'nombre', headerName: 'CLIENTE', flex: 1.5, minWidth: 200, renderCell: (p) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, height: '100%' }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: '#2563eb', fontSize: '0.875rem', fontWeight: 'bold' }}>
                {p.row.nombre.charAt(0).toUpperCase()}
            </Avatar>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>{p.row.nombre}</Typography>
        </Box>
    )},
    { field: 'razon_social', headerName: 'RAZON SOCIAL', flex: 1.5, minWidth: 200 },
    { field: 'rut', headerName: 'RUT', flex: 1, minWidth: 120, renderCell: (p) => (
        <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>{p.row.rut}</Typography>
    )},
    { field: 'telefono', headerName: 'TELÉFONO', flex: 1, minWidth: 130 },
    {
      field: 'acciones',
      headerName: 'ACCIONES',
      width: 140,
      sortable: false,
      renderCell: (p) => (
        <Stack direction="row" spacing={0.5} sx={{ height: '100%', alignItems: 'center' }}>
          <Tooltip title="Ver Ficha"><IconButton size="small" onClick={(e) => { e.stopPropagation(); handleOpenDrawer(p.row as Cliente); }} sx={{ color: '#2563eb', bgcolor: '#eff6ff', '&:hover': { bgcolor: '#dbeafe' } }}><VisibilityOutlined fontSize="small" /></IconButton></Tooltip>
          {canManageClientes && (
            <Tooltip title="Editar"><IconButton size="small" onClick={(e) => { e.stopPropagation(); handleOpenEdit(p.row as Cliente); }} sx={{ color: '#64748b', '&:hover': { bgcolor: '#f1f5f9' } }}><EditOutlined fontSize="small" /></IconButton></Tooltip>
          )}
          {canManageClientes && (
            <Tooltip title="Eliminar"><IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); handleDeleteCliente(p.row.rut); }} sx={{ '&:hover': { bgcolor: '#fef2f2' } }}><DeleteOutline fontSize="small" /></IconButton></Tooltip>
          )}
        </Stack>
      ),
    },
  ];

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* CABECERA */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ color: '#0f172a', letterSpacing: '-0.5px' }}>
            Directorio de Clientes
          </Typography>
          <Typography variant="body1" sx={{ color: '#64748b', mt: 0.5 }}>
            Gestión centralizada documental, financiera y operativa.
          </Typography>
        </Box>
        {canManageClientes && (
            <Button variant="contained" startIcon={<Add />} onClick={handleOpenCreate} sx={{ borderRadius: 2, textTransform: 'none', px: 3, py: 1, fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgb(37 99 235 / 0.2)' }}>
                Nuevo Cliente
            </Button>
        )}
      </Box>

      {/* BARRA BUSQUEDA */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid #e2e8f0', borderRadius: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField 
            fullWidth size="small" 
            placeholder="Buscar por cliente o RUT..." 
            value={searchText} 
            onChange={(e) => setSearchText(e.target.value)} 
            InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ color: '#94a3b8' }}/></InputAdornment>, sx: { borderRadius: 2, bgcolor: '#f8fafc' } }} 
        />
        <Chip label={`${filtered.length} Registros`} size="small" sx={{ fontWeight: 'bold', bgcolor: '#e2e8f0', color: '#475569' }} />
      </Paper>

      {/* TABLA PRINCIPAL */}
      <Paper elevation={0} sx={{ flex: 1, minHeight: 400, width: '100%', border: '1px solid #e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
        <DataGrid 
            rows={filtered} 
            columns={clienteCols} 
            getRowId={(r) => r.rut} 
            loading={loadingClientes} 
            onRowClick={(p) => handleOpenDrawer(p.row as Cliente)} 
            disableRowSelectionOnClick
            sx={{
                border: 'none',
                '& .MuiDataGrid-columnHeaders': { bgcolor: '#f8fafc', color: '#475569', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' },
                '& .MuiDataGrid-cell': { borderBottom: '1px solid #f1f5f9' },
                '& .MuiDataGrid-row:hover': { bgcolor: '#f8fafc', cursor: 'pointer' }
            }}
        />
      </Paper>

      {/* === MODAL: CREAR / EDITAR CLIENTE === */}
      <Dialog open={openCliente && canManageClientes} onClose={() => setOpenCliente(false)} fullScreen={isMobile} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4, backgroundImage: 'none' } }}>
        <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', bgcolor: '#f8fafc' }}>
          <Typography variant="h6" fontWeight={700} color="#0f172a">{isEdit ? 'Modificar Información del Cliente' : 'Registrar Nuevo Cliente'}</Typography>
          <IconButton onClick={() => setOpenCliente(false)} size="small"><Close /></IconButton>
        </Box>
        <DialogContent sx={{ p: 3 }}>
          <Stack spacing={2.5}>
            {saveError && <Alert severity="error" sx={{ borderRadius: 2 }}>{saveError}</Alert>}
            
            <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField size="small" label="RUT*" value={clienteForm.rut} disabled={isEdit} onChange={(e) => setClienteForm((p) => ({ ...p, rut: e.target.value }))} sx={{ flex: 1 }} />
            </Box>
            
            <TextField size="small" label="Nombre Comercial*" value={clienteForm.nombre} onChange={(e) => setClienteForm((p) => ({ ...p, nombre: e.target.value }))} fullWidth />
            <TextField size="small" label="Razón Social*" value={clienteForm.razon_social} onChange={(e) => setClienteForm((p) => ({ ...p, razon_social: e.target.value }))} fullWidth />
            
            <Box sx={{ display: 'flex', gap: 2, flexDirection: isMobile ? 'column' : 'row' }}>
                <TextField size="small" label="Teléfono de Contacto" value={clienteForm.telefono} onChange={(e) => setClienteForm((p) => ({ ...p, telefono: e.target.value }))} sx={{ flex: 1 }} />
                <TextField size="small" label="Correo Electrónico" value={clienteForm.correo} onChange={(e) => setClienteForm((p) => ({ ...p, correo: e.target.value }))} sx={{ flex: 1 }} />
            </Box>
            
            <TextField size="small" label="Observaciones o Descripción Adicional" multiline rows={3} value={clienteForm.descripcion} onChange={(e) => setClienteForm((p) => ({ ...p, descripcion: e.target.value }))} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0, bgcolor: '#fff' }}>
          <Button onClick={() => setOpenCliente(false)} sx={{ color: '#64748b', fontWeight: 'bold' }}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveCliente} sx={{ borderRadius: 2, fontWeight: 'bold' }}>{isEdit ? 'Guardar Cambios' : 'Completar Registro'}</Button>
        </DialogActions>
      </Dialog>


      {/* === DRAWER: FICHA COMPLETA (TABS) === */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={handleCloseDrawer}
        PaperProps={{ sx: { width: { xs: '100%', md: '800px' }, maxWidth: '100%', bgcolor: '#f8fafc' } }}
        sx={{ zIndex: (theme) => theme.zIndex.modal + 1 }}
      >
        {selected && (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Drawer Header */}
            <Box sx={{ bgcolor: '#0f172a', color: 'white', p: 4, position: 'relative' }}>
                <IconButton onClick={handleCloseDrawer} sx={{ position: 'absolute', top: 16, right: 16, color: '#94a3b8', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' } }}>
                    <Close />
                </IconButton>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mt: 1 }}>
                    <Avatar sx={{ width: 80, height: 80, bgcolor: '#2563eb', fontSize: '2rem', fontWeight: 'bold', border: '3px solid rgba(255,255,255,0.2)' }}>
                        {selected.nombre.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box>
                        <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-0.5px', mb: 0.5 }}>{selected.nombre}</Typography>
                        <Typography variant="body1" sx={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Business fontSize="small" /> {selected.razon_social}
                        </Typography>
                    </Box>
                </Box>
            </Box>

            {/* Tabs Header */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#fff', px: 2 }}>
                <Tabs value={tabIndex} onChange={(_, nv) => setTabIndex(nv)} variant={isMobile ? "scrollable" : "standard"} scrollButtons="auto" 
                      textColor="primary" indicatorColor="primary" sx={{ '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', fontSize: '0.95rem', minHeight: 60, py: 2 } }}>
                    <Tab icon={<Assessment sx={{ mb: 0 }} fontSize="small" />} iconPosition="start" label="Resumen General" />
                    <Tab icon={<Folder sx={{ mb: 0 }} fontSize="small" />} iconPosition="start" label="Documentación" disabled={loadingDetail} />
                    <Tab icon={<MonetizationOn sx={{ mb: 0 }} fontSize="small" />} iconPosition="start" label="Finanzas" disabled={loadingDetail} />
                    <Tab icon={<Assignment sx={{ mb: 0 }} fontSize="small" />} iconPosition="start" label="Tareas" disabled={loadingDetail} />
                </Tabs>
            </Box>

            {/* Pestañas Contenido */}
            <Box sx={{ flex: 1, overflowY: 'hidden' }}>
                
                {/* 1. RESUMEN GENERAL */}
                <CustomTabPanel value={tabIndex} index={0}>
                    <Stack spacing={4} sx={{ maxWidth: '100%', pb: 5 }}>
                        {/* KPI Financieros */}
                        <Box>
                            <Typography variant="subtitle2" sx={{ color: '#64748b', fontWeight: 700, mb: 1.5, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                Visión Financiera Global
                            </Typography>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                <Paper elevation={0} sx={{ p: 2.5, flex: 1, border: '1px solid #bbf7d0', borderRadius: 3, bgcolor: '#f0fdf4', display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <TrendingUp sx={{ color: '#16a34a' }} fontSize="small" />
                                        <Typography variant="caption" sx={{ color: '#166534', fontWeight: 700 }}>INGRESOS TOTALES</Typography>
                                    </Box>
                                    <Typography variant="h5" sx={{ color: '#15803d', fontWeight: 800 }}>{money.format(totalIngresos)}</Typography>
                                </Paper>
                                
                                <Paper elevation={0} sx={{ p: 2.5, flex: 1, border: '1px solid #fecaca', borderRadius: 3, bgcolor: '#fef2f2', display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <TrendingDown sx={{ color: '#dc2626' }} fontSize="small" />
                                        <Typography variant="caption" sx={{ color: '#991b1b', fontWeight: 700 }}>COSTOS / INVERSIÓN</Typography>
                                    </Box>
                                    <Typography variant="h5" sx={{ color: '#b91c1c', fontWeight: 800 }}>{money.format(totalCostos)}</Typography>
                                </Paper>

                                <Paper elevation={0} sx={{ p: 2.5, flex: 1, border: '1px solid #bfdbfe', borderRadius: 3, bgcolor: '#eff6ff', display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <MonetizationOn sx={{ color: '#2563eb' }} fontSize="small" />
                                        <Typography variant="caption" sx={{ color: '#1e40af', fontWeight: 700 }}>BENEFICIO NETO</Typography>
                                    </Box>
                                    <Typography variant="h5" sx={{ color: neta >= 0 ? '#1d4ed8' : '#dc2626', fontWeight: 800 }}>{money.format(neta)}</Typography>
                                </Paper>
                            </Stack>

                            {totalIngresos > 0 || totalCostos > 0 ? (
                                <Box sx={{ mt: 3, bgcolor: '#fff', p: 2, borderRadius: 3, border: '1px solid #e2e8f0' }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>Proporción (Ingresos vs Costos)</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', bgcolor: '#f1f5f9' }}>
                                        <Box sx={{ width: `${(totalIngresos / barMax) * 100}%`, bgcolor: '#22c55e', transition: 'width 1s ease' }} />
                                    </Box>
                                    <Box sx={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', bgcolor: '#f1f5f9', mt: 1 }}>
                                        <Box sx={{ width: `${(totalCostos / barMax) * 100}%`, bgcolor: '#ef4444', transition: 'width 1s ease' }} />
                                    </Box>
                                </Box>
                            ) : null}
                        </Box>

                        <Divider sx={{ borderColor: '#e2e8f0' }} />

                        {/* Datos de Contacto */}
                        <Box>
                            <Typography variant="subtitle2" sx={{ color: '#64748b', fontWeight: 700, mb: 1.5, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                Información de Contacto
                            </Typography>
                            <Paper elevation={0} sx={{ bgcolor: '#fff', borderRadius: 3, border: '1px solid #e2e8f0', p: 3 }}>
                                <Stack spacing={2.5}>
                                    <Box sx={{ display: 'flex', gap: 2 }}>
                                        <Box sx={{ p: 1, bgcolor: '#f1f5f9', borderRadius: 2, display: 'flex', height: 'fit-content' }}>
                                            <ContactPhone sx={{ color: '#64748b' }} />
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">IDENTIFICADOR / RUT</Typography>
                                            <Typography variant="body1" fontWeight={500} color="#0f172a">{selected.rut}</Typography>
                                        </Box>
                                    </Box>
                                    
                                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">CORREO ELECTRÓNICO</Typography>
                                            <Typography variant="body1" fontWeight={500} color="#0f172a">{selected.correo || 'No registrado'}</Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">TELÉFONO COMPAÑÍA</Typography>
                                            <Typography variant="body1" fontWeight={500} color="#0f172a">{selected.telefono || 'No registrado'}</Typography>
                                        </Box>
                                    </Box>

                                    <Box>
                                        <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">DESCRIPCIÓN OPERATIVA</Typography>
                                        <Typography variant="body2" sx={{ color: '#475569', mt: 0.5, bgcolor: '#f8fafc', p: 1.5, borderRadius: 2 }}>
                                            {selected.descripcion || 'Sin información adicional provista.'}
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Paper>
                        </Box>
                    </Stack>
                </CustomTabPanel>


                {/* 2. DOCUMENTACIÓN */}
                <CustomTabPanel value={tabIndex} index={1}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography variant="subtitle1" fontWeight={700} color="#0f172a">Archivos y Anexos</Typography>
                        <Chip label={`${docs.length} Documentos`} size="small" sx={{ fontWeight: 600, bgcolor: '#e2e8f0', color: '#475569' }} />
                    </Box>

                    {/* Formulario rápido para subir */}
                    {canCreateDocs && (
                        <Paper elevation={0} sx={{ p: 2.5, mb: 4, bgcolor: '#fff', border: '1px dashed #cbd5e1', borderRadius: 3 }}>
                            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>Subir Nuevo Archivo</Typography>
                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                                <Button variant="outlined" component="label" sx={{ flex: 1, justifyContent: 'flex-start', textTransform: 'none', borderColor: '#cbd5e1', color: docForm.archivo ? '#0f172a' : '#64748b' }}>
                                    <CloudUpload sx={{ mr: 1 }} />
                                    {docForm.archivo ? docForm.archivo.name : 'Seleccionar PDF, Word, Excel o imagen...'}
                                    <input type="file" hidden onChange={handleDocFile} />
                                </Button>
                                <TextField size="small" placeholder="Descripción breve (opcional)" value={docForm.descripcion} onChange={(e) => setDocForm((p) => ({ ...p, descripcion: e.target.value }))} sx={{ flex: 1 }} />
                                <Button variant="contained" onClick={handleUploadDoc} disabled={!docForm.archivo} sx={{ boxShadow: 'none', px: 3 }}>
                                    Cargar
                                </Button>
                            </Stack>
                        </Paper>
                    )}

                    {docs.length > 0 ? (
                        <Stack spacing={1.5}>
                            {docs.map((doc) => (
                                <Paper key={doc.id} elevation={0} sx={{ bgcolor: '#fff', border: '1px solid #e2e8f0', borderRadius: 3, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.2s', '&:hover': { borderColor: '#cbd5e1', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' } }}>
                                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                        <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: '#f1f5f9', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                            <Typography variant="button" sx={{ color: '#64748b', fontWeight: 800 }}>{doc.extension.substring(0,3)}</Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#0f172a' }}>{doc.nombre_original}</Typography>
                                            <Typography variant="caption" sx={{ color: '#64748b' }}>
                                                {formatBytes(doc.tamano_bytes)} • Subido por {doc.cargado_por_username || 'Sistema'} el {new Date(doc.fecha_carga).toLocaleDateString()}
                                            </Typography>
                                            {doc.descripcion && <Typography variant="caption" display="block" sx={{ mt: 0.5, color: '#475569' }}>{doc.descripcion}</Typography>}
                                        </Box>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <Tooltip title="Descargar"><IconButton size="small" onClick={() => handleDownloadDoc(doc)} sx={{ bgcolor: '#f8fafc' }}><Download fontSize="small" /></IconButton></Tooltip>
                                        {canDeleteDocs && (
                                            <Tooltip title="Eliminar Permanente"><IconButton size="small" color="error" onClick={() => handleDeleteDoc(doc.id)} sx={{ bgcolor: '#fef2f2' }}><DeleteOutline fontSize="small" /></IconButton></Tooltip>
                                        )}
                                    </Box>
                                </Paper>
                            ))}
                        </Stack>
                    ) : (
                        <Box sx={{ textAlign: 'center', p: 6, bgcolor: '#fff', border: '1px solid #e2e8f0', borderRadius: 3 }}>
                            <Folder sx={{ fontSize: 48, color: '#cbd5e1', mb: 2 }} />
                            <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#475569' }}>Repositorio Vacío</Typography>
                            <Typography variant="body2" sx={{ color: '#94a3b8' }}>No hay archivos vinculados a este cliente.</Typography>
                        </Box>
                    )}
                </CustomTabPanel>


                {/* 3. FINANZAS */}
                <CustomTabPanel value={tabIndex} index={2}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography variant="subtitle1" fontWeight={700} color="#0f172a">Libro Mayor del Cliente</Typography>
                    </Box>

                    {canCreateMov && (
                        <Paper elevation={0} sx={{ p: 2.5, mb: 4, bgcolor: '#fff', border: '1px solid #e2e8f0', borderRadius: 3 }}>
                            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>Registrar Flujo de Caja</Typography>
                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                                <TextField select size="small" label="Operación" value={movForm.tipo_movimiento} onChange={(e) => setMovForm((p) => ({ ...p, tipo_movimiento: e.target.value as 'INGRESO' | 'COSTO' }))} sx={{ minWidth: 130 }} SelectProps={{ MenuProps: { sx: { zIndex: 1400 } } }}>
                                    <MenuItem value="INGRESO">Ingreso (+)</MenuItem>
                                    <MenuItem value="COSTO">Costo (-)</MenuItem>
                                </TextField>
                                <TextField size="small" label="Monto" type="number" placeholder="Ej. 150000" value={movForm.monto} onChange={(e) => setMovForm((p) => ({ ...p, monto: e.target.value }))} sx={{ flex: 1, minWidth: 130 }} />
                                <TextField size="small" type="date" label="Fecha" InputLabelProps={{ shrink: true }} value={movForm.fecha} onChange={(e) => setMovForm((p) => ({ ...p, fecha: e.target.value }))} sx={{ minWidth: 140 }} />
                                <TextField size="small" label="Concepto / Detalle" value={movForm.descripcion} onChange={(e) => setMovForm((p) => ({ ...p, descripcion: e.target.value }))} sx={{ flex: 2 }} />
                                <Button variant="contained" onClick={handleCreateMov} sx={{ boxShadow: 'none', px: 3, fontWeight: 'bold' }}>
                                    Anotar
                                </Button>
                            </Stack>
                        </Paper>
                    )}

                    {movs.length > 0 ? (
                        <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                            <Box sx={{ maxHeight: 500, overflow: 'auto', bgcolor: '#fff' }}>
                                {movs.map((mov, idx) => {
                                    const isIngreso = mov.tipo_movimiento === 'INGRESO';
                                    return (
                                        <Box key={mov.id} sx={{ p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: idx < movs.length - 1 ? '1px solid #f1f5f9' : 'none', '&:hover': { bgcolor: '#f8fafc' } }}>
                                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flex: 1 }}>
                                                <Box sx={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: isIngreso ? '#dcfce7' : '#fee2e2' }}>
                                                    {isIngreso ? <TrendingUp sx={{ color: '#166534' }} fontSize="small" /> : <TrendingDown sx={{ color: '#991b1b' }} fontSize="small" />}
                                                </Box>
                                                <Box>
                                                    <Typography variant="subtitle2" fontWeight={700} sx={{ color: isIngreso ? '#15803d' : '#b91c1c' }}>
                                                        {isIngreso ? '+' : '-'}{money.format(parseAmount(mov.monto))}
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ color: '#475569', fontWeight: 500 }}>
                                                        {mov.descripcion || 'Sin concepto'}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                                                        {new Date(`${mov.fecha}T00:00:00`).toLocaleDateString()} • Por {mov.creado_por_username || 'Sistema'}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                            {canDeleteMov && (
                                                <Tooltip title="Anular Registro">
                                                    <IconButton size="small" color="error" onClick={() => handleDeleteMov(mov.id)} sx={{ opacity: 0.5, '&:hover': { opacity: 1, bgcolor: '#fef2f2' } }}>
                                                        <DeleteOutline fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </Box>
                                    );
                                })}
                            </Box>
                        </Paper>
                    ) : (
                        <Box sx={{ textAlign: 'center', p: 6, bgcolor: '#fff', border: '1px solid #e2e8f0', borderRadius: 3 }}>
                            <MonetizationOn sx={{ fontSize: 48, color: '#cbd5e1', mb: 2 }} />
                            <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#475569' }}>Sin Movimientos</Typography>
                            <Typography variant="body2" sx={{ color: '#94a3b8' }}>Este cliente no presenta ningún historial financiero registrado.</Typography>
                        </Box>
                    )}
                </CustomTabPanel>


                {/* 4. TAREAS */}
                <CustomTabPanel value={tabIndex} index={3}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography variant="subtitle1" fontWeight={700} color="#0f172a">Planificación y Tareas Operativas</Typography>
                        <Chip label={`${tareas.length} Tareas Totales`} size="small" sx={{ fontWeight: 600, bgcolor: '#e2e8f0', color: '#475569' }} />
                    </Box>

                    {tareas.length > 0 ? (
                      <Stack spacing={2} sx={{ pb: 4 }}>
                        {tareas.map((tarea) => {
                            const isDone = tarea.estado === 'COMPLETADA';
                            return (
                                <Paper key={tarea.id} elevation={0} sx={{ p: 2.5, bgcolor: '#fff', border: `1px solid ${isDone ? '#bbf7d0' : '#e2e8f0'}`, borderLeft: `4px solid ${isDone ? '#22c55e' : tarea.prioridad === 'ALTA' ? '#ef4444' : tarea.prioridad === 'MEDIA' ? '#f59e0b' : '#3b82f6'}`, borderRadius: 3 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mb: 1 }}>
                                        <Box>
                                            <Typography variant="subtitle2" fontWeight={800} sx={{ color: isDone ? '#166534' : '#0f172a', textDecoration: isDone ? 'line-through' : 'none' }}>
                                                {tarea.nombre}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                                Responsable: {tarea.responsable} 
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                            <Chip size="small" label={tarea.estado} sx={{ fontWeight: 700, fontSize: '0.65rem', height: 20, bgcolor: isDone ? '#dcfce7' : tarea.estado === 'EN_PROGRESO' ? '#dbeafe' : '#f1f5f9', color: isDone ? '#166534' : tarea.estado === 'EN_PROGRESO' ? '#1e40af' : '#475569' }} />
                                        </Box>
                                    </Box>
                                    
                                    {tarea.informacion && (
                                        <Typography variant="body2" sx={{ color: '#475569', mt: 1 }}>{tarea.informacion}</Typography>
                                    )}
                                    
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2, pt: 1.5, borderTop: '1px dashed #e2e8f0' }}>
                                        <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>
                                            Fecha Límite: {new Date(`${tarea.fecha_limite}T00:00:00`).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700 }}>
                                            Prioridad: {tarea.prioridad}
                                        </Typography>
                                    </Box>
                                </Paper>
                            );
                        })}
                      </Stack>
                    ) : (
                      <Box sx={{ textAlign: 'center', p: 6, bgcolor: '#fff', border: '1px solid #e2e8f0', borderRadius: 3 }}>
                          <Assignment sx={{ fontSize: 48, color: '#cbd5e1', mb: 2 }} />
                          <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#475569' }}>Agenda Limpia</Typography>
                          <Typography variant="body2" sx={{ color: '#94a3b8' }}>No hay tareas vinculadas o pendientes para este cliente.</Typography>
                      </Box>
                    )}
                </CustomTabPanel>
                
            </Box>
          </Box>
        )}
      </Drawer>
    </Box>
  );
};

export default Clientes;
