import { useEffect, useState } from 'react';
import { 
  Box, Typography, Button, Paper, TextField, MenuItem, Stack, 
  Dialog, DialogContent, DialogActions, Chip, InputAdornment, Avatar, IconButton, Tooltip, Alert
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { 
  CloudUpload, VisibilityOutlined, WarningAmber, ErrorOutline, 
  Search, Close, FilterList, DeleteOutline,
  PictureAsPdf, Image as ImageIcon, Description, InsertDriveFile // <--- NUEVOS ICONOS
} from '@mui/icons-material';
import api from '../api/axios';
import { useAuth } from '../hooks/useAuth';

// --- Interfaces ---
interface Trabajador {
  rut: string;
  nombres: string;
  apellidos: string;
}

interface Documento {
  id: number;
  tipo: string;
  archivo: string;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  observacion: string;
  nombre_trabajador: string;
  rut_trabajador: string;
  created_at: string;
}

interface DocType {
  id: number;
  nombre: string;
}

// --- UTILS PARA ICONOS ---
const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return <PictureAsPdf fontSize="small" />;
  if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return <ImageIcon fontSize="small" />;
  if (['doc', 'docx'].includes(ext || '')) return <Description fontSize="small" />;
  return <InsertDriveFile fontSize="small" />;
};

const getFileColor = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return { bg: '#fee2e2', text: '#ef4444' }; // Rojo
  if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return { bg: '#e0f2fe', text: '#0ea5e9' }; // Azul
  if (['doc', 'docx'].includes(ext || '')) return { bg: '#ede9fe', text: '#8b5cf6' }; // Morado
  return { bg: '#f1f5f9', text: '#64748b' }; // Gris por defecto
};

