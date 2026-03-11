import { useEffect, useState } from 'react';
import { 
  Box, Typography, Paper, Stack, Avatar, Divider, Chip, 
  CircularProgress, List, ListItem, ListItemAvatar, ListItemText, 
  Card, CardContent, Button, Tooltip
} from '@mui/material';
import { 
  WarningAmber, ErrorOutline, Assignment, Description, 
  Timeline, Schedule, FolderOpen, TaskAlt, Warehouse, ShoppingCart,
  TrendingDown, CheckCircle
} from '@mui/icons-material';
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
        hoy.setHours(0,0,0,0);

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

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  // Componente de Tarjeta KPI Reutilizable
  const KpiCard = ({ title, value, icon, color, borderColor, badge }: any) => (
    <Paper elevation={0} sx={{ p: 2, borderLeft: `5px solid ${borderColor}`, bgcolor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', flex: 1, position: 'relative' }}>
        {badge && (
          <Box sx={{ position: 'absolute', top: 10, right: 10, bgcolor: '#ef4444', color: 'white', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}>
            {badge}
          </Box>
        )}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
            <Box>
                <Typography variant="caption" fontWeight="bold" color="text.secondary">{title}</Typography>
                <Typography variant="h4" fontWeight="800" color="#1e293b">{value}</Typography>
            </Box>
            <Avatar sx={{ bgcolor: color.bg, color: color.text, width: 44, height: 44, flexShrink: 0 }}>{icon}</Avatar>
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

    return (
      <Card sx={{ borderLeft: `4px solid ${color.border}`, bgcolor: color.bg, mb: 1 }}>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 }, display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Icon sx={{ color: color.border, mt: 0.5 }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" fontWeight="600" sx={{ color: color.text }}>
              {alerta.titulo}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {alerta.descripcion}
            </Typography>
            {alerta.fecha && (
              <Typography variant="caption" color="text.secondary">
                📅 {formatDateSafe(alerta.fecha)}
              </Typography>
            )}
          </Box>
          <Chip 
            label={alerta.severidad.toUpperCase()} 
            size="small" 
            sx={{ bgcolor: color.border, color: 'white', fontWeight: 'bold', fontSize: '0.65rem' }}
          />
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* HEADER CON INFORMACIÓN DEL ROL */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="700" color="#1e293b">Panel de Control</Typography>
        <Typography variant="body1" color="text.secondary">
          Visión estratégica en tiempo real
        </Typography>
        {/* Chip de rol con información */}
        <Box sx={{ mt: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
          <Chip 
            label={`Rol: ${user?.rol || 'SIN ROL'}`}
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 'bold' }}
          />
          {user?.area && (
            <Chip 
              label={`Área: ${user.area}`}
              variant="outlined"
              sx={{ fontWeight: 'bold' }}
            />
          )}
        </Box>
      </Box>

      {/* SECCIÓN 0: ALERTAS CRÍTICAS - Filtradas y personalizadas por rol */}
      {alertasCriticas.length > 0 && (
        <>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 1 }}>
            <ErrorOutline /> Alertas y Avisos del Sistema
          </Typography>
          <Paper elevation={0} sx={{ p: 2, mb: 2, border: '1px solid #fee2e2', bgcolor: '#fef2f2', maxHeight: 360, overflowY: 'auto' }}>
            {visibleAlertas.map(alerta => (
              <AlertaCriticaCard key={alerta.id} alerta={alerta} />
            ))}
          </Paper>
          {alertasCriticas.length > 5 && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 4 }}>
              <Button variant="text" onClick={() => setShowAllAlerts((prev) => !prev)}>
                {showAllAlerts ? 'Ver menos' : 'Ver más alertas'}
              </Button>
            </Box>
          )}
        </>
      )}

      {/* Aviso personalizado según rol si no hay alertas */}
      {alertasCriticas.length === 0 && (
        <Paper elevation={0} sx={{ p: 2, mb: 4, border: '1px solid #d1fae5', bgcolor: '#f0fdf4' }}>
          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#16a34a' }}>
            <CheckCircle fontSize="small" /> Excelente: No hay avisos críticos en este momento
          </Typography>
        </Paper>
      )}

      {/* SECCIÓN 1: GESTIÓN DOCUMENTAL - Solo para ADMINISTRADOR, RRHH, TRABAJADOR */}
      {canSeeDocs() && (
        <>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 1 }}>
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
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 1 }}>
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
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 1 }}>
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
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 1 }}>
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

      {/* --- SECCIÓN 5: CALENDARIO INTELIGENTE --- */}
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 1 }}>
        <Schedule /> Calendario de Eventos y Tareas
      </Typography>

      <Box sx={{ mb: 5 }}>
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

      {/* --- SECCIÓN 6: ACTIVIDAD RECIENTE --- */}
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, color: '#1e293b' }}>
        Últimos Movimientos
      </Typography>
      
      <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
        <List sx={{ p: 0 }}>
          {recentActivity.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>No hay actividad reciente.</Box>
          ) : (
            recentActivity.map((item, index) => (
              <Box key={item.id}>
                <ListItem alignItems="flex-start" sx={{ py: 2 }}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: item.type === 'DOCUMENTO' ? '#e0f2fe' : '#f0fdf4', color: item.type === 'DOCUMENTO' ? '#0284c7' : '#16a34a' }}>
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
                  <Chip label={item.type} size="small" sx={{ fontSize: '0.65rem', fontWeight: 'bold', height: 20 }} />
                </ListItem>
                {index < recentActivity.length - 1 && <Divider component="li" />}
              </Box>
            ))
          )}
        </List>
      </Paper>

      {/* FOOTER */}
      <Box sx={{ mt: 8, textAlign: 'center', borderTop: '1px solid #e2e8f0', pt: 3, pb: 5 }}>
        <Typography variant="body2" color="text.secondary">Sistema SERKAN SPA 2026</Typography>
        
      {/* Información sobre permisos del rol */}
        <Paper elevation={0} sx={{ p: 2, mt: 3, bgcolor: '#f0f9ff', border: '1px solid #bfdbfe', borderRadius: 1 }}>
          <Typography variant="caption" fontWeight="bold" color="primary">
            📋 Información visible para tu rol:
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





