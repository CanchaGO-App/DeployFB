from django.db import migrations

TRIGGER_FN = """
CREATE OR REPLACE FUNCTION fn_verificar_disponibilidad()
RETURNS TRIGGER AS $$
DECLARE
    conflictos INT;
BEGIN
    SELECT COUNT(*) INTO conflictos
    FROM usuarios_reserva
    WHERE cancha_id = NEW.cancha_id
      AND fecha = NEW.fecha
      AND estado IN ('confirmada', 'pendiente_pago')
      AND hora_inicio < NEW.hora_fin
      AND hora_fin > NEW.hora_inicio
      AND id != COALESCE(NEW.id, 0);

    IF conflictos > 0 THEN
        RAISE EXCEPTION 'La cancha ya esta reservada en ese horario';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
"""

CREATE_TRIGGER = """
DROP TRIGGER IF EXISTS trigger_verificar_disponibilidad ON usuarios_reserva;
CREATE TRIGGER trigger_verificar_disponibilidad
    BEFORE INSERT OR UPDATE ON usuarios_reserva
    FOR EACH ROW
    EXECUTE FUNCTION fn_verificar_disponibilidad();
"""

DROP_TRIGGER = """
DROP TRIGGER IF EXISTS trigger_verificar_disponibilidad ON usuarios_reserva;
DROP FUNCTION IF EXISTS fn_verificar_disponibilidad;
"""


class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0009_alter_pago_estado_alter_reserva_created_at_and_more'),
    ]

    operations = [
        migrations.RunSQL(TRIGGER_FN + CREATE_TRIGGER, DROP_TRIGGER),
    ]
