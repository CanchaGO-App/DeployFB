from rest_framework import serializers
from django.contrib.auth.hashers import check_password, make_password
from django.db.models import Avg
from .models import Usuario, Local, Cancha, Reserva, Resena, Notificacion, Favorito, Pago


class UsuarioSerializer(serializers.ModelSerializer):
    foto_perfil_url = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = ['id', 'nombre', 'correo', 'rol', 'foto_perfil', 'foto_perfil_url', 'created_at']

    def get_foto_perfil_url(self, obj):
        if obj.foto_perfil:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.foto_perfil.url)
            return obj.foto_perfil.url
        return None


class PerfilSerializer(serializers.ModelSerializer):
    """Serializer para editar el perfil del usuario autenticado."""
    contrasena_actual = serializers.CharField(write_only=True, required=False)
    nueva_contrasena = serializers.CharField(write_only=True, required=False, min_length=6)
    foto_perfil_url = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = ['id', 'nombre', 'correo', 'rol', 'foto_perfil', 'foto_perfil_url', 'contrasena_actual', 'nueva_contrasena']
        read_only_fields = ['id', 'rol']

    def get_foto_perfil_url(self, obj):
        if obj.foto_perfil:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.foto_perfil.url)
            return obj.foto_perfil.url
        return None

    def validate(self, data):
        nueva = data.get('nueva_contrasena')
        actual = data.get('contrasena_actual')

        if nueva and not actual:
            raise serializers.ValidationError(
                "Debes ingresar tu contraseña actual para cambiarla."
            )

        if actual:
            if not check_password(actual, self.instance.contrasena):
                raise serializers.ValidationError(
                    "La contraseña actual es incorrecta."
                )

        return data

    def update(self, instance, validated_data):
        validated_data.pop('contrasena_actual', None)
        nueva = validated_data.pop('nueva_contrasena', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if nueva:
            instance.contrasena = make_password(nueva)

        instance.save()
        return instance


class RegistroSerializer(serializers.ModelSerializer):
    contrasena = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = Usuario
        fields = ['id', 'nombre', 'correo', 'contrasena', 'rol']

    def validate_correo(self, value):
        if Usuario.objects.filter(correo=value).exists():
            raise serializers.ValidationError("Ya existe un usuario con este correo.")
        return value

    def create(self, validated_data):
        return Usuario.objects.create(**validated_data)


class LoginSerializer(serializers.Serializer):
    correo = serializers.EmailField()
    contrasena = serializers.CharField()

    def validate(self, data):
        try:
            usuario = Usuario.objects.get(correo=data['correo'])
        except Usuario.DoesNotExist:
            raise serializers.ValidationError("Correo o contraseña incorrectos.")

        if not check_password(data['contrasena'], usuario.contrasena):
            raise serializers.ValidationError("Correo o contraseña incorrectos.")

        data['usuario'] = usuario
        return data


# =============================================
#  LOCAL (Complejo Deportivo)
# =============================================

class LocalSerializer(serializers.ModelSerializer):
    dueno_nombre = serializers.CharField(source='dueno.nombre', read_only=True)
    total_canchas = serializers.IntegerField(read_only=True)
    calificacion_promedio = serializers.FloatField(read_only=True)
    total_resenas = serializers.IntegerField(read_only=True)
    imagen_portada_url = serializers.SerializerMethodField()
    qr_code_url = serializers.SerializerMethodField()

    class Meta:
        model = Local
        fields = [
            'id', 'nombre', 'direccion', 'descripcion',
            'latitud', 'longitud',
            'imagen_portada', 'imagen_portada_url',
            'qr_code', 'qr_code_url', 'qr_expiry',
            'hora_apertura', 'hora_cierre',
            'telefonos',
            'dueno', 'dueno_nombre',
            'total_canchas', 'calificacion_promedio', 'total_resenas',
            'created_at',
        ]
        extra_kwargs = {
            'qr_code': {'required': True},
            'qr_expiry': {'required': True},
        }

    def get_imagen_portada_url(self, obj):
        if obj.imagen_portada:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.imagen_portada.url)
            return obj.imagen_portada.url
        return None

    def get_qr_code_url(self, obj):
        if obj.qr_code:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.qr_code.url)
            return obj.qr_code.url
        return None


class LocalDetalleSerializer(LocalSerializer):
    """Serializer extendido con las canchas del local incluidas."""
    canchas = serializers.SerializerMethodField()

    class Meta(LocalSerializer.Meta):
        fields = LocalSerializer.Meta.fields + ['canchas']

    def get_canchas(self, obj):
        canchas = obj.canchas.all().order_by('nombre')
        return CanchaSerializer(
            canchas, many=True, context=self.context
        ).data


# =============================================
#  CANCHA
# =============================================

class CanchaSerializer(serializers.ModelSerializer):
    # Datos heredados del Local
    local_nombre = serializers.CharField(source='local.nombre', read_only=True)
    local_direccion = serializers.CharField(source='local.direccion', read_only=True)
    dueno_nombre = serializers.CharField(source='local.dueno.nombre', read_only=True)
    calificacion_promedio = serializers.FloatField(read_only=True)
    total_resenas = serializers.IntegerField(read_only=True)
    imagen_url = serializers.SerializerMethodField()

    class Meta:
        model = Cancha
        fields = [
            'id', 'nombre', 'descripcion', 'precio_por_hora',
            'tipo', 'capacidad', 'imagen', 'imagen_url',
            'local', 'local_nombre', 'local_direccion',
            'dueno_nombre', 'calificacion_promedio', 'total_resenas',
            'created_at'
        ]

    def get_imagen_url(self, obj):
        if obj.imagen:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.imagen.url)
            return obj.imagen.url
        return None


