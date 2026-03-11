import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  MenuItem,
  Stack,
  FormControlLabel,
  Switch,
  CircularProgress,
  Alert,
  Divider,
  Autocomplete,
} from '@mui/material';
import api from '../api/axios';

interface Trabajador {
  rut: string;
  nombres: string;
  apellidos: string;
  nombre_completo?: string;
  cargo: string;
}

interface EventoFormData {
  titulo: string;
  descripcion: string;
  tipo: 'SISTEMA' | 'ASIGNADO' | 'PERSONAL';
  importancia: 'ALTA' | 'MEDIA' | 'BAJA';
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  trabajadores_asignados_ids: string[];
  visibilidad_privada: boolean;
}

interface EventoFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  editingEvent?: any;
}

const EventoFormModal: React.FC<EventoFormModalProps> = ({
  open,
  onClose,
  onSuccess,
  editingEvent,
}) => {
  const [formData, setFormData] = useState<EventoFormData>({
    titulo: '',
    descripcion: '',
    tipo: 'PERSONAL',
    importancia: 'MEDIA',
    fecha: new Date().toISOString().split('T')[0],
    hora_inicio: '09:00',
    hora_fin: '10:00',
    trabajadores_asignados_ids: [],
    visibilidad_privada: false,
  });

  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Cargar trabajadores disponibles
  useEffect(() => {
    if (!open) return;

    const fetchTrabajadores = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get('/trabajadores/');
        if (!response.data || response.data.length === 0) {
          console.warn('No hay trabajadores disponibles');
        }
        // Procesar los datos para asegurar que tengan nombre_completo
        const procesados = (response.data || []).map((t: any) => ({
          ...t,
          nombre_completo: t.nombre_completo || `${t.nombres || ''} ${t.apellidos || ''}`.trim(),
        }));
        setTrabajadores(procesados);
      } catch (err: any) {
        console.error('Error cargando trabajadores:', err.response || err.message);
        setError('Error al cargar los trabajadores. Por favor, intenta de nuevo.');
      } finally {
        setLoading(false);
      }
    };

    fetchTrabajadores();
  }, [open]);

  // Si estamos editando, llenar el formulario con los datos existentes
  useEffect(() => {
    if (editingEvent && open) {
      setFormData({
        titulo: editingEvent.titulo || '',
        descripcion: editingEvent.descripcion || '',
        tipo: editingEvent.tipo || 'PERSONAL',
        importancia: editingEvent.importancia || 'MEDIA',
        fecha: editingEvent.fecha || new Date().toISOString().split('T')[0],
        hora_inicio: editingEvent.hora_inicio || '09:00',
        hora_fin: editingEvent.hora_fin || '10:00',
        trabajadores_asignados_ids: editingEvent.trabajadores_asignados?.map((t: any) => t.rut) || [],
        visibilidad_privada: editingEvent.visibilidad_privada || false,
      });
    } else {
      setFormData({
        titulo: '',
        descripcion: '',
        tipo: 'PERSONAL',
        importancia: 'MEDIA',
        fecha: new Date().toISOString().split('T')[0],
        hora_inicio: '09:00',
        hora_fin: '10:00',
        trabajadores_asignados_ids: [],
        visibilidad_privada: false,
      });
    }
    setError(null);
    setSuccess(false);
  }, [editingEvent, open]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target as any;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleTypeChange = (e: any) => {
    const newTipo = e.target.value;
    setFormData({
      ...formData,
      tipo: newTipo,
      visibilidad_privada: newTipo === 'PERSONAL' ? true : formData.visibilidad_privada,
    });
    setError(null); // Limpiar errores al cambiar tipo
  };

  const handleWorkerChange = (event: any, newValue: Trabajador[]) => {
    setFormData({
      ...formData,
      trabajadores_asignados_ids: newValue.map((t) => t.rut),
    });
  };

  const handleSubmit = async () => {
    // Validaciones básicas
    if (!formData.titulo.trim()) {
      setError('El título es obligatorio');
      return;
    }

    if (!formData.fecha) {
      setError('La fecha es obligatoria');
      return;
    }

    if (formData.tipo === 'ASIGNADO' && formData.trabajadores_asignados_ids.length === 0) {
      setError('Debes asignar al menos un trabajador para eventos asignados');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        titulo: formData.titulo.trim(),
        descripcion: formData.descripcion.trim(),
        tipo: formData.tipo,
        importancia: formData.importancia,
        fecha: formData.fecha,
        hora_inicio: formData.hora_inicio || null,
        hora_fin: formData.hora_fin || null,
        trabajadores_asignados_ids: formData.trabajadores_asignados_ids,
        visibilidad_privada: formData.tipo === 'PERSONAL' ? true : formData.visibilidad_privada,
      };

      if (editingEvent) {
        // Actualizar evento existente
        await api.put(`/eventos/${editingEvent.id}/`, payload);
      } else {
        // Crear nuevo evento
        await api.post('/eventos/', payload);
      }

      setSuccess(true);
      setFormData({
        titulo: '',
        descripcion: '',
        tipo: 'PERSONAL',
        importancia: 'MEDIA',
        fecha: new Date().toISOString().split('T')[0],
        hora_inicio: '09:00',
        hora_fin: '10:00',
        trabajadores_asignados_ids: [],
        visibilidad_privada: false,
      });

      setTimeout(() => {
        onClose();
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
        Object.values(err.response?.data || {}).join(', ') ||
        'Error al guardar el evento'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2, boxShadow: 3 },
      }}
    >
      <DialogTitle sx={{ fontWeight: 'bold' }}>
        {editingEvent ? 'Editar Evento' : 'Crear Nuevo Evento'}
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 2, maxHeight: '70vh', overflowY: 'auto' }}>
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {editingEvent ? 'Evento actualizado correctamente' : 'Evento creado correctamente'}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Stack spacing={2}>
          {/* TÍTULO */}
          <TextField
            fullWidth
            label="Título del Evento"
            name="titulo"
            value={formData.titulo}
            onChange={handleInputChange}
            placeholder="Ej: Reunión con cliente, Capacitación..."
            required
            disabled={submitting}
          />

          {/* DESCRIPCIÓN */}
          <TextField
            fullWidth
            label="Descripción"
            name="descripcion"
            value={formData.descripcion}
            onChange={handleInputChange}
            placeholder="Detalles adicionales..."
            multiline
            rows={3}
            disabled={submitting}
          />

          <Divider />

          {/* TIPO DE EVENTO */}
          <TextField
            fullWidth
            select
            label="Tipo de Evento"
            name="tipo"
            value={formData.tipo}
            onChange={handleTypeChange}
            disabled={submitting}
          >
            <MenuItem value="SISTEMA">Sistema (Visible para todos)</MenuItem>
            <MenuItem value="ASIGNADO">Asignado (A trabajadores específicos)</MenuItem>
            <MenuItem value="PERSONAL">Personal (Solo para mí)</MenuItem>
          </TextField>

          {/* IMPORTANCIA */}
          <TextField
            fullWidth
            select
            label="Nivel de Importancia"
            name="importancia"
            value={formData.importancia}
            onChange={handleInputChange}
            disabled={submitting}
          >
            <MenuItem value="BAJA">Baja</MenuItem>
            <MenuItem value="MEDIA">Media</MenuItem>
            <MenuItem value="ALTA">Alta</MenuItem>
          </TextField>

          <Divider />

          {/* FECHA */}
          <TextField
            fullWidth
            type="date"
            label="Fecha"
            name="fecha"
            value={formData.fecha}
            onChange={handleInputChange}
            InputLabelProps={{ shrink: true }}
            required
            disabled={submitting}
          />

          {/* HORA INICIO */}
          <TextField
            fullWidth
            type="time"
            label="Hora de Inicio"
            name="hora_inicio"
            value={formData.hora_inicio}
            onChange={handleInputChange}
            InputLabelProps={{ shrink: true }}
            disabled={submitting}
          />

          {/* HORA FIN */}
          <TextField
            fullWidth
            type="time"
            label="Hora de Fin"
            name="hora_fin"
            value={formData.hora_fin}
            onChange={handleInputChange}
            InputLabelProps={{ shrink: true }}
            disabled={submitting}
          />

          <Divider />

          {/* ASIGNAR A TRABAJADORES - Solo para eventos ASIGNADO */}
          {formData.tipo === 'ASIGNADO' && (
            <Box>
              {loading ? (
                <CircularProgress size={24} />
              ) : trabajadores.length === 0 ? (
                <Alert severity="warning">
                  No hay trabajadores disponibles para asignar
                </Alert>
              ) : (
                <Autocomplete
                  multiple
                  options={trabajadores}
                  getOptionLabel={(option) => 
                    option.nombre_completo || `${option.nombres} ${option.apellidos}` || option.rut
                  }
                  value={trabajadores.filter((t) =>
                    formData.trabajadores_asignados_ids.includes(t.rut)
                  )}
                  onChange={handleWorkerChange}
                  disabled={submitting || loading}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Asignar a Trabajadores"
                      placeholder="Busca y selecciona trabajadores..."
                      required
                    />
                  )}
                />
              )}
            </Box>
          )}

          {/* PRIVACIDAD - Solo para eventos PERSONAL */}
          {formData.tipo === 'PERSONAL' && (
            <FormControlLabel
              control={
                <Switch
                  checked={formData.visibilidad_privada}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      visibilidad_privada: e.target.checked,
                    })
                  }
                  disabled={submitting}
                />
              }
              label="Solo tú puedes ver este evento"
            />
          )}
        </Stack>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2 }}>
        <Button
          onClick={onClose}
          disabled={submitting}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={submitting || loading}
        >
          {submitting ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
          {editingEvent ? 'Actualizar' : 'Crear Evento'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EventoFormModal;
