import { useEffect, useState } from 'react';
import { 
  Box, Typography, Button, Paper, TextField, MenuItem, Stack, 
  Dialog, DialogContent, DialogActions, Chip, InputAdornment, IconButton, Tooltip, Avatar, Divider, Alert,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { 
  Add, Search, EditOutlined, DeleteOutline, VisibilityOutlined, 
  Close, Assignment, AccountTree, Business, 
  KeyboardArrowDown, KeyboardArrowRight, SubdirectoryArrowRight,
  WarningAmber, ErrorOutline, CheckCircleOutline, History
} from '@mui/icons-material';
import CheckCircle from '@mui/icons-material/CheckCircle';
import api from '../api/axios';
import { useAuth } from '../hooks/useAuth';

// --- INTERFACES ---
interface Tarea {
  children: Tarea[];
  id: number;
  nombre: string;
  informacion: string;
  fecha_limite: string;
  fecha_creacion: string;
  prioridad: string;
  estado: string;
  categoria: number | null;
  categoria_nombre: string;
  cliente: string | null;
  cliente_nombre: string;
  responsable: string;
  nombre_responsable: string;
  tarea_padre: number | null;
  creado_por: string; 
  level?: number; 
}

const Tareas = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();
  const canCreateTask = user?.rol === 'ADMINISTRADOR' || user?.rol === 'RRHH' || user?.rol === 'SUPERVISOR';
  const canEditTask = canCreateTask;
  const canDeleteTask = user?.rol === 'ADMINISTRADOR' || user?.rol === 'RRHH';
  const canCompleteTask = user?.rol === 'ADMINISTRADOR' || user?.rol === 'RRHH' || user?.rol === 'SUPERVISOR' || user?.rol === 'TRABAJADOR';

  const [tareasTable, setTareasTable] = useState<Tarea[]>([]); 
  const [tareasRaw, setTareasRaw] = useState<Tarea[]>([]); 
  const [expandedIds, setExpandedIds] = useState<number[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [trabajadores, setTrabajadores] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // --- ESTADOS DE FILTROS ---
  const [searchText, setSearchText] = useState('');
  const [filterEstado, setFilterEstado] = useState('Todos');
  const [filterPrioridad, setFilterPrioridad] = useState('Todos'); 
  const [filterResponsable, setFilterResponsable] = useState('Todos');

  const [open, setOpen] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedTarea, setSelectedTarea] = useState<Tarea | null>(null);

  const [form, setForm] = useState({
    id: 0, nombre: '', informacion: '', fecha_limite: '', 
    prioridad: 'MEDIA', estado: 'PENDIENTE', 
    responsable: '', categoria: '', cliente: '', tarea_padre: '' as string | number
  });

  // --- 1. LÓGICA DE ÁRBOL Y FILTRADO ---
  const orderByCompletion = (items: Tarea[]) => (
    [...items].sort((a, b) => {
      const aCompleted = a.estado === 'COMPLETADA';
      const bCompleted = b.estado === 'COMPLETADA';
      if (aCompleted === bCompleted) return 0;
      return aCompleted ? 1 : -1;
    })
  );

  const buildAndFlattenTree = (data: Tarea[], expanded: number[]) => {
    const map = new Map();
    const roots: any[] = [];
    data.forEach(t => map.set(t.id, { ...t, children: [] }));
    data.forEach(t => {
      if (t.tarea_padre && map.has(t.tarea_padre)) {
        map.get(t.tarea_padre).children.push(map.get(t.id));
      } else {
        roots.push(map.get(t.id)); 
      }
    });
    const sortNodes = (nodes: any[]) => {
      const ordered = orderByCompletion(nodes);
      ordered.forEach(node => {
        if (node.children?.length) {
          node.children = sortNodes(node.children);
        }
      });
      return ordered;
    };
    const flatList: Tarea[] = [];
    const flatten = (nodes: any[], currentLevel: number) => {
      nodes.forEach(node => {
        flatList.push({ ...node, level: currentLevel });
        if (node.children.length > 0 && expanded.includes(node.id)) {
          flatten(node.children, currentLevel + 1);
        }
      });
    };
    const orderedRoots = sortNodes(roots);
    flatten(orderedRoots, 0);
    return flatList;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const resTareas = await api.get('/tareas/');
      setTareasRaw(resTareas.data);
      setTareasTable(buildAndFlattenTree(resTareas.data, expandedIds)); 

      if (canCreateTask) {
        const [resTrab, resCat, resCli] = await Promise.allSettled([
          api.get('/trabajadores/'),
          api.get('/categorias-tarea/'),
          api.get('/clientes/'),
        ]);

        setTrabajadores(resTrab.status === 'fulfilled' ? resTrab.value.data : []);
        setCategorias(resCat.status === 'fulfilled' ? resCat.value.data : []);
        setClientes(resCli.status === 'fulfilled' ? resCli.value.data : []);
      } else {
        setTrabajadores([]);
        setCategorias([]);
        setClientes([]);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [canCreateTask]);

  useEffect(() => {
    if (searchText === '' && filterEstado === 'Todos' && filterPrioridad === 'Todos' && filterResponsable === 'Todos') {
        setTareasTable(buildAndFlattenTree(tareasRaw, expandedIds));
    } else {
        const filtered = tareasRaw.filter(t => {
            const matchText = t.nombre.toLowerCase().includes(searchText.toLowerCase()) || 
                              t.nombre_responsable.toLowerCase().includes(searchText.toLowerCase());
            const matchEstado = filterEstado === 'Todos' || t.estado === filterEstado;
            const matchPrioridad = filterPrioridad === 'Todos' || t.prioridad === filterPrioridad;
            const matchResponsable = filterResponsable === 'Todos' || t.responsable === filterResponsable;
            return matchText && matchEstado && matchPrioridad && matchResponsable;
        });
        const ordered = orderByCompletion(filtered);
        setTareasTable(ordered.map(t => ({ ...t, level: 0 }))); 
    }
  }, [expandedIds, searchText, filterEstado, filterPrioridad, filterResponsable, tareasRaw]);

  const toggleExpand = (id: number) => {
      setExpandedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // --- CÁLCULOS KPI ---
  const hoy = new Date();
  hoy.setHours(0,0,0,0);

  const vencidas = tareasRaw.filter(t => {
      if (t.estado === 'COMPLETADA' || t.estado === 'CANCELADA') return false;
      return new Date(`${t.fecha_limite}T00:00:00`) < hoy;
  }).length;

  const porVencer = tareasRaw.filter(t => {
      if (t.estado === 'COMPLETADA' || t.estado === 'CANCELADA') return false;
      const f = new Date(`${t.fecha_limite}T00:00:00`);
      const diffDias = Math.ceil((f.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
      return diffDias >= 0 && diffDias <= 3;
  }).length;

  // --- HANDLERS ---
  const handleOpenCreate = (parentId: number | null = null) => {
    if (!canCreateTask) return;
    if (parentId) {
      const parentTask = tareasRaw.find(t => t.id === parentId);
      if (parentTask && parentTask.estado === 'COMPLETADA') {
        setErrorMessage("La tarea principal ya está completada. No puedes crear subtareas.");
        return;
      }
    }

    setForm({ 
        id: 0, nombre: '', informacion: '', fecha_limite: new Date().toISOString().split('T')[0], 
        prioridad: 'MEDIA', estado: 'PENDIENTE',
        responsable: '', categoria: '', cliente: '', tarea_padre: parentId || '' 
    });
    setIsEdit(false); setOpen(true);
    if (parentId && !expandedIds.includes(parentId)) setExpandedIds([...expandedIds, parentId]);
  };

  const handleOpenEdit = (t: Tarea) => {
    if (!canEditTask) return;

    setForm({
      id: t.id, nombre: t.nombre, informacion: t.informacion || '',
      fecha_limite: t.fecha_limite, prioridad: t.prioridad, estado: t.estado,
      responsable: t.responsable, categoria: t.categoria ? t.categoria.toString() : '',
      cliente: t.cliente || '', tarea_padre: t.tarea_padre ? t.tarea_padre.toString() : ''
    });
    setIsEdit(true); setOpen(true);
  };

  const handleSave = async () => {
    if (!canCreateTask) return;

    if (!form.nombre || !form.responsable || !form.fecha_limite) {
      alert("Faltan campos obligatorios."); return;
    }
    let finalCategoria = form.categoria ? parseInt(form.categoria) : null;
    let finalCliente = form.cliente || null;
    if (!isEdit && form.tarea_padre) {
        const parentTask = tareasRaw.find(t => t.id === parseInt(form.tarea_padre as string));
        if (parentTask) {
            finalCategoria = parentTask.categoria;
            finalCliente = parentTask.cliente;
        }
    }
    const payload = {
        ...form,
        estado: isEdit ? form.estado : 'PENDIENTE',
        categoria: finalCategoria,
        cliente: finalCliente,
        tarea_padre: form.tarea_padre ? parseInt(form.tarea_padre as string) : null
    };
    try {
      if (isEdit) await api.put(`/tareas/${form.id}/`, payload);
      else await api.post('/tareas/', payload);
      fetchData(); setOpen(false);
      setErrorMessage(null);
    } catch (err: any) { 
      const errorMsg = err.response?.data?.estado?.[0] || err.response?.data?.detail || "Error al guardar.";
      setErrorMessage(errorMsg);
    }
  };

const handleDelete = async (id: number) => {
    if (!canDeleteTask) return;
    if(!confirm("¿Eliminar tarea y subtareas?")) return;
    try { await api.delete(`/tareas/${id}/`); fetchData(); } catch (err) { alert("Error."); }
  };

const handleQuickComplete = async (task: Tarea) => {
    if (!canCompleteTask) return;
    if(!confirm(`¿Marcar "${task.nombre}" como COMPLETADA?`)) return;
    try { 
      await api.patch(`/tareas/${task.id}/`, { estado: 'COMPLETADA' }); 
      fetchData();
      setErrorMessage(null);
    } catch (err: any) { 
      const errorMsg = err.response?.data?.estado?.[0] || err.response?.data?.detail || "Error al actualizar.";
      setErrorMessage(errorMsg);
    }
  };

  const getParentName = () => {
      if (!form.tarea_padre) return null;
      const parent = tareasRaw.find(t => t.id === parseInt(form.tarea_padre as string));
      return parent ? parent.nombre : null;
  };


  //estilos comunes para la tabla
  const commonTableStyle = {
  border: 'none',
  '& .MuiDataGrid-columnHeaders': { bgcolor: 'transparent', color: '#64748b',
    fontWeight: '800', textTransform: 'uppercase', fontSize: '0.75rem',border: 'none', },

  '& .MuiDataGrid-virtualScroller': {padding: '3px 0',}, // Espacio para que las sombras de las filas no se corten

  '& .MuiDataGrid-row': {
    bgcolor: 'white', borderRadius: '12px', // Bordes redondeados por fila
    border: '1px solid #e2e8f0', marginBottom: '5px',  transition: 'all 0.2s', // SEPARACIÓN ENTRE FILAS (Efecto Tarjeta)
   
    '&:hover': { bgcolor: '#f8fafc',transform: 'translateY(-2px)', // Pequeño levante al pasar el mouse
      boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.05)', borderColor: '#3b82f6',},
  },
  // Diferenciación visual entre tareas principales y subtareas
  '& .main-row': {
    // tarea principal: aspecto por defecto (ligeramente destacado)
  },
  '& .subtask-row': {
    bgcolor: '#fcfdfe',
    borderLeft: '4px solid #cbd5e1',
    '& .MuiDataGrid-cell': { color: '#475569' },
    '& .MuiAvatar-root': { bgcolor: 'transparent', color: '#94a3b8' },
    '& .MuiTypography-root': { fontSize: '0.95rem' }
  },
  // Estilo distintivo para filas COMPLETADAS: atenuar visualmente
  '& .completed-row': {
    opacity: 0.65,
    '&:hover': { transform: 'none' }
  },
  '& .MuiDataGrid-cell': {border: 'none', display: 'flex', alignItems: 'center',},
  '& .MuiDataGrid-footerContainer': { border: 'none', mt: 1,},


    };

  // --- COLUMNAS ---
  const completedTextSx = (completed: boolean) => (
    completed ? { textDecoration: 'line-through', color: '#94a3b8' } : undefined
  );

  const columns: GridColDef[] = [
    { 
      field: 'nombre', headerName: 'TAREA / ACTIVIDAD', width: 300,
      renderCell: (params) => {
      const lvl = params.row.level || 0;
      const hasChildren = tareasRaw.some(t => t.tarea_padre === params.row.id);
      const isExpanded = expandedIds.includes(params.row.id);
      const isCompleted = params.row.estado === 'COMPLETADA';
      const indent = lvl > 0 ? lvl * 4 : 0;
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', ml: indent }}>
          <Box sx={{ width: 30, display: 'flex', justifyContent: 'center' }}>
            {hasChildren ? (
              <IconButton size="small" onClick={() => toggleExpand(params.row.id)}>
                {isExpanded ? <KeyboardArrowDown color="primary" /> : <KeyboardArrowRight />}
              </IconButton>
            ) : ( lvl > 0 && <SubdirectoryArrowRight sx={{ color: '#cbd5e1', fontSize: 18 }} /> )}
          </Box>
          <Avatar sx={{ bgcolor: lvl === 0 ? '#eff6ff' : 'transparent', color: lvl === 0 ? '#2563eb' : '#94a3b8', width: 32, height: 32, mr: 1.5 }}>
            <Assignment sx={{ fontSize: lvl === 0 ? 16 : 14 }} />
          </Avatar>
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography
              variant="body2"
              fontWeight={lvl === 0 ? 'bold' : '500'}
              sx={completedTextSx(isCompleted)}
            >
              {params.row.nombre.length > 35 ? params.row.nombre.substring(0, 35) + '...' : params.row.nombre}
            </Typography>
            {isCompleted && <CheckCircle sx={{ color: '#22c55e', fontSize: 16, ml: 0.5 }} />}
            </Box>
            <Typography variant="caption" color="text.secondary">{ lvl === 0 ? 'Tarea Principal' : `Subtarea nivel ${lvl}` }</Typography>
            <Typography variant="caption" color="text.secondary">{params.row.categoria_nombre || 'Sin Categoría'}</Typography>
          </Box>
        </Box>
      );
      }
    },
    
    { 
      field: 'cliente_nombre', headerName: 'CLIENTE ASOCIADO', width: 200,
      renderCell: (params) => {
        const clienteRut = params.row.cliente;
        const clienteObj = clientes.find((c) => c.rut === clienteRut);
        if (clienteObj) {
          return (
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Business sx={{ fontSize: 16, color: '#64748b' }} />
                <Typography variant="body2" fontWeight="600">{clienteObj.nombre}</Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">{clienteObj.razon_social}</Typography>
            </Box>
          );
        }

        return params.row.cliente_nombre ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Business sx={{ fontSize: 16, color: '#64748b' }} />
            <Typography variant="caption" fontWeight="600">{params.row.cliente_nombre}</Typography>
          </Box>
        ) : (
          <Chip label="INTERNO" size="small" sx={{ fontSize: 12, fontWeight: 'bold', height: 20 }} />
        );
      }
    },
    { field: 'responsable', headerName: 'RESPONSABLE', width: 180, renderCell: (params) => {
        const isCompleted = params.row.estado === 'COMPLETADA';
        return (
          <Typography variant="caption" fontWeight="bold" sx={completedTextSx(isCompleted)}>
            {params.row.nombre_responsable}
          </Typography>
        );
      }
    },
    { field: 'estado', headerName: 'ESTADO', width: 110, renderCell: (params) => <Chip label={params.value} size="small" color={params.value === 'COMPLETADA' ? 'success' : params.value === 'EN_PROGRESO' ? 'info' : 'default'} sx={{ fontWeight: 'bold', fontSize: '0.6rem' }} /> },
    { field: 'prioridad', headerName: 'PRIOR.', width: 80, renderCell: (params) => {
        const isCompleted = params.row.estado === 'COMPLETADA';
        const color = isCompleted
          ? '#94a3b8'
          : (params.value === 'ALTA' ? '#ef4444' : params.value === 'MEDIA' ? '#eab308' : '#3b82f6');
        return <Typography variant="caption" fontWeight="bold" sx={{ color }}>{params.value}</Typography>;
      }
    },
    { 
        field: 'auditoria', headerName: 'AUDITORÍA', width: 120,
        renderCell: (params) => (
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography variant="caption" fontWeight="bold">{params.row.creado_por || 'Sistema'}</Typography>
                <Typography variant="caption" color="text.secondary">{new Date(params.row.fecha_creacion).toLocaleDateString()}</Typography>
            </Box>
        )
    },
    { 
        field: 'fecha_limite', headerName: 'VENCIMIENTO', width: 110,
        renderCell: (params) => {
            const isCompleted = params.row.estado === 'COMPLETADA';
            const isVencido = new Date(`${params.value}T00:00:00`) < hoy && !isCompleted;
            const color = isCompleted ? '#94a3b8' : (isVencido ? '#dc2626' : 'text.secondary');
            return (
              <Typography
                variant="caption"
                fontWeight={isVencido ? 'bold' : '500'}
                color={color}
                sx={completedTextSx(isCompleted)}
              >
                {new Date(params.value + 'T00:00:00').toLocaleDateString()}
              </Typography>
            );
        }
    },
    {
      field: 'acciones', headerName: 'ACCIONES', width: 330,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {canCompleteTask && params.row.estado !== 'COMPLETADA' && params.row.estado !== 'CANCELADA' ? (
              <Button 
                variant="contained" color="success" size="small" 
                onClick={() => handleQuickComplete(params.row as Tarea)}
                sx={{ px: 1.5, py: 0.5, mr: 0.5, textTransform: 'none', borderRadius: '8px', fontWeight: 'bold', boxShadow: 'none', alignItems: 'center', gap: 0.5 }}
              >
                  <CheckCircleOutline fontSize="small" sx={{ mr: 0.5 }} /> Completar
              </Button>
          ) : ( <Box sx={{ width: 115, mr: 1 }} /> )}
          {canCreateTask && (
            <Button variant="outlined" size="small" onClick={() => handleOpenCreate(params.row.id)} startIcon={<AccountTree />} sx={{ textTransform: 'none', px: 1, mr: 1, borderRadius: 2 }}>
              Subtarea
            </Button>
          )}
          <Tooltip title="Ver"><IconButton size="small" onClick={() => { setSelectedTarea(params.row as Tarea); setOpenView(true); }}><VisibilityOutlined fontSize="small" /></IconButton></Tooltip>
          {canEditTask && (
            <Tooltip title="Editar"><IconButton size="small" onClick={() => handleOpenEdit(params.row as Tarea)}><EditOutlined fontSize="small" /></IconButton></Tooltip>
          )}
          {canDeleteTask && (
            <Tooltip title="Borrar"><IconButton size="small" color="error" onClick={() => handleDelete(params.row.id)}><DeleteOutline fontSize="small" /></IconButton></Tooltip>
          )}
        </Box>
      )
    }
  ];

  return (
    <Box sx={{ width: '100%' }}>
      {/* HEADER */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="700">Gestión de Tareas</Typography>
          <Typography variant="body2" color="text.secondary">Organización jerárquica de actividades de Serkan SPA.</Typography>
        </Box>
        {canCreateTask && (
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenCreate(null)} sx={{ bgcolor: '#2563eb' }}>
            Nueva Tarea
          </Button>
        )}
      </Box>

      {/* TARJETAS KPI (JSX CORREGIDO) */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 4 }}>
        <Paper sx={{ p: 2, flex: 1, bgcolor: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: '#ef4444', width: 45, height: 45 }}><ErrorOutline /></Avatar>
          <Box>
            <Typography variant="overline" fontWeight="bold" color="#b91c1c">TAREAS VENCIDAS</Typography>
            <Typography variant="body2" color="#7f1d1d">Hay <b>{vencidas} tareas</b> pendientes fuera de plazo.</Typography>
          </Box>
        </Paper>
        <Paper sx={{ p: 2, flex: 1, bgcolor: '#fefce8', border: '1px solid #fde047', display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: '#eab308', width: 45, height: 45 }}><WarningAmber /></Avatar>
          <Box>
            <Typography variant="overline" fontWeight="bold" color="#a16207">PRÓXIMAS A VENCER</Typography>
            <Typography variant="body2" color="#713f12">Hay <b>{porVencer} tareas</b> que vencen en 3 días.</Typography>
          </Box>
        </Paper>
      </Stack>

      {/* MENSAJE DE ERROR */}
      {errorMessage && (
        <Alert severity="error" onClose={() => setErrorMessage(null)} sx={{ mb: 3, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
            <ErrorOutline sx={{ fontSize: 20, mt: 0.5 }} />
            <Box>
              <Typography variant="subtitle2" fontWeight="bold">Acción no permitida</Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>{errorMessage}</Typography>
            </Box>
          </Box>
        </Alert>
      )}

      {/* FILTROS */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid #e2e8f0', borderRadius: 2, display: 'flex', gap: 2 }}>
         <TextField placeholder="Buscar..." size="small" fullWidth value={searchText} onChange={(e) => setSearchText(e.target.value)} InputProps={{ startAdornment: (<InputAdornment position="start"><Search /></InputAdornment>) }} />
         <TextField select label="Estado" size="small" value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)} sx={{ minWidth: 150 }}><MenuItem value="Todos">Todos</MenuItem><MenuItem value="PENDIENTE">Pendientes</MenuItem><MenuItem value="EN_PROGRESO">En Progreso</MenuItem><MenuItem value="COMPLETADA">Completadas</MenuItem></TextField>
         <TextField select label="Prioridad" size="small" value={filterPrioridad} onChange={(e) => setFilterPrioridad(e.target.value)} sx={{ minWidth: 150 }}><MenuItem value="Todos">Todas</MenuItem><MenuItem value="ALTA">Alta</MenuItem><MenuItem value="MEDIA">Media</MenuItem><MenuItem value="BAJA">Baja</MenuItem></TextField>
         <TextField select label="Responsable" size="small" value={filterResponsable} onChange={(e) => setFilterResponsable(e.target.value)} sx={{ minWidth: 180 }}>
           <MenuItem value="Todos">Todos</MenuItem>
           {trabajadores.map((w) => (
             <MenuItem key={w.rut} value={w.rut}>{w.nombres}</MenuItem>
           ))}
         </TextField>
      </Paper>

      {/* TABLA */}
      <Paper elevation={0} sx={{ height: 600, border: '1px solid #e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
        <DataGrid 
  rows={tareasTable} 
  columns={columns} 
  loading={loading} 
  rowHeight={90} // Importante: Más altura para que luzca el diseño
  disableRowSelectionOnClick
  // asigna clases por fila para poder diferenciarlas en CSS
  getRowClassName={(params) => {
    const classes: string[] = [];
    const lvl = params.row.level || 0;
    if (lvl > 0) classes.push('subtask-row'); else classes.push('main-row');
    if (params.row.estado === 'COMPLETADA') classes.push('completed-row');
    return classes.join(' ');
  }}
  // APLICAMOS EL ESTILO AQUÍ
  sx={commonTableStyle} 
/>
      </Paper>

      {/* MODAL CREAR/EDITAR */}
       <Dialog open={open && canCreateTask} onClose={() => setOpen(false)} fullScreen={isMobile} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <Box sx={{ p: 3, bgcolor: '#f8fafc', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="h6" fontWeight="bold">{isEdit ? 'Editar Tarea' : form.tarea_padre ? 'Crear Subtarea' : 'Crear Tarea'}</Typography>
            <IconButton onClick={() => setOpen(false)}><Close /></IconButton>
        </Box>
        <DialogContent sx={{ p: 3 }}>
          <Stack spacing={3}>
            {form.tarea_padre && !isEdit && <Alert severity="info" sx={{ borderRadius: 2 }}>Heredará datos de: <b>{getParentName()}</b></Alert>}
            {isEdit && form.estado === 'COMPLETADA' && (() => {
              const subtareasPendientes = tareasRaw.filter(t => t.tarea_padre === form.id && t.estado !== 'COMPLETADA' && t.estado !== 'CANCELADA');
              return subtareasPendientes.length > 0 ? (
                <Alert severity="warning" sx={{ borderRadius: 2, display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <WarningAmber sx={{ fontSize: 20, mt: 0.3, flexShrink: 0 }} />
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold">⚠️ Subtareas pendientes</Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      Antes de completar, finaliza estas subtareas:<br/>
                      {subtareasPendientes.slice(0, 3).map((st: any) => <span key={st.id}>• {st.nombre}<br/></span>)}
                      {subtareasPendientes.length > 3 && `y ${subtareasPendientes.length - 3} más`}
                    </Typography>
                  </Box>
                </Alert>
              ) : null;
            })()}
            <Box><Typography variant="caption" fontWeight="bold">NOMBRE ACTIVIDAD*</Typography><TextField fullWidth size="small" value={form.nombre} onChange={(e) => setForm({...form, nombre: e.target.value})} /></Box>
            <Stack direction="row" spacing={2}>
              <Box sx={{ flex: 1 }}><Typography variant="caption" fontWeight="bold">RESPONSABLE*</Typography><TextField select fullWidth size="small" value={form.responsable} onChange={(e) => setForm({...form, responsable: e.target.value})}>{trabajadores.map((w) => <MenuItem key={w.rut} value={w.rut}>{w.nombres}</MenuItem>)}</TextField></Box>
              <Box sx={{ flex: 1 }}><Typography variant="caption" fontWeight="bold">VENCIMIENTO*</Typography><TextField type="date" fullWidth size="small" value={form.fecha_limite} onChange={(e) => setForm({...form, fecha_limite: e.target.value})} /></Box>
            </Stack>
            <Stack direction="row" spacing={2}>
              <Box sx={{ flex: 1 }}><Typography variant="caption" fontWeight="bold">PRIORIDAD*</Typography><TextField select fullWidth size="small" value={form.prioridad} onChange={(e) => setForm({...form, prioridad: e.target.value})}><MenuItem value="ALTA">Alta</MenuItem><MenuItem value="MEDIA">Media</MenuItem><MenuItem value="BAJA">Baja</MenuItem></TextField></Box>
              <Box sx={{ flex: 1 }}>{isEdit ? <TextField select fullWidth size="small" label="Estado" value={form.estado} onChange={(e) => setForm({...form, estado: e.target.value})}><MenuItem value="PENDIENTE">Pendiente</MenuItem><MenuItem value="EN_PROGRESO">En Progreso</MenuItem><MenuItem value="COMPLETADA">Completada</MenuItem></TextField> : <Chip label="INICIA: PENDIENTE" size="small" sx={{ mt: 3 }} />}</Box>
            </Stack>
            {!form.tarea_padre && (
                <Stack direction="row" spacing={2}>
                  <Box sx={{ flex: 1 }}><Typography variant="caption" fontWeight="bold">CATEGORÍA</Typography><TextField select fullWidth size="small" value={form.categoria} onChange={(e) => setForm({...form, categoria: e.target.value})}><MenuItem value=""><em>--</em></MenuItem>{categorias.map((c) => <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>)}</TextField></Box>
                  <Box sx={{ flex: 1 }}><Typography variant="caption" fontWeight="bold">CLIENTE</Typography><TextField select fullWidth size="small" value={form.cliente} onChange={(e) => setForm({...form, cliente: e.target.value})}><MenuItem value=""><em>-- INTERNO --</em></MenuItem>{clientes.map((c) => <MenuItem key={c.rut} value={c.rut}>{c.nombre}</MenuItem>)}</TextField></Box>
                </Stack>
            )}
            <Box><Typography variant="caption" fontWeight="bold">DESCRIPCIÓN</Typography><TextField multiline rows={3} fullWidth value={form.informacion} onChange={(e) => setForm({...form, informacion: e.target.value})} /></Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}><Button onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={handleSave} variant="contained" disabled={!canCreateTask}>Guardar</Button></DialogActions>
      </Dialog>

      {/* MODAL DETALLES */}
      {selectedTarea && (
        <Dialog open={openView} onClose={() => setOpenView(false)} fullScreen={isMobile} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
          <Box sx={{ bgcolor: '#0f172a', p: 3, color: 'white', display: 'flex', justifyContent: 'space-between' }}>
            <Box><Typography variant="h5" fontWeight="bold">{selectedTarea.nombre}</Typography><Chip label={selectedTarea.estado} size="small" sx={{ color: 'white' }} /></Box>
            <IconButton onClick={() => setOpenView(false)} sx={{ color: 'white' }}><Close /></IconButton>
          </Box>
          <DialogContent sx={{ p: 3 }}>
            <Stack spacing={3}>
                {(() => {
                  const isCompleted = selectedTarea.estado === 'COMPLETADA';
                  return (
                    <>
                      <Box sx={{ display: 'flex', gap: 3 }}>
                          <Box><Typography variant="caption" color="text.secondary">RESPONSABLE</Typography><Typography variant="body2" fontWeight="bold" sx={completedTextSx(isCompleted)}>{selectedTarea.nombre_responsable}</Typography></Box>
                          <Box><Typography variant="caption" color="text.secondary">VENCIMIENTO</Typography><Typography variant="body2" fontWeight="bold" sx={completedTextSx(isCompleted)}>{selectedTarea.fecha_limite}</Typography></Box>
                          <Box><Typography variant="caption" color="text.secondary">ORIGEN</Typography><Typography variant="body2" fontWeight="bold">{selectedTarea.cliente_nombre || 'PROYECTO INTERNO'}</Typography></Box>
                      </Box>
                      <Box><Typography variant="caption" color="text.secondary">NOTAS</Typography><Paper elevation={0} sx={{ p: 2, bgcolor: '#f8fafc', border: '1px solid #eee' }}><Typography variant="body2" sx={completedTextSx(isCompleted)}>{selectedTarea.informacion || 'Sin notas.'}</Typography></Paper></Box>
                    </>
                  );
                })()}
                <Box><Divider sx={{ mb: 2 }} /><Typography variant="subtitle2" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><History fontSize="small" /> AUDITORÍA</Typography>
                    <Stack direction="row" spacing={4} sx={{ mt: 1 }}>
                        <Box><Typography variant="caption">CREADOR</Typography><Typography variant="body2" fontWeight="bold">{selectedTarea.creado_por}</Typography></Box>
                        <Box><Typography variant="caption">REGISTRO</Typography><Typography variant="body2" fontWeight="bold">{new Date(selectedTarea.fecha_creacion).toLocaleString()}</Typography></Box>
                    </Stack>
                </Box>
            </Stack>
          </DialogContent>
        </Dialog>
      )}
    </Box>
  );
};

export default Tareas;
