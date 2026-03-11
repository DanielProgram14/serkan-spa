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
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { Add, Close, CloudUpload, DeleteOutline, Download, EditOutlined, Search, VisibilityOutlined } from '@mui/icons-material';
import api from '../api/axios';
import { useAuth } from '../hooks/useAuth';

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

const Clientes = () => {
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

  const [openCliente, setOpenCliente] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [openDoc, setOpenDoc] = useState(false);
  const [openFicha, setOpenFicha] = useState(false);
  const [fichaCliente, setFichaCliente] = useState<Cliente | null>(null);
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
      const data: Cliente[] = res.data ?? [];
      setClientes(data);
      setSelected((prev) => {
        if (!data.length) return null;
        if (!prev) return data[0];
        return data.find((x) => x.rut === prev.rut) ?? data[0];
      });
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

  useEffect(() => {
    if (!selected) {
      setDocs([]);
      setMovs([]);
      setResumen(null);
      return;
    }
    void fetchDetail(selected.rut);
  }, [fetchDetail, selected?.rut]);

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

  const handleOpenFicha = (c: Cliente) => {
    setFichaCliente(c);
    setOpenFicha(true);
    void fetchDetail(c.rut);
  };

  const handleSaveCliente = async () => {
    if (!canManageClientes) return;
    setSaveError(null);
    const payload = normalizeClientePayload(clienteForm);
    if (!payload.rut || !payload.nombre || !payload.razon_social) {
      alert('RUT, Nombre y Razon Social son obligatorios.');
      return;
    }
    try {
      if (isEdit) await api.put(`/clientes/${payload.rut}/`, payload);
      else await api.post('/clientes/', payload);
      await fetchClientes();
      setOpenCliente(false);
    } catch (error) {
      setSaveError(formatApiError(error));
    }
  };

  const handleDeleteCliente = async (rut: string) => {
    if (!canManageClientes) return;
    if (!confirm('Eliminar cliente?')) return;
    await api.delete(`/clientes/${rut}/`);
    await fetchClientes();
  };

  const handleDocFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() ?? '' : '';
    if (!ALLOWED_EXTS.includes(ext)) return alert(`Tipo no permitido: ${ALLOWED_EXTS.join(', ')}`);
    if (file.size > MAX_DOC_SIZE) return alert('Maximo 10 MB');
    setDocForm((prev) => ({ ...prev, archivo: file }));
  };

  const handleUploadDoc = async () => {
    if (!canCreateDocs || !selected || !docForm.archivo) return;
    const form = new FormData();
    form.append('cliente', selected.rut);
    form.append('archivo', docForm.archivo);
    form.append('descripcion', docForm.descripcion);
    await api.post('/documentos-cliente/', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    setDocForm({ archivo: null, descripcion: '' });
    setOpenDoc(false);
    await fetchDetail(selected.rut);
  };

  const handleDeleteDoc = async (id: number) => {
    if (!canDeleteDocs || !selected) return;
    if (!confirm('Eliminar documento?')) return;
    await api.delete(`/documentos-cliente/${id}/`);
    await fetchDetail(selected.rut);
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
    if (!movForm.monto || Number(movForm.monto) <= 0) return alert('Monto invalido');
    await api.post('/movimientos-financieros/', { cliente: selected.rut, ...movForm });
    setMovForm({ tipo_movimiento: 'INGRESO', monto: '', fecha: todayISO(), descripcion: '' });
    await fetchDetail(selected.rut);
  };

  const handleDeleteMov = async (id: number) => {
    if (!canDeleteMov || !selected) return;
    if (!confirm('Eliminar movimiento?')) return;
    await api.delete(`/movimientos-financieros/${id}/`);
    await fetchDetail(selected.rut);
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
    { field: 'nombre', headerName: 'CLIENTE', width: 230, renderCell: (p) => <b>{p.row.nombre}</b> },
    { field: 'razon_social', headerName: 'RAZON SOCIAL', width: 240 },
    { field: 'rut', headerName: 'RUT', width: 150 },
    { field: 'telefono', headerName: 'TELEFONO', width: 140 },
    { field: 'correo', headerName: 'CORREO', width: 220 },
    {
      field: 'acciones',
      headerName: 'ACCIONES',
      width: 160,
      sortable: false,
      renderCell: (p) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Ver Ficha"><IconButton size="small" onClick={() => handleOpenFicha(p.row as Cliente)}><VisibilityOutlined fontSize="small" /></IconButton></Tooltip>
          {canManageClientes && (
            <Tooltip title="Editar"><IconButton size="small" onClick={() => handleOpenEdit(p.row as Cliente)}><EditOutlined fontSize="small" /></IconButton></Tooltip>
          )}
          {canManageClientes && (
            <Tooltip title="Eliminar"><IconButton size="small" color="error" onClick={() => handleDeleteCliente(p.row.rut)}><DeleteOutline fontSize="small" /></IconButton></Tooltip>
          )}
        </Stack>
      ),
    },
  ];

  const docCols: GridColDef[] = [
    { field: 'nombre_original', headerName: 'ARCHIVO', width: 220 },
    { field: 'extension', headerName: 'TIPO', width: 90 },
    { field: 'tamano_bytes', headerName: 'TAMANO', width: 120, renderCell: (p) => formatBytes(p.value as number) },
    { field: 'fecha_carga', headerName: 'FECHA CARGA', width: 170, renderCell: (p) => new Date(p.value as string).toLocaleString() },
    { field: 'descripcion', headerName: 'DESCRIPCION', width: 200, renderCell: (p) => p.value || '-' },
    { field: 'cargado_por_username', headerName: 'SUBIDO POR', width: 140, renderCell: (p) => p.value || 'Sistema' },
    {
      field: 'acciones',
      headerName: 'ACCIONES',
      width: 110,
      sortable: false,
      renderCell: (p) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Descargar"><IconButton size="small" onClick={() => handleDownloadDoc(p.row as DocumentoCliente)}><Download fontSize="small" /></IconButton></Tooltip>
          {canDeleteDocs && (
            <Tooltip title="Eliminar"><IconButton size="small" color="error" onClick={() => handleDeleteDoc(p.row.id)}><DeleteOutline fontSize="small" /></IconButton></Tooltip>
          )}
        </Stack>
      ),
    },
  ];

  const movCols: GridColDef[] = [
    { field: 'tipo_movimiento', headerName: 'TIPO', width: 120, renderCell: (p) => <Chip size="small" label={p.value as string} /> },
    { field: 'monto', headerName: 'MONTO', width: 140, renderCell: (p) => money.format(parseAmount(p.value)) },
    { field: 'fecha', headerName: 'FECHA', width: 120, renderCell: (p) => new Date(`${p.value as string}T00:00:00`).toLocaleDateString() },
    { field: 'descripcion', headerName: 'DESCRIPCION', width: 250, renderCell: (p) => p.value || '-' },
    { field: 'creado_por_username', headerName: 'REGISTRADO POR', width: 160, renderCell: (p) => p.value || 'Sistema' },
    {
      field: 'acciones',
      headerName: 'ACCIONES',
      width: 90,
      sortable: false,
      renderCell: (p) =>
        canDeleteMov ? <IconButton size="small" color="error" onClick={() => handleDeleteMov(p.row.id)}><DeleteOutline fontSize="small" /></IconButton> : null,
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Cartera de Clientes</Typography>
          <Typography variant="body2" color="text.secondary">Gestor documental y financiero por cliente.</Typography>
        </Box>
        {canManageClientes && <Button variant="contained" startIcon={<Add />} onClick={handleOpenCreate}>Nuevo Cliente</Button>}
      </Box>

      <Paper sx={{ p: 2, mb: 2 }}>
        <TextField fullWidth size="small" placeholder="Buscar por cliente o RUT..." value={searchText} onChange={(e) => setSearchText(e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} />
      </Paper>

      <Paper sx={{ height: 420, mb: 2 }}>
        <DataGrid rows={filtered} columns={clienteCols} getRowId={(r) => r.rut} loading={loadingClientes} onRowClick={(p) => setSelected(p.row as Cliente)} />
      </Paper>

      {selected && (
        <Stack spacing={2}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={700}>{selected.nombre} ({selected.rut})</Typography>
            <Typography variant="body2" color="text.secondary">{selected.razon_social}</Typography>
          </Paper>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <Paper sx={{ p: 2, flex: 1 }}><Typography variant="caption">Ingresos</Typography><Typography variant="h6">{money.format(totalIngresos)}</Typography></Paper>
            <Paper sx={{ p: 2, flex: 1 }}><Typography variant="caption">Costos</Typography><Typography variant="h6">{money.format(totalCostos)}</Typography></Paper>
            <Paper sx={{ p: 2, flex: 1 }}><Typography variant="caption">Ganancia neta</Typography><Typography variant="h6" color={neta >= 0 ? 'success.main' : 'error.main'}>{money.format(neta)}</Typography></Paper>
          </Stack>

          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Grafico comparativo</Typography>
            <Typography variant="caption">Ingresos</Typography>
            <Box sx={{ height: 10, bgcolor: '#e2e8f0', borderRadius: 2, mb: 1 }}><Box sx={{ height: 10, bgcolor: '#16a34a', borderRadius: 2, width: `${(totalIngresos / barMax) * 100}%` }} /></Box>
            <Typography variant="caption">Costos</Typography>
            <Box sx={{ height: 10, bgcolor: '#e2e8f0', borderRadius: 2 }}><Box sx={{ height: 10, bgcolor: '#dc2626', borderRadius: 2, width: `${(totalCostos / barMax) * 100}%` }} /></Box>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="h6">Documentos del cliente</Typography>
              {canCreateDocs && <Button startIcon={<CloudUpload />} variant="contained" onClick={() => setOpenDoc(true)}>Cargar</Button>}
            </Box>
            <Alert severity="info" sx={{ mb: 1 }}>Tipos permitidos: {ALLOWED_EXTS.join(', ')}. Max: 10 MB.</Alert>
            <Box sx={{ height: 300 }}>
              <DataGrid rows={docs} columns={docCols} loading={loadingDetail} />
            </Box>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Registro financiero</Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mb: 1 }}>
              <TextField select size="small" label="Tipo" value={movForm.tipo_movimiento} onChange={(e) => setMovForm((p) => ({ ...p, tipo_movimiento: e.target.value as 'INGRESO' | 'COSTO' }))} sx={{ minWidth: 140 }}>
                <MenuItem value="INGRESO">Ingreso</MenuItem><MenuItem value="COSTO">Costo</MenuItem>
              </TextField>
              <TextField size="small" label="Monto" type="number" value={movForm.monto} onChange={(e) => setMovForm((p) => ({ ...p, monto: e.target.value }))} />
              <TextField size="small" type="date" label="Fecha" InputLabelProps={{ shrink: true }} value={movForm.fecha} onChange={(e) => setMovForm((p) => ({ ...p, fecha: e.target.value }))} />
              <TextField size="small" label="Descripcion" value={movForm.descripcion} onChange={(e) => setMovForm((p) => ({ ...p, descripcion: e.target.value }))} fullWidth />
              {canCreateMov && <Button variant="contained" onClick={handleCreateMov}>Registrar</Button>}
            </Stack>
            {!canCreateMov && <Alert severity="warning" sx={{ mb: 1 }}>Acceso de solo lectura para movimientos.</Alert>}
            <Box sx={{ height: 300 }}>
              <DataGrid rows={movs} columns={movCols} loading={loadingDetail} />
            </Box>
          </Paper>
        </Stack>
      )}

      {!selected && !loadingClientes && <Alert severity="info" sx={{ mt: 2 }}>No hay clientes para mostrar.</Alert>}

      <Dialog open={openCliente && canManageClientes} onClose={() => setOpenCliente(false)} maxWidth="sm" fullWidth>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee' }}>
          <Typography variant="h6">{isEdit ? 'Editar Cliente' : 'Nuevo Cliente'}</Typography>
          <IconButton onClick={() => setOpenCliente(false)}><Close /></IconButton>
        </Box>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={1.5}>
            {saveError && <Alert severity="error">{saveError}</Alert>}
            <TextField size="small" label="RUT*" value={clienteForm.rut} disabled={isEdit} onChange={(e) => setClienteForm((p) => ({ ...p, rut: e.target.value }))} />
            <TextField size="small" label="Nombre*" value={clienteForm.nombre} onChange={(e) => setClienteForm((p) => ({ ...p, nombre: e.target.value }))} />
            <TextField size="small" label="Razon social*" value={clienteForm.razon_social} onChange={(e) => setClienteForm((p) => ({ ...p, razon_social: e.target.value }))} />
            <TextField size="small" label="Telefono" value={clienteForm.telefono} onChange={(e) => setClienteForm((p) => ({ ...p, telefono: e.target.value }))} />
            <TextField size="small" label="Correo" value={clienteForm.correo} onChange={(e) => setClienteForm((p) => ({ ...p, correo: e.target.value }))} />
            <TextField size="small" label="Descripcion" multiline rows={3} value={clienteForm.descripcion} onChange={(e) => setClienteForm((p) => ({ ...p, descripcion: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCliente(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveCliente}>Guardar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openDoc && canCreateDocs} onClose={() => setOpenDoc(false)} maxWidth="sm" fullWidth>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee' }}>
          <Typography variant="h6">Cargar documento</Typography>
          <IconButton onClick={() => setOpenDoc(false)}><Close /></IconButton>
        </Box>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={1.5}>
            <Typography variant="body2">Cliente: <b>{selected?.nombre}</b></Typography>
            <Button variant="outlined" component="label" sx={{ justifyContent: 'flex-start', textTransform: 'none' }}>
              {docForm.archivo ? docForm.archivo.name : 'Seleccionar archivo...'}
              <input type="file" hidden onChange={handleDocFile} />
            </Button>
            <TextField size="small" label="Descripcion" multiline rows={3} value={docForm.descripcion} onChange={(e) => setDocForm((p) => ({ ...p, descripcion: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDoc(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleUploadDoc}>Subir</Button>
        </DialogActions>
      </Dialog>

      {/* === MODAL: FICHA COMPLETA DEL CLIENTE === */}
      {fichaCliente && (
        <Dialog open={openFicha} onClose={() => setOpenFicha(false)} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          {/* ENCABEZADO */}
          <Box sx={{ bgcolor: '#0f172a', color: 'white', p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h5" fontWeight="bold" sx={{ mb: 0.5 }}>{fichaCliente.nombre}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>RUT: {fichaCliente.rut}</Typography>
            </Box>
            <IconButton onClick={() => setOpenFicha(false)} sx={{ color: 'white' }}><Close /></IconButton>
          </Box>

          {/* CONTENIDO */}
          <DialogContent sx={{ p: 3, maxHeight: '70vh', overflow: 'auto' }}>
            <Stack spacing={3}>
              {/* SECCIÓN 1: DATOS GENERALES */}
              <Box>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  Datos generales
                </Typography>
                <Paper elevation={0} sx={{ p: 2.5, border: '1px solid #e2e8f0', borderRadius: 2 }}>
                  <Stack spacing={2}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight="bold">RAZÓN SOCIAL</Typography>
                        <Typography variant="body2">{fichaCliente.razon_social || '-'}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight="bold">TELÉFONO</Typography>
                        <Typography variant="body2">{fichaCliente.telefono || '-'}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight="bold">CORREO</Typography>
                        <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{fichaCliente.correo || '-'}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight="bold">DESCRIPCIÓN</Typography>
                        <Typography variant="body2">{fichaCliente.descripcion || '-'}</Typography>
                      </Box>
                    </Box>
                  </Stack>
                </Paper>
              </Box>

              {/* SECCIÓN 2: RESUMEN FINANCIERO */}
              <Box>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  Resumen financiero
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Paper elevation={0} sx={{ p: 2, flex: 1, border: '2px solid #16a34a', borderRadius: 2, bgcolor: '#f0fdf4' }}>
                    <Typography variant="caption" color="text.secondary" fontWeight="bold">INGRESOS</Typography>
                    <Typography variant="h6" color="success.main" fontWeight="bold">{money.format(parseAmount(resumen?.total_ingresos))}</Typography>
                  </Paper>
                  <Paper elevation={0} sx={{ p: 2, flex: 1, border: '2px solid #dc2626', borderRadius: 2, bgcolor: '#fef2f2' }}>
                    <Typography variant="caption" color="text.secondary" fontWeight="bold">COSTOS</Typography>
                    <Typography variant="h6" color="error.main" fontWeight="bold">{money.format(parseAmount(resumen?.total_costos))}</Typography>
                  </Paper>
                  <Paper elevation={0} sx={{ p: 2, flex: 1, border: '2px solid #2563eb', borderRadius: 2, bgcolor: '#eff6ff' }}>
                    <Typography variant="caption" color="text.secondary" fontWeight="bold">GANANCIA NETA</Typography>
                    <Typography variant="h6" color={parseAmount(resumen?.ganancia_neta) >= 0 ? 'success.main' : 'error.main'} fontWeight="bold">
                      {money.format(parseAmount(resumen?.ganancia_neta))}
                    </Typography>
                  </Paper>
                </Stack>
              </Box>

              {/* SECCIÓN 3: TAREAS VINCULADAS */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Typography variant="h6" fontWeight="bold">Tareas vinculadas</Typography>
                  <Chip label={tareas.length} size="small" color="primary" variant="outlined" />
                </Box>
                {tareas.length > 0 ? (
                  <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
                    {tareas.map((tarea, idx) => (
                      <Box key={tarea.id} sx={{ p: 2, borderBottom: idx < tareas.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mb: 1 }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2" fontWeight="bold">{tarea.nombre}</Typography>
                            <Typography variant="caption" color="text.secondary">Responsable: {tarea.responsable}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Chip size="small" label={tarea.estado} variant="outlined" color={tarea.estado === 'COMPLETADA' ? 'success' : tarea.estado === 'CANCELADA' ? 'default' : 'primary'} />
                            <Chip size="small" label={tarea.prioridad} variant="outlined" color={tarea.prioridad === 'ALTA' ? 'error' : tarea.prioridad === 'MEDIA' ? 'warning' : 'default'} />
                          </Box>
                        </Box>
                        {tarea.informacion && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>{tarea.informacion}</Typography>}
                        <Typography variant="caption" color="text.secondary">Fecha límite: {new Date(`${tarea.fecha_limite}T00:00:00`).toLocaleDateString()}</Typography>
                      </Box>
                    ))}
                  </Paper>
                ) : (
                  <Paper elevation={0} sx={{ p: 2, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: 2 }}>
                    <Typography variant="body2" color="text.secondary">No hay tareas vinculadas a este cliente</Typography>
                  </Paper>
                )}
              </Box>

              {/* SECCIÓN 4: DOCUMENTOS */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Typography variant="h6" fontWeight="bold">Documentos</Typography>
                  <Chip label={docs.length} size="small" color="primary" variant="outlined" />
                </Box>
                {docs.length > 0 ? (
                  <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, maxHeight: 300, overflow: 'auto' }}>
                    {docs.map((doc, idx) => (
                      <Box key={doc.id} sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: idx < docs.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight="bold">{doc.nombre_original}</Typography>
                          <Typography variant="caption" color="text.secondary">{doc.extension.toUpperCase()} - {formatBytes(doc.tamano_bytes)} - {new Date(doc.fecha_carga).toLocaleDateString()}</Typography>
                          {doc.descripcion && <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>{doc.descripcion}</Typography>}
                        </Box>
                        <IconButton size="small" onClick={() => handleDownloadDoc(doc)}><Download fontSize="small" /></IconButton>
                      </Box>
                    ))}
                  </Paper>
                ) : (
                  <Paper elevation={0} sx={{ p: 2, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: 2 }}>
                    <Typography variant="body2" color="text.secondary">No hay documentos registrados</Typography>
                  </Paper>
                )}
              </Box>

              {/* SECCIÓN 5: HISTORIAL FINANCIERO */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Typography variant="h6" fontWeight="bold">Historial financiero</Typography>
                  <Chip label={movs.length} size="small" color="primary" variant="outlined" />
                </Box>
                {movs.length > 0 ? (
                  <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, maxHeight: 300, overflow: 'auto' }}>
                    {movs.map((mov, idx) => (
                      <Box key={mov.id} sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: idx < movs.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 0.5 }}>
                            <Chip size="small" label={mov.tipo_movimiento} sx={{ backgroundColor: mov.tipo_movimiento === 'INGRESO' ? '#dcfce7' : '#fee2e2', color: mov.tipo_movimiento === 'INGRESO' ? '#166534' : '#991b1b' }} />
                            <Typography variant="body2" fontWeight="bold">{money.format(parseAmount(mov.monto))}</Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary">{new Date(`${mov.fecha}T00:00:00`).toLocaleDateString()} - {mov.creado_por_username || 'Sistema'}</Typography>
                          {mov.descripcion && <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>{mov.descripcion}</Typography>}
                        </Box>
                      </Box>
                    ))}
                  </Paper>
                ) : (
                  <Paper elevation={0} sx={{ p: 2, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: 2 }}>
                    <Typography variant="body2" color="text.secondary">No hay movimientos registrados</Typography>
                  </Paper>
                )}
              </Box>
            </Stack>
          </DialogContent>

          {/* PIE DE PÁGINA */}
          <Box sx={{ p: 2, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button onClick={() => setOpenFicha(false)} variant="contained" sx={{ bgcolor: '#0f172a' }}>Cerrar Ficha</Button>
          </Box>
        </Dialog>
      )}
    </Box>
  );
};

export default Clientes;