class ReservaSerializer(serializers.ModelSerializer):
    cancha_nombre = serializers.CharField(source='cancha.nombre', read_only=True)
    cliente_nombre = serializers.CharField(source='cliente.nombre', read_only=True)
    local_nombre = serializers.CharField(source='cancha.local.nombre', read_only=True)
    local = serializers.IntegerField(source='cancha.local.id', read_only=True)
    participantes = UsuarioSerializer(many=True, read_only=True)

    class Meta:
        model = Reserva
        fields = [
            'id', 'cliente', 'cliente_nombre', 'cancha', 'cancha_nombre',
            'local_nombre', 'local', 'fecha', 'hora_inicio', 'hora_fin', 'estado',
            'ticket_code', 'participantes', 'created_at'
        ]

    def validate(self, data):
        estado = data.get('estado')
        if estado == 'pendiente':
            raise serializers.ValidationError(
                {'estado': 'El estado pendiente ya no está disponible.'}
            )
        if self.instance is None:
            cancha = data.get('cancha')
            if cancha and hasattr(cancha.local, 'qr_code') and cancha.local.qr_code:
                data['estado'] = 'pendiente_pago'
            else:
                data['estado'] = 'confirmada'

        hora_inicio = data.get('hora_inicio')
        hora_fin = data.get('hora_fin')

        if hora_fin and hora_inicio:
            if hora_fin <= hora_inicio:
                raise serializers.ValidationError(
                    "La hora de fin debe ser posterior a la hora de inicio."
                )

            # Validar bloques de 1 hora exacta
            minutos_inicio = hora_inicio.hour * 60 + hora_inicio.minute
            minutos_fin = hora_fin.hour * 60 + hora_fin.minute
            diferencia = minutos_fin - minutos_inicio

            if diferencia % 60 != 0:
                raise serializers.ValidationError(
                    "Las reservas deben ser en bloques exactos de 1 hora."
                )

        cancha = data.get('cancha')
        fecha = data.get('fecha')

        if cancha and fecha and hora_inicio and hora_fin:
            from django.utils import timezone
            import datetime
            naive_datetime = datetime.datetime.combine(fecha, hora_inicio)
            from django.conf import settings
            if settings.USE_TZ:
                current_tz = timezone.get_current_timezone()
                slot_datetime = timezone.make_aware(naive_datetime, current_tz)
                now = timezone.localtime(timezone.now())
            else:
                slot_datetime = naive_datetime
                now = datetime.datetime.now()

            if slot_datetime < now - datetime.timedelta(minutes=1):
                raise serializers.ValidationError(
                    "No se pueden realizar reservas para fechas u horarios pasados."
                )

            reservas_existentes = Reserva.objects.filter(
                cancha=cancha, fecha=fecha,
                estado__in=['confirmada', 'pendiente_pago']
            ).exclude(pk=self.instance.pk if self.instance else None)

            for reserva in reservas_existentes:
                if hora_inicio < reserva.hora_fin and hora_fin > reserva.hora_inicio:
                    raise serializers.ValidationError(
                        f"La cancha ya está reservada de {reserva.hora_inicio} a {reserva.hora_fin}."
                    )

        return data


class ResenaSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source='cliente.nombre', read_only=True)

    class Meta:
        model = Resena
        fields = ['id', 'cliente', 'cliente_nombre', 'cancha',
                  'calificacion', 'comentario', 'created_at']

    def validate(self, data):
        if self.instance is None:
            cliente = data.get('cliente')
            cancha = data.get('cancha')

            # Verificar que el cliente haya reservado esta cancha antes
            if cliente and cancha:
                tiene_reserva = Reserva.objects.filter(
                    cliente=cliente, cancha=cancha,
                    estado='confirmada'
                ).exists()
                if not tiene_reserva:
                    raise serializers.ValidationError(
                        "Solo puedes reseñar canchas que hayas reservado."
                    )

        return data


class NotificacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notificacion
        fields = ['id', 'titulo', 'mensaje', 'tipo', 'leida', 'created_at']


class FavoritoSerializer(serializers.ModelSerializer):
    local_nombre = serializers.CharField(source='local.nombre', read_only=True)
    local_direccion = serializers.CharField(source='local.direccion', read_only=True)
    local_imagen = serializers.SerializerMethodField()

    class Meta:
        model = Favorito
        fields = ['id', 'cliente', 'local', 'local_nombre', 'local_direccion', 'local_imagen', 'created_at']

    def get_local_imagen(self, obj):
        if obj.local.imagen_portada:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.local.imagen_portada.url)
            return obj.local.imagen_portada.url
        return None


class PagoSerializer(serializers.ModelSerializer):
    reserva_detalle = ReservaSerializer(source='reserva', read_only=True)
    comprobante_url = serializers.SerializerMethodField()

    class Meta:
        model = Pago
        fields = ['id', 'reserva', 'reserva_detalle', 'monto', 'comprobante', 'comprobante_url', 'estado', 'created_at']
        read_only_fields = ['estado']

    def get_comprobante_url(self, obj):
        if obj.comprobante:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.comprobante.url)
            return obj.comprobante.url
        return None
