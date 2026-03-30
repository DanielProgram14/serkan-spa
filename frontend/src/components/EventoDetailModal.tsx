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
} from '@mui/material';
import {
  Schedule,
  Close,
  Edit,
  Delete,
  EventNote,
  Person,
  Flag,
} from '@mui/icons-material';
import api from '../api/axios';
import { confirmAction } from '../utils/alerts';

interface Evento {
  id: number;
  titulo: string;
  descripcion?: string;
  tipo: 'SISTEMA' | 'ASIGNADO' | 'PERSONAL';
  importancia: 'ALTA' | 'MEDIA' | 'BAJA';
  fecha: string;
  hora_inicio?: string;
  hora_fin?: string;
  creado_por: number;
  creado_por_nombre?: string;
  trabajadores_asignados?: Array<{
    rut: string;
    nombres: string;
    apellidos: string;
    nombre_completo: string;
    cargo: string;
  }>;
  visibilidad_privada: boolean;
  tarea_relacionada?: number;
  tarea_nombre?: string;
  created_at: string;
  updated_at: string;
}

interface EventoDetailModalProps {
  open: boolean;
  eventoId: number | null;
  onClose: () => void;
  onEdit?: (evento: Evento) => void;
  onDelete?: (eventoId: number) => Promise<void>;
}

const EventoDetailModal: React.FC<EventoDetailModalProps> = ({
  open,
  eventoId,
  onClose,
  onEdit,
  onDelete,
}) => {
  const [evento, setEvento] = useState<Evento | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open || !eventoId) {
      setEvento(null);
      setError(null);
      return;
    }

    const fetchEvento = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/eventos/${eventoId}/`);
        setEvento(response.data);
      } catch (err) {
        setError('Error al cargar los detalles del evento');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvento();
  }, [eventoId, open]);

  const getTypeColor = (tipo: string) => {
    switch (tipo) {
      case 'SISTEMA':
        return 'primary';
      case 'ASIGNADO':
        return 'success';
      case 'PERSONAL':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getImportanceColor = (importancia: string) => {
    switch (importancia) {
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

  const getTypeLabel = (tipo: string) => {
    switch (tipo) {
      case 'SISTEMA':
        return 'Del Sistema';
      case 'ASIGNADO':
        return 'Asignado';
      case 'PERSONAL':
        return 'Personal';
      default:
        return tipo;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return null;
    const [hours, minutes] = timeString.split(':');
    return `${hours}:${minutes}`;
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
          Detalles del Evento
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

        {evento && (
          <Stack spacing={2}>
            {/* TÍTULO Y TIPO */}
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                {evento.titulo}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                <Chip
                  label={getTypeLabel(evento.tipo)}
                  color={getTypeColor(evento.tipo) as any}
                  size="small"
                  icon={<EventNote />}
                />
                <Chip
                  label={`Importancia: ${evento.importancia}`}
                  color={getImportanceColor(evento.importancia) as any}
                  size="small"
                  icon={<Flag />}
                />
                {evento.visibilidad_privada && (
                  <Chip
                    label="Privado"
                    size="small"
                    variant="outlined"
                  />
                )}
              </Stack>
            </Box>

            <Divider />

            {/* DESCRIPCIÓN */}
            {evento.descripcion && (
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
                  <Typography variant="body2">{evento.descripcion}</Typography>
                </Paper>
              </Box>
            )}

            <Divider />

            {/* INFORMACIÓN DE FECHA Y HORA */}
            <Box>
              <Stack spacing={1.5}>
                {/* FECHA */}
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                    <Schedule sx={{ mr: 0.5, fontSize: 18, verticalAlign: 'middle' }} />
                    Fecha
                  </Typography>
                  <Typography variant="body2" sx={{ ml: 3.5 }}>
                    {formatDate(evento.fecha)}
                  </Typography>
                </Paper>

                {/* HORARIO */}
                {(evento.hora_inicio || evento.hora_fin) && (
                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                      <Schedule sx={{ mr: 0.5, fontSize: 18, verticalAlign: 'middle' }} />
                      Horario
                    </Typography>
                    <Typography variant="body2" sx={{ ml: 3.5 }}>
                      {evento.hora_inicio ? formatTime(evento.hora_inicio) : '—'}
                      {evento.hora_fin && ` a ${formatTime(evento.hora_fin)}`}
                    </Typography>
                  </Paper>
                )}
              </Stack>
            </Box>

            <Divider />

            {/* CREADOR */}
            {evento.creado_por_nombre && (
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                  <Person sx={{ mr: 0.5, fontSize: 18, verticalAlign: 'middle' }} />
                  Creado por
                </Typography>
                <Typography variant="body2" sx={{ ml: 3.5 }}>
                  {evento.creado_por_nombre}
                </Typography>
              </Paper>
            )}

            {/* TRABAJADORES ASIGNADOS */}
            {evento.trabajadores_asignados && evento.trabajadores_asignados.length > 0 && (
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  <Person sx={{ mr: 0.5, fontSize: 18, verticalAlign: 'middle' }} />
                  Asignados a ({evento.trabajadores_asignados.length})
                </Typography>
                <Stack spacing={0.75} sx={{ ml: 3.5 }}>
                  {evento.trabajadores_asignados.map((trabajador) => (
                    <Box key={trabajador.rut}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {trabajador.nombre_completo}
                      </Typography>
                      {trabajador.cargo && (
                        <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>
                          {trabajador.cargo}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Stack>
              </Paper>
            )}

            {/* TAREA RELACIONADA */}
            {evento.tarea_nombre && (
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1, backgroundColor: '#f0f9ff' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                  📋 Tarea Relacionada
                </Typography>
                <Typography variant="body2" sx={{ ml: 1 }}>
                  {evento.tarea_nombre}
                </Typography>
              </Paper>
            )}

            <Divider />

            {/* METADATOS */}
            <Box sx={{ pt: 1 }}>
              <Typography variant="caption" sx={{ color: '#999' }}>
                Creado: {new Date(evento.created_at).toLocaleDateString('es-CL')}
              </Typography>
              <Typography variant="caption" sx={{ color: '#999', display: 'block' }}>
                Actualizado: {new Date(evento.updated_at).toLocaleDateString('es-CL')}
              </Typography>
            </Box>
          </Stack>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          disabled={deleting}
        >
          Cerrar
        </Button>
        {onEdit && evento && (
          <Button
            onClick={() => {
              onEdit(evento);
              onClose();
            }}
            variant="contained"
            color="primary"
            startIcon={<Edit />}
            disabled={deleting}
          >
            Editar
          </Button>
        )}
        {onDelete && evento && (
          <Button
            onClick={async () => {
              const isConfirmed = await confirmAction('¿Eliminar evento?', '¿Estás seguro de que deseas eliminar este evento?', 'Sí, eliminar');
              if (isConfirmed) {
                setDeleting(true);
                try {
                  await onDelete(evento.id);
                  onClose();
                } catch (err: any) {
                  setError(err.message || 'Error al eliminar el evento');
                } finally {
                  setDeleting(false);
                }
              }
            }}
            variant="outlined"
            color="error"
            startIcon={<Delete />}
            disabled={deleting}
          >
            {deleting ? 'Eliminando...' : 'Eliminar'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default EventoDetailModal;
