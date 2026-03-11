# Generated migration to fix herramienta stock_disponible values

from django.db import migrations

def recalcular_stock_disponible(apps, schema_editor):
    """Recalcula stock_disponible para todas las herramientas basado en asignaciones activas"""
    Herramienta = apps.get_model('api', 'Herramienta')
    HerramientaAsignacion = apps.get_model('api', 'HerramientaAsignacion')
    
    for herramienta in Herramienta.objects.all():
        # Calcular cantidad asignada activamente
        asignaciones_activas = HerramientaAsignacion.objects.filter(
            herramienta=herramienta,
            estado='ACTIVA'
        )
        cantidad_asignada = sum(a.cantidad for a in asignaciones_activas)
        
        # Nuevo stock disponible = stock total - cantidad asignada
        nuevo_disponible = herramienta.stock_total - cantidad_asignada
        nuevo_disponible = max(0, min(nuevo_disponible, herramienta.stock_total))
        
        # Actualizar si es diferente
        if herramienta.stock_disponible != nuevo_disponible:
            herramienta.stock_disponible = nuevo_disponible
            
            # Actualizar estado si es necesario
            if nuevo_disponible == herramienta.stock_total:
                herramienta.estado = 'DISPONIBLE'
            elif nuevo_disponible < herramienta.stock_total:
                herramienta.estado = 'ASIGNADA'
                
            herramienta.save(update_fields=["stock_disponible", "estado"])

def reverse_migration(apps, schema_editor):
    """Reverse no hace nada en este caso"""
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('api', '0013_alter_ordencompraitem_producto'),
    ]

    operations = [
        migrations.RunPython(recalcular_stock_disponible, reverse_migration),
    ]
