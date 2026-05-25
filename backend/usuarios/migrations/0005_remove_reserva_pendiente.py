from django.db import migrations, models


def confirmar_reservas_pendientes(apps, schema_editor):
    Reserva = apps.get_model('usuarios', 'Reserva')
    Reserva.objects.filter(estado='pendiente').update(estado='confirmada')


class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0004_local_telefonos'),
    ]

    operations = [
        migrations.RunPython(confirmar_reservas_pendientes, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='reserva',
            name='estado',
            field=models.CharField(
                choices=[('confirmada', 'Confirmada'), ('cancelada', 'Cancelada')],
                default='confirmada',
                max_length=20,
            ),
        ),
    ]
