import { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Paper, Stack, Avatar, Divider, Chip,
  CircularProgress, Card, CardContent, Button, TextField, MenuItem,
  Stepper, Step, StepLabel, StepContent
} from '@mui/material';
import {
  WarningAmber, ErrorOutline, Assignment, Description,
  Schedule, FolderOpen, TaskAlt, Warehouse, ShoppingCart,
  TrendingDown, CheckCircle, AddCircleOutline, DateRange,
  PersonAddAlt, ReceiptLong, LocalAtm, Timeline
} from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid
} from 'recharts';
import api from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import TaskDetailModal from '../components/TaskDetailModal';
import EventoFormModal from '../components/EventoFormModal';
import EventoDetailModal from '../components/EventoDetailModal';
import Calendar from '../components/Calendar';

// --- Interfaces ---
interface ActivityItem {
  id: number | string;
  type: 'DOCUMENTO' | 'TAREA' | 'FINANZAS';
  title: string;
  subtitle: string;
  date: string;
  status: string;
}

interface AlertaCritica {
  id: string;
  tipo: 'BAJO_STOCK' | 'ORDEN_PENDIENTE' | 'TAREA_URGENTE' | 'HERRAMIENTA' | 'DOCUMENTO';
  titulo: string;
  descripcion: string;
  severidad: 'alto' | 'medio' | 'bajo';
  fecha?: string;
}

interface EventoCalendario {
  id?: number;
  fecha: string;
  tipo: 'tarea' | 'orden' | 'inventario';
  titulo: string;
  prioridad: 'alta' | 'media' | 'baja';
}

const parseDateSafe = (value?: string) => {
  if (!value) return null;
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T00:00:00`
    : (value.includes(' ') ? value.replace(' ', 'T') : value);
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
};

const formatDateTimeSafe = (value?: string) => {
  const d = parseDateSafe(value);
  if (!d) return 'Fecha no disponible';
  const hasTime = !!value && (/\d{2}:\d{2}/.test(value));
  return hasTime
    ? d.toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })
    : d.toLocaleDateString('es-CL');
};

const getTimeSafe = (value?: string) => {
  const d = parseDateSafe(value);
  return d ? d.getTime() : 0;
};

const sectionTitleSx = {
  mb: 2,
  color: '#0f172a',
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  letterSpacing: '0.2px'
};

const panelSx = {
  p: { xs: 2, md: 2.5 },
  border: '1px solid #e2e8f0',
  borderRadius: 3,
  bgcolor: '#ffffff',
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)'
};

const PIE_COLORS = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b'];

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'HOY' | 'SEMANA' | 'MES' | 'AÑO' | 'SIEMPRE'>('MES');

  // Estadísticas
  const [docStats, setDocStats] = useState({ vencidos: 0, porVencer: 0, total: 0 });
  const [taskStats, setTaskStats] = useState({ vencidas: 0, proximas: 0, pendientes: 0, completadas: 0, canceladas: 0 });
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

  // Nuevos estados para Inventario y Órdenes
  const [inventoryStats, setInventoryStats] = useState({ bajoStock: 0, totalProductos: 0 });
  const [herramientasStats, setHerramientasStats] = useState({ mantenimiento: 0, disponibles: 0, total: 0 });
  const [ordenesStats, setOrdenesStats] = useState({ pendientes: 0, confirmadas: 0, total: 0 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [chartDataFinanzas, setChartDataFinanzas] = useState<any[]>([]);

  // Alertas y Calendario
  const [alertasCriticas, setAlertasCriticas] = useState<AlertaCritica[]>([]);
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const [eventosCalendario, setEventosCalendario] = useState<EventoCalendario[]>([]);
  const [mesActual, setMesActual] = useState(new Date());

  // Estados para los modales
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [selectedEventoId, setSelectedEventoId] = useState<number | null>(null);
  const [eventoModalOpen, setEventoModalOpen] = useState(false);
  const [eventoFormOpen, setEventoFormOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editingEvento, setEditingEvento] = useState<any>(null);
  const [refreshCalendar, setRefreshCalendar] = useState(0);

  // Control de accesos
  const canSeeDocs = useCallback(() => ['ADMINISTRADOR', 'RRHH', 'TRABAJADOR'].includes(user?.rol || ''), [user]);
  const canSeeInventory = useCallback(() => ['ADMINISTRADOR', 'RRHH', 'SUPERVISOR'].includes(user?.rol || ''), [user]);
  const canSeeOrdenes = useCallback(() => ['ADMINISTRADOR', 'RRHH', 'SUPERVISOR'].includes(user?.rol || ''), [user]);
  const canSeeFinanzas = useCallback(() => ['ADMINISTRADOR', 'RRHH', 'SUPERVISOR'].includes(user?.rol || ''), [user]);

  // Función Helper para filtrar por fecha según el timeFilter
  const isDateInFilter = useCallback((dateString?: string | null) => {
    if (timeFilter === 'SIEMPRE') return true;
    const d = parseDateSafe(dateString || '');
    if (!d) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(d);
    target.setHours(0, 0, 0, 0);

    const diffTime = Math.abs(today.getTime() - target.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    switch (timeFilter) {
      case 'HOY': return diffDays === 0;
      case 'SEMANA': return diffDays <= 7;
      case 'MES': return diffDays <= 30;
      case 'AÑO': return diffDays <= 365;
      default: return true;
    }
  }, [timeFilter]);

  useEffect(() => {
    if (!user) return;

    const fetchDashboardData = async () => {
      try {
        const requests = [
          canSeeDocs() ? api.get('/documentos/') : Promise.resolve({ data: [] }),
          api.get('/tareas/'),
          canSeeInventory() ? api.get('/productos/') : Promise.resolve({ data: [] }),
          canSeeInventory() ? api.get('/herramientas/') : Promise.resolve({ data: [] }),
          canSeeOrdenes() ? api.get('/ordenes-compra/') : Promise.resolve({ data: [] }),
          canSeeFinanzas() ? api.get('/movimientos-financieros/') : Promise.resolve({ data: [] }),
        ];

        const [resDocs, resTasks, resProductos, resHerramientas, resOrdenes, resFinanzas] = await Promise.all(requests);

        const docs = resDocs.data;
        const rawTasks = resTasks.data;
        const productos = resProductos.data;
        const herramientas = resHerramientas.data;
        const ordenes = resOrdenes.data;
        const finanzas = resFinanzas.data;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tasks = rawTasks; // Tasks shouldn't be time filtered for absolute KPIs

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        // 1. CÁLCULOS DOCUMENTOS
        let dVencidos = 0;
        let dPorVencer = 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filteredDocs = docs; // Document KPIs are always absolute
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        filteredDocs.forEach((d: any) => {
          if (d.fecha_vencimiento) {
            const f = new Date(d.fecha_vencimiento);
            const diff = Math.ceil((f.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
            if (diff < 0) dVencidos++;
            else if (diff >= 0 && diff <= 15) dPorVencer++;
          }
        });
        setDocStats({ vencidos: dVencidos, porVencer: dPorVencer, total: filteredDocs.length });

        // 2. CÁLCULOS TAREAS
        let tVencidas = 0, tProximas = 0, tPendientes = 0, tCompletadas = 0, tCanceladas = 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tasksUrgentes: any[] = [];
        const tasksVencidasAle: any[] = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tasks.forEach((t: any) => {
          if (t.estado === 'PENDIENTE' || t.estado === 'EN_PROGRESO') tPendientes++;
          else if (t.estado === 'COMPLETADA') tCompletadas++;
          else if (t.estado === 'CANCELADA') tCanceladas++;

          if (t.estado === 'PENDIENTE' || t.estado === 'EN_PROGRESO') {
            const f = new Date(t.fecha_limite + 'T00:00:00');
            const diff = Math.ceil((f.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
            if (diff < 0) {
              tVencidas++;
              tasksVencidasAle.push(t);
            }
            else if (diff >= 0 && diff <= 7) tProximas++;
            
            if (t.prioridad === 'ALTA' && diff <= 3 && diff >= 0) tasksUrgentes.push(t);
          }
        });
        setTaskStats({ vencidas: tVencidas, proximas: tProximas, pendientes: tPendientes, completadas: tCompletadas, canceladas: tCanceladas });

        // 3. INVENTARIO
        let bajoStock = 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const productosEnAlerta: any[] = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        productos.forEach((p: any) => {
          if (p.stock_actual <= p.stock_minimo) {
            bajoStock++;
            productosEnAlerta.push({
              id: `prod-${p.id}`, tipo: 'BAJO_STOCK' as const, titulo: p.nombre,
              descripcion: `Stock: ${p.stock_actual}/${p.stock_minimo} (${p.unidad_medida})`,
              severidad: p.stock_actual === 0 ? 'alto' : 'medio'
            });
          }
        });
        setInventoryStats({ bajoStock, totalProductos: productos.length });

        // 4. HERRAMIENTAS
        let hMantenimiento = 0, hDisponibles = 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const herramientasEnAlerta: any[] = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        herramientas.forEach((h: any) => {
          if (h.estado === 'MANTENIMIENTO') {
            hMantenimiento++;
            herramientasEnAlerta.push({
              id: `herra-${h.id}`, tipo: 'HERRAMIENTA' as const, titulo: h.nombre,
              descripcion: `Stock disponible: ${h.stock_disponible}/${h.stock_total}`, severidad: 'medio'
            });
          } else if (h.estado === 'DISPONIBLE') hDisponibles++;
        });
        setHerramientasStats({ mantenimiento: hMantenimiento, disponibles: hDisponibles, total: herramientas.length });

        // 5. ÓRDENES DE COMPRA
        let oPendientes = 0, oConfirmadas = 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ordenesEnAlerta: any[] = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filteredOrdenes = ordenes; // Orders absolute
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        filteredOrdenes.forEach((o: any) => {
          if (o.estado === 'BORRADOR') {
            oPendientes++;
            ordenesEnAlerta.push({
              id: `orden-${o.id}`, tipo: 'ORDEN_PENDIENTE' as const, titulo: `Orden ${o.numero}`,
              descripcion: `Proveedor: ${o.proveedor_nombre} - Total: $${Number(o.total_orden).toLocaleString('es-CL')}`,
              severidad: 'bajo', fecha: o.fecha_orden
            });
          } else if (o.estado === 'CONFIRMADA') oConfirmadas++;
        });
        setOrdenesStats({ pendientes: oPendientes, confirmadas: oConfirmadas, total: filteredOrdenes.length });

        // 6. GRÁFICO FINANZAS
        if (canSeeFinanzas()) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const fFiltered = timeFilter === 'SIEMPRE' ? finanzas : finanzas.filter((f: any) => isDateInFilter(f.fecha));
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const agg: any = {};
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          fFiltered.forEach((f: any) => {
            const month = new Date(f.fecha + 'T00:00:00').toLocaleString('es-CL', { month: 'short', year: '2-digit' });
            if (!agg[month]) agg[month] = { name: month, Ingresos: 0, Costos: 0 };
            if (f.tipo_movimiento === 'INGRESO') agg[month].Ingresos += Number(f.monto);
            else agg[month].Costos += Number(f.monto);
          });
          const chartData = Object.values(agg);
          setChartDataFinanzas(chartData);
        }

        // 7. ALERTAS (mismas reglas)
        const alertas: AlertaCritica[] = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tasksUrgentes.forEach((t: any) => alertas.push({
          id: `task-${t.id}`, tipo: 'TAREA_URGENTE', titulo: t.nombre,
          descripcion: `Vence en próximos 3 días (${t.fecha_limite})`, severidad: 'alto', fecha: t.fecha_limite
        }));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tasksVencidasAle.forEach((t: any) => alertas.push({
          id: `task-vencida-${t.id}`, tipo: 'TAREA_URGENTE', titulo: t.nombre,
          descripcion: `¡ATRASADA! (${t.fecha_limite})`, severidad: 'alto', fecha: t.fecha_limite
        }));
        if (canSeeInventory()) {
          productosEnAlerta.forEach(p => alertas.push(p));
          herramientasEnAlerta.forEach(h => alertas.push(h));
          ordenesEnAlerta.forEach(o => alertas.push(o));
        }
        if (canSeeDocs() && user.rol !== 'TRABAJADOR') {
          if (dVencidos > 0) {
            alertas.push({
              id: 'docs-vencidos', tipo: 'DOCUMENTO', titulo: `${dVencidos} Documento(s) Vencido(s)`,
              descripcion: 'Requiere renovación urgente o actualización', severidad: 'alto', fecha: new Date().toISOString().split('T')[0]
            });
          }
          if (dPorVencer > 0) {
            alertas.push({
              id: 'docs-por-vencer', tipo: 'DOCUMENTO', titulo: `${dPorVencer} Documento(s) por Vencer`,
              descripcion: 'Se aproximan a su fecha límite en menos de 15 días', severidad: 'medio', fecha: new Date().toISOString().split('T')[0]
            });
          }
        }
        setAlertasCriticas(alertas);

        // 8. EVENTOS CALENDARIO (Todo el mes actual, sin afectar por timeFilter)
        const eventos: EventoCalendario[] = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rawTasks.filter((t: any) => t.estado === 'PENDIENTE').forEach((t: any) => {
          const fecha = new Date(t.fecha_limite);
          if (fecha.getMonth() === mesActual.getMonth() && fecha.getFullYear() === mesActual.getFullYear()) {
            eventos.push({
              id: t.id, fecha: t.fecha_limite, tipo: 'tarea', titulo: t.nombre,
              prioridad: t.prioridad === 'ALTA' ? 'alta' : t.prioridad === 'MEDIA' ? 'media' : 'baja'
            });
          }
        });
        setEventosCalendario(eventos);

        // 9. ACTIVIDAD RECIENTE (Stepper Timeline)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const aDocs: ActivityItem[] = docs.slice(0, 20).map((d: any) => ({
          id: `doc-${d.id}`, type: 'DOCUMENTO', title: `Documento cargado: ${d.tipo}`,
          subtitle: d.observacion || 'Sin detalles', date: d.created_at || d.fecha_carga || '', status: 'info'
        }));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const aTasks: ActivityItem[] = rawTasks.slice(0, 20).map((t: any) => ({
          id: `task-${t.id}`, type: 'TAREA', title: `Tarea: ${t.nombre}`,
          subtitle: `Resp: ${t.nombre_responsable || 'N/A'}`, date: t.created_at || '', status: 'warning'
        }));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const aFin: ActivityItem[] = finanzas.slice(0, 20).map((f: any) => ({
          id: `fin-${f.id}`, type: 'FINANZAS', title: `Caja: ${f.tipo_movimiento} por $${Number(f.monto).toLocaleString('es-CL')}`,
          subtitle: f.descripcion || '', date: f.fecha || '', status: 'success'
        }));

        const combined = [...aDocs, ...aTasks, ...aFin]
          .filter(x => x.date)
          .sort((a, b) => getTimeSafe(b.date) - getTimeSafe(a.date))
          .slice(0, 10);
        setRecentActivity(combined);

      } catch (error) { console.error(error); }
      finally { setLoading(false); }
    };
    fetchDashboardData();
  }, [user, mesActual, timeFilter, canSeeDocs, canSeeFinanzas, canSeeInventory, canSeeOrdenes, isDateInFilter]);

  const visibleAlertas = showAllAlerts ? alertasCriticas : alertasCriticas.slice(0, 5);
  const pieData = [
    { name: 'Pendientes', value: taskStats.pendientes },
    { name: 'Completadas', value: taskStats.completadas },
    { name: 'Canceladas', value: taskStats.canceladas }
  ].filter(d => d.value > 0);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const KpiCard = ({ title, value, icon, color, borderColor, badge }: any) => (
    <Paper elevation={0} sx={{ p: 2.25, borderLeft: `5px solid ${borderColor}`, borderRadius: 3, border: '1px solid #e2e8f0', background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', boxShadow: '0 10px 20px rgba(15, 23, 42, 0.08)', flex: 1, position: 'relative', transition: 'transform 160ms ease', '&:hover': { transform: 'translateY(-2px)' } }}>
      {badge && <Box sx={{ position: 'absolute', top: 12, right: 12, bgcolor: '#ef4444', color: 'white', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}>{badge}</Box>}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
        <Box>
          <Typography variant="caption" fontWeight="700" color="text.secondary">{title}</Typography>
          <Typography variant="h4" fontWeight="800" color="#0f172a">{value}</Typography>
        </Box>
        <Avatar sx={{ bgcolor: color.bg, color: color.text, width: 46, height: 46 }}>{icon}</Avatar>
      </Box>
    </Paper>
  );

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* HEADER PREMIUM Y ACCIONES RÁPIDAS EN LÍNEA */}
      <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3.5 }, borderRadius: 4, border: '1px solid #e2e8f0', background: 'linear-gradient(120deg, #ffffff 0%, #f0fdfa 55%, #e0f2fe 100%)', boxShadow: '0 16px 30px rgba(15, 23, 42, 0.08)' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between">
          <Box>
            <Typography variant="h4" fontWeight="800" color="#0f172a" sx={{ letterSpacing: '-0.4px' }}>
              Dashboard Gerencial
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
              Bienvenido, {user?.username} ({user?.rol})
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              select size="small" variant="outlined" value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as any)}
              InputProps={{ startAdornment: <DateRange fontSize="small" sx={{ mr: 1, color: '#64748b' }} />, sx: { bgcolor: 'white', borderRadius: 2, minWidth: 160, fontWeight: 700 } }}
            >
              <MenuItem value="HOY">Hoy</MenuItem>
              <MenuItem value="SEMANA">Últimos 7 Días</MenuItem>
              <MenuItem value="MES">Este Mes</MenuItem>
              <MenuItem value="AÑO">Este Año</MenuItem>
              <MenuItem value="SIEMPRE">Todo el Tiempo</MenuItem>
            </TextField>
          </Stack>
        </Stack>

        <Divider sx={{ my: 3, borderColor: '#cbd5e1' }} />

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button variant="contained" startIcon={<AddCircleOutline />} onClick={() => setEventoFormOpen(true)} sx={{ borderRadius: 2, px: 3, bgcolor: '#0f172a', '&:hover': { bgcolor: '#1e293b' } }}>
            Registrar Evento
          </Button>
          {(user?.rol === 'ADMINISTRADOR' || user?.rol === 'RRHH') && (
            <Button variant="outlined" startIcon={<PersonAddAlt />} href="/clientes" sx={{ borderRadius: 2, bgcolor: 'white' }}>
              Añadir Cliente
            </Button>
          )}
          {canSeeFinanzas() && (
            <Button variant="outlined" startIcon={<LocalAtm />} color="success" href="/caja" sx={{ borderRadius: 2, bgcolor: 'white' }}>
              Nueva Orden Compra
            </Button>
          )}
        </Box>
      </Paper>

      {/* GRÁFICOS INTERACTIVOS RECHARTS (NUEVO) */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: canSeeFinanzas() ? '1fr 1fr' : '1fr' }, gap: 3 }}>
        <Paper elevation={0} sx={panelSx}>
          <Typography variant="subtitle1" fontWeight="700" sx={{ ...sectionTitleSx, color: '#0f172a' }}>
            <TaskAlt color="primary" /> Distribución Operativa (Status Tareas)
          </Typography>
          <Box sx={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart style={{ cursor: 'pointer' }}>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value">
                    {pieData.map((_entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Typography color="text.secondary">No hay tareas registradas en este periodo.</Typography>
            )}
          </Box>
        </Paper>

        {canSeeFinanzas() && (
          <Paper elevation={0} sx={panelSx}>
            <Typography variant="subtitle1" fontWeight="700" sx={{ ...sectionTitleSx, color: '#0f172a' }}>
              <ReceiptLong color="success" /> Resumen Financiero (Ingresos vs Costos)
            </Typography>
            <Box sx={{ height: 280 }}>
              {chartDataFinanzas.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDataFinanzas} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val / 1000}k`} />
                    <RechartsTooltip cursor={{ fill: '#f1f5f9' }} formatter={(val) => `$${Number(val).toLocaleString('es-CL')}`} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }} />
                    <Legend iconType="circle" />
                    <Bar dataKey="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                    <Bar dataKey="Costos" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box display="flex" height="100%" alignItems="center" justifyContent="center">
                  <Typography color="text.secondary">No hay historico financiero en este periodo.</Typography>
                </Box>
              )}
            </Box>
          </Paper>
        )}
      </Box>

      {/* SECCIÓN 0: CENTRO ALERTS & AGENDA */}
      <Paper elevation={0} sx={{ ...panelSx, borderRadius: 4 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.05fr 0.95fr' }, gap: 3 }}>
          <Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography variant="subtitle1" fontWeight="700" sx={{ color: '#b91c1c', display: 'flex', alignItems: 'center', gap: 1 }}>
                <ErrorOutline /> Alertas Críticas Integradas
              </Typography>
              {alertasCriticas.length > 5 && (
                <Button size="small" variant="text" onClick={() => setShowAllAlerts(!showAllAlerts)}>
                  {showAllAlerts ? 'Ocultar' : 'Ver todas'}
                </Button>
              )}
            </Stack>
            {alertasCriticas.length > 0 ? (
              <Paper elevation={0} sx={{ p: 2, border: '1px solid #fecaca', bgcolor: '#fff1f2', borderRadius: 3, maxHeight: 360, overflowY: 'auto' }}>
                {visibleAlertas.map(alerta => {
                  const colorMap = {
                    alto: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b', icon: ErrorOutline },
                    medio: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e', icon: WarningAmber },
                    bajo: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af', icon: Schedule }
                  };
                  const c = colorMap[alerta.severidad];
                  const Icon = c.icon;
                  return (
                    <Card key={alerta.id} sx={{ borderLeft: `4px solid ${c.border}`, bgcolor: c.bg, mb: 1, borderRadius: 2, border: `1px solid ${c.border}33`, boxShadow: 'none' }}>
                      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 }, display: 'flex', gap: 2 }}>
                        <Icon sx={{ color: c.border }} />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle2" fontWeight="600" sx={{ color: c.text }}>{alerta.titulo}</Typography>
                          <Typography variant="body2" color="text.secondary">{alerta.descripcion}</Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  )
                })}
              </Paper>
            ) : (
              <Paper elevation={0} sx={{ p: 2, border: '1px solid #bbf7d0', bgcolor: '#f0fdf4', borderRadius: 3 }}>
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#15803d', fontWeight: 600 }}>
                  <CheckCircle fontSize="small" /> Sin avisos en este periodo
                </Typography>
              </Paper>
            )}
          </Box>
          <Box>
            <Calendar mes={mesActual} onMonthChange={setMesActual} onTaskClick={(id) => { setSelectedTaskId(id); setTaskModalOpen(true); }} onEventClick={(id) => { setSelectedEventoId(id); setEventoModalOpen(true); }} onCreateEventClick={() => setEventoFormOpen(true)} refreshTrigger={refreshCalendar} />
          </Box>
        </Box>
      </Paper>

      {/* KPI DOCUMENTOS */}
      {canSeeDocs() && (
        <>
          <Typography variant="h6" fontWeight="700" sx={sectionTitleSx}><FolderOpen color="primary" /> Documentos</Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ mb: 2 }}>
            <KpiCard title="CONTRATOS VENCIDOS" value={docStats.vencidos} borderColor="#ef4444" color={{ bg: '#fee2e2', text: '#ef4444' }} icon={<ErrorOutline />} badge={docStats.vencidos || null} />
            <KpiCard title="POR VENCER" value={docStats.porVencer} borderColor="#f97316" color={{ bg: '#ffedd5', text: '#f97316' }} icon={<WarningAmber />} badge={docStats.porVencer || null} />
            <KpiCard title="TOTAL ARCHIVOS" value={docStats.total} borderColor="#3b82f6" color={{ bg: '#dbeafe', text: '#3b82f6' }} icon={<Description />} />
          </Stack>
        </>
      )}

      {/* KPI TAREAS */}
      <Typography variant="h6" fontWeight="700" sx={sectionTitleSx}><TaskAlt color="success" /> Tareas/Actividades</Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ mb: 2 }}>
        <KpiCard title="TAREAS ATRASADAS" value={taskStats.vencidas} borderColor="#ef4444" color={{ bg: '#fee2e2', text: '#ef4444' }} icon={<Schedule />} badge={taskStats.vencidas || null} />
        <KpiCard title="TOTAL PENDIENTES" value={taskStats.pendientes} borderColor="#10b981" color={{ bg: '#d1fae5', text: '#10b981' }} icon={<Assignment />} />
        <KpiCard title="COMPLETADAS" value={taskStats.completadas} borderColor="#3b82f6" color={{ bg: '#dbeafe', text: '#3b82f6' }} icon={<CheckCircle />} />
      </Stack>

      {/* KPI INVENTARIO */}
      {canSeeInventory() && (
        <>
          <Typography variant="h6" fontWeight="700" sx={sectionTitleSx}><Warehouse color="warning" /> Inventario</Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ mb: 2 }}>
            <KpiCard title="PRODUCTOS BAJO STOCK" value={inventoryStats.bajoStock} borderColor="#ef4444" color={{ bg: '#fee2e2', text: '#ef4444' }} icon={<TrendingDown />} badge={inventoryStats.bajoStock || null} />
            <KpiCard title="HERRAMIENTAS EN MANTENIMIENTO" value={herramientasStats.mantenimiento} borderColor="#f59e0b" color={{ bg: '#fef3c7', text: '#f59e0b' }} icon={<WarningAmber />} badge={herramientasStats.mantenimiento || null} />
            <KpiCard title="HERRAMIENTAS DISPONIBLES" value={herramientasStats.disponibles} borderColor="#10b981" color={{ bg: '#d1fae5', text: '#10b981' }} icon={<CheckCircle />} />
          </Stack>
        </>
      )}

      {/* KPI ÓRDENES DE COMPRA */}
      {canSeeOrdenes() && (
        <>
          <Typography variant="h6" fontWeight="700" sx={sectionTitleSx}><ShoppingCart color="info" /> Órdenes de Compra</Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ mb: 2 }}>
            <KpiCard title="ÓRDENES PENDIENTES" value={ordenesStats.pendientes} borderColor="#f97316" color={{ bg: '#ffedd5', text: '#f97316' }} icon={<Schedule />} badge={ordenesStats.pendientes || null} />
            <KpiCard title="ÓRDENES CONFIRMADAS" value={ordenesStats.confirmadas} borderColor="#10b981" color={{ bg: '#d1fae5', text: '#10b981' }} icon={<CheckCircle />} />
            <KpiCard title="TOTAL ÓRDENES" value={ordenesStats.total} borderColor="#3b82f6" color={{ bg: '#dbeafe', text: '#3b82f6' }} icon={<ShoppingCart />} />
          </Stack>
        </>
      )}

      {/* TIMELINE RECIENTE */}
      <Typography variant="h6" fontWeight="700" sx={{ ...sectionTitleSx, color: '#0f172a', mt: 4 }}>
        <Timeline color="primary" /> Bitácora de Actividad Reciente
      </Typography>
      <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
        <Stepper orientation="vertical" sx={{ '& .MuiStepConnector-line': { minHeight: 30, borderColor: '#cbd5e1' } }}>
          {recentActivity.length > 0 ? recentActivity.map((item) => (
            <Step key={item.id} active={true}>
              <StepLabel icon={<Avatar sx={{ width: 32, height: 32, bgcolor: item.type === 'FINANZAS' ? '#10b981' : item.type === 'TAREA' ? '#f59e0b' : '#3b82f6', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>{item.type === 'FINANZAS' ? <LocalAtm fontSize="small" /> : item.type === 'TAREA' ? <Assignment fontSize="small" /> : <Description fontSize="small" />}</Avatar>}>
                <Typography variant="subtitle2" fontWeight="700">{item.title}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>{formatDateTimeSafe(item.date)} <Chip label={item.type} size="small" sx={{ height: 16, fontSize: '0.6rem' }} /></Typography>
              </StepLabel>
              <StepContent>
                <Typography color="text.secondary" variant="body2">{item.subtitle}</Typography>
              </StepContent>
            </Step>
          )) : <Typography color="text.secondary" sx={{ textAlign: 'center', width: '100%' }}>No hay eventos para mostrar en esta ventana de tiempo.</Typography>}
        </Stepper>
      </Paper>

      {/* MODALES */}
      <TaskDetailModal open={taskModalOpen} taskId={selectedTaskId} onClose={() => { setTaskModalOpen(false); setSelectedTaskId(null); }} />
      <EventoDetailModal open={eventoModalOpen} eventoId={selectedEventoId} onClose={() => { setEventoModalOpen(false); setSelectedEventoId(null); }} onEdit={(e) => { setEditingEvento(e); setEventoFormOpen(true); }} onDelete={async (id) => { await api.delete(`/eventos/${id}/`); setRefreshCalendar(p => p + 1); }} />
      <EventoFormModal open={eventoFormOpen} onClose={() => { setEventoFormOpen(false); setEditingEvento(null); }} onSuccess={() => setRefreshCalendar(p => p + 1)} editingEvent={editingEvento} />
    </Box>
  );
};
export default Dashboard;
