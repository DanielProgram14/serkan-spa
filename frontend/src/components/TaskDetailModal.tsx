import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Stack,
  Divider,
  Paper,
  CircularProgress,
  Alert,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  CheckCircle,
  Schedule,
  AssignmentInd,
  Flag,
  Close,
  Edit,
  Delete,
  Business,
} from '@mui/icons-material';
import api from '../api/axios';

interface Tarea {
  id: number;
  nombre: string;
  informacion?: string;
  comentario_gestion?: string;
  fecha_limite: string;
  fecha_creacion: string;
  prioridad: 'ALTA' | 'MEDIA' | 'BAJA';
  estado: 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADA' | 'CANCELADA';
  categoria?: number;
  categoria_nombre?: string;
  cliente?: string;
  cliente_nombre?: string;
  responsable?: number;
  nombre_responsable?: string;
  responsable_objeto?: {
    rut: string;
    nombres: string;
    apellidos: string;
    nombre_completo: string;
    cargo: string;
  };
  creado_por?: string;
}

interface TaskDetailModalProps {
  open: boolean;
  taskId: number | null;
  onClose: () => void;
  onEdit?: (task: Tarea) => void;
  onDelete?: (taskId: number) => void;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  open,
  taskId,
  onClose,
  onEdit,
  onDelete,
}) => {
  const [task, setTask] = useState<Tarea | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !taskId) {
      setTask(null);
      setError(null);
      return;
    }

    const fetchTask = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/tareas/${taskId}/`);
        setTask(response.data);
      } catch (err) {
        setError('Error al cargar los detalles de la tarea');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [taskId, open]);

  const getPriorityColor = (prioridad: string) => {
    switch (prioridad) {
      case 'ALTA':
        return 'error';
      case 'MEDIA':
        return 'warning';
      case 'BAJA':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStateColor = (estado: string) => {
    switch (estado) {
      case 'COMPLETADA':
        return 'success';
      case 'EN_PROGRESO':
        return 'info';
      case 'CANCELADA':
        return 'error';
      case 'PENDIENTE':
      default:
        return 'warning';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: 3,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 2,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          Detalles de Tarea
        </Typography>
        <Button
          onClick={onClose}
          size="small"
          sx={{
            minWidth: 'auto',
            p: 0.5,
          }}
        >
          <Close />
        </Button>
      </DialogTitle>

      <Divider />

      <DialogContent
        sx={{
          pt: 2,
          pb: 2,
          maxHeight: '70vh',
          overflowY: 'auto',
        }}
      >
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {task && (
          <Stack spacing={2}>
            {/* TÍTULO Y ESTADO */}
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                {task.nombre}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                <Chip
                  label={task.estado}
                  color={getStateColor(task.estado) as any}
                  size="small"
                  icon={<CheckCircle />}
                />
                <Chip
                  label={`Prioridad: ${task.prioridad}`}
                  color={getPriorityColor(task.prioridad) as any}
                  size="small"
                  icon={<Flag />}
                />
              </Stack>
            </Box>

            <Divider />

            {/* DESCRIPCIÓN */}
            {task.informacion && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Descripción
                </Typography>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    backgroundColor: '#f5f5f5',
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="body2">{task.informacion}</Typography>
                </Paper>
              </Box>
            )}

            {/* COMENTARIO DE GESTIÓN */}
            {task.comentario_gestion && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Comentario de Gestión
                </Typography>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    backgroundColor: '#f5f5f5',
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="body2">{task.comentario_gestion}</Typography>
                </Paper>
              </Box>
            )}

            <Divider />

            {/* INFORMACIÓN DE ASIGNACIÓN */}
            <Box>
              <Stack spacing={1.5}>
                {/* RESPONSABLE */}
                {task.responsable_objeto && (
                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                      <AssignmentInd sx={{ mr: 0.5, fontSize: 18, verticalAlign: 'middle' }} />
                      Responsable
                    </Typography>
                    <Typography variant="body2" sx={{ ml: 3 }}>
                      {task.responsable_objeto.nombre_completo}
                    </Typography>
                    {task.responsable_objeto.cargo && (
                      <Typography variant="caption" sx={{ ml: 3, display: 'block', color: '#666' }}>
                        {task.responsable_objeto.cargo}
                      </Typography>
                    )}
                  </Paper>
                )}

                {/* CLIENTE */}
                {task.cliente_nombre && (
                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                      <Business sx={{ mr: 0.5, fontSize: 18, verticalAlign: 'middle' }} />
                      Cliente
                    </Typography>
                    <Typography variant="body2" sx={{ ml: 3 }}>
                      {task.cliente_nombre}
                    </Typography>
                  </Paper>
                )}

                {/* CATEGORÍA */}
                {task.categoria_nombre && (
                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                      Categoría
                    </Typography>
                    <Typography variant="body2" sx={{ ml: 1 }}>
                      {task.categoria_nombre}
                    </Typography>
                  </Paper>
                )}
              </Stack>
            </Box>

            <Divider />

            {/* FECHAS */}
            <Box>
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Schedule sx={{ mr: 1, fontSize: 18, color: '#999' }} />
                  <Box>
                    <Typography variant="caption" sx={{ color: '#666' }}>
                      Fecha Límite
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {new Date(task.fecha_limite).toLocaleDateString('es-CL', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Schedule sx={{ mr: 1, fontSize: 18, color: '#999' }} />
                  <Box>
                    <Typography variant="caption" sx={{ color: '#666' }}>
                      Fecha de Creación
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {formatDate(task.fecha_creacion)}
                    </Typography>
                  </Box>
                </Box>
              </Stack>
            </Box>
          </Stack>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2 }}>
        <Button
          onClick={onClose}
          variant="outlined"
        >
          Cerrar
        </Button>
        {onEdit && task && (
          <Button
            onClick={() => {
              onEdit(task);
              onClose();
            }}
            variant="contained"
            color="primary"
            startIcon={<Edit />}
          >
            Editar
          </Button>
        )}
        {onDelete && task && (
          <Button
            onClick={() => {
              if (window.confirm('¿Estás seguro de que deseas eliminar esta tarea?')) {
                onDelete(task.id);
                onClose();
              }
            }}
            variant="outlined"
            color="error"
            startIcon={<Delete />}
          >
            Eliminar
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default TaskDetailModal;
