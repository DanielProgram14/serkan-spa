import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Add,
  Task,
  EventNote,
  Circle,
} from '@mui/icons-material';
import api from '../api/axios';

interface CalendarDayData {
  date: Date;
  tareas: any[];
  eventos: any[];
  hasContent: boolean;
}

interface CalendarComponentProps {
  onTaskClick?: (taskId: number) => void;
  onEventClick?: (eventId: number) => void;
  onCreateEventClick?: () => void;
  mes?: Date;
  onMonthChange?: (newDate: Date) => void;
  refreshTrigger?: number;
}

const Calendar: React.FC<CalendarComponentProps> = ({
  onTaskClick,
  onEventClick,
  onCreateEventClick,
  mes: propMes,
  onMonthChange,
  refreshTrigger = 0,
}) => {
  const [currentMonth, setCurrentMonth] = useState(propMes || new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [calendarDays, setCalendarDays] = useState<CalendarDayData[]>([]);

  // Cargar eventos y tareas
  useEffect(() => {
    if (loading) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [eventsRes, tasksRes] = await Promise.all([
          api.get('/eventos/mis_eventos/'),
          api.get('/tareas/'),
        ]);

        setEvents(eventsRes.data || []);
        setTasks(tasksRes.data || []);
      } catch (err) {
        console.error('Error cargando datos del calendario:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentMonth, refreshTrigger]);

  // Generar días del calendario
  useEffect(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // Primer día del mes
    const firstDay = new Date(year, month, 1);
    // Último día del mes
    const lastDay = new Date(year, month + 1, 0);

    // Días del mes anterior que se muestran
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days: CalendarDayData[] = [];
    let currentDate = new Date(startDate);

    // Generar 42 días (6 semanas)
    for (let i = 0; i < 42; i++) {
      const dateStr = currentDate.toISOString().split('T')[0];

      // Filtrar eventos y tareas para este día
      const dayEvents = events.filter((e) => e.fecha && e.fecha.split('T')[0] === dateStr);
      const dayTasks = tasks.filter((t) => t.fecha_limite && t.fecha_limite.split('T')[0] === dateStr && t.estado === 'PENDIENTE' && String(t.prioridad).toUpperCase() === 'ALTA');

      days.push({
        date: new Date(currentDate),
        tareas: dayTasks,
        eventos: dayEvents,
        hasContent: dayEvents.length > 0 || dayTasks.length > 0,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    setCalendarDays(days);
  }, [currentMonth, events, tasks]);

  const handlePrevMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentMonth(newDate);
    if (onMonthChange) onMonthChange(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentMonth(newDate);
    if (onMonthChange) onMonthChange(newDate);
  };

  const monthName = currentMonth.toLocaleDateString('es-CL', {
    month: 'long',
    year: 'numeric',
  });

  const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentMonth.getMonth();
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const getEventColor = (tipo: string) => {
    switch (tipo) {
      case 'SISTEMA':
        return '#1976d2'; // Blue
      case 'ASIGNADO':
        return '#388e3c'; // Green
      case 'PERSONAL':
        return '#f57c00'; // Orange
      default:
        return '#666';
    }
  };

  const getTaskColor = (prioridad: string) => {
    switch (prioridad?.toUpperCase()) {
      case 'ALTA':
        return '#d32f2f'; // Red
      case 'MEDIA':
        return '#ed6c02'; // Orange
      case 'BAJA':
        return '#2e7d32'; // Green
      default:
        return '#1976d2'; // Blue
    }
  };

  return (
    <Paper
      elevation={2}
      sx={{
        p: { xs: 1.5, md: 2 },
        borderRadius: 3,
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        boxShadow: '0 10px 24px rgba(15, 23, 42, 0.08)',
      }}
    >
      {/* HEADER CON CONTROLES */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 800, textTransform: 'capitalize', color: '#0f172a', letterSpacing: '-0.2px' }}>
          {monthName}
        </Typography>

        <Stack direction="row" spacing={1}>
          <Tooltip title="Mes anterior">
            <IconButton
              onClick={handlePrevMonth}
              size="small"
              sx={{
                '&:hover': { backgroundColor: '#e0e0e0' },
              }}
            >
              <ChevronLeft />
            </IconButton>
          </Tooltip>

          <Tooltip title="Mes siguiente">
            <IconButton
              onClick={handleNextMonth}
              size="small"
              sx={{
                '&:hover': { backgroundColor: '#e0e0e0' },
              }}
            >
              <ChevronRight />
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" sx={{ mx: 1 }} />

          <Tooltip title="Crear evento">
            <Button
              size="small"
              variant="contained"
              color="primary"
              startIcon={<Add />}
              onClick={onCreateEventClick}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              Evento
            </Button>
          </Tooltip>
        </Stack>
      </Box>

      {/* LEYENDA DE COLORES */}
      <Stack
        direction="row"
        spacing={2}
        sx={{
          mb: 2,
          p: 1,
          backgroundColor: '#f8fafc',
          borderRadius: 2,
          border: '1px solid #e2e8f0',
          flexWrap: 'wrap',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Circle sx={{ fontSize: 12, color: '#1976d2' }} />
          <Typography variant="caption">Ev. Sistema</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Circle sx={{ fontSize: 12, color: '#388e3c' }} />
          <Typography variant="caption">Ev. Asignado</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Circle sx={{ fontSize: 12, color: '#f57c00' }} />
          <Typography variant="caption">Ev. Personal</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Task sx={{ fontSize: 16, color: '#d32f2f' }} />
          <Typography variant="caption">Tarea (Alta)</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Task sx={{ fontSize: 16, color: '#ed6c02' }} />
          <Typography variant="caption">Tarea (Media)</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Task sx={{ fontSize: 16, color: '#2e7d32' }} />
          <Typography variant="caption">Tarea (Baja)</Typography>
        </Box>
      </Stack>

      {/* ENCABEZADO CON DÍAS DE LA SEMANA */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, mb: 0.5 }}>
        {weekDays.map((day) => (
          <Box
            key={day}
            sx={{
              textAlign: 'center',
              fontWeight: 'bold',
              py: 1,
              backgroundColor: '#eef2ff',
              borderRadius: 1.5,
              border: '1px solid #e2e8f0',
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
              {day}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* DÍAS DEL CALENDARIO */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
        {calendarDays.map((day, idx) => (
          <Card
            key={idx}
            sx={{
              minHeight: 100,
              backgroundColor: isCurrentMonth(day.date) ? '#ffffff' : '#f8fafc',
              border: isToday(day.date) ? '2px solid #2563eb' : '1px solid #e2e8f0',
              borderRadius: 2,
              position: 'relative',
              overflow: 'hidden',
              cursor: day.hasContent ? 'pointer' : 'default',
              transition: 'all 0.2s',
              '&:hover': day.hasContent ? { boxShadow: '0 10px 20px rgba(15, 23, 42, 0.08)', backgroundColor: '#f8fafc' } : {},
            }}
          >
            <CardContent
              sx={{
                p: 0.75,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                '&:last-child': { pb: 0.75 },
              }}
            >
              {/* DÍA DEL MES */}
              <Typography
                variant="caption"
                sx={{
                  fontWeight: isToday(day.date) ? 'bold' : 'normal',
                  color: isCurrentMonth(day.date) ? '#000' : '#999',
                  mb: 0.5,
                }}
              >
                {day.date.getDate()}
              </Typography>

              {/* ÍTEMS DEL DÍA */}
              <Box sx={{ flex: 1, overflow: 'hidden' }}>
                {/* EVENTOS */}
                {day.eventos.map((evento) => (
                  <Box
                    key={`evento-${evento.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onEventClick) onEventClick(evento.id);
                    }}
                    sx={{
                      fontSize: '0.65rem',
                      backgroundColor: getEventColor(evento.tipo),
                      color: 'white',
                      px: 0.5,
                      py: 0.25,
                      mb: 0.25,
                      borderRadius: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      fontWeight: 600,
                      '&:hover': {
                        opacity: 0.8,
                        backgroundColor: getEventColor(evento.tipo),
                      },
                    }}
                    title={`${evento.titulo} (${evento.tipo})`}
                  >
                    <EventNote sx={{ fontSize: '0.6rem', mr: 0.25, verticalAlign: 'middle' }} />
                    {evento.titulo.substring(0, 15)}
                  </Box>
                ))}

                {/* TAREAS */}
                {day.tareas.map((tarea) => (
                  <Box
                    key={`tarea-${tarea.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onTaskClick) onTaskClick(tarea.id);
                    }}
                    sx={{
                      fontSize: '0.65rem',
                      backgroundColor: getTaskColor(tarea.prioridad),
                      color: 'white',
                      px: 0.5,
                      py: 0.25,
                      mb: 0.25,
                      borderRadius: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      fontWeight: 600,
                      '&:hover': {
                        opacity: 0.8,
                        backgroundColor: getTaskColor(tarea.prioridad),
                      },
                    }}
                    title={tarea.nombre}
                  >
                    <Task sx={{ fontSize: '0.6rem', mr: 0.25, verticalAlign: 'middle' }} />
                    {tarea.nombre.substring(0, 15)}
                  </Box>
                ))}
              </Box>

              {/* BADGE CON NÚMERO DE ÍTEMS SI HAY MÁS */}
              {day.tareas.length + day.eventos.length > 2 && (
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '0.6rem',
                    color: '#666',
                    fontStyle: 'italic',
                  }}
                >
                  +{day.tareas.length + day.eventos.length - 2} más
                </Typography>
              )}
            </CardContent>
          </Card>
        ))}
      </Box>
    </Paper>
  );
};

export default Calendar;