const Documentos = () => {
  const { user } = useAuth();
  const canManageDocuments = user?.rol === 'ADMINISTRADOR' || user?.rol === 'RRHH';

  const [docs, setDocs] = useState<Documento[]>([]);
  const [workers, setWorkers] = useState<Trabajador[]>([]);
  const [docTypes, setDocTypes] = useState<DocType[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  
  const [searchText, setSearchText] = useState('');
  const [filterEstado, setFilterEstado] = useState('Todos');

  const [form, setForm] = useState({
    trabajador: '',
    tipo: '',
    fecha_emision: new Date().toISOString().split('T')[0],
    fecha_vencimiento: '',
    observacion: '',
    archivo: null as File | null
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const resDocs = await api.get('/documentos/');
      setDocs(resDocs.data);

      if (canManageDocuments) {
        const [resWorkers, resTypes] = await Promise.allSettled([
          api.get('/trabajadores/'),
          api.get('/tipos-documento/'),
        ]);
        setWorkers(resWorkers.status === 'fulfilled' ? resWorkers.value.data : []);
        setDocTypes(resTypes.status === 'fulfilled' ? resTypes.value.data : []);
      } else {
        setWorkers([]);
        setDocTypes([]);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [canManageDocuments]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setForm({ ...form, archivo: e.target.files[0] });
    }
  };

  const handleSave = async () => {
    if (!canManageDocuments) return;

    if (!form.trabajador || !form.archivo || !form.tipo) {
      alert("Faltan datos obligatorios (Trabajador, Tipo o Archivo).");
      return;
    }

    const formData = new FormData();
    formData.append('trabajador', form.trabajador);
    formData.append('tipo', form.tipo);
    formData.append('fecha_emision', form.fecha_emision);
    if (form.fecha_vencimiento) formData.append('fecha_vencimiento', form.fecha_vencimiento);
    formData.append('observacion', form.observacion || `${form.tipo}`);
    formData.append('archivo', form.archivo);

    try {
      await api.post('/documentos/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      fetchData();
      setOpen(false);
      setForm({ ...form, archivo: null, observacion: '', tipo: '' });
    } catch (err) { alert("Error al subir."); }
  };

const handleDelete = async (id: number) => {
    if (!canManageDocuments) return;
    if(!confirm("¿Estás seguro de eliminar este documento de forma permanente?")) return;
    try {
        await api.delete(`/documentos/${id}/`);
        fetchData();
    } catch(e) { alert("Error al eliminar el documento."); }
  };

  const getEstado = (fechaVencimiento: string | null) => {
    if (!fechaVencimiento) return { label: 'INDEFINIDO', color: 'info' as const, textColor: '#0284c7' };
    const fecha = new Date(fechaVencimiento);
    const hoy = new Date();
    const diffDias = Math.ceil((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDias < 0) return { label: 'VENCIDO', color: 'error' as const, textColor: '#dc2626' };
    if (diffDias <= 15) return { label: 'POR VENCER', color: 'warning' as const, textColor: '#d97706' };
    return { label: 'VIGENTE', color: 'success' as const, textColor: '#16a34a' };
  };

  const filteredDocs = docs.filter(d => {
    const matchText = d.nombre_trabajador?.toLowerCase().includes(searchText.toLowerCase()) || 
                      d.tipo.toLowerCase().includes(searchText.toLowerCase());
    if (filterEstado === 'Todos') return matchText;
    const estadoActual = getEstado(d.fecha_vencimiento).label;
    return matchText && estadoActual === filterEstado;
  });

  const hoy = new Date();
  const vencidos = docs.filter(d => d.fecha_vencimiento && new Date(d.fecha_vencimiento) < hoy).length;
  const porVencer = docs.filter(d => {
    if (!d.fecha_vencimiento) return false;
    const f = new Date(d.fecha_vencimiento);
    const diff = Math.ceil((f.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 15;
  }).length;

  const columns: GridColDef[] = [
    { 
      field: 'archivo', headerName: 'ARCHIVO', width: 300, 
      renderCell: (params: GridRenderCellParams) => {
        const url = params.row.archivo || '';
        const nombreArchivo = decodeURIComponent(url.split('/').pop() || '');
        const colors = getFileColor(nombreArchivo);

        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, height: '100%' }}>
            {/* ICONO DINÁMICO */}
            <Avatar sx={{ bgcolor: colors.bg, color: colors.text, width: 40, height: 40, borderRadius: 2 }}>
              {getFileIcon(nombreArchivo)}
            </Avatar>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Tooltip title={nombreArchivo}>
                <Typography variant="body2" fontWeight="bold" sx={{ lineHeight: 1.2 }}>
                  {nombreArchivo.length > 20 ? nombreArchivo.substring(0, 20) + '...' : nombreArchivo}
                </Typography>
              </Tooltip>
              <Typography variant="caption" color="text.secondary">
                 {params.row.observacion ? (params.row.observacion.length > 25 ? params.row.observacion.substring(0, 25) + '...' : params.row.observacion) : 'Sin obs.'}
              </Typography>
            </Box>
          </Box>
        );
      }
    },
    { 
      field: 'tipo', headerName: 'TIPO', width: 200,
      renderCell: (params) => (
        <Chip label={params.value.toUpperCase()} size="small" variant="outlined" sx={{ fontWeight: 'bold', fontSize: '0.65rem', borderRadius: 1 }} />
      )
    },
    { 
      field: 'trabajador', headerName: 'TRABAJADOR', width: 200,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
            <Typography variant="body2" fontWeight="600">{params.row.nombre_trabajador}</Typography>
            <Typography variant="caption" fontSize={14} fontWeight="550" color="text.secondary">{params.row.rut_trabajador}</Typography>
        </Box>
      )
    },
    { 
        field: 'fecha_emision', headerName: 'EMISIÓN', width: 150,
        renderCell: (params) => (
            <Typography variant="body2" color="text.secondary">
                {params.value ? new Date(params.value + 'T00:00:00').toLocaleDateString() : '-'}
            </Typography>
        )
    },
    { 
      field: 'fecha_vencimiento', headerName: 'VENCIMIENTO', width: 150,
      renderCell: (params) => {
        if (!params.value) return <Typography variant="caption" color="text.secondary" >INDEFINIDO</Typography>;
        const estado = getEstado(params.value);
        return (
          <Typography variant="body2" fontWeight="bold" sx={{ color: estado.color === 'error' ? '#dc2626' : 'text.primary' }}>
            {new Date(params.value + 'T00:00:00').toLocaleDateString()}
          </Typography>
        );
      }
    },
    {
      field: 'estado', headerName: 'ESTADO', width: 150,
      renderCell: (params) => {
        const estado = getEstado(params.row.fecha_vencimiento);
        return <Typography variant="caption" fontWeight="bold" sx={{ color: estado.textColor }}>{estado.label}</Typography>;
      }
    },
    {
      field: 'acciones', headerName: 'ACCIONES', width: 150,
      renderCell: (params) => (
        <Box>
            <Tooltip title="Ver Documento">
                <IconButton size="small" href={params.row.archivo} target="_blank" sx={{ color: '#64748b' }}><VisibilityOutlined /></IconButton>
            </Tooltip>
            {canManageDocuments && (
              <Tooltip title="Eliminar">
                  <IconButton size="small" color="error" onClick={() => handleDelete(params.row.id)}><DeleteOutline /></IconButton>
              </Tooltip>
            )}
        </Box>
      )
    }
  ];

  return (
    <Box sx={{ width: '100%' }}>
      {/* HEADER */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="700" color="#1e293b">Gestión de Documentos</Typography>
          <Typography variant="body2" color="text.secondary">Administración centralizada y control de vencimientos</Typography>
        </Box>
        {canManageDocuments && (
          <Button variant="contained" startIcon={<CloudUpload />} onClick={() => setOpen(true)} sx={{ bgcolor: '#2563eb' }}>
            Subir Documento
          </Button>
        )}
      </Box>

      {/* TARJETAS KPI */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 4 }}>
        <Paper sx={{ p: 2, flex: 1, bgcolor: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: '#ef4444', width: 50, height: 50 }}><ErrorOutline /></Avatar>
          <Box>
            <Typography variant="overline" fontWeight="bold" color="#b91c1c">DOCUMENTOS VENCIDOS</Typography>
            <Typography variant="body2" color="#7f1d1d">Hay <b>{vencidos} archivos</b> que requieren renovación inmediata.</Typography>
          </Box>
        </Paper>
        <Paper sx={{ p: 2, flex: 1, bgcolor: '#fce7f3', border: '1px solid #fbcfe8', display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: '#ec4899', width: 50, height: 50 }}><WarningAmber /></Avatar>
          <Box>
             <Typography variant="overline" fontWeight="bold" color="#831843">PRÓXIMOS A VENCER</Typography>
             <Typography variant="body2" color="#831843">Hay <b>{porVencer} archivos</b> que vencerán en 15 días.</Typography>
          </Box>
        </Paper>
      </Stack>

      {/* FILTROS */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid #e2e8f0', borderRadius: 2, display: 'flex', gap: 2 }}>
         <TextField 
            placeholder="Buscar por trabajador o tipo..." size="small" fullWidth
            value={searchText} onChange={(e) => setSearchText(e.target.value)}
            InputProps={{ startAdornment: (<InputAdornment position="start"><Search /></InputAdornment>) }}
         />
         <TextField 
            select label="Estado" size="small" value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)} sx={{ minWidth: 200 }}
            InputProps={{ startAdornment: (<InputAdornment position="start"><FilterList /></InputAdornment>) }}
         >
            <MenuItem value="Todos">Todos</MenuItem>
            <MenuItem value="VIGENTE">Vigentes</MenuItem>
            <MenuItem value="POR VENCER">Por Vencer</MenuItem>
            <MenuItem value="VENCIDO">Vencidos</MenuItem>
            <MenuItem value="INDEFINIDO">Indefinidos</MenuItem>
         </TextField>
      </Paper>

      {/* TABLA */}
      <Paper elevation={0} sx={{ height: 500, border: '1px solid #e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
        <DataGrid 
          rows={filteredDocs} columns={columns} loading={loading} rowHeight={70} disableRowSelectionOnClick
          sx={{ border: 'none', '& .MuiDataGrid-columnHeaders': { bgcolor: '#f8fafc', color: '#64748b', fontWeight: 'bold' }, '& .MuiDataGrid-cell': { borderBottom: '1px solid #f1f5f9' } }}
        />
      </Paper>

      {/* MODAL SUBIDA */}
      <Dialog open={open && canManageDocuments} onClose={() => setOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <Box sx={{ p: 3, bgcolor: '#f8fafc', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
            <Box>
                <Typography variant="h6" fontWeight="bold">Subir Documento</Typography>
                <Typography variant="caption" color="text.secondary">REGISTRO DE ARCHIVO DIGITAL</Typography>
            </Box>
            <IconButton onClick={() => setOpen(false)}><Close /></IconButton>
        </Box>
        
        <DialogContent sx={{ p: 3 }}>
          <Stack spacing={3}>
            {docTypes.length === 0 && <Alert severity="warning">No hay Tipos de Documento creados en Admin.</Alert>}

            <Box>
              <Typography variant="caption" fontWeight="bold">VINCULAR TRABAJADOR*</Typography>
              <TextField select fullWidth value={form.trabajador} onChange={(e) => setForm({...form, trabajador: e.target.value})}>
                {workers.map((w) => (
                  <MenuItem key={w.rut} value={w.rut}>{w.nombres} {w.apellidos}</MenuItem>
                ))}
              </TextField>
            </Box>

            <Stack direction="row" spacing={2}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" fontWeight="bold">TIPO DE DOCUMENTO*</Typography>
                <TextField select fullWidth value={form.tipo} onChange={(e) => setForm({...form, tipo: e.target.value})}>
                  {docTypes.map((dt) => (
                      <MenuItem key={dt.id} value={dt.nombre}>{dt.nombre}</MenuItem>
                  ))}
                </TextField>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" fontWeight="bold">ARCHIVO* (PDF/IMG/DOC)</Typography>
                <Button variant="outlined" component="label" fullWidth sx={{ height: 53, justifyContent: 'flex-start', borderColor: '#cbd5e1', color: '#64748b', textTransform: 'none' }}>
                   {form.archivo ? form.archivo.name : 'Seleccionar archivo...'}
                   <input type="file" hidden onChange={handleFileChange} />
                </Button>
              </Box>
            </Stack>

            <Stack direction="row" spacing={2}>
               <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" fontWeight="bold">FECHA DE EMISIÓN</Typography>
                  <TextField type="date" fullWidth value={form.fecha_emision} onChange={(e) => setForm({...form, fecha_emision: e.target.value})} />
               </Box>
               <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" fontWeight="bold">FECHA DE VENCIMIENTO</Typography>
                  <TextField type="date" fullWidth value={form.fecha_vencimiento} onChange={(e) => setForm({...form, fecha_vencimiento: e.target.value})} />
               </Box>
            </Stack>
            
            <Box>
               <Typography variant="caption" fontWeight="bold">OBSERVACIÓN</Typography>
               <TextField multiline rows={3} fullWidth placeholder="Comentario opcional..." value={form.observacion} onChange={(e) => setForm({...form, observacion: e.target.value})} />
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 0 }}>
           <Button onClick={() => setOpen(false)} variant="outlined" sx={{ color: '#64748b', borderColor: '#cbd5e1' }}>Cerrar</Button>
           <Button onClick={handleSave} variant="contained" sx={{ bgcolor: '#2563eb' }}>Guardar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Documentos;
