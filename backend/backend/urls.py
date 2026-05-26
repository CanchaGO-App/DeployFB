from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from usuarios.views import (
    LocalViewSet, CanchaViewSet, ReservaViewSet, ResenaViewSet,
    registro_view, login_view, me_view, refresh_token_view,
    dueno_estadisticas_view, admin_estadisticas_view,
    disponibilidad_cancha_view,
    notificaciones_view, marcar_notificaciones_leidas_view,
    favoritos_view, eliminar_favorito_view, es_favorito_view,
    mis_resenas_view,

    agregar_participante_view, quitar_participante_view,
    reservar_y_pagar_view,
    pagos_pendientes_view, confirmar_pago_view, rechazar_pago_view,
    chatbot_view,
)

router = DefaultRouter()
router.register('locales', LocalViewSet, basename='locales')
router.register('canchas', CanchaViewSet, basename='canchas')
router.register('reservas', ReservaViewSet)
router.register('resenas', ResenaViewSet, basename='resenas')

urlpatterns = [
    path('admin/', admin.site.urls),

    # Autenticación
    path('api/registro/', registro_view),
    path('api/login/', login_view),
    path('api/me/', me_view),
    path('api/token/refresh/', refresh_token_view),

    # Disponibilidad individual de cancha
    path('api/disponibilidad/<int:cancha_id>/', disponibilidad_cancha_view),

    # Notificaciones
    path('api/notificaciones/<int:usuario_id>/', notificaciones_view),
    path('api/notificaciones/<int:usuario_id>/leer/', marcar_notificaciones_leidas_view),

    # Estadísticas
    path('api/estadisticas/dueno/<int:dueno_id>/', dueno_estadisticas_view),
    path('api/estadisticas/admin/', admin_estadisticas_view),

    # Favoritos
    path('api/favoritos/<int:cliente_id>/', favoritos_view),
    path('api/favoritos/<int:cliente_id>/<int:local_id>/eliminar/', eliminar_favorito_view),
    path('api/favoritos/<int:cliente_id>/<int:local_id>/verificar/', es_favorito_view),

    # Mis reseñas
    path('api/resenas/cliente/<int:cliente_id>/', mis_resenas_view),

    # Participantes de reserva
    path('api/reservas/<int:reserva_id>/participantes/agregar/', agregar_participante_view),
    path('api/reservas/<int:reserva_id>/participantes/quitar/', quitar_participante_view),

    # Pagos
    path('api/pagos/reservar-y-pagar/', reservar_y_pagar_view),
    path('api/pagos/pendientes/<int:dueno_id>/', pagos_pendientes_view),
    path('api/pagos/<int:pago_id>/confirmar/', confirmar_pago_view),
    path('api/pagos/<int:pago_id>/rechazar/', rechazar_pago_view),

    # Chatbot IA
    path('api/chatbot/', chatbot_view),

    # REST API (includes /api/locales/, /api/canchas/, /api/reservas/, /api/resenas/)
    # Local availability: /api/locales/<id>/disponibilidad/
    path('api/', include(router.urls)),
]

# Servir archivos de media (producción incluida)
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)