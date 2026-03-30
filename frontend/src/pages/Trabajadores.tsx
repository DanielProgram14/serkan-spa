import { useEffect, useState } from 'react';
import { 
  Box, Typography, Button, Chip, IconButton, Tooltip, Dialog, 
  DialogContent, DialogActions, TextField, MenuItem, Stack, Paper, Avatar, 
  InputAdornment, Divider, Alert,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { 
  Add, Search, EditOutlined, DeleteOutline, VisibilityOutlined, 
  Close, Description, Download, History, CalendarToday, Person
} from '@mui/icons-material';
import api from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import { showSuccess, showError, showWarning, confirmAction } from '../utils/alerts';

// --- INTERFACES ---
export interface Trabajador {
  rut: string;
  nombres: string;
  apellidos: string;
  area: string;
  cargo: string;
  fecha_ingreso: string;
  correo_personal?: string;
  correo_empresarial?: string;
  estado: 'ACTIVO' | 'INACTIVO';
  telefono?: string;
}

// Interfaces para los selectores
interface MasterItem {
  id: number;
  nombre: string;
}

// --- UTILS ---
function stringAvatar(name: string) {
  const parts = name.split(' ');
  const first = parts[0]?.[0] || '';
  const second = parts[1]?.[0] || '';
  return { children: `${first}${second}` };
}

const initialFormState: Trabajador = {
  rut: '', nombres: '', apellidos: '', area: '', cargo: '', 
  fecha_ingreso: new Date().toISOString().split('T')[0],
  correo_personal: '', correo_empresarial: '', estado: 'ACTIVO', telefono: ''
};

const getApiErrorMessage = (error: any, fallback: string) => {
  const payload = error?.response?.data;
  if (!payload) return fallback;

  if (typeof payload === 'string') return payload;
  if (Array.isArray(payload)) return payload.join('\n');

  if (typeof payload === 'object') {
    const messages = Object.entries(payload).map(([field, value]) => {
      const text = Array.isArray(value) ? value.join(' ') : String(value);
      return `${field}: ${text}`;
    });
    if (messages.length) return messages.join('\n');
  }

  return fallback;
};

const Trabajadores = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();
  const canManageWorkers = user?.rol === 'ADMINISTRADOR' || user?.rol === 'RRHH';
  const canViewWorkerDocuments = canManageWorkers || user?.rol === 'TRABAJADOR';

  const [rows, setRows] = useState<Trabajador[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Estados para las listas desplegables
  const [listaAreas, setListaAreas] = useState<MasterItem[]>([]);
  const [listaCargos, setListaCargos] = useState<MasterItem[]>([]);

  const [searchText, setSearchText] = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [filterCargo, setFilterCargo] = useState('');
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openView, setOpenView] = useState(false);
  
  const [formData, setFormData] = useState<Trabajador>(initialFormState);
  const [selectedWorker, setSelectedWorker] = useState<Trabajador | null>(null);
  const [workerDocs, setWorkerDocs] = useState<any[]>([]);
  const [workerHistory, setWorkerHistory] = useState<any[]>([]);

  // --- 1. CARGA DE DATOS (TRABAJADORES + MAESTROS) ---
  const fetchData = async () => {
    setLoading(true);
    try {
      // Usamos Promise.all para cargar todo junto y rápido
      const resWorkers = await api.get('/trabajadores/');
      setRows(resWorkers.data);

      if (canManageWorkers) {
        const [resAreas, resCargos] = await Promise.allSettled([
          api.get('/areas/'),
          api.get('/cargos/'),
        ]);
        setListaAreas(resAreas.status === 'fulfilled' ? resAreas.value.data : []);
        setListaCargos(resCargos.status === 'fulfilled' ? resCargos.value.data : []);
      } else {
        setListaAreas([]);
        setListaCargos([]);
      }

    } catch (err) { console.error("Error cargando datos", err); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [canManageWorkers]);

  // --- HANDLERS ---
  const handleOpenCreate = () => { setFormData(initialFormState); setOpenCreate(true); };
  
  const handleOpenEdit = (worker: Trabajador) => { 
    setFormData({
      ...worker,
      correo_personal: worker.correo_personal || '',
      correo_empresarial: worker.correo_empresarial || '',
      telefono: worker.telefono || ''
    }); 
    setOpenEdit(true); 
  };
  
  const handleOpenView = async (worker: Trabajador) => { 
      setSelectedWorker(worker); 
      setOpenView(true); 
      setWorkerDocs([]);
      setWorkerHistory([]);
      if (!canViewWorkerDocuments) return;

      try {
          const res = await api.get('/documentos/');
          const docsDelTrabajador = res.data.filter((d: any) => d.trabajador === worker.rut);
          setWorkerDocs(docsDelTrabajador);
      } catch (error) { console.error(error); }

      try {
          const resHist = await api.get(`/trabajadores/${worker.rut}/historial/`);
          setWorkerHistory(resHist.data);
      } catch (error) { console.error("Error cargando historial:", error); }
  };

  const handleClose = () => { setOpenCreate(false); setOpenEdit(false); setOpenView(false); };

  const handleSave = async () => {
    if (!canManageWorkers) return;

    try {
      if (openEdit) {
        await api.put(`/trabajadores/${formData.rut}/`, formData);
      } else {
        await api.post('/trabajadores/', formData);
      }
      fetchData(); // Recargamos para ver cambios
      showSuccess('Trabajador guardado con éxito');
      handleClose();
    } catch (err: any) {
      showError('Error al guardar', getApiErrorMessage(err, "Error al guardar el trabajador."));
    }
  };

const handleDelete = async (worker: Trabajador) => {
    if (!canManageWorkers) return;
    if (worker.estado === "ACTIVO") {
      showWarning('No se puede eliminar', `El trabajador "${worker.nombres} ${worker.apellidos}" se encuentra ACTIVO.\\n\\nCámbialo a INACTIVO desde la edición.`);
      return;
    }
    const isConfirmed = await confirmAction('Eliminar Trabajador', `¿Eliminar permanentemente a "${worker.nombres} ${worker.apellidos}"?\\nEsta acción no se puede deshacer.`, 'Sí, eliminar');
    if (!isConfirmed) return;
    try {
      await api.delete(`/trabajadores/${worker.rut}/`);
      showSuccess('Trabajador eliminado');
      fetchData();
    } catch (err: any) {
        showError('No se pudo eliminar', getApiErrorMessage(err, "No se pudo eliminar el trabajador."));
    }
  };

  

  // --- COLUMNAS ---
const columns: GridColDef[] = [
  { 
    field: 'trabajador', headerName: 'TRABAJADOR', width: 400, 
    renderCell: (params) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, height: '100%' }}>
        <Avatar 
          {...stringAvatar(`${params.row.nombres} ${params.row.apellidos}`)} 
          sx={{ bgcolor: '#1e293b', width: 40, height: 40, borderRadius: 2 }} 
        />
        {/* Usamos un Box con flex column y centrado vertical */}
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Typography 
            variant="body2" 
            fontWeight="bold" 
            sx={{ lineHeight: 1.2, color: '#0f172a' }}
          >
            {params.row.nombres} {params.row.apellidos}
          </Typography>
          <Typography 
            variant="caption" 
            color="text.secondary" 
            sx={{ lineHeight: 1.2 }}
          >
            {params.row.correo_empresarial || 'Sin correo'}
          </Typography>
        </Box>
      </Box>
    )
  },
  { 
    field: 'rut', headerName: 'RUT', width: 200,
    renderCell: (params) => (
        <Typography variant="body2" color="#475569" fontWeight="600" fontSize={16} sx={{ lineHeight: 5}}>
            {params.value}
        </Typography>
    )
  },
  { 
    field: 'cargo', headerName: 'CARGO / ÁREA', width: 250,
    renderCell: (params) => (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <Typography variant="body2" sx={{ lineHeight: 3 }}>{params.row.cargo}</Typography>
        <Typography 
            variant="caption" 
            color="primary" 
            fontWeight="bold" 
            sx={{ lineHeight: 1, textTransform: 'uppercase' }}
        >
            {params.row.area}
        </Typography>
      </Box>
    )
  },
  { 
    field: 'estado', headerName: 'ESTADO', width: 200,
    renderCell: (params) => (
      <Chip 
        label={params.value} 
        size="small" 
        sx={{ 
            bgcolor: params.value === 'ACTIVO' ? '#dcfce7' : '#fee2e2', 
            color: params.value === 'ACTIVO' ? '#166534' : '#991b1b', 
            fontWeight: 'bold',
            borderRadius: 1.5
        }} 
      />
    )
  },
  {
    field: 'acciones', headerName: 'ACCIONES', width: 150,
    renderCell: (params) => (
      <Stack direction="row" spacing={0.5}>
        <Tooltip title="Ver Ficha">
            <IconButton size="small" onClick={() => handleOpenView(params.row as Trabajador)}>
                <VisibilityOutlined fontSize="small" />
            </IconButton>
        </Tooltip>
        {canManageWorkers && (
          <Tooltip title="Editar">
              <IconButton size="small" color="primary" onClick={() => handleOpenEdit(params.row as Trabajador)}>
                  <EditOutlined fontSize="small" />
              </IconButton>
          </Tooltip>
        )}
        {canManageWorkers && (
          <Tooltip title="Eliminar">
              <IconButton size="small" color="error" onClick={() => handleDelete(params.row as Trabajador)}>
                  <DeleteOutline fontSize="small" />
              </IconButton>
          </Tooltip>
        )}
      </Stack>
    )
  }
];

  const filteredRows = rows.filter((r) => {
    const q = searchText.toLowerCase();
    const matchText = r.nombres.toLowerCase().includes(q) || r.apellidos.toLowerCase().includes(q) || r.rut.includes(searchText);
    const matchArea = filterArea ? r.area === filterArea : true;
    const matchCargo = filterCargo ? r.cargo === filterCargo : true;
    return matchText && matchArea && matchCargo;
  });

  return (
    <Box sx={{ width: '100%' }}>


      {/* HEADER */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight="700">Gestión de Trabajadores</Typography>
          <Typography variant="body2" color="text.secondary">Mantenimiento de personal y fichas laborales.</Typography>
        </Box>
        {canManageWorkers && (
          <Button variant="contained" startIcon={<Add />} onClick={handleOpenCreate} sx={{ bgcolor: '#2563eb' }}>
            Nuevo Trabajador
          </Button>
        )}
      </Box>

      {/* FILTROS */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid #e2e8f0', borderRadius: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField 
          placeholder="Buscar por nombre o RUT..." size="small" 
          value={searchText} onChange={(e) => setSearchText(e.target.value)}
          InputProps={{ startAdornment: (<InputAdornment position="start"><Search /></InputAdornment>) }}
          sx={{ flex: 1, minWidth: 250 }}
        />
        <TextField 
          select 
          label="Cargo" 
          size="small" 
          value={filterCargo} 
          onChange={(e) => setFilterCargo(e.target.value)}
          sx={{ minWidth: 200 }}
          variant="outlined"
        >
          <MenuItem value="">Todos los Cargos</MenuItem>
          {listaCargos.map((c) => (
            <MenuItem key={c.id} value={c.nombre}>{c.nombre}</MenuItem>
          ))}
        </TextField>
        <TextField 
          select 
          label="Área" 
          size="small" 
          value={filterArea} 
          onChange={(e) => setFilterArea(e.target.value)}
          sx={{ minWidth: 200 }}
          variant="outlined"
        >
          <MenuItem value="">Todas las Áreas</MenuItem>
          {listaAreas.map((a) => (
            <MenuItem key={a.id} value={a.nombre}>{a.nombre}</MenuItem>
          ))}
        </TextField>
      </Paper>

      {/* TABLA */}
      <Paper elevation={0} sx={{ height: 400, border: '1px solid #e2e8f0', borderRadius: 2 }}>
        <DataGrid 
          rows={filteredRows} columns={columns} getRowId={(r) => r.rut} loading={loading} rowHeight={70} 
          sx={{ border: 'none', '& .MuiDataGrid-columnHeaders': { bgcolor: '#f8fafc', color: '#64748b' } }}
        />
      </Paper>

      {/* =====================================================================
          1. MODAL DE EDICIÓN / CREACIÓN (CON SELECTORES CONECTADOS)
         ===================================================================== */}
      <Dialog open={(openCreate || openEdit) && canManageWorkers} onClose={handleClose} fullScreen={isMobile} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee' }}>
          <Box>
            <Typography variant="h6" fontWeight="bold">
              {openEdit ? 'EDITAR TRABAJADOR' : 'NUEVO TRABAJADOR'}
            </Typography>
            <Typography variant="caption" color="text.secondary">REGISTRO DE PERSONAL SERKAN SPA</Typography>
          </Box>
          <IconButton onClick={handleClose}><Close /></IconButton>
        </Box>

        <DialogContent sx={{ p: 3 }}>
          <Stack spacing={2}>
            
            {/* ALERTAS DE AYUDA */}
            {listaAreas.length === 0 && (
                <Alert severity="warning">No hay Áreas creadas. Ve al módulo Admin para configurarlas.</Alert>
            )}

            {/* Fila 1 */}
            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" fontWeight="bold">NOMBRES*</Typography>
                <TextField fullWidth placeholder="Juan Andrés" value={formData.nombres} onChange={(e) => setFormData({...formData, nombres: e.target.value})} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" fontWeight="bold">APELLIDOS*</Typography>
                <TextField fullWidth placeholder="Pérez González" value={formData.apellidos} onChange={(e) => setFormData({...formData, apellidos: e.target.value})} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" fontWeight="bold">RUT*</Typography>
                <TextField fullWidth placeholder="12.345.678-9" value={formData.rut} disabled={openEdit} onChange={(e) => setFormData({...formData, rut: e.target.value})} />
              </Box>
            </Box>

            {/* Fila 2: AQUÍ ESTÁN LOS CAMBIOS PRINCIPALES (SELECTORES) */}
            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
              
              {/* SELECTOR DE CARGO */}
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" fontWeight="bold">CARGO</Typography>
                <TextField 
                    select 
                    fullWidth 
                    value={formData.cargo} 
                    onChange={(e) => setFormData({...formData, cargo: e.target.value})}
                    helperText={listaCargos.length === 0 ? "Sin cargos disponibles" : ""}
                >
                    {listaCargos.map((c) => (
                        <MenuItem key={c.id} value={c.nombre}>{c.nombre}</MenuItem>
                    ))}
                    {/* Opción fallback por si el cargo actual ya no existe en la lista */}
                    {openEdit && formData.cargo && !listaCargos.find(c => c.nombre === formData.cargo) && (
                        <MenuItem value={formData.cargo}>{formData.cargo} (Obsoleto)</MenuItem>
                    )}
                </TextField>
              </Box>

              {/* SELECTOR DE ÁREA */}
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" fontWeight="bold">ÁREA*</Typography>
                <TextField 
                    select 
                    fullWidth 
                    value={formData.area} 
                    onChange={(e) => setFormData({...formData, area: e.target.value})}
                    helperText={listaAreas.length === 0 ? "Sin áreas disponibles" : ""}
                >
                   {listaAreas.map((a) => (
                        <MenuItem key={a.id} value={a.nombre}>{a.nombre}</MenuItem>
                    ))}
                     {/* Opción fallback */}
                     {openEdit && formData.area && !listaAreas.find(a => a.nombre === formData.area) && (
                        <MenuItem value={formData.area}>{formData.area} (Obsoleto)</MenuItem>
                    )}
                </TextField>
              </Box>

              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" fontWeight="bold">FECHA INGRESO*</Typography>
                <TextField type="date" fullWidth value={formData.fecha_ingreso} disabled={openEdit} onChange={(e) => setFormData({...formData, fecha_ingreso: e.target.value})} />
              </Box>
            </Box>

            {/* Fila 3 */}
            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" fontWeight="bold">TELÉFONO</Typography>
                <TextField fullWidth value={formData.telefono || ''} onChange={(e) => setFormData({...formData, telefono: e.target.value})} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" fontWeight="bold">ESTADO*</Typography>
                <TextField select fullWidth value={formData.estado} onChange={(e) => setFormData({...formData, estado: e.target.value as any})}>
                  <MenuItem value="ACTIVO">Activo</MenuItem>
                  <MenuItem value="INACTIVO">Inactivo</MenuItem>
                </TextField>
              </Box>
            </Box>
             
             {/* Fila Correos */}
             <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" fontWeight="bold">CORREO EMPRESA</Typography>
                <TextField fullWidth value={formData.correo_empresarial} onChange={(e) => setFormData({...formData, correo_empresarial: e.target.value})} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" fontWeight="bold">CORREO PERSONAL</Typography>
                <TextField fullWidth value={formData.correo_personal} onChange={(e) => setFormData({...formData, correo_personal: e.target.value})} />
              </Box>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button variant="outlined" onClick={handleClose}>CANCELAR</Button>
          <Button variant="contained" onClick={handleSave} sx={{ bgcolor: '#2563eb', fontWeight: 'bold' }}>GUARDAR REGISTRO</Button>
        </DialogActions>
      </Dialog>

      {/* =====================================================================
          2. MODAL DE FICHA (Igual que antes, solo visualización)
         ===================================================================== */}
      {selectedWorker && (
        <Dialog open={openView} onClose={handleClose} fullScreen={isMobile} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 4, overflow: 'hidden' } }}>
          <Box sx={{ bgcolor: '#0f172a', p: 4, color: 'white', position: 'relative' }}>
            <IconButton onClick={handleClose} sx={{ position: 'absolute', top: 16, right: 16, color: 'rgba(255,255,255,0.5)' }}><Close /></IconButton>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Avatar 
                sx={{ width: 80, height: 80, bgcolor: '#3b82f6', fontSize: 32, fontWeight: 'bold' }}
                {...stringAvatar(`${selectedWorker.nombres} ${selectedWorker.apellidos}`)}
              />
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Typography variant="h4" fontWeight="800" sx={{ textTransform: 'uppercase' }}>
                    {selectedWorker.nombres} {selectedWorker.apellidos}
                  </Typography>
                  <Chip label={selectedWorker.estado} size="small" sx={{ bgcolor: selectedWorker.estado === 'ACTIVO' ? '#10b981' : '#ef4444', color: 'white', fontWeight: 'bold' }} />
                </Box>
                <Stack direction="row" spacing={3} sx={{ opacity: 0.8 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Person fontSize="small" /> <Typography variant="body2">RUT: {selectedWorker.rut}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarToday fontSize="small" /> <Typography variant="body2">INGRESO: {selectedWorker.fecha_ingreso}</Typography>
                  </Box>
                </Stack>
              </Box>
            </Box>
          </Box>

          <DialogContent sx={{ p: 4 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={4}>
              <Box sx={{ flex: 2 }}>
                <Typography variant="overline" fontWeight="bold" color="text.secondary" sx={{ letterSpacing: 1.2 }}>INFORMACIÓN PERSONAL Y DE CONTACTO</Typography>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, mb: 4 }}>
                    <Box><Typography variant="caption" color="text.secondary">CARGO</Typography><Typography variant="subtitle2" fontWeight="bold">{selectedWorker.cargo}</Typography></Box>
                    <Box><Typography variant="caption" color="text.secondary">ÁREA</Typography><Typography variant="subtitle2" fontWeight="bold">{selectedWorker.area}</Typography></Box>
                    <Box><Typography variant="caption" color="text.secondary">TELÉFONO</Typography><Typography variant="subtitle2" fontWeight="bold">{selectedWorker.telefono || '-'}</Typography></Box>
                    <Box><Typography variant="caption" color="text.secondary">ESTADO</Typography><Typography variant="subtitle2" fontWeight="bold">{selectedWorker.estado}</Typography></Box>
                    <Box><Typography variant="caption" color="text.secondary">CORREO PERSONAL</Typography><Typography variant="subtitle2" fontWeight="bold" sx={{ wordBreak: 'break-all' }}>{selectedWorker.correo_personal || '-'}</Typography></Box>
                    <Box><Typography variant="caption" color="text.secondary">CORREO CORPORATIVO</Typography><Typography variant="subtitle2" fontWeight="bold" sx={{ wordBreak: 'break-all' }}>{selectedWorker.correo_empresarial || '-'}</Typography></Box>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="overline" fontWeight="bold" color="text.secondary" sx={{ letterSpacing: 1.2 }}>DOCUMENTACIÓN ASOCIADA</Typography>
                  <Chip label={`${workerDocs.length} ARCHIVOS`} size="small" color="primary" variant="outlined" />
                </Box>
                
                <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                    {workerDocs.length > 0 ? (
                        workerDocs.map((doc: any) => (
                            <Box key={doc.id} sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #eee' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Avatar sx={{ bgcolor: '#f0f9ff', color: '#0ea5e9' }}><Description /></Avatar>
                                    <Box>
                                        <Typography variant="body2" fontWeight="bold">{doc.tipo.toUpperCase()}</Typography>
                                        <Typography variant="caption" color="text.secondary">Vence: {doc.fecha_vencimiento || 'Indefinido'}</Typography>
                                    </Box>
                                </Box>
                                <IconButton size="small" href={doc.archivo} target="_blank"><Download /></IconButton>
                            </Box>
                        ))
                    ) : (
                        <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                            <Typography variant="body2">No hay documentos registrados.</Typography>
                        </Box>
                    )}
                </Paper>
              </Box>

              <Box sx={{ flex: 1 }}>
                <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, height: '100%', maxHeight: {xs: 400, md: 600}, overflowY: 'auto', bgcolor: '#fafafa' }}>
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <History fontSize="small" /> HISTORIAL
                  </Typography>
                  <Stack spacing={3}>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Box sx={{ mt: 0.5, width: 10, height: 10, borderRadius: '50%', flexShrink: 0, bgcolor: '#3b82f6' }} />
                        <Box>
                           <Typography variant="caption" fontWeight="bold" sx={{ display: 'block' }}>REGISTRO ACTIVO</Typography>
                           <Typography variant="caption" color="text.secondary">Ficha creada en sistema.</Typography>
                        </Box>
                    </Box>
                    {workerHistory.map((item, idx) => (
                      <Box key={idx} sx={{ display: 'flex', gap: 2 }}>
                          <Box sx={{ mt: 0.5, width: 10, height: 10, borderRadius: '50%', flexShrink: 0, bgcolor: item.tipo === 'SISTEMA' ? '#8b5cf6' : item.tipo === 'TAREA' ? '#eab308' : item.tipo === 'HERRAMIENTA' ? '#f97316' : '#10b981' }} />
                          <Box>
                             <Typography variant="caption" fontWeight="bold" sx={{ display: 'block' }}>{item.titulo} ({item.tipo})</Typography>
                             <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>{new Date(item.fecha).toLocaleString()}</Typography>
                             <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{item.descripcion}</Typography>
                             <Typography variant="caption" sx={{ color: '#64748b', fontStyle: 'italic', display: 'block' }}>Por: {item.usuario}</Typography>
                          </Box>
                      </Box>
                    ))}
                  </Stack>
                </Paper>
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 3, bgcolor: '#f8fafc', borderTop: '1px solid #eee' }}>
             <Button onClick={handleClose} variant="contained" sx={{ bgcolor: '#0f172a', borderRadius: 2, px: 4 }}>CERRAR FICHA</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default Trabajadores;





