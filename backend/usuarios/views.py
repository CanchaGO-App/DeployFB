from datetime import date, timedelta, datetime, time
from datetime import timezone as dt_timezone
from django.utils import timezone
from django.core.exceptions import ObjectDoesNotExist
from django.core.mail import send_mail
from django.conf import settings
from django.db.models import Count, Q, Avg
from django.db.models.functions import TruncDate, TruncMonth
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import api_view, permission_classes, parser_classes, action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from .models import Usuario, Local, Cancha, Reserva, Resena, Notificacion, Favorito, Pago
from .serializers import (
    UsuarioSerializer, RegistroSerializer, LoginSerializer, PerfilSerializer,
    LocalSerializer, LocalDetalleSerializer,
    CanchaSerializer, ReservaSerializer, ResenaSerializer,
    NotificacionSerializer, FavoritoSerializer, PagoSerializer
)
from .authentication import generar_tokens


# =============================================
#  AUTENTICACIÓN
# =============================================

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def registro_view(request):
    serializer = RegistroSerializer(data=request.data)
    if serializer.is_valid():
        usuario = serializer.save()
        tokens = generar_tokens(usuario)
        return Response({
            'usuario': UsuarioSerializer(usuario, context={'request': request}).data,
            'tokens': tokens,
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login_view(request):
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        usuario = serializer.validated_data['usuario']
        tokens = generar_tokens(usuario)
        return Response({
            'usuario': UsuarioSerializer(usuario, context={'request': request}).data,
            'tokens': tokens,
        })
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def me_view(request):
    if not hasattr(request, 'usuario'):
        return Response({'error': 'No autenticado'}, status=401)

    if request.method == 'DELETE':
        usuario = request.usuario
        usuario.delete()
        return Response({'success': True, 'detail': 'Cuenta eliminada correctamente.'}, status=status.HTTP_200_OK)

    if request.method == 'PATCH':
        serializer = PerfilSerializer(
            request.usuario, data=request.data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(UsuarioSerializer(request.usuario, context={'request': request}).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    return Response(UsuarioSerializer(request.usuario, context={'request': request}).data)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def refresh_token_view(request):
    from .authentication import refrescar_access_token
    refresh = request.data.get('refresh')
    if not refresh:
        return Response({'error': 'Refresh token requerido'}, status=400)
    try:
        new_access = refrescar_access_token(refresh)
        return Response({'access': new_access})
    except Exception as e:
        return Response({'error': str(e)}, status=401)


# =============================================
#  LOCALES (Complejos Deportivos)
# =============================================

class LocalViewSet(viewsets.ModelViewSet):
    serializer_class = LocalSerializer
    permission_classes = [permissions.AllowAny]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return LocalDetalleSerializer
        return LocalSerializer

    def get_serializer_context(self):
        return {'request': self.request}

    def get_queryset(self):
        queryset = Local.objects.all().order_by('-created_at')

        # Filtro por dueño
        dueno = self.request.query_params.get('dueno')
        if dueno:
            queryset = queryset.filter(dueno_id=dueno)

        # Búsqueda por nombre o dirección
        buscar = self.request.query_params.get('buscar')
        if buscar:
            queryset = queryset.filter(
                Q(nombre__icontains=buscar) | Q(direccion__icontains=buscar)
            )

        # Filtro por tipo de cancha dentro del local
        tipo = self.request.query_params.get('tipo')
        if tipo:
            queryset = queryset.filter(canchas__tipo=tipo).distinct()

        # Filtro por rango de precio (precio mínimo de las canchas del local)
        precio_min = self.request.query_params.get('precio_min')
        precio_max = self.request.query_params.get('precio_max')
        if precio_min:
            queryset = queryset.filter(canchas__precio_por_hora__gte=precio_min).distinct()
        if precio_max:
            queryset = queryset.filter(canchas__precio_por_hora__lte=precio_max).distinct()

        # Filtro geográfico (bounding box)
        lat_min = self.request.query_params.get('lat_min')
        lat_max = self.request.query_params.get('lat_max')
        lng_min = self.request.query_params.get('lng_min')
        lng_max = self.request.query_params.get('lng_max')
        if all([lat_min, lat_max, lng_min, lng_max]):
            queryset = queryset.filter(
                latitud__gte=lat_min, latitud__lte=lat_max,
                longitud__gte=lng_min, longitud__lte=lng_max,
            )

        return queryset

    @action(detail=True, methods=['get'])
    def disponibilidad(self, request, pk=None):
        """Disponibilidad unificada de TODAS las canchas del local para una fecha."""
        local = self.get_object()
        fecha_str = request.query_params.get('fecha')

        if fecha_str:
            try:
                from datetime import datetime
                fecha = datetime.strptime(fecha_str, '%Y-%m-%d').date()
            except ValueError:
                return Response({'error': 'Formato de fecha inválido. Use YYYY-MM-DD'}, status=400)
        else:
            fecha = date.today()

        canchas = local.canchas.all().order_by('nombre')
        resultado = []

        for cancha in canchas:
            reservas = Reserva.objects.filter(
                cancha=cancha,
                fecha=fecha,
                estado__in=['confirmada', 'pendiente_pago']
            ).order_by('hora_inicio')

            slots_ocupados = [
                {
                    'id': r.id,
                    'cliente_id': r.cliente.id,
                    'hora_inicio': str(r.hora_inicio)[:5],
                    'hora_fin': str(r.hora_fin)[:5],
                    'estado': r.estado,
                }
                for r in reservas
            ]

            resultado.append({
                'cancha_id': cancha.id,
                'cancha_nombre': cancha.nombre,
                'tipo': cancha.tipo,
                'precio_por_hora': str(cancha.precio_por_hora),
                'slots_ocupados': slots_ocupados,
            })

        return Response({
            'local_id': local.id,
            'local_nombre': local.nombre,
            'fecha': str(fecha),
            'hora_apertura': str(local.hora_apertura)[:5],
            'hora_cierre': str(local.hora_cierre)[:5],
            'canchas': resultado,
        })


# =============================================
#  CANCHAS
# =============================================

class CanchaViewSet(viewsets.ModelViewSet):
    serializer_class = CanchaSerializer
    permission_classes = [permissions.AllowAny]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_serializer_context(self):
        return {'request': self.request}

    def get_queryset(self):
        queryset = Cancha.objects.all().select_related('local', 'local__dueno').order_by('-created_at')

        # Filtro por local
        local = self.request.query_params.get('local')
        if local:
            queryset = queryset.filter(local_id=local)

        # Filtro por dueño (a través del local)
        dueno = self.request.query_params.get('dueno')
        if dueno:
            queryset = queryset.filter(local__dueno_id=dueno)

        # Búsqueda por nombre o dirección del local
        buscar = self.request.query_params.get('buscar')
        if buscar:
            queryset = queryset.filter(
                Q(nombre__icontains=buscar) | Q(local__direccion__icontains=buscar)
            )

        # Filtro por tipo de cancha
        tipo = self.request.query_params.get('tipo')
        if tipo:
            queryset = queryset.filter(tipo=tipo)

        # Filtro por rango de precio
        precio_min = self.request.query_params.get('precio_min')
        precio_max = self.request.query_params.get('precio_max')
        if precio_min:
            queryset = queryset.filter(precio_por_hora__gte=precio_min)
        if precio_max:
            queryset = queryset.filter(precio_por_hora__lte=precio_max)

        # Ordenar
        ordenar = self.request.query_params.get('ordenar')
        if ordenar == 'precio_asc':
            queryset = queryset.order_by('precio_por_hora')
        elif ordenar == 'precio_desc':
            queryset = queryset.order_by('-precio_por_hora')
        elif ordenar == 'calificacion':
            queryset = queryset.annotate(
                avg_cal=Avg('resenas__calificacion')
            ).order_by('-avg_cal')
        elif ordenar == 'popular':
            queryset = queryset.annotate(
                total_res=Count('reservas')
            ).order_by('-total_res')

        return queryset


class ReservaViewSet(viewsets.ModelViewSet):
    queryset = Reserva.objects.all()
    serializer_class = ReservaSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        queryset = Reserva.objects.all().select_related(
            'cancha', 'cancha__local', 'cancha__local__dueno', 'cliente'
        ).order_by('-created_at')

        cliente = self.request.query_params.get('cliente')
        cancha = self.request.query_params.get('cancha')
        dueno = self.request.query_params.get('dueno')
        local = self.request.query_params.get('local')

        if cliente:
            queryset = queryset.filter(
                Q(cliente_id=cliente) | Q(participantes__id=cliente)
            ).distinct()
        if cancha:
            queryset = queryset.filter(cancha_id=cancha)
        if dueno:
            queryset = queryset.filter(cancha__local__dueno_id=dueno)
        if local:
            queryset = queryset.filter(cancha__local_id=local)

        return queryset

    @action(detail=True, methods=['post'])
    def agregar_participante(self, request, pk=None):
        reserva = self.get_object()
        usuario_id = request.data.get('usuario_id')
        if not usuario_id:
            return Response({'error': 'usuario_id es requerido'}, status=400)
        try:
            usuario = Usuario.objects.get(id=usuario_id)
        except Usuario.DoesNotExist:
            return Response({'error': 'Usuario no encontrado'}, status=404)
        
        if usuario == reserva.cliente:
            return Response({'error': 'No puedes agregarte a ti mismo como participante'}, status=400)
            
        reserva.participantes.add(usuario)
        
        Notificacion.objects.create(
            usuario=usuario,
            titulo='Añadido a una reserva 🎫',
            mensaje=f'Has sido añadido como participante a la reserva en {reserva.cancha.nombre} ({reserva.cancha.local.nombre}) para el {reserva.fecha}.',
            tipo='sistema'
        )
        
        return Response({'success': True, 'reserva': ReservaSerializer(reserva, context={'request': request}).data})

    @action(detail=True, methods=['post'])
    def eliminar_participante(self, request, pk=None):
        reserva = self.get_object()
        usuario_id = request.data.get('usuario_id')
        if not usuario_id:
            return Response({'error': 'usuario_id es requerido'}, status=400)
        try:
            usuario = Usuario.objects.get(id=usuario_id)
        except Usuario.DoesNotExist:
            return Response({'error': 'Usuario no encontrado'}, status=404)
            
        reserva.participantes.remove(usuario)
        return Response({'success': True, 'reserva': ReservaSerializer(reserva, context={'request': request}).data})

    @action(detail=True, methods=['post'], url_path='reembolsar')
    def reembolsar(self, request, pk=None):
        """Reembolso por el dueño: cancela la reserva, libera el horario y notifica al cliente."""
        reserva = self.get_object()

        if reserva.estado != 'confirmada':
            return Response(
                {'error': 'Solo se pueden reembolsar reservas confirmadas'},
                status=400,
            )

        if not _reserva_es_futura(reserva):
            return Response(
                {'error': 'Solo se pueden reembolsar reservas futuras'},
                status=400,
            )

        dueno = reserva.cancha.local.dueno
        usuario_auth = getattr(request, 'usuario', None)
        if usuario_auth:
            if usuario_auth.id != dueno.id or usuario_auth.rol != 'dueno':
                return Response({'error': 'No autorizado'}, status=403)
        else:
            dueno_id = request.data.get('dueno_id')
            if not dueno_id or int(dueno_id) != dueno.id:
                return Response({'error': 'No autorizado'}, status=403)

        horas = (
            reserva.hora_fin.hour + reserva.hora_fin.minute / 60
            - reserva.hora_inicio.hour - reserva.hora_inicio.minute / 60
        )
        monto = float(reserva.cancha.precio_por_hora) * max(horas, 0)

        reserva.estado = 'cancelada'
        reserva.save(update_fields=['estado', 'updated_at'])

        # Marcar el pago como reembolsado si existe
        try:
            if reserva.pago and reserva.pago.estado == 'pagado':
                reserva.pago.estado = 'reembolsado'
                reserva.pago.save(update_fields=['estado'])
        except ObjectDoesNotExist:
            pass

        Notificacion.objects.create(
            usuario=reserva.cliente,
            titulo='Reserva cancelada ❌',
            mensaje=(
                f'{reserva.cancha.local.nombre} ha cancelado tu reserva en '
                f'{reserva.cancha.nombre} para el {reserva.fecha} '
                f'({str(reserva.hora_inicio)[:5]} – {str(reserva.hora_fin)[:5]}). '
                f'Monto reembolsado: ${monto:.2f}. El horario quedó disponible nuevamente.'
            ),
            tipo='reserva_cancelada',
        )

        return Response(
            ReservaSerializer(reserva, context={'request': request}).data
        )

    def perform_create(self, serializer):
        """Al crear una reserva, notificar al dueño."""
        reserva = serializer.save()
        Notificacion.objects.create(
            usuario=reserva.cancha.local.dueno,
            titulo='Nueva reserva',
            mensaje=f'{reserva.cliente.nombre} reservó {reserva.cancha.nombre} '
                    f'({reserva.cancha.local.nombre}) '
                    f'para el {reserva.fecha} de {reserva.hora_inicio} a {reserva.hora_fin}.',
            tipo='reserva_nueva'
        )

    def perform_update(self, serializer):
        reserva = serializer.save()



# =============================================
#  DISPONIBILIDAD DE CANCHA (individual)
# =============================================

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def disponibilidad_cancha_view(request, cancha_id):
    """Devuelve los slots ocupados de una cancha para una fecha dada o la semana."""
    fecha_str = request.query_params.get('fecha')

    if fecha_str:
        # Slots para un día específico
        try:
            from datetime import datetime
            fecha = datetime.strptime(fecha_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({'error': 'Formato de fecha inválido. Use YYYY-MM-DD'}, status=400)

        reservas = Reserva.objects.filter(
            cancha_id=cancha_id,
            fecha=fecha,
            estado='confirmada'
        ).order_by('hora_inicio')

        slots_ocupados = [
            {
                'id': r.id,
                'cliente_id': r.cliente.id,
                'hora_inicio': str(r.hora_inicio)[:5],
                'hora_fin': str(r.hora_fin)[:5],
                'estado': r.estado,
            }
            for r in reservas
        ]

        return Response({
            'cancha_id': cancha_id,
            'fecha': str(fecha),
            'slots_ocupados': slots_ocupados,
        })
    else:
        # Slots para los próximos 7 días
        hoy = date.today()
        resultado = []

        for i in range(7):
            dia = hoy + timedelta(days=i)
            reservas = Reserva.objects.filter(
                cancha_id=cancha_id,
                fecha=dia,
                estado='confirmada'
            ).order_by('hora_inicio')

            slots = [
                {
                    'id': r.id,
                    'cliente_id': r.cliente.id,
                    'hora_inicio': str(r.hora_inicio)[:5],
                    'hora_fin': str(r.hora_fin)[:5],
                    'estado': r.estado,
                }
                for r in reservas
            ]

            resultado.append({
                'fecha': str(dia),
                'dia_semana': ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][dia.weekday()],
                'slots_ocupados': slots,
            })

        return Response({
            'cancha_id': cancha_id,
            'disponibilidad': resultado,
        })


# =============================================
#  RESEÑAS
# =============================================

class ResenaViewSet(viewsets.ModelViewSet):
    serializer_class = ResenaSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        queryset = Resena.objects.all().order_by('-created_at')
        cancha = self.request.query_params.get('cancha')
        if cancha:
            queryset = queryset.filter(cancha_id=cancha)
        return queryset

    def perform_create(self, serializer):
        resena = serializer.save()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if not request.user or not isinstance(request.user, Usuario):
            return Response(
                {"detail": "Debes estar autenticado para eliminar esta reseña."},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        is_client = request.user == instance.cliente
        is_owner = request.user == instance.cancha.local.dueno
        
        if not (is_client or is_owner):
            return Response(
                {"detail": "No tienes permiso para eliminar esta reseña. Solo el autor o el dueño del local pueden hacerlo."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if not request.user or not isinstance(request.user, Usuario):
            return Response(
                {"detail": "Debes estar autenticado para modificar esta reseña."},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        if request.user != instance.cliente:
            return Response(
                {"detail": "No tienes permiso para editar esta reseña. Solo el autor puede modificarla."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)


# =============================================
#  NOTIFICACIONES
# =============================================

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def notificaciones_view(request, usuario_id):
    """Lista de notificaciones de un usuario. Genera recordatorio si tiene reserva hoy."""
    hoy = date.today()
    reservas_hoy = Reserva.objects.filter(
        Q(cliente_id=usuario_id) | Q(participantes__id=usuario_id),
        fecha=hoy, estado='confirmada'
    ).distinct()
    for r in reservas_hoy:
        existe = Notificacion.objects.filter(
            usuario_id=usuario_id,
            titulo='Recordatorio de reserva ⏰',
            created_at__date=hoy,
            tipo='sistema'
        ).exists()
        if not existe:
            Notificacion.objects.create(
                usuario_id=usuario_id,
                titulo='Recordatorio de reserva ⏰',
                mensaje=f'Hoy tienes una reserva en {r.cancha.nombre} ({r.cancha.local.nombre}) '
                        f'de {r.hora_inicio} a {r.hora_fin}.',
                tipo='sistema'
            )
    # Notificar si el QR de algún local expiró (solo dueños)
    qr_expirados = Local.objects.filter(dueno_id=usuario_id, qr_expiry__isnull=False, qr_expiry__lte=hoy)
    for local in qr_expirados:
        titulo = f'⚠️ QR expirado — {local.nombre}'
        if not Notificacion.objects.filter(usuario_id=usuario_id, titulo=titulo, created_at__date=hoy).exists():
            Notificacion.objects.create(
                usuario_id=usuario_id,
                titulo=titulo,
                mensaje=f'El código QR de {local.nombre} venció el {local.qr_expiry}. Actualiza el QR para que los clientes puedan pagar.',
                tipo='sistema',
            )

    notificaciones = Notificacion.objects.filter(usuario_id=usuario_id)[:30]
    no_leidas = Notificacion.objects.filter(usuario_id=usuario_id, leida=False).count()
    return Response({
        'notificaciones': NotificacionSerializer(notificaciones, many=True).data,
        'no_leidas': no_leidas,
    })


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def marcar_notificaciones_leidas_view(request, usuario_id):
    """Marcar todas las notificaciones como leídas."""
    Notificacion.objects.filter(usuario_id=usuario_id, leida=False).update(leida=True)
    return Response({'ok': True})


# =============================================
#  HELPERS
# =============================================

def _calcular_ingresos(queryset):
    """Suma montos de pagos confirmados, resta reembolsos."""
    total = 0
    for r in queryset.filter(pago__isnull=False).prefetch_related('pago'):
        if r.pago.estado == 'pagado':
            total += float(r.pago.monto)
        elif r.pago.estado == 'reembolsado':
            total -= float(r.pago.monto)
    return round(total, 2)


def _reserva_es_futura(reserva):
    """True si el turno aún no ha comenzado (se puede reembolsar)."""
    tz = timezone.get_current_timezone()
    inicio = datetime.combine(reserva.fecha, reserva.hora_inicio)
    if timezone.is_naive(inicio):
        inicio = timezone.make_aware(inicio, tz)
    return inicio > timezone.localtime(timezone.now())


RESERVAS_CONFIRMADAS_Q = Q(estado='confirmada')


# =============================================
#  ESTADÍSTICAS DUEÑO
# =============================================

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def dueno_estadisticas_view(request, dueno_id):
    hoy = date.today()
    inicio_semana = hoy - timedelta(days=hoy.weekday())
    inicio_mes = hoy.replace(day=1)
    inicio_ano = hoy.replace(month=1, day=1)

    reservas = Reserva.objects.filter(cancha__local__dueno_id=dueno_id)
    canchas = Cancha.objects.filter(local__dueno_id=dueno_id)
    locales = Local.objects.filter(dueno_id=dueno_id)
    reservas_confirmadas = reservas.filter(RESERVAS_CONFIRMADAS_Q)

    por_estado = dict(
        reservas.values_list('estado')
        .annotate(total=Count('id'))
        .values_list('estado', 'total')
    )

    def _dt_utc(d):
        return datetime.combine(d, time.min).replace(tzinfo=dt_timezone.utc)

    hace_30 = hoy - timedelta(days=30)
    reservas_por_dia = (
        reservas_confirmadas.filter(created_at__gte=_dt_utc(hace_30))
        .annotate(dia=TruncDate('created_at'))
        .values('dia')
        .annotate(total=Count('id'))
        .order_by('dia')
    )

    dt_hoy_inicio = _dt_utc(hoy)
    dt_hoy_fin = _dt_utc(hoy + timedelta(days=1))

    return Response({
        'reservas': {
            'hoy': reservas_confirmadas.filter(created_at__gte=dt_hoy_inicio, created_at__lt=dt_hoy_fin).count(),
            'semana': reservas_confirmadas.filter(created_at__gte=_dt_utc(inicio_semana)).count(),
            'mes': reservas_confirmadas.filter(created_at__gte=_dt_utc(inicio_mes)).count(),
            'ano': reservas_confirmadas.filter(created_at__gte=_dt_utc(inicio_ano)).count(),
        },
        'ingresos': {
            'hoy': _calcular_ingresos(reservas_confirmadas.filter(created_at__gte=dt_hoy_inicio, created_at__lt=dt_hoy_fin)),
            'semana': _calcular_ingresos(reservas_confirmadas.filter(created_at__gte=_dt_utc(inicio_semana))),
            'mes': _calcular_ingresos(reservas_confirmadas.filter(created_at__gte=_dt_utc(inicio_mes))),
            'ano': _calcular_ingresos(reservas_confirmadas.filter(created_at__gte=_dt_utc(inicio_ano))),
        },
        'por_estado': {
            'confirmada': por_estado.get('confirmada', 0),
            'cancelada': por_estado.get('cancelada', 0),
        },
        'reservas_por_dia': [
            {'fecha': str(r['dia']), 'total': r['total']}
            for r in reservas_por_dia
        ],
        'total_canchas': canchas.count(),
        'total_locales': locales.count(),
    })


# =============================================
#  ESTADÍSTICAS ADMIN
# =============================================

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def admin_estadisticas_view(request):
    hoy = date.today()
    inicio_semana = hoy - timedelta(days=hoy.weekday())
    inicio_mes = hoy.replace(day=1)
    inicio_ano = hoy.replace(month=1, day=1)

    por_estado = dict(
        Reserva.objects.values_list('estado')
        .annotate(total=Count('id'))
        .values_list('estado', 'total')
    )

    hace_12_meses = hoy - timedelta(days=365)
    crecimiento_usuarios = (
        Usuario.objects.filter(created_at__date__gte=hace_12_meses)
        .annotate(mes=TruncMonth('created_at'))
        .values('mes')
        .annotate(total=Count('id'))
        .order_by('mes')
    )

    hace_30 = hoy - timedelta(days=30)
    reservas_por_dia = (
        Reserva.objects.filter(created_at__date__gte=hace_30)
        .values(dia=TruncDate('created_at'))
        .annotate(total=Count('id'))
        .order_by('dia')
    )

    top_canchas = (
        Cancha.objects.select_related('local')
        .annotate(total_reservas=Count('reservas'))
        .order_by('-total_reservas')[:5]
    )

    usuarios_activos = (
        Reserva.objects.filter(created_at__date__gte=hace_30)
        .values('cliente')
        .distinct()
        .count()
    )

    return Response({
        'totales': {
            'usuarios': Usuario.objects.filter(rol='cliente').count(),
            'duenos': Usuario.objects.filter(rol='dueno').count(),
            'canchas': Cancha.objects.count(),
            'locales': Local.objects.count(),
            'reservas': Reserva.objects.count(),
        },
        'nuevos_usuarios': {
            'hoy': Usuario.objects.filter(rol='cliente', created_at__date=hoy).count(),
            'semana': Usuario.objects.filter(rol='cliente', created_at__date__gte=inicio_semana).count(),
            'mes': Usuario.objects.filter(rol='cliente', created_at__date__gte=inicio_mes).count(),
        },
        'nuevos_duenos': {
            'hoy': Usuario.objects.filter(rol='dueno', created_at__date=hoy).count(),
            'semana': Usuario.objects.filter(rol='dueno', created_at__date__gte=inicio_semana).count(),
            'mes': Usuario.objects.filter(rol='dueno', created_at__date__gte=inicio_mes).count(),
        },
        'reservas_periodo': {
            'hoy': Reserva.objects.filter(created_at__date=hoy).count(),
            'semana': Reserva.objects.filter(created_at__date__gte=inicio_semana).count(),
            'mes': Reserva.objects.filter(created_at__date__gte=inicio_mes).count(),
        },
        'ingresos': {
            'mes': _calcular_ingresos(Reserva.objects.filter(estado='confirmada', fecha__gte=inicio_mes)),
            'ano': _calcular_ingresos(Reserva.objects.filter(estado='confirmada', fecha__gte=inicio_ano)),
        },
        'por_estado': {
            'confirmada': por_estado.get('confirmada', 0),
            'cancelada': por_estado.get('cancelada', 0),
        },
        'crecimiento_usuarios': [
            {'mes': c['mes'].strftime('%Y-%m'), 'total': c['total']}
            for c in crecimiento_usuarios
        ],
        'reservas_por_dia': [
            {'fecha': str(r['dia']), 'total': r['total']}
            for r in reservas_por_dia
        ],
        'top_canchas': [
            {'nombre': c.nombre, 'local': c.local.nombre, 'total_reservas': c.total_reservas}
            for c in top_canchas
        ],
        'usuarios_activos': usuarios_activos,
    })


# =============================================
#  FAVORITOS
# =============================================

@api_view(['GET', 'POST'])
@permission_classes([permissions.AllowAny])
def favoritos_view(request, cliente_id=None):
    """Lista o crea favoritos para un cliente."""
    if request.method == 'GET':
        if not cliente_id:
            return Response({'error': 'cliente_id requerido'}, status=400)
        favoritos = Favorito.objects.filter(cliente_id=cliente_id).select_related('local')
        serializer = FavoritoSerializer(favoritos, many=True, context={'request': request})
        return Response(serializer.data)

    elif request.method == 'POST':
        cliente_id = request.data.get('cliente')
        local_id = request.data.get('local')

        if not cliente_id or not local_id:
            return Response({'error': 'cliente y local son requeridos'}, status=400)

        # Verificar si ya existe
        existente = Favorito.objects.filter(cliente_id=cliente_id, local_id=local_id).first()
        if existente:
            existente.delete()
            return Response({'mensaje': 'Favorito eliminado', 'es_favorito': False})

        # Crear favorito
        favorito = Favorito.objects.create(
            cliente_id=cliente_id,
            local_id=local_id
        )
        serializer = FavoritoSerializer(favorito, context={'request': request})
        return Response({'mensaje': 'Favorito añadido', 'es_favorito': True, 'favorito': serializer.data})


@api_view(['DELETE'])
@permission_classes([permissions.AllowAny])
def eliminar_favorito_view(request, cliente_id, local_id):
    """Elimina un favorito específico."""
    Favorito.objects.filter(cliente_id=cliente_id, local_id=local_id).delete()
    return Response({'mensaje': 'Favorito eliminado'})


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def es_favorito_view(request, cliente_id, local_id):
    """Verifica si un local es favorito del cliente."""
    es_favorito = Favorito.objects.filter(cliente_id=cliente_id, local_id=local_id).exists()
    return Response({'es_favorito': es_favorito})


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def mis_resenas_view(request, cliente_id):
    """Lista de reseñas realizadas por un cliente."""
    resenas = Resena.objects.filter(cliente_id=cliente_id).select_related('cancha', 'cancha__local').order_by('-created_at')
    resultado = []
    for r in resenas:
        resultado.append({
            'id': r.id,
            'cancha_id': r.cancha_id,
            'cancha_nombre': r.cancha.nombre,
            'local_nombre': r.cancha.local.nombre,
            'calificacion': r.calificacion,
            'comentario': r.comentario,
            'created_at': r.created_at.isoformat(),
        })
    return Response(resultado)




# =============================================
#  PARTICIPANTES DE RESERVA
# =============================================

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def agregar_participante_view(request, reserva_id):
    """Agrega un participante a una reserva."""
    usuario_id = request.data.get('usuario_id')
    
    if not usuario_id:
        return Response({'error': 'usuario_id requerido'}, status=400)
    
    try:
        reserva = Reserva.objects.get(id=reserva_id)
    except Reserva.DoesNotExist:
        return Response({'error': 'Reserva no encontrada'}, status=404)
    
    try:
        usuario = Usuario.objects.get(id=usuario_id)
    except Usuario.DoesNotExist:
        return Response({'error': 'Usuario no encontrado'}, status=404)
    
    reserva.participantes.add(usuario)
    reserva.save()
    
    Notificacion.objects.create(
        usuario=usuario,
        titulo='Te añadieron a una reserva 🎉',
        mensaje=f'Has sido añadido a la reserva de {reserva.cancha.nombre} el {reserva.fecha} de {reserva.hora_inicio} a {reserva.hora_fin}.',
        tipo='sistema'
    )
    
    return Response({'success': True, 'mensaje': 'Participante añadido a la reserva'})


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def quitar_participante_view(request, reserva_id):
    """Quita un participante de una reserva."""
    usuario_id = request.data.get('usuario_id')
    
    if not usuario_id:
        return Response({'error': 'usuario_id requerido'}, status=400)
    
    try:
        reserva = Reserva.objects.get(id=reserva_id)
        reserva.participantes.remove(usuario_id)
        reserva.save()
        return Response({'success': True, 'mensaje': 'Participante eliminado de la reserva'})
    except Reserva.DoesNotExist:
        return Response({'error': 'Reserva no encontrada'}, status=404)


# =============================================
#  PAGOS
# =============================================

from django.db import transaction

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def reservar_y_pagar_view(request):
    """Cliente reserva y sube comprobante en un solo paso."""
    cancha_id = request.data.get('cancha_id')
    cliente_id = request.data.get('cliente_id')
    fecha = request.data.get('fecha')
    hora_inicio = request.data.get('hora_inicio')
    hora_fin = request.data.get('hora_fin')
    comprobante = request.FILES.get('comprobante')

    if not all([cancha_id, cliente_id, fecha, hora_inicio, hora_fin, comprobante]):
        return Response({'error': 'Todos los campos son obligatorios'}, status=400)

    try:
        cancha = Cancha.objects.get(id=cancha_id)
        cliente = Usuario.objects.get(id=cliente_id)
        from datetime import datetime, time
        fecha_date = datetime.strptime(fecha, '%Y-%m-%d').date()
        hi = time(*map(int, hora_inicio.split(':')))
        hf = time(*map(int, hora_fin.split(':')))
    except Exception as e:
        return Response({'error': str(e)}, status=400)

    with transaction.atomic():
        reserva = Reserva.objects.create(
            cliente=cliente, cancha=cancha, fecha=fecha_date,
            hora_inicio=hi, hora_fin=hf, estado='pendiente_pago',
        )
        monto = float(cancha.precio_por_hora) * max(
            hf.hour + hf.minute / 60 - hi.hour - hi.minute / 60, 0)
        pago = Pago.objects.create(
            reserva=reserva, monto=monto,
            comprobante=comprobante, estado='pendiente',
        )

    Notificacion.objects.create(
        usuario=cancha.local.dueno,
        titulo='Nueva solicitud de reserva',
        mensaje=f'{cliente.nombre} reservó {cancha.nombre} ({cancha.local.nombre}) el {fecha} de {hora_inicio} a {hora_fin} y subió un comprobante.',
        tipo='sistema'
    )

    serializer = PagoSerializer(pago, context={'request': request})
    return Response(serializer.data, status=201)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def pagos_pendientes_view(request, dueno_id):
    """Lista pagos pendientes de confirmar para un dueño."""
    pagos = Pago.objects.filter(
        estado='pendiente',
        reserva__cancha__local__dueno_id=dueno_id
    ).select_related('reserva', 'reserva__cliente', 'reserva__cancha').order_by('-created_at')
    serializer = PagoSerializer(pagos, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def confirmar_pago_view(request, pago_id):
    """Dueño confirma el pago → reserva pasa a confirmada."""
    try:
        pago = Pago.objects.get(id=pago_id)
    except Pago.DoesNotExist:
        return Response({'error': 'Pago no encontrado'}, status=404)

    pago.estado = 'pagado'
    pago.save()

    reserva = pago.reserva
    reserva.estado = 'confirmada'
    reserva.save()

    Notificacion.objects.create(
        usuario=reserva.cliente,
        titulo='Pago confirmado ✅',
        mensaje=f'Tu pago para {reserva.cancha.nombre} ({reserva.fecha}) fue confirmado por el dueño.',
        tipo='reserva_confirmada'
    )

    # Enviar correo de confirmación
    try:
        asunto = f'✅ Pago confirmado — Reserva en {reserva.cancha.local.nombre}'
        mensaje_correo = (
            f"¡Hola {reserva.cliente.nombre}!\n\n"
            f"Tu pago ha sido confirmado y tu reserva está activa.\n\n"
            f"Detalles:\n"
            f"- Complejo: {reserva.cancha.local.nombre}\n"
            f"- Cancha: {reserva.cancha.nombre}\n"
            f"- Ubicación: {reserva.cancha.local.direccion}\n"
            f"- Fecha: {reserva.fecha}\n"
            f"- Hora: {reserva.hora_inicio} a {reserva.hora_fin}\n"
            f"- Monto pagado: ${float(pago.monto):.2f}\n\n"
            f"¡Que disfrutes tu partido!\n"
            f"El equipo de CanchaGo"
        )
        send_mail(
            subject=asunto, message=mensaje_correo,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[reserva.cliente.correo],
            fail_silently=False,
        )
    except Exception as e:
        print(f"Error enviando correo: {e}")

    return Response({'success': True, 'mensaje': 'Pago confirmado y reserva activada'})


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def rechazar_pago_view(request, pago_id):
    """Dueño rechaza el pago → reserva cancelada, slot libre."""
    try:
        pago = Pago.objects.get(id=pago_id)
    except Pago.DoesNotExist:
        return Response({'error': 'Pago no encontrado'}, status=404)

    if pago.estado != 'pendiente':
        return Response({'error': 'Solo se pueden rechazar pagos pendientes'}, status=400)

    pago.estado = 'rechazado'
    pago.save()

    reserva = pago.reserva
    reserva.estado = 'cancelada'
    reserva.save()

    Notificacion.objects.create(
        usuario=reserva.cliente,
        titulo='Pago rechazado ❌',
        mensaje=f'Tu comprobante de pago para {reserva.cancha.nombre} ({reserva.fecha}) fue rechazado. Debes hacer una nueva reserva.',
        tipo='sistema'
    )

    return Response({'success': True, 'mensaje': 'Pago rechazado y reserva cancelada.'})

# =============================================
#  CHATBOT IA
# =============================================

from groq import Groq as GroqClient

SYSTEM_PROMPT_CLIENTE = """Eres CanchaBot, asistente de CanchaGo para clientes. Recibirás DATOS del sistema y una PREGUNTA del usuario. Tu tarea es responder al usuario usando esos datos. INSTRUCCIONES ESTRICTAS: Responde en español claro, amable y directo. Usa ÚNICAMENTE los datos proporcionados en el contexto. ESTÁ ABSOLUTAMENTE PROHIBIDO inventar, suponer, estimar o fabricar cualquier dato, número, nombre o información. Si los datos incluyen locales, nómbralos ordenadamente con sus precios y calificaciones. Si NO recibes datos del sistema en este mensaje, responde EXACTAMENTE: 'No tengo datos suficientes para responder con precisión. ¿Podrías reformular tu pregunta o ser más específico?' NO uses frases como 'podría ser', 'es probable que', 'quizás' cuando no tengas datos. Si no hay datos, usa la respuesta exacta indicada arriba. PRIVACIDAD: No reveles datos de ingresos o estadísticas de negocio de los dueños. Si el usuario pregunta por datos personales y no hay datos de autenticación, indica que debe iniciar sesión.
"""

SYSTEM_PROMPT_DUENO = """Eres CanchaBot, asistente de análisis para dueños de canchas en CanchaGo. Recibirás DATOS del sistema y una PREGUNTA del usuario. Tu tarea es responder al usuario usando esos datos. INSTRUCCIONES ESTRICTAS: Responde en español claro, profesional y directo. Usa ÚNICAMENTE los datos proporcionados en el contexto. ESTÁ ABSOLUTAMENTE PROHIBIDO inventar, suponer, estimar o fabricar estadísticas, ingresos, reservas o cualquier dato numérico. Si los datos incluyen montos de ingresos, preséntalos con formato Bs. X.XX. Si son locales o canchas, nómbralos ordenadamente. Si NO recibes datos del sistema en este mensaje, responde EXACTAMENTE: 'No tengo datos suficientes para responder con precisión. ¿Podrías reformular tu pregunta?' NO inventes datos bajo ninguna circunstancia. Si no tienes los datos, usa la respuesta exacta indicada arriba. PRIVACIDAD: Solo respondes sobre datos del dueño actual autenticado. Si te preguntan por datos de otros dueños, indica que no tienes autorización.
"""

# =============================================
#  DETECCIÓN DE INTENSIÓN (SERVER-SIDE)
#  En vez de depender de function calling del LLM,
#  el servidor detecta la intención por palabras clave
#  y pre-ejecuta las tools. El LLM solo formatea.
# =============================================

def _detectar_intent_dueno(mensaje, usuario):
    m = mensaje.lower()
    resultados = []

    if any(p in m for p in ['ingreso', 'ingresos', 'gane', 'ganancia', 'factura', 'plata', 'dinero', 'gané', 'recaude', 'recaudé', 'recaudacion', 'recaudación']):
        if 'hoy' in m or 'dia' in m:
            resultados.append(_ejecutar_tool_dueno('obtener_ingresos', {'periodo': 'hoy'}, usuario))
        elif 'semana' in m:
            resultados.append(_ejecutar_tool_dueno('obtener_ingresos', {'periodo': 'semana'}, usuario))
        elif 'mes' in m:
            resultados.append(_ejecutar_tool_dueno('obtener_ingresos', {'periodo': 'mes'}, usuario))
        elif any(p in m for p in ['año', 'anio', 'total', 'todo', 'todos', 'todas']):
            resultados.append(_ejecutar_tool_dueno('obtener_ingresos', {'periodo': 'año'}, usuario))
        else:
            resultados.append(_ejecutar_tool_dueno('obtener_ingresos', {'periodo': 'hoy'}, usuario))
            resultados.append(_ejecutar_tool_dueno('obtener_ingresos', {'periodo': 'semana'}, usuario))

    if any(p in m for p in ['reserva', 'reservas', 'partido', 'partidos', 'cantidad de reserva', 'cantidad de reservas', 'cuantas reserva', 'cuántas reserva']):
        if 'hoy' in m or 'dia' in m:
            resultados.append(_ejecutar_tool_dueno('obtener_reservas', {'periodo': 'hoy'}, usuario))
        elif 'semana' in m:
            resultados.append(_ejecutar_tool_dueno('obtener_reservas', {'periodo': 'semana'}, usuario))
        elif 'mes' in m:
            resultados.append(_ejecutar_tool_dueno('obtener_reservas', {'periodo': 'mes'}, usuario))
        elif any(p in m for p in ['año', 'anio', 'total', 'todo', 'todos', 'todas']):
            resultados.append(_ejecutar_tool_dueno('obtener_reservas', {'periodo': 'año'}, usuario))
        else:
            resultados.append(_ejecutar_tool_dueno('obtener_reservas', {'periodo': 'hoy'}, usuario))

    if any(p in m for p in ['local', 'locales', 'registrado', 'tengo registrado', 'mis locales', 'cancha', 'canchas', 'mis canchas', 'resumen', 'dame', 'decime', 'mostrame', 'muéstrame']):
        resultados.append(_ejecutar_tool_dueno('obtener_mis_locales', {}, usuario))

    if any(p in m for p in ['notificacion', 'notificaciones', 'mensaje', 'alerta', 'aviso', 'notificación', 'notificaciones']):
        resultados.append(_ejecutar_tool_dueno('obtener_mis_notificaciones', {}, usuario))

    if any(p in m for p in ['pago pendiente', 'comprobante', 'por revisar', 'por confirmar', 'pendiente de pago', 'pagos pendientes']):
        resultados.append(_ejecutar_tool_dueno('obtener_pagos_pendientes', {}, usuario))

    if any(p in m for p in ['listado', 'detalle', 'lista de reserva', 'quien reservo', 'quién reservó', 'quienes reservaron', 'quiénes reservaron']):
        periodo = 'semana' if 'semana' in m else 'mes' if 'mes' in m else 'hoy'
        estado = 'confirmada' if 'confirmada' in m else 'cancelada' if 'cancelada' in m else 'pendiente_pago' if 'pendiente' in m else 'todos'
        resultados.append(_ejecutar_tool_dueno('obtener_listado_reservas', {'periodo': periodo, 'estado': estado}, usuario))

    if any(p in m for p in ['popular', 'mas reservada', 'más reservada', 'ranking', 'top cancha', 'top canchas', 'mejor cancha', 'mejores canchas']):
        resultados.append(_ejecutar_tool_dueno('obtener_canchas_mas_reservadas', {'limite': 5}, usuario))

    if any(p in m for p in ['tasa', 'porcentaje', 'confirmacion', 'confirmación', 'tasa de confirmacion', 'tasa de reservas']):
        resultados.append(_ejecutar_tool_dueno('obtener_tasa_confirmacion', {}, usuario))

    if any(p in m for p in ['tendencia', 'ultimos dias', 'últimos días', '30 dias', '30 días', 'historial', 'evolucion', 'evolución']):
        resultados.append(_ejecutar_tool_dueno('obtener_tendencia_30dias', {}, usuario))

    if any(p in m for p in ['cuantos local', 'cuantas cancha', 'total de cancha', 'total de local', 'cuántos locales', 'cuántas canchas']):
        resultados.append(_ejecutar_tool_dueno('obtener_total_canchas', {}, usuario))

    return '\n'.join(resultados) if resultados else None


def _detectar_intent_cliente(mensaje, usuario):
    m = mensaje.lower()
    resultados = []

    if any(p in m for p in [
        'local', 'locales', 'que local', 'muestrame', 'muéstrame', 'mostráme', 'lista', 'todos los local',
        'cancha', 'canchas', 'resumen', 'decime', 'dame', 'mostrame',
        'todos', 'todas', 'ver todo', 'listar', 'acceso', 'disponibles',
    ]):
        if any(p in m for p in ['nomb', 'busca', 'encuentra', 'zona', 'direccion', 'dirección']):
            nombre = None
            zona = None
            resultados.append(_ejecutar_tool_cliente('buscar_locales', {'nombre': nombre, 'zona': zona}, usuario))
        else:
            resultados.append(_ejecutar_tool_cliente('buscar_locales', {}, usuario))
    elif 'hay' in m and not any(p in m for p in ['reserva', 'reservas', 'partido']):
        resultados.append(_ejecutar_tool_cliente('buscar_locales', {}, usuario))

    if any(p in m for p in ['barato', 'economico', 'económico', 'precio bajo', 'mas barato', 'más barato', 'menos precio']):
        tipo = None
        for t in ['futbol', 'fútbol', 'tenis', 'basquet', 'básquet', 'voley', 'vóley', 'padel', 'pádel']:
            if t in m:
                tipo = t
                break
        resultados.append(_ejecutar_tool_cliente('buscar_locales_economicos', {'tipo_deporte': tipo}, usuario))

    if any(p in m for p in ['detalle', 'info de', 'informacion de', 'información de', 'que tiene', 'precio de', 'donde queda', 'dónde queda', 'horario de', 'telefono de', 'teléfono de']):
        local_id = m.split('de ')[-1] if 'de ' in m else None
        resultados.append(_ejecutar_tool_cliente('obtener_detalle_local', {'local_id': local_id or ''}, usuario))

    if any(p in m for p in ['disponible', 'disponibilidad', 'ocupado', 'libre', 'horario', 'hay cancha']):
        local_id = m.split('en ')[-1] if 'en ' in m else None
        resultados.append(_ejecutar_tool_cliente('consultar_disponibilidad', {'local_id': local_id or '', 'fecha': ''}, usuario))

    if any(p in m for p in ['futbol', 'fútbol', 'tenis', 'basquet', 'básquet', 'voley', 'vóley', 'padel', 'pádel', 'recomienda', 'recomiéndame']):
        categoria = next((t for t in ['futbol', 'fútbol', 'tenis', 'basquet', 'básquet', 'voley', 'vóley', 'padel', 'pádel'] if t in m), '')
        if categoria:
            resultados.append(_ejecutar_tool_cliente('recomendar_por_categoria', {'categoria': categoria}, usuario))

    if any(p in m for p in ['mis reserva', 'mis partido', 'reservas que hice', 'tengo reservado', 'alguna reserva', 'hay reserva', 'hay partido', 'tengo reserva', 'tengo partido', 'reservacion', 'reservaciones', 'reservas tengo', 'que reservas', 'que partidos']):
        solo_hoy = 'hoy' in m or 'dia' in m
        resultados.append(_ejecutar_tool_cliente('obtener_mis_reservas', {'solo_hoy': solo_hoy}, usuario))

    if any(p in m for p in [
        'gaste', 'gasté', 'gasto', 'dinero gastado', 'cuanto pague', 'cuánto pagué',
        'total invertido', 'gastado', 'cuanto gaste', 'cuánto gasté', 'cuanto he gastado',
        'cuánto he gastado', 'mis gastos', 'lo que pague', 'lo que pagué',
    ]):
        resultados.append(_ejecutar_tool_cliente('obtener_mis_gastos', {}, usuario))

    if any(p in m for p in ['favorito', 'favoritos', 'guardado', 'guardados', 'mis favoritos', 'favorito']):
        resultados.append(_ejecutar_tool_cliente('obtener_mis_favoritos', {}, usuario))

    if any(p in m for p in ['notificacion', 'notificaciones', 'notificación', 'mensaje', 'alerta', 'avisos']):
        resultados.append(_ejecutar_tool_cliente('obtener_mis_notificaciones', {}, usuario))

    return '\n'.join(resultados) if resultados else None


def obtener_local_por_id_o_nombre(local_id_raw):
    """
    Helper para obtener un local de forma robusta por ID numérico o por coincidencia de nombre.
    Soporta IDs numéricos pasados como enteros o strings, y nombres de locales.
    """
    if not local_id_raw:
        return None
    try:
        if isinstance(local_id_raw, int) or (isinstance(local_id_raw, str) and local_id_raw.isdigit()):
            return Local.objects.get(id=int(local_id_raw))
        else:
            local = Local.objects.filter(nombre__icontains=str(local_id_raw)).first()
            return local
    except Local.DoesNotExist:
        return None


def _ejecutar_tool_dueno(name, args, usuario):
    if not usuario:
        return "No estás autenticado. Por favor inicia sesión."

    hoy = date.today()
    inicio_semana = hoy - timedelta(days=hoy.weekday())
    inicio_mes = hoy.replace(day=1)
    inicio_ano = hoy.replace(month=1, day=1)

    reservas_qs = Reserva.objects.filter(
        cancha__local__dueno=usuario, estado='confirmada'
    )

    def _dt_utc(d):
        return datetime.combine(d, time.min).replace(tzinfo=dt_timezone.utc)

    if name == 'obtener_reservas':
        p = args['periodo']
        filtros = {'hoy': {'created_at__gte': _dt_utc(hoy), 'created_at__lt': _dt_utc(hoy + timedelta(days=1))},
                   'semana': {'created_at__gte': _dt_utc(inicio_semana)},
                   'mes': {'created_at__gte': _dt_utc(inicio_mes)},
                   'año': {'created_at__gte': _dt_utc(inicio_ano)}}
        total = reservas_qs.filter(**filtros[p]).count()
        return f"Reservas confirmadas {p}: {total}"

    elif name == 'obtener_ingresos':
        p = args['periodo']
        filtros = {'hoy': {'created_at__gte': _dt_utc(hoy), 'created_at__lt': _dt_utc(hoy + timedelta(days=1))},
                   'semana': {'created_at__gte': _dt_utc(inicio_semana)},
                   'mes': {'created_at__gte': _dt_utc(inicio_mes)},
                   'año': {'created_at__gte': _dt_utc(inicio_ano)}}
        qs = reservas_qs.filter(**filtros[p])
        total = _calcular_ingresos(qs)
        return f"Ingresos {p}: Bs. {total:.2f}"

    elif name == 'obtener_canchas_mas_reservadas':
        limite = args.get('limite', 5)
        canchas = Cancha.objects.filter(local__dueno=usuario).annotate(
            total_reservas=Count('reservas', filter=Q(reservas__estado='confirmada')),
        ).order_by('-total_reservas')[:limite]
        if not canchas:
            return "No tienes canchas registradas."
        resultado = "**Canchas más reservadas:**\n"
        for i, c in enumerate(canchas, 1):
            resultado += f"{i}. {c.nombre} — {c.total_reservas} reservas\n"
        return resultado

    elif name == 'obtener_tasa_confirmacion':
        total_reservas = Reserva.objects.filter(cancha__local__dueno=usuario)
        total = total_reservas.count()
        if total == 0:
            return "No tienes reservas registradas."
        confirmadas = total_reservas.filter(estado='confirmada').count()
        canceladas = total_reservas.filter(estado='cancelada').count()
        tasa = (confirmadas / total) * 100
        return f"Tasa de confirmación: {tasa:.1f}% ({confirmadas} confirmadas, {canceladas} canceladas de {total} total)"

    elif name == 'obtener_tendencia_30dias':
        hace_30 = hoy - timedelta(days=30)
        dias = (
            reservas_qs.filter(fecha__gte=hace_30)
            .values('fecha')
            .annotate(total=Count('id'))
            .order_by('fecha')
        )
        if not dias:
            return "No hay reservas en los últimos 30 días."
        return "\n".join(f"{d['fecha']}: {d['total']} reservas" for d in dias)

    elif name == 'obtener_total_canchas':
        locales = Local.objects.filter(dueno=usuario).count()
        canchas = Cancha.objects.filter(local__dueno=usuario).count()
        return f"Tienes {locales} local(es) y {canchas} cancha(s) registradas."

    elif name == 'obtener_listado_reservas':
        p = args.get('periodo', 'hoy')
        if p == 'hoy':
            reservas = Reserva.objects.filter(cancha__local__dueno=usuario, fecha=hoy)
        elif p == 'semana':
            reservas = Reserva.objects.filter(cancha__local__dueno=usuario, fecha__gte=inicio_semana)
        elif p == 'mes':
            reservas = Reserva.objects.filter(cancha__local__dueno=usuario, fecha__gte=inicio_mes)
        else:
            reservas = Reserva.objects.filter(cancha__local__dueno=usuario)

        est = args.get('estado', 'todos')
        if est != 'todos':
            reservas = reservas.filter(estado=est)

        reservas = reservas.select_related('cancha', 'cliente', 'cancha__local').order_by('fecha', 'hora_inicio')[:30]
        if not reservas.exists():
            return f"No se encontraron reservas para el período '{p}' con estado '{est}'."

        res = f"**Listado de Reservas ({p}, estado: {est}):**\n"
        for r in list(reservas):
            hi = r.hora_inicio.strftime('%H:%M')
            hf = r.hora_fin.strftime('%H:%M')
            monto_str = ""
            try:
                if r.pago:
                    monto_str = f" | Pago: Bs. {r.pago.monto:.2f} ({r.pago.get_estado_display()})"
            except ObjectDoesNotExist:
                pass
            res += f"- **{r.fecha.strftime('%d/%m/%Y')}** | {hi} - {hf} | Cancha: {r.cancha.nombre} ({r.cancha.local.nombre}) | Cliente: {r.cliente.nombre} ({r.cliente.correo}) | Estado: {r.get_estado_display()}{monto_str}\n"
        return res

    elif name == 'obtener_mis_locales':
        locales = Local.objects.filter(dueno=usuario)
        if not locales:
            return "No tienes locales registrados."
        resultado = "**Tus locales:**\n"
        for l in locales:
            nota = f"{l.calificacion_promedio:.1f}" if l.calificacion_promedio is not None else "N/A"
            resultado += f"- **{l.nombre}** ({l.direccion}) | ⭐ {nota} | {l.total_canchas} cancha(s) | {l.hora_apertura.strftime('%H:%M')} a {l.hora_cierre.strftime('%H:%M')}\n"
        return resultado

    elif name == 'obtener_mis_notificaciones':
        notificaciones = Notificacion.objects.filter(usuario=usuario).order_by('-created_at')[:10]
        if not notificaciones:
            return "No tienes notificaciones recientes."
        resultado = "**Tus notificaciones recientes:**\n"
        for n in notificaciones:
            marca = "✅ leída" if n.leida else "🆕 nueva"
            fecha_str = n.created_at.strftime('%d/%m %H:%M')
            resultado += f"- [{marca}] ({fecha_str}) **{n.titulo}**: {n.mensaje}\n"
        return resultado

    elif name == 'obtener_pagos_pendientes':
        pagos = Pago.objects.filter(reserva__cancha__local__dueno=usuario, estado='pendiente').select_related('reserva', 'reserva__cancha', 'reserva__cancha__local', 'reserva__cliente')
        if not pagos:
            return "No tienes pagos pendientes por revisar."
        resultado = "**Pagos pendientes de revisión:**\n"
        for p in pagos:
            hi = p.reserva.hora_inicio.strftime('%H:%M')
            hf = p.reserva.hora_fin.strftime('%H:%M')
            resultado += f"- **{p.reserva.cliente.nombre}** ({p.reserva.cliente.correo}) | Cancha: {p.reserva.cancha.nombre} en {p.reserva.cancha.local.nombre} | {p.reserva.fecha} {hi}-{hf} | Bs. {p.monto:.2f}\n"
        return resultado

    return "Herramienta no encontrada."


def _ejecutar_tool_cliente(name, args, usuario):
    if name == 'buscar_locales':
        filtros = {}
        if args.get('nombre'):
            filtros['nombre__icontains'] = args['nombre']
        if args.get('zona'):
            filtros['direccion__icontains'] = args['zona']
            
        locales = Local.objects.filter(**filtros)[:10]
        if not locales:
            return "No encontré locales registrados con esos criterios."
            
        titulo = "Locales registrados:" if not filtros else "Locales encontrados:"
        resultado = f"**{titulo}**\n"
        for l in locales:
            nota = f"{l.calificacion_promedio:.1f}" if l.calificacion_promedio is not None else "N/A"
            resultado += f"- [{l.id}] {l.nombre} ({l.direccion}) — ⭐ {nota}\n"
        return resultado

    elif name == 'buscar_locales_economicos':
        qs = Cancha.objects.select_related('local').order_by('precio_por_hora')
        tipo = args.get('tipo_deporte')
        if tipo:
            qs = qs.filter(tipo__icontains=tipo)
        canchas = qs[:10]
        if not canchas:
            return "No encontré locales con esos criterios."
        resultado = "**Locales más económicos (menor precio por hora):**\n"
        visto = set()
        for c in canchas:
            if c.local.id not in visto:
                visto.add(c.local.id)
                nota = f"{c.local.calificacion_promedio:.1f}" if c.local.calificacion_promedio is not None else "N/A"
                resultado += f"- **{c.local.nombre}** ({c.local.direccion}) — desde Bs. {c.precio_por_hora:.2f}/h | ⭐ {nota}\n"
        if not visto:
            resultado = "No encontré locales económicos con esos criterios."
        return resultado

    elif name == 'obtener_detalle_local':
        local = obtener_local_por_id_o_nombre(args.get('local_id'))
        if not local:
            return f"Local '{args.get('local_id')}' no encontrado."
            
        canchas = local.canchas.all()
        nota = f"{local.calificacion_promedio:.1f}" if local.calificacion_promedio is not None else "N/A"
        resultado = f"**{local.nombre}** (ID: {local.id})\n📍 Dirección: {local.direccion}\n"
        resultado += f"🕒 Horario: {local.hora_apertura.strftime('%H:%M')} a {local.hora_cierre.strftime('%H:%M')}\n"
        resultado += f"⭐ Calificación: {nota} | {local.total_resenas} reseñas\n"
        if local.telefonos:
            resultado += f"📞 Teléfonos: {', '.join(local.telefonos) if isinstance(local.telefonos, list) else local.telefonos}\n"
        resultado += f"\n**Canchas disponibles:**\n"
        for c in canchas:
            resultado += f"- {c.nombre} (ID: {c.id}) | Tipo: {c.get_tipo_display()} | Precio: Bs. {c.precio_por_hora:.2f}/h | Capacidad: {c.capacidad} personas\n"
        return resultado

    elif name == 'consultar_disponibilidad':
        local = obtener_local_por_id_o_nombre(args.get('local_id'))
        if not local:
            return f"Local '{args.get('local_id')}' no encontrado."
            
        fecha_str = args.get('fecha')
        if not fecha_str:
            fecha = date.today()
        else:
            try:
                fecha = datetime.strptime(fecha_str, '%Y-%m-%d').date()
            except ValueError:
                fecha = date.today()
                
        canchas = local.canchas.all()
        resultado = f"**Disponibilidad en {local.nombre} para el {fecha.strftime('%d/%m/%Y')}:**\n"
        resultado += f"Horario de atención: {local.hora_apertura.strftime('%H:%M')} a {local.hora_cierre.strftime('%H:%M')}\n\n"
        
        for c in canchas:
            ocupadas = c.reservas.filter(fecha=fecha, estado__in=['confirmada', 'pendiente_pago'])
            if not ocupadas.exists():
                resultado += f"- {c.nombre} ({c.get_tipo_display()}): Totalmente Disponible\n"
            else:
                horarios = []
                for r in ocupadas:
                    hi = r.hora_inicio.strftime('%H:%M')
                    hf = r.hora_fin.strftime('%H:%M')
                    horarios.append(f"{hi}-{hf} ({r.get_estado_display()})")
                resultado += f"- {c.nombre} ({c.get_tipo_display()}): Ocupada en {', '.join(horarios)}\n"
        return resultado

    elif name == 'recomendar_por_categoria':
        categoria = args.get('categoria', '')
        canchas = Cancha.objects.filter(tipo__icontains=categoria).select_related('local').distinct()[:10]
        if not canchas:
            canchas = [c for c in Cancha.objects.select_related('local').all() if categoria.lower() in c.get_tipo_display().lower()][:10]
            
        if not canchas:
            return f"No encontré canchas para la categoría '{categoria}'."
            
        resultado = f"**Recomendaciones para {categoria}:**\n"
        for c in canchas:
            nota = f"{c.calificacion_promedio:.1f}" if c.calificacion_promedio is not None else "N/A"
            resultado += f"- {c.nombre} en **{c.local.nombre}** | Bs. {c.precio_por_hora:.2f}/h | ⭐ {nota} ({c.total_resenas} reseñas)\n"
        return resultado

    # Nuevas herramientas para clientes autenticados:
    elif name == 'obtener_mis_reservas':
        if not usuario:
            return "No tienes una sesión de usuario activa en el chatbot. Por favor inicia sesión."
        
        reservas = Reserva.objects.filter(cliente=usuario).select_related('cancha', 'cancha__local')
        
        solo_hoy = args.get('solo_hoy', False)
        if solo_hoy:
            reservas = reservas.filter(fecha=date.today())
            
        estado = args.get('estado', 'todos')
        if estado != 'todos':
            reservas = reservas.filter(estado=estado)
            
        reservas = reservas.order_by('-fecha', '-hora_inicio')[:20]
        if not reservas.exists():
            return "No tienes reservas registradas con los filtros seleccionados."
            
        resultado = "**Tus reservas:**\n"
        for r in reservas:
            hi = r.hora_inicio.strftime('%H:%M')
            hf = r.hora_fin.strftime('%H:%M')
            resultado += f"- **{r.fecha.strftime('%d/%m/%Y')}** | {hi} a {hf} | Cancha: {r.cancha.nombre} ({r.cancha.local.nombre}) | Ticket: {r.ticket_code} | Estado: {r.get_estado_display()}\n"
        return resultado

    elif name == 'obtener_mis_gastos':
        if not usuario:
            return "No tienes una sesión de usuario activa en el chatbot. Por favor inicia sesión."
            
        pagos_confirmados = Pago.objects.filter(reserva__cliente=usuario, estado='pagado')
        total_confirmado = sum(float(p.monto) for p in pagos_confirmados)
        
        pagos_pendientes = Pago.objects.filter(reserva__cliente=usuario, estado='pendiente')
        total_pendiente = sum(float(p.monto) for p in pagos_pendientes)
        
        hoy = date.today()
        pagos_hoy = Pago.objects.filter(reserva__cliente=usuario, reserva__fecha=hoy, estado='pagado')
        total_hoy = sum(float(p.monto) for p in pagos_hoy)
        
        return (f"**Resumen de tus gastos en reservas:**\n"
                f"- **Gasto realizado hoy ({hoy.strftime('%d/%m/%Y')}):** Bs. {total_hoy:.2f}\n"
                f"- **Total invertido en reservas activas/confirmadas:** Bs. {total_confirmado:.2f}\n"
                f"- **Monto retenido en reservas pendientes de pago:** Bs. {total_pendiente:.2f}")

    elif name == 'obtener_mis_favoritos':
        if not usuario:
            return "No tienes una sesión de usuario activa en el chatbot. Por favor inicia sesión."
            
        favoritos = Favorito.objects.filter(cliente=usuario).select_related('local')
        if not favoritos.exists():
            return "No tienes ningún local guardado en tus favoritos."
            
        resultado = "**Tus locales favoritos:**\n"
        for f in favoritos:
            nota = f"{f.local.calificacion_promedio:.1f}" if f.local.calificacion_promedio is not None else "N/A"
            resultado += f"- **{f.local.nombre}** ({f.local.direccion}) — ⭐ {nota}\n"
        return resultado

    elif name == 'obtener_mis_notificaciones':
        if not usuario:
            return "No tienes una sesión de usuario activa en el chatbot. Por favor inicia sesión."
            
        notificaciones = Notificacion.objects.filter(usuario=usuario).order_by('-created_at')[:10]
        if not notificaciones.exists():
            return "No tienes notificaciones recientes."
            
        resultado = "**Tus notificaciones recientes:**\n"
        for n in notificaciones:
            marca = "✅ leída" if n.leida else "🆕 nueva"
            fecha_str = n.created_at.strftime('%d/%m %H:%M')
            resultado += f"- [{marca}] ({fecha_str}) **{n.titulo}**: {n.mensaje}\n"
        return resultado

    return "Herramienta no encontrada."


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def chatbot_view(request):
    mensaje = request.data.get('mensaje', '').strip()
    if not mensaje:
        return Response({'error': 'Mensaje requerido'}, status=400)

    usuario = request.user if request.user.is_authenticated else None

    # Inyección dinámica de contexto temporal para evitar confusiones de fecha en el modelo
    hoy_str = date.today().strftime('%Y-%m-%d')
    dia_semana = date.today().strftime('%A')
    dias_es = {
        'Monday': 'lunes', 'Tuesday': 'martes', 'Wednesday': 'miércoles',
        'Thursday': 'jueves', 'Friday': 'viernes', 'Saturday': 'sábado', 'Sunday': 'domingo'
    }
    dia_nombre = dias_es.get(dia_semana, dia_semana)
    contexto_temporal = f"\n\nCONTEXTO TEMPORAL:\n- Fecha de hoy: {hoy_str} (día {dia_nombre})\n- Hora actual: {datetime.now().strftime('%H:%M')}"

    if usuario and usuario.is_authenticated and usuario.rol == 'dueno':
        system_prompt = SYSTEM_PROMPT_DUENO + contexto_temporal
        tool_resultados = _detectar_intent_dueno(mensaje, usuario)
    else:
        system_prompt = SYSTEM_PROMPT_CLIENTE + contexto_temporal
        tool_resultados = _detectar_intent_cliente(mensaje, usuario)

    api_key = settings.GROQ_API_KEY
    if not api_key:
        return Response({'error': 'GROQ_API_KEY no configurada'}, status=500)

    client = GroqClient(api_key=api_key)

    if tool_resultados:
        messages = [
            {'role': 'system', 'content': system_prompt},
            # Inserta el historial de la conversación para que Groq tenga contexto
            # de preguntas y respuestas anteriores
            *_armar_historial(request.data.get('historial', [])),
            {'role': 'user', 'content': f'Datos obtenidos del sistema:\n{tool_resultados}\n\nPregunta del usuario: {mensaje}'},
        ]
    else:
        messages = [
            {'role': 'system', 'content': system_prompt},
            # Inserta el historial de la conversación para que Groq tenga contexto
            # de preguntas y respuestas anteriores
            *_armar_historial(request.data.get('historial', [])),
            {'role': 'user', 'content': mensaje},
        ]

    try:
        response = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=messages,
            temperature=0.3,
            max_tokens=2048,
        )
        return Response({'respuesta': response.choices[0].message.content})
    except Exception as e:
        return Response({'error': f'Error al comunicarse con Groq: {str(e)}'}, status=500)


# Helper: convierte el historial del frontend al formato de mensajes de Groq
# Recibe [{rol, contenido}] del frontend y devuelve [{role, content}]
# Filtra solo los roles válidos (user/assistant), excluye mensajes de error
# y limita a los últimos 10 mensajes para no exceder tokens
def _armar_historial(historial):
    if not historial or not isinstance(historial, list):
        return []
    mapeo = {'user': 'user', 'assistant': 'assistant'}
    return [
        {'role': mapeo.get(h.get('rol', ''), 'user'), 'content': h.get('contenido', '')}
        for h in historial[-10:]
        if h.get('rol') in ('user', 'assistant') and h.get('contenido')
    ]