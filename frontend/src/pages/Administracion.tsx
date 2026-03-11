import { useState } from 'react';
import { Box, Paper, List, ListItemButton, ListItemIcon, ListItemText, Typography } from '@mui/material';
import { Person, TableChart, Visibility } from '@mui/icons-material';
import CuentasUsuarios from './admin/CuentasUsuarios';
import TablasMaestras from './admin/TablasMaestras';

const Administracion = () => {
    const [tab, setTab] = useState(0);

    return (
        <Box sx={{ display: 'flex', gap: 4, alignItems: 'flex-start' }}>
            {/* SIDEBAR */}
            <Paper elevation={0} sx={{ width: 280, minHeight: '80vh', p: 2, bgcolor: '#fff', border: '1px solid #e2e8f0', borderRadius: 4 }}>
                <Typography variant="h6" fontWeight="bold" sx={{ px: 2, mb: 3, mt: 1, color: '#1e293b' }}>
                    Administración
                </Typography>
                
                <List>
                    <ListItemButton selected={tab === 0} onClick={() => setTab(0)} sx={{ borderRadius: 2, mb: 1, '&.Mui-selected': { bgcolor: '#eff6ff', color: '#2563eb' } }}>
                        <ListItemIcon><Person sx={{ color: tab === 0 ? '#2563eb' : 'inherit' }} /></ListItemIcon>
                        <ListItemText primary="Cuentas / Usuarios" primaryTypographyProps={{ fontWeight: tab === 0 ? 'bold' : 'normal' }} />
                    </ListItemButton>
                    
                    <ListItemButton selected={tab === 1} onClick={() => setTab(1)} sx={{ borderRadius: 2, mb: 1, '&.Mui-selected': { bgcolor: '#eff6ff', color: '#2563eb' } }}>
                        <ListItemIcon><TableChart sx={{ color: tab === 1 ? '#2563eb' : 'inherit' }} /></ListItemIcon>
                        <ListItemText primary="Tablas Maestras" primaryTypographyProps={{ fontWeight: tab === 1 ? 'bold' : 'normal' }} />
                    </ListItemButton>

                    <ListItemButton selected={tab === 2} onClick={() => setTab(2)} sx={{ borderRadius: 2, mb: 1, '&.Mui-selected': { bgcolor: '#eff6ff', color: '#2563eb' } }}>
                        <ListItemIcon><Visibility sx={{ color: tab === 2 ? '#2563eb' : 'inherit' }} /></ListItemIcon>
                        <ListItemText primary="Auditoría Global" primaryTypographyProps={{ fontWeight: tab === 2 ? 'bold' : 'normal' }} />
                    </ListItemButton>
                </List>
            </Paper>

            {/* CONTENIDO */}
            <Box sx={{ flex: 1 }}>
                {tab === 0 && <CuentasUsuarios />}
                {tab === 1 && <TablasMaestras />}
                {tab === 2 && (
                    <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 4 }}>
                        <Typography variant="h6" color="text.secondary">Módulo de Auditoría en construcción...</Typography>
                    </Paper>
                )}
            </Box>
        </Box>
    );
};
export default Administracion;