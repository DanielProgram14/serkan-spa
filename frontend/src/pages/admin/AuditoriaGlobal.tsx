import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { Refresh, Search, Visibility, ManageHistory, Close, FilterAltOutlined, Clear } from '@mui/icons-material';
import api from '../../api/axios';

// --- Interfaces ---
interface AuditLog {
  id: number;
  timestamp: string;
  user_label: string | null;
  user_username: string | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  module: string | null;
  model: string;
  object_id: string | null;
  summary: string | null;
  changes: {
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
    diff?: Record<string, { before: unknown; after: unknown }>;
  };
  ip_address?: string | null;
  path?: string | null;
}

const getActionChipParams = (action: string) => {
  switch (action) {
    case 'CREATE': return { label: 'Creación', color: '#065f46', bgcolor: '#d1fae5' };
    case 'UPDATE': return { label: 'Modificación', color: '#92400e', bgcolor: '#fef3c7' };
    case 'DELETE': return { label: 'Eliminación', color: '#991b1b', bgcolor: '#fee2e2' };
    default: return { label: 'Desconocida', color: '#374151', bgcolor: '#f3f4f6' };
  }
};

const emptyFilters = {
  q: '',
  action: '',
  module: '',
  model: '',
  user: '',
  from: '',
  to: '',
};

// --- DICCIONARIOS DE TRADUCCIÓN ---
const MODULE_LABELS: Record<string, string> = {
  'login': 'Autenticación',
  'movimientos-financieros': 'Mov. Financieros',
  'documentos-cliente': 'Doc. Clientes',
  'documentos': 'Documentos Generales',
  'clientes': 'Directorio Clientes',
  'trabajadores': 'Recursos Humanos',
  'productos': 'Catálogo de Productos',
  'categorias-producto': 'Categorías Prod.',
  'herramientas': 'Inventario Herramientas',
  'herramientas-asignaciones': 'Asignación Herr.',
  'ordenes-compra': 'Órdenes de Compra',
  'movimientos-inventario': 'Bodega / Inventario',
  'tareas': 'Gestión de Tareas',
  'categorias-tarea': 'Categorías Tareas',
  'eventos': 'Calendario Eventos',
  'users': 'Cuentas Sistema',
  'areas': 'Áreas Empresa',
  'cargos': 'Cargos Empresa',
  'tipos-documento': 'Tipos de Documento',
  'proveedores': 'Proveedores',
};

const MODEL_LABELS: Record<string, string> = {
  'User': 'Usuario Sistema',
  'MovimientoFinancieroCliente': 'Movimiento Financiero',
  'DocumentoCliente': 'Doc. de Cliente',
  'Cliente': 'Cliente',
  'Trabajador': 'Trabajador',
  'Producto': 'Producto',
  'CategoriaProducto': 'Categ. Producto',
  'Herramienta': 'Herramienta',
  'HerramientaAsignacion': 'Asignación',
  'OrdenCompra': 'Orden Compra',
  'MovimientoInventario': 'Mov. Inventario',
  'Tarea': 'Tarea',
  'CategoriaTarea': 'Categ. Tarea',
  'Evento': 'Evento / Cita',
  'Area': 'Área',
  'Cargo': 'Cargo',
  'TipoDocumento': 'Tipo Doc.',
  'Proveedor': 'Proveedor',
};

const translateFieldNames = (fieldsStr: string) => {
  const dictionary: Record<string, string> = {
    'last_login': 'último acceso',
    'created_at': 'fecha de registro',
    'updated_at': 'fecha actualización',
    'creado_por': 'creador',
    'descripcion': 'descripción',
    'razon_social': 'razón social',
    'fecha_carga': 'fecha de carga',
    'extension': 'extensión archivo',
  };
  return fieldsStr.split(', ').map(f => dictionary[f] || f.replace(/_/g, ' ')).join(', ');
};

const generateFriendlySummary = (row: any) => {
  const modelName = MODEL_LABELS[row.model] || row.model || 'Registro';
  const id = row.object_id ? ` (ID: ${row.object_id})` : '';
  
  let base = '';
  switch (row.action) {
    case 'CREATE': base = `Nuevo(a) ${modelName} registrado(a)${id}`; break;
    case 'UPDATE': base = `${modelName} modificado(a)${id}`; break;
    case 'DELETE': base = `${modelName} eliminado(a)${id}`; break;
    default: base = `Operación sobre ${modelName}${id}`; break;
  }

  // Extraer los campos modificados desde el resumen original del backend (si vienen entre paréntesis)
  const fieldsMatch = row.summary?.match(/\((.*?)\)/);
  if (fieldsMatch && fieldsMatch[1]) {
    const friendlyFields = translateFieldNames(fieldsMatch[1]);
    base += ` — Atributos: ${friendlyFields}`;
  }

  return base;
};

const formatValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value, null, 2);
};

const AuditoriaGlobal = () => {
  const [filters, setFilters] = useState({ ...emptyFilters });
  const [appliedFilters, setAppliedFilters] = useState({ ...emptyFilters });
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<AuditLog | null>(null);

  const fetchLogs = async (params: typeof emptyFilters) => {
    setLoading(true);
    setError('');
    try {
      const query: Record<string, string> = {};
      Object.entries(params).forEach(([key, value]) => {
        if (value) query[key] = value;
      });
      const res = await api.get('/audit-logs/', { params: query });
      
      const data = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      setLogs(data.filter((item: any) => item && item.id));
    } catch (e) {
      setError('No se pudo cargar la auditoría. Verifica la conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(appliedFilters);
  }, [appliedFilters]);

  const handleApply = () => setAppliedFilters({ ...filters });
  const handleReset = () => {
    setFilters({ ...emptyFilters });
    setAppliedFilters({ ...emptyFilters });
  };

  const detailRows = useMemo(() => {
    if (!selected?.changes?.diff) return [];
    return Object.entries(selected.changes.diff).map(([field, value]) => ({
      field,
      before: value?.before,
      after: value?.after,
    }));
  }, [selected]);

  const columns: GridColDef[] = [
    {
      field: 'timestamp',
      headerName: 'FECHA Y HORA',
      width: 170,
      valueGetter: (value: any, row: any) => (row?.timestamp ? new Date(row.timestamp).toLocaleString() : '-'),
    },
    {
      field: 'user',
      headerName: 'USUARIO',
      width: 180,
      valueGetter: (value: any, row: any) => row?.user_label || row?.user_username || 'Sistema',
      renderCell: (params: any) => (
        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
          {params.value}
        </Typography>
      )
    },
    {
      field: 'module',
      headerName: 'MÓDULO',
      width: 160,
      valueGetter: (value: any, row: any) => MODULE_LABELS[row?.module] || row?.module || '-',
    },
    {
      field: 'action',
      headerName: 'ACCIÓN',
      width: 140,
      renderCell: (params: any) => {
        const action = params.row?.action;
        const { label, color, bgcolor } = getActionChipParams(action);
        return (
          <Chip 
            size="small" 
            label={label} 
            sx={{ 
              color, 
              bgcolor, 
              fontWeight: 700, 
              borderRadius: 1,
              px: 0.5
            }} 
          />
        );
      },
    },
    { 
      field: 'model', 
      headerName: 'MODELO', 
      width: 170,
      valueGetter: (value: any, row: any) => MODEL_LABELS[row?.model] || row?.model || '-' 
    },
    { 
      field: 'object_id', 
      headerName: 'ID OBJETO', 
      width: 110, 
      valueGetter: (value: any, row: any) => row?.object_id || '-' 
    },
    {
      field: 'summary',
      headerName: 'RESUMEN / DETALLE',
      flex: 1,
      minWidth: 280,
      valueGetter: (value: any, row: any) => generateFriendlySummary(row),
      renderCell: (params: any) => (
        <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
          {params.value}
        </Typography>
      )
    },
    {
      field: 'actions',
      headerName: 'VER',
      width: 80,
      sortable: false,
      renderCell: (params: any) => (
        <IconButton 
          size="small" 
          color="primary" 
          onClick={() => setSelected(params.row as AuditLog)}
          sx={{ bgcolor: 'primary.50', '&:hover': { bgcolor: 'primary.100' } }}
        >
          <Visibility fontSize="small" />
        </IconButton>
      ),
    },
  ];

  return (
    <Box sx={{ maxWidth: '100%', mx: 'auto' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}
          >
            <ManageHistory fontSize="medium" />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800} color="text.primary">
              Auditoría Global
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Trazabilidad detallada de todas las operaciones realizadas en el sistema
            </Typography>
          </Box>
        </Stack>
        <Button 
          variant="contained" 
          startIcon={<Refresh />} 
          onClick={() => fetchLogs(appliedFilters)}
          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, px: 3 }}
          disableElevation
        >
          Actualizar Registro
        </Button>
      </Stack>

      <Paper 
        elevation={0} 
        sx={{ 
          p: 3, 
          mb: 3, 
          border: '1px solid', 
          borderColor: 'divider', 
          borderRadius: 3,
          background: 'linear-gradient(to right bottom, #ffffff, #f8fafc)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1} mb={3}>
          <FilterAltOutlined sx={{ color: 'primary.main' }} />
          <Typography variant="subtitle2" fontWeight={800} color="text.primary" sx={{ letterSpacing: '0.05em' }}>
            FILTROS DE BÚSQUEDA
          </Typography>
        </Stack>
        
        <Stack spacing={3}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '2fr 1fr 1.5fr' }, gap: 2 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Buscar por usuario, ID, objeto o detalle..."
              value={filters.q}
              onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))}
              InputProps={{ 
                startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
                sx: { borderRadius: 2, bgcolor: '#fff' }
              }}
            />
            <TextField
              select
              size="small"
              label="Tipo de Acción"
              value={filters.action}
              onChange={(e) => setFilters((p) => ({ ...p, action: e.target.value }))}
              InputProps={{ sx: { borderRadius: 2, bgcolor: '#fff' } }}
            >
              <MenuItem value="">Todas las acciones</MenuItem>
              <MenuItem value="CREATE">Creación</MenuItem>
              <MenuItem value="UPDATE">Modificación</MenuItem>
              <MenuItem value="DELETE">Eliminación</MenuItem>
            </TextField>
            <TextField
              select
              size="small"
              label="Módulo Afectado"
              value={filters.module}
              onChange={(e) => setFilters((p) => ({ ...p, module: e.target.value }))}
              InputProps={{ sx: { borderRadius: 2, bgcolor: '#fff' } }}
              sx={{ gridColumn: { xs: '1 / -1', md: 'auto' } }}
            >
              <MenuItem value="">Todos los módulos</MenuItem>
              {Object.entries(MODULE_LABELS).map(([key, label]) => (
                <MenuItem key={key} value={key}>{label}</MenuItem>
              ))}
            </TextField>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
            <TextField
              size="small"
              label="Fecha Desde"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={filters.from}
              onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))}
              sx={{ minWidth: 160, flex: { xs: 1, sm: 'none' } }}
              InputProps={{ sx: { borderRadius: 2, bgcolor: '#fff' } }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>-</Typography>
            <TextField
              size="small"
              label="Fecha Hasta"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={filters.to}
              onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))}
              sx={{ minWidth: 160, flex: { xs: 1, sm: 'none' } }}
              InputProps={{ sx: { borderRadius: 2, bgcolor: '#fff' } }}
            />
            
            <Box sx={{ flexGrow: 1, minWidth: '10px' }} />
            
            <Stack direction="row" spacing={1.5} sx={{ width: { xs: '100%', sm: 'auto' } }}>
              <Button 
                variant="outlined" 
                color="inherit"
                onClick={handleReset} 
                startIcon={<Clear fontSize="small" />}
                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, flex: 1, borderColor: '#e2e8f0' }}
              >
                Limpiar
              </Button>
              <Button 
                variant="contained" 
                color="primary"
                onClick={handleApply} 
                startIcon={<Search fontSize="small" />}
                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, px: 4, boxShadow: 'none', flex: 1 }}
              >
                Buscar
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2, border: '1px solid #fca5a5' }} action={
          <Button color="inherit" size="small" onClick={() => fetchLogs(appliedFilters)}>Reintentar carga</Button>
        }>
          {error}
        </Alert>
      )}

      <Paper 
        elevation={0}
        sx={{ 
          height: 600, 
          border: '1px solid', 
          borderColor: 'divider', 
          borderRadius: 3,
          overflow: 'hidden',
          backgroundColor: '#fff',
          '& .MuiDataGrid-root': {
            border: 'none',
          },
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            color: '#475569',
            textTransform: 'uppercase',
            fontSize: '0.75rem',
            letterSpacing: '0.05em',
            fontWeight: 800,
          },
          '& .MuiDataGrid-cell': {
            borderBottom: '1px solid #f1f5f9',
          },
          '& .MuiDataGrid-row:hover': {
            backgroundColor: '#f8fafc',
          }
        }}
      >
        <DataGrid 
          rows={logs} 
          columns={columns} 
          loading={loading} 
          getRowId={(row: any) => row?.id || Math.random()} 
          disableRowSelectionOnClick
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } },
          }}
          pageSizeOptions={[10, 25, 50, 100]}
          rowHeight={60}
        />
      </Paper>

      <Dialog 
        open={Boolean(selected)} 
        onClose={() => setSelected(null)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, p: 1 }
        }}
      >
        {selected && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h6" fontWeight={800}>Detalle de Registro</Typography>
                <Typography variant="body2" color="text.secondary">
                  Ocurrido el {selected?.timestamp ? new Date(selected.timestamp).toLocaleString() : 'Sin fecha'}
                </Typography>
              </Box>
              <IconButton onClick={() => setSelected(null)} size="small" sx={{ bgcolor: 'grey.100' }}>
                <Close fontSize="small" />
              </IconButton>
            </DialogTitle>
            
            <DialogContent sx={{ pb: 3 }}>
              <Paper 
                elevation={0} 
                sx={{ 
                  p: 2.5, 
                  mb: 3, 
                  bgcolor: '#f8fafc', 
                  borderRadius: 2, 
                  border: '1px solid #e2e8f0' 
                }}
              >
                <Typography variant="overline" color="text.secondary" fontWeight={700}>Contexto de la operación</Typography>
                <Stack direction="row" flexWrap="wrap" gap={1.5} sx={{ mt: 1 }}>
                  <Chip size="small" label={`Usuario: ${selected.user_label || selected.user_username || 'Sistema'}`} sx={{ bgcolor: 'white', border: '1px solid #cbd5e1' }} />
                  <Chip size="small" label={`Módulo: ${MODULE_LABELS[selected.module || ''] || selected.module || '-'}`} sx={{ bgcolor: 'white', border: '1px solid #cbd5e1' }} />
                  <Chip size="small" label={`Modelo: ${MODEL_LABELS[selected.model] || selected.model}`} sx={{ bgcolor: 'white', border: '1px solid #cbd5e1' }} />
                  <Chip size="small" label={`ID Objeto: ${selected.object_id || '-'}`} sx={{ bgcolor: 'white', border: '1px solid #cbd5e1' }} />
                  <Chip
                    size="small"
                    label={getActionChipParams(selected.action).label}
                    sx={{
                      color: getActionChipParams(selected.action).color,
                      bgcolor: getActionChipParams(selected.action).bgcolor,
                      fontWeight: 700,
                    }}
                  />
                </Stack>
                {selected.summary && (
                  <Typography variant="body2" sx={{ mt: 2, display: 'flex', gap: 1 }}>
                    <Box component="span" fontWeight={600}>Resumen Detallado:</Box>
                    {generateFriendlySummary(selected)}
                  </Typography>
                )}
              </Paper>

              <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>Modificaciones Detalladas</Typography>
              {detailRows.length === 0 ? (
                <Alert severity="info" sx={{ borderRadius: 2 }}>Este registro no contiene cambios específicos o campos modificados capturados.</Alert>
              ) : (
                <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800, width: '25%', color: '#475569' }}>CAMPO</TableCell>
                        <TableCell sx={{ fontWeight: 800, width: '37.5%', color: '#475569' }}>VALOR ANTERIOR</TableCell>
                        <TableCell sx={{ fontWeight: 800, width: '37.5%', color: '#475569' }}>VALOR NUEVO</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {detailRows.map((row) => (
                        <TableRow key={row.field} hover>
                          <TableCell sx={{ fontWeight: 700, color: 'text.primary', borderRight: '1px solid #f1f5f9' }}>
                            {row.field}
                          </TableCell>
                          <TableCell sx={{ 
                            whiteSpace: 'pre-wrap', 
                            color: '#991b1b', 
                            bgcolor: '#fef2f2', 
                            borderRight: '1px solid #fff',
                            wordBreak: 'break-word'
                          }}>
                            {formatValue(row.before)}
                          </TableCell>
                          <TableCell sx={{ 
                            whiteSpace: 'pre-wrap', 
                            color: '#065f46', 
                            bgcolor: '#ecfdf5',
                            wordBreak: 'break-word'
                          }}>
                            {formatValue(row.after)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Paper>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3 }}>
              <Button variant="outlined" onClick={() => setSelected(null)} sx={{ borderRadius: 2, fontWeight: 600 }}>Cerrar Detalles</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default AuditoriaGlobal;