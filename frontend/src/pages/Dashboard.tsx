import { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Stack, Avatar, Divider, Chip,
  CircularProgress, List, ListItem, ListItemAvatar, ListItemText,
  Card, CardContent, Button
} from '@mui/material';
import {
  WarningAmber, ErrorOutline, Assignment, Description,
  Timeline, Schedule, FolderOpen, TaskAlt, Warehouse, ShoppingCart,
  TrendingDown, CheckCircle, InfoOutlined, AddCircleOutline, DateRange, AttachMoney
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
  type: 'DOCUMENTO' | 'TAREA';
  title: string;
  subtitle: string;
  date: string;
  status: string;
}

interface AlertaCritica {
  id: string;
  tipo: 'BAJO_STOCK' | 'ORDEN_PENDIENTE' | 'TAREA_URGENTE' | 'HERRAMIENTA';
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

const formatDateSafe = (value?: string) => {
  const d = parseDateSafe(value);
  if (!d) return 'Fecha no disponible';
  return d.toLocaleDateString('es-CL');
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

const subtleCardSx = {
  border: '1px solid #e2e8f0',
  borderRadius: 3,
  bgcolor: '#ffffff',
  boxShadow: '0 6px 18px rgba(15, 23, 42, 0.06)'
};

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  // Estadísticas
  const [docStats, setDocStats] = useState({ vencidos: 0, porVencer: 0, total: 0 });
  const [taskStats, setTaskStats] = useState({ vencidas: 0, proximas: 0, pendientes: 0 });
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

  // Nuevos estados para Inventario y Órdenes
  const [inventoryStats, setInventoryStats] = useState({ bajoStock: 0, totalProductos: 0 });
  const [herramientasStats, setHerramientasStats] = useState({ mantenimiento: 0, disponibles: 0, total: 0 });
  const [ordenesStats, setOrdenesStats] = useState({ pendientes: 0, confirmadas: 0, total: 0 });

  // Alertas y Calendario
  const [alertasCriticas, setAlertasCriticas] = useState<AlertaCritica[]>([]);
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const [eventosCalendario, setEventosCalendario] = useState<EventoCalendario[]>([]);
  const [mesActual, setMesActual] = useState(new Date());

  // Estados para los nuevos modales
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [selectedEventoId, setSelectedEventoId] = useState<number | null>(null);
  const [eventoModalOpen, setEventoModalOpen] = useState(false);
  const [eventoFormOpen, setEventoFormOpen] = useState(false);
  const [editingEvento, setEditingEvento] = useState<any>(null);
  const [refreshCalendar, setRefreshCalendar] = useState(0);

  // Funciones de control de acceso basadas en roles
  const canSeeDocs = () => ['ADMINISTRADOR', 'RRHH', 'TRABAJADOR'].includes(user?.rol || '');
  const canSeeInventory = () => ['ADMINISTRADOR', 'RRHH', 'SUPERVISOR'].includes(user?.rol || '');
  const canSeeOrdenes = () => ['ADMINISTRADOR', 'RRHH', 'SUPERVISOR'].includes(user?.rol || '');
  const canSeeAllTasks = () => ['ADMINISTRADOR', 'RRHH', 'SUPERVISOR'].includes(user?.rol || '');

  useEffect(() => {
    if (!user) return;

    const fetchDashboardData = async () => {
      try {
        // Obtener todos los datos en paralelo
        const requests = [
          canSeeDocs() ? api.get('/documentos/') : Promise.resolve({ data: [] }),
          api.get('/tareas/'),
          canSeeInventory() ? api.get('/productos/') : Promise.resolve({ data: [] }),
          canSeeInventory() ? api.get('/herramientas/') : Promise.resolve({ data: [] }),
          canSeeOrdenes() ? api.get('/ordenes-compra/') : Promise.resolve({ data: [] }),
        ];

        const [resDocs, resTasks, resProductos, resHerramientas, resOrdenes] = await Promise.all(requests);

        const docs = resDocs.data;
        const tasks = resTasks.data;
        const productos = resProductos.data;
        const herramientas = resHerramientas.data;
        const ordenes = resOrdenes.data;

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        // 1. CÁLCULOS DOCUMENTOS
        let dVencidos = 0;
        let dPorVencer = 0;
        docs.forEach((d: any) => {
          if (d.fecha_vencimiento) {
            const f = new Date(d.fecha_vencimiento);
            const diff = Math.ceil((f.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
            if (diff < 0) dVencidos++;
            else if (diff >= 0 && diff <= 15) dPorVencer++;
          }
        });
        setDocStats({ vencidos: dVencidos, porVencer: dPorVencer, total: docs.length });

        // 2. CÁLCULOS TAREAS
        let tVencidas = 0;
        let tProximas = 0;
        let tPendientes = 0;
        let tasksUrgentes: any[] = [];
        tasks.forEach((t: any) => {
          if (t.estado === 'PENDIENTE') {
            tPendientes++;
            const f = new Date(t.fecha_limite + 'T00:00:00');
            const diff = Math.ceil((f.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
            if (diff < 0) tVencidas++;
            else if (diff >= 0 && diff <= 7) tProximas++;

            // Tareas urgentes (prioridad alta y próximas a vencer en 3 días)
            if (t.prioridad === 'ALTA' && diff <= 3 && diff >= 0) {
              tasksUrgentes.push(t);
            }
          }
        });
        setTaskStats({ vencidas: tVencidas, proximas: tProximas, pendientes: tPendientes });

        // 3. CÁLCULOS INVENTARIO - PRODUCTOS
        let bajoStock = 0;
        let productosEnAlerta: any[] = [];
        productos.forEach((p: any) => {
          if (p.stock_actual <= p.stock_minimo) {
            bajoStock++;
            productosEnAlerta.push({
              id: `prod-${p.id}`,
              tipo: 'BAJO_STOCK' as const,
              titulo: p.nombre,
              descripcion: `Stock: ${p.stock_actual}/${p.stock_minimo} (${p.unidad_medida})`,
              severidad: p.stock_actual === 0 ? 'alto' : 'medio'
            });
          }
        });
        setInventoryStats({ bajoStock, totalProductos: productos.length });

        // 4. CÁLCULOS HERRAMIENTAS
        let herramientasMantenimiento = 0;
        let herramientasDisponibles = 0;
        let herramientasEnAlerta: any[] = [];
        herramientas.forEach((h: any) => {
          if (h.estado === 'MANTENIMIENTO') {
            herramientasMantenimiento++;
            herramientasEnAlerta.push({
              id: `herra-${h.id}`,
              tipo: 'HERRAMIENTA' as const,
              titulo: h.nombre,
              descripcion: `En mantenimiento - Stock disponible: ${h.stock_disponible}/${h.stock_total}`,
              severidad: 'medio'
            });
          } else if (h.estado === 'DISPONIBLE') {
            herramientasDisponibles++;
          }
        });
        setHerramientasStats({ mantenimiento: herramientasMantenimiento, disponibles: herramientasDisponibles, total: herramientas.length });

        // 5. CÁLCULOS ÓRDENES DE COMPRA
        let ordenesPendientes = 0;
        let ordenesConfirmadas = 0;
        let ordenesEnAlerta: any[] = [];
        ordenes.forEach((o: any) => {
          if (o.estado === 'BORRADOR') {
            ordenesPendientes++;
            ordenesEnAlerta.push({
              id: `orden-${o.id}`,
              tipo: 'ORDEN_PENDIENTE' as const,
              titulo: `Orden ${o.numero}`,
              descripcion: `Proveedor: ${o.proveedor_nombre} - Total: $${Number(o.total_orden).toLocaleString('es-CL')}`,
              severidad: 'bajo',
              fecha: o.fecha_orden
            });
          } else if (o.estado === 'CONFIRMADA') {
            ordenesConfirmadas++;
          }
        });
        setOrdenesStats({ pendientes: ordenesPendientes, confirmadas: ordenesConfirmadas, total: ordenes.length });

        // 6. GENERAR ALERTAS CRÍTICAS (filtradas por rol del usuario)
        const alertas: AlertaCritica[] = [];

        // ALERTAS PARA TODOS LOS ROLES
        // Tareas urgentes - visible para todos
        tasksUrgentes.forEach((t: any) => {
          alertas.push({
            id: `task-${t.id}`,
            tipo: 'TAREA_URGENTE' as const,
            titulo: t.nombre,
            descripcion: `Límite: ${t.fecha_limite} - ${t.informacion || t.comentario_gestion || 'Sin descripción'}`,
            severidad: 'alto' as const,
            fecha: t.fecha_limite
          });
        });

        // ALERTAS POR ROL: ADMINISTRADOR, RRHH, SUPERVISOR - ven inventario
        if (canSeeInventory()) {
          productosEnAlerta.forEach((p: any) => {
            alertas.push(p);
          });
          herramientasEnAlerta.forEach((h: any) => {
            alertas.push(h);
          });
          ordenesEnAlerta.forEach((o: any) => {
            alertas.push(o);
          });
        }

        // ALERTAS POR ROL: ADMINISTRADOR, RRHH - ven documentos vencidos
        if (canSeeDocs() && user.rol !== 'TRABAJADOR') {
          if (dVencidos > 0) {
            alertas.push({
              id: 'docs-vencidos',
              tipo: 'DOCUMENTO' as any,
              titulo: `${dVencidos} Documentos Vencidos`,
              descripcion: 'Existe documentación vencida que requiere renovación urgente',
              severidad: 'alto',
              fecha: new Date().toISOString().split('T')[0]
            });
          }
        }

        setAlertasCriticas(alertas);
        setShowAllAlerts(false);

        // 7. GENERAR EVENTOS DEL CALENDARIO
        const eventos: EventoCalendario[] = [];

        // Tareas en el mes
        tasks.filter((t: any) => t.estado === 'PENDIENTE').forEach((t: any) => {
          const fecha = new Date(t.fecha_limite);
          if (fecha.getMonth() === mesActual.getMonth() && fecha.getFullYear() === mesActual.getFullYear()) {
            eventos.push({
              id: t.id,
              fecha: t.fecha_limite,
              tipo: 'tarea',
              titulo: t.nombre,
              prioridad: t.prioridad === 'ALTA' ? 'alta' : t.prioridad === 'MEDIA' ? 'media' : 'baja'
            });
          }
        });

        // Órdenes en el mes
        ordenes.filter((o: any) => o.estado === 'BORRADOR').forEach((o: any) => {
          const fecha = new Date(o.fecha_orden);
          if (fecha.getMonth() === mesActual.getMonth() && fecha.getFullYear() === mesActual.getFullYear()) {
            eventos.push({
              id: o.id,
              fecha: o.fecha_orden,
              tipo: 'orden',
              titulo: `Orden: ${o.numero}`,
              prioridad: 'media'
            });
          }
        });

        setEventosCalendario(eventos);

        // 8. ACTIVIDAD RECIENTE
        const activityDocs: ActivityItem[] = docs.map((d: any) => ({
          id: `doc-${d.id}`, type: 'DOCUMENTO', title: `Documento: ${d.tipo}`,
          subtitle: d.observacion || 'Sin detalles',
          date: d.created_at || d.fecha_carga || '',
          status: 'info'
        }));
        const activityTasks: ActivityItem[] = tasks.map((t: any) => ({
          id: `task-${t.id}`, type: 'TAREA', title: `Tarea: ${t.nombre}`,
          subtitle: `Resp: ${t.nombre_responsable || 'N/A'}`,
          date: t.fecha_creacion || t.created_at || t.fecha_limite || '',
          status: 'warning'
        }));

        const combined = [...activityDocs, ...activityTasks]
          .sort((a, b) => getTimeSafe(b.date) - getTimeSafe(a.date))
          .slice(0, 5);
        setRecentActivity(combined);

      } catch (error) { console.error(error); }
      finally { setLoading(false); }
    };
    fetchDashboardData();
  }, [user, mesActual]);

  const visibleAlertas = showAllAlerts ? alertasCriticas : alertasCriticas.slice(0, 5);
  const alertSummary = alertasCriticas.reduce(
    (acc, alerta) => {
      acc[alerta.severidad] += 1;
      return acc;
    },
    { alto: 0, medio: 0, bajo: 0 }
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const agendaItems = eventosCalendario
    .map((evento) => ({
      ...evento,
      dateObj: parseDateSafe(evento.fecha),
    }))
    .filter((evento) => evento.dateObj && evento.dateObj.getTime() >= today.getTime())
    .sort((a, b) => (a.dateObj?.getTime() || 0) - (b.dateObj?.getTime() || 0))
    .slice(0, 8);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  // Componente de Tarjeta KPI Reutilizable
  const KpiCard = ({ title, value, icon, color, borderColor, badge }: any) => (
    <Paper
      elevation={0}
      sx={{
        p: 2.25,
        borderLeft: `5px solid ${borderColor}`,
        borderRadius: 3,
        border: '1px solid #e2e8f0',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        boxShadow: '0 10px 20px rgba(15, 23, 42, 0.08)',
        flex: 1,
        position: 'relative',
        transition: 'transform 160ms ease, box-shadow 160ms ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 14px 28px rgba(15, 23, 42, 0.12)'
        }
      }}
    >
      {badge && (
        <Box sx={{ position: 'absolute', top: 12, right: 12, bgcolor: '#ef4444', color: 'white', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold', boxShadow: '0 6px 12px rgba(239, 68, 68, 0.35)' }}>
          {badge}
        </Box>
      )}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
        <Box>
          <Typography variant="caption" fontWeight="700" color="text.secondary" sx={{ letterSpacing: '0.5px' }}>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight="800" color="#0f172a">{value}</Typography>
        </Box>
        <Avatar sx={{ bgcolor: color.bg, color: color.text, width: 46, height: 46, flexShrink: 0, boxShadow: '0 6px 14px rgba(15, 23, 42, 0.12)' }}>
          {icon}
        </Avatar>
      </Box>
    </Paper>
  );

  // Componente de Alerta Crítica
  const AlertaCriticaCard = ({ alerta }: { alerta: AlertaCritica }) => {
    const colorMap = {
      alto: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b', icon: ErrorOutline },
      medio: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e', icon: WarningAmber },
      bajo: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af', icon: Schedule }
    };
    const color = colorMap[alerta.severidad];
    const Icon = color.icon;
    const isTaskAlert = alerta.tipo === 'TAREA_URGENTE' && typeof alerta.id === 'string' && alerta.id.startsWith('task-');
    const taskId = isTaskAlert ? Number(alerta.id.replace('task-', '')) : null;

    return (
      <Card sx={{ borderLeft: `4px solid ${color.border}`, bgcolor: color.bg, mb: 1.25, borderRadius: 2.5, border: `1px solid ${color.border}33`, boxShadow: '0 6px 14px rgba(15, 23, 42, 0.06)' }}>
        <CardContent sx={{ py: 1.75, '&:last-child': { pb: 1.75 }, display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Icon sx={{ color: color.border, mt: 0.25 }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" fontWeight="600" sx={{ color: color.text }}>
              {alerta.titulo}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {alerta.descripcion}
            </Typography>
            {alerta.fecha && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                <Schedule sx={{ fontSize: 14 }} />
                {formatDateSafe(alerta.fecha)}
              </Typography>
            )}
          </Box>
          <Chip
            label={alerta.severidad.toUpperCase()}
            size="small"
            sx={{ bgcolor: color.border, color: 'white', fontWeight: 'bold', fontSize: '0.65rem', letterSpacing: '0.5px' }}
          />
          {isTaskAlert && taskId && (
            <Button
              size="small"
              variant="text"
              onClick={() => {
                setSelectedTaskId(taskId);
                setTaskModalOpen(true);
              }}
            >
              Ver tarea
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* HEADER CON INFORMACIÓN DEL ROL */}
      <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3.5 }, borderRadius: 4, border: '1px solid #e2e8f0', background: 'linear-gradient(120deg, #ffffff 0%, #f1f5f9 55%, #eef2ff 100%)', boxShadow: '0 16px 30px rgba(15, 23, 42, 0.08)' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between">
          <Box>
            <Typography variant="h4" fontWeight="800" color="#0f172a" sx={{ letterSpacing: '-0.4px' }}>
              Panel de Control
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
              Visión estratégica en tiempo real
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            <Chip
              label={`Rol: ${user?.rol || 'SIN ROL'}`}
              variant="outlined"
              sx={{ fontWeight: 700, bgcolor: '#eff6ff', borderColor: '#bfdbfe', color: '#1e3a8a' }}
            />
            {user?.area && (
              <Chip
                label={`Área: ${user.area}`}
                variant="outlined"
                sx={{ fontWeight: 700, bgcolor: '#f8fafc', borderColor: '#cbd5f5', color: '#334155' }}
              />
            )}
          </Stack>
        </Stack>
      </Paper>

      {/* SECCIÓN 0: CENTRO OPERATIVO */}
      <Typography variant="h5" fontWeight="800" sx={{ color: '#0f172a', letterSpacing: '-0.3px' }}>
        Centro Operativo
      </Typography>
      <Paper elevation={0} sx={{ ...panelSx, borderRadius: 4 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.05fr 0.95fr' }, gap: 3 }}>
          <Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography variant="subtitle1" fontWeight="700" sx={{ color: '#b91c1c', display: 'flex', alignItems: 'center', gap: 1 }}>
                <ErrorOutline /> Alertas Críticas Integradas
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip label={`ALTO ${alertSummary.alto}`} size="small" sx={{ bgcolor: '#fee2e2', color: '#991b1b', fontWeight: 700 }} />
                <Chip label={`MEDIO ${alertSummary.medio}`} size="small" sx={{ bgcolor: '#fef3c7', color: '#92400e', fontWeight: 700 }} />
                <Chip label={`BAJO ${alertSummary.bajo}`} size="small" sx={{ bgcolor: '#dbeafe', color: '#1e40af', fontWeight: 700 }} />
              </Stack>
            </Stack>

            {alertasCriticas.length > 0 ? (
              <Paper elevation={0} sx={{ p: 2, border: '1px solid #fecaca', bgcolor: '#fff1f2', borderRadius: 3, maxHeight: 360, overflowY: 'auto' }}>
                {visibleAlertas.map(alerta => (
                  <AlertaCriticaCard key={alerta.id} alerta={alerta} />
                ))}
              </Paper>
            ) : (
              <Paper elevation={0} sx={{ p: 2, border: '1px solid #bbf7d0', bgcolor: '#f0fdf4', borderRadius: 3 }}>
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#15803d', fontWeight: 600 }}>
                  <CheckCircle fontSize="small" /> Excelente: No hay avisos críticos en este momento
                </Typography>
              </Paper>
            )}

            {alertasCriticas.length > 5 && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                <Button variant="text" onClick={() => setShowAllAlerts((prev) => !prev)}>
                  {showAllAlerts ? 'Ver menos' : 'Ver más alertas'}
                </Button>
              </Box>
            )}
          </Box>

          <Box>
            <Typography variant="subtitle1" fontWeight="700" sx={{ ...sectionTitleSx, mb: 2, color: '#0f172a' }}>
              <Schedule /> Agenda Operativa Inmediata
            </Typography>
            <Stack spacing={1.25} sx={{ mb: 2 }}>
              {agendaItems.length === 0 ? (
                <Paper elevation={0} sx={{ p: 2, border: '1px dashed #cbd5f5', borderRadius: 2.5, bgcolor: '#f8fafc' }}>
                  <Typography variant="body2" color="text.secondary">
                    No hay eventos próximos en el período actual.
                  </Typography>
                </Paper>
              ) : (
                agendaItems.map((item) => {
                  const typeLabel = item.tipo === 'tarea' ? 'Tarea' : item.tipo === 'orden' ? 'Orden' : 'Inventario';
                  const priorityMap = {
                    alta: { bg: '#fee2e2', color: '#b91c1c' },
                    media: { bg: '#fef3c7', color: '#92400e' },
                    baja: { bg: '#dcfce7', color: '#166534' },
                  };
                  const priorityStyle = priorityMap[item.prioridad] || priorityMap.media;
                  const isTask = item.tipo === 'tarea' && Boolean(item.id);

                  return (
                    <Paper
                      key={`${item.tipo}-${item.fecha}-${item.titulo}`}
                      elevation={0}
                      onClick={() => {
                        if (isTask) {
                          setSelectedTaskId(item.id || null);
                          setTaskModalOpen(true);
                        }
                      }}
                      sx={{
                        p: 1.5,
                        border: '1px solid #e2e8f0',
                        borderRadius: 2.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 2,
                        cursor: isTask ? 'pointer' : 'default',
                        transition: 'background-color 160ms ease, box-shadow 160ms ease',
                        '&:hover': isTask ? { bgcolor: '#f8fafc', boxShadow: '0 8px 18px rgba(15, 23, 42, 0.08)' } : {},
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle2" fontWeight="700" sx={{ color: '#0f172a' }} noWrap>
                          {item.titulo}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDateSafe(item.fecha)}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Chip label={typeLabel} size="small" sx={{ bgcolor: '#f1f5f9', fontWeight: 700 }} />
                        <Chip label={item.prioridad.toUpperCase()} size="small" sx={{ bgcolor: priorityStyle.bg, color: priorityStyle.color, fontWeight: 700 }} />
                      </Stack>
                    </Paper>
                  );
                })
              )}
            </Stack>
            <Divider sx={{ my: 2 }} />
            <Calendar
              mes={mesActual}
              onMonthChange={(newDate) => setMesActual(newDate)}
              onTaskClick={(taskId) => {
                setSelectedTaskId(taskId);
                setTaskModalOpen(true);
              }}
              onEventClick={(eventoId) => {
                setSelectedEventoId(eventoId);
                setEventoModalOpen(true);
              }}
              onCreateEventClick={() => {
                setEditingEvento(null);
                setEventoFormOpen(true);
              }}
              refreshTrigger={refreshCalendar}
            />
          </Box>
        </Box>
      </Paper>

      {/* SECCIÓN 1: GESTIÓN DOCUMENTAL - Solo para ADMINISTRADOR, RRHH, TRABAJADOR */}
      {canSeeDocs() && (
        <>
          <Typography variant="h6" fontWeight="700" sx={sectionTitleSx}>
            <FolderOpen color="primary" /> Estado Documental
          </Typography>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ mb: 5 }}>
            <KpiCard
              title="CONTRATOS VENCIDOS"
              value={docStats.vencidos}
              borderColor="#ef4444"
              color={{ bg: '#fee2e2', text: '#ef4444' }}
              icon={<ErrorOutline />}
              badge={docStats.vencidos > 0 ? docStats.vencidos : null}
            />
            <KpiCard
              title="POR VENCER (15 DÍAS)"
              value={docStats.porVencer}
              borderColor="#f97316"
              color={{ bg: '#ffedd5', text: '#f97316' }}
              icon={<WarningAmber />}
              badge={docStats.porVencer > 0 ? docStats.porVencer : null}
            />
            <KpiCard
              title="TOTAL ARCHIVOS"
              value={docStats.total}
              borderColor="#3b82f6"
              color={{ bg: '#dbeafe', text: '#3b82f6' }}
              icon={<Description />}
            />
          </Stack>
        </>
      )}

      {/* --- SECCIÓN 2: GESTIÓN OPERATIVA (TAREAS) --- */}
      <Typography variant="h6" fontWeight="700" sx={sectionTitleSx}>
        <TaskAlt color="success" />
        {canSeeAllTasks() ? 'Estado de Tareas (Todas)' : 'Mis Tareas'}
      </Typography>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ mb: 5 }}>
        <KpiCard
          title="TAREAS ATRASADAS"
          value={taskStats.vencidas}
          borderColor="#ef4444"
          color={{ bg: '#fee2e2', text: '#ef4444' }}
          icon={<Schedule />}
          badge={taskStats.vencidas > 0 ? taskStats.vencidas : null}
        />
        <KpiCard
          title="PARA ESTA SEMANA"
          value={taskStats.proximas}
          borderColor="#eab308"
          color={{ bg: '#fef9c3', text: '#eab308' }}
          icon={<Timeline />}
          badge={taskStats.proximas > 0 ? taskStats.proximas : null}
        />
        <KpiCard
          title="TOTAL PENDIENTES"
          value={taskStats.pendientes}
          borderColor="#10b981"
          color={{ bg: '#d1fae5', text: '#10b981' }}
          icon={<Assignment />}
        />
      </Stack>

      {/* --- SECCIÓN 3: GESTIÓN DE INVENTARIO - Solo para ADMINISTRADOR, RRHH, SUPERVISOR --- */}
      {canSeeInventory() && (
        <>
          <Typography variant="h6" fontWeight="700" sx={sectionTitleSx}>
            <Warehouse color="warning" /> Estado de Inventario
          </Typography>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ mb: 5 }}>
            <KpiCard
              title="PRODUCTOS BAJO STOCK"
              value={inventoryStats.bajoStock}
              borderColor="#ef4444"
              color={{ bg: '#fee2e2', text: '#ef4444' }}
              icon={<TrendingDown />}
              badge={inventoryStats.bajoStock > 0 ? inventoryStats.bajoStock : null}
            />
            <KpiCard
              title="HERRAMIENTAS EN MANTENIMIENTO"
              value={herramientasStats.mantenimiento}
              borderColor="#f59e0b"
              color={{ bg: '#fef3c7', text: '#f59e0b' }}
              icon={<WarningAmber />}
              badge={herramientasStats.mantenimiento > 0 ? herramientasStats.mantenimiento : null}
            />
            <KpiCard
              title="HERRAMIENTAS DISPONIBLES"
              value={herramientasStats.disponibles}
              borderColor="#10b981"
              color={{ bg: '#d1fae5', text: '#10b981' }}
              icon={<CheckCircle />}
            />
          </Stack>
        </>
      )}

      {/* --- SECCIÓN 4: ÓRDENES DE COMPRA - Solo para ADMINISTRADOR, RRHH, SUPERVISOR --- */}
      {canSeeOrdenes() && (
        <>
          <Typography variant="h6" fontWeight="700" sx={sectionTitleSx}>
            <ShoppingCart color="info" /> Órdenes de Compra
          </Typography>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ mb: 5 }}>
            <KpiCard
              title="ÓRDENES PENDIENTES"
              value={ordenesStats.pendientes}
              borderColor="#f97316"
              color={{ bg: '#ffedd5', text: '#f97316' }}
              icon={<Schedule />}
              badge={ordenesStats.pendientes > 0 ? ordenesStats.pendientes : null}
            />
            <KpiCard
              title="ÓRDENES CONFIRMADAS"
              value={ordenesStats.confirmadas}
              borderColor="#10b981"
              color={{ bg: '#d1fae5', text: '#10b981' }}
              icon={<CheckCircle />}
            />
            <KpiCard
              title="TOTAL ÓRDENES"
              value={ordenesStats.total}
              borderColor="#3b82f6"
              color={{ bg: '#dbeafe', text: '#3b82f6' }}
              icon={<ShoppingCart />}
            />
          </Stack>
        </>
      )}

      {/* --- SECCIÓN 6: ACTIVIDAD RECIENTE --- */}
      <Typography variant="h6" fontWeight="700" sx={{ ...sectionTitleSx, color: '#0f172a' }}>
        Últimos Movimientos
      </Typography>

      <Paper elevation={0} sx={{ ...subtleCardSx, overflow: 'hidden' }}>
        <List sx={{ p: 0 }}>
          {recentActivity.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>No hay actividad reciente.</Box>
          ) : (
            recentActivity.map((item, index) => (
              <Box key={item.id}>
                <ListItem alignItems="flex-start" sx={{ py: 2, px: { xs: 2, md: 3 }, transition: 'background-color 160ms ease', '&:hover': { bgcolor: '#f8fafc' } }}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: item.type === 'DOCUMENTO' ? '#e0f2fe' : '#f0fdf4', color: item.type === 'DOCUMENTO' ? '#0284c7' : '#16a34a', boxShadow: '0 6px 12px rgba(15, 23, 42, 0.12)' }}>
                      {item.type === 'DOCUMENTO' ? <Description /> : <Assignment />}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={<Typography variant="subtitle2" fontWeight="bold">{item.title}</Typography>}
                    secondary={
                      <Typography component="span" variant="body2" color="text.primary" sx={{ display: 'block' }}>
                        {formatDateTimeSafe(item.date)} — {item.subtitle}
                      </Typography>
                    }
                  />
                  <Chip label={item.type} size="small" sx={{ fontSize: '0.65rem', fontWeight: 'bold', height: 22, bgcolor: '#f1f5f9' }} />
                </ListItem>
                {index < recentActivity.length - 1 && <Divider component="li" />}
              </Box>
            ))
          )}
        </List>
      </Paper>

      {/* FOOTER */}
      <Box sx={{ mt: 8, textAlign: 'center', borderTop: '1px solid #e2e8f0', pt: 3, pb: 5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Sistema SERKAN SPA 2026</Typography>

        {/* Información sobre permisos del rol */}
        <Paper elevation={0} sx={{ ...panelSx, mt: 3, bgcolor: '#eff6ff', border: '1px solid #bfdbfe' }}>
          <Typography variant="caption" fontWeight="bold" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
            <InfoOutlined sx={{ fontSize: 14 }} /> Información visible para tu rol
          </Typography>
          <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
            {canSeeDocs() && <Chip label="Documentos" size="small" color="primary" variant="outlined" />}
            <Chip label="Tareas" size="small" color="primary" variant="outlined" />
            {canSeeInventory() && <Chip label="Inventario" size="small" color="primary" variant="outlined" />}
            {canSeeOrdenes() && <Chip label="Órdenes de Compra" size="small" color="primary" variant="outlined" />}
            {canSeeAllTasks() && <Chip label="Vista Total de Tareas" size="small" color="primary" variant="outlined" />}
          </Box>
        </Paper>
      </Box>

      {/* MODALES */}
      <TaskDetailModal
        open={taskModalOpen}
        taskId={selectedTaskId}
        onClose={() => {
          setTaskModalOpen(false);
          setSelectedTaskId(null);
        }}
      />

      <EventoDetailModal
        open={eventoModalOpen}
        eventoId={selectedEventoId}
        onClose={() => {
          setEventoModalOpen(false);
          setSelectedEventoId(null);
        }}
        onEdit={(evento) => {
          setEditingEvento(evento);
          setEventoFormOpen(true);
        }}
        onDelete={async (eventoId) => {
          await api.delete(`/eventos/${eventoId}/`);
          setRefreshCalendar((prev) => prev + 1);
        }}
      />

      <EventoFormModal
        open={eventoFormOpen}
        onClose={() => {
          setEventoFormOpen(false);
          setEditingEvento(null);
        }}
        onSuccess={() => {
          // Incrementar el trigger para recargar eventos en el calendario
          setRefreshCalendar((prev) => prev + 1);
        }}
        editingEvent={editingEvento}
      />
    </Box>
  );
};

export default Dashboard;





