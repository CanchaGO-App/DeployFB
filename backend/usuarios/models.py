from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.contrib.auth.hashers import make_password


class Usuario(models.Model):
    ROLES = [
        ('cliente', 'Cliente'),
        ('dueno', 'Dueño de Cancha'),
        ('admin', 'Administrador'),
    ]

    nombre = models.CharField(max_length=100)
    correo = models.EmailField(unique=True)
    contrasena = models.CharField(max_length=255)
    rol = models.CharField(max_length=20, choices=ROLES)
    foto_perfil = models.ImageField(upload_to='perfiles/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def is_authenticated(self):
        return True

    def save(self, *args, **kwargs):
        if not self.contrasena.startswith(('pbkdf2_sha256$', 'bcrypt$', 'argon2')):
            self.contrasena = make_password(self.contrasena)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.nombre


class Local(models.Model):
    """Complejo Deportivo / Local que agrupa varias canchas."""
    dueno = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name='locales',
        limit_choices_to={'rol': 'dueno'}
    )
    nombre = models.CharField(max_length=150)
    direccion = models.CharField(max_length=300)
    descripcion = models.TextField(blank=True)
    latitud = models.DecimalField(
        max_digits=9, decimal_places=6,
        null=True, blank=True
    )
    longitud = models.DecimalField(
        max_digits=9, decimal_places=6,
        null=True, blank=True
    )
    imagen_portada = models.ImageField(
        upload_to='locales/', blank=True, null=True
    )
    qr_code = models.ImageField(
        upload_to='qr_codes/', blank=True, null=True
    )
    qr_expiry = models.DateField(null=True, blank=True)
    hora_apertura = models.TimeField(default='07:00')
    hora_cierre = models.TimeField(default='22:00')
    telefonos = models.JSONField(default=list, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.nombre

    @property
    def total_canchas(self):
        return self.canchas.count()

    @property
    def calificacion_promedio(self):
        promedio = self.canchas.aggregate(
            avg=models.Avg('resenas__calificacion')
        )['avg']
        return round(promedio, 1) if promedio else None

    @property
    def total_resenas(self):
        from .models import Resena
        return Resena.objects.filter(cancha__local=self).count()


class Cancha(models.Model):
    TIPOS = [
        ('futbol5', 'Fútbol 5'),
        ('futbol7', 'Fútbol 7'),
        ('futbol11', 'Fútbol 11'),
        ('basquet', 'Básquetbol'),
        ('tenis', 'Tenis'),
        ('padel', 'Pádel'),
        ('voley', 'Voleibol'),
        ('otro', 'Otro'),
    ]

    local = models.ForeignKey(
        Local,
        on_delete=models.CASCADE,
        related_name='canchas'
    )
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True)
    precio_por_hora = models.DecimalField(max_digits=8, decimal_places=2)
    tipo = models.CharField(max_length=20, choices=TIPOS, default='futbol5')
    capacidad = models.IntegerField(default=10)
    imagen = models.ImageField(upload_to='canchas/', blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.nombre} ({self.local.nombre})"

    @property
    def calificacion_promedio(self):
        promedio = self.resenas.aggregate(models.Avg('calificacion'))['calificacion__avg']
        return round(promedio, 1) if promedio else None

    @property
    def total_resenas(self):
        return self.resenas.count()


class Reserva(models.Model):
    ESTADOS = [
        ('pendiente_pago', 'Pendiente de Pago'),
        ('confirmada', 'Confirmada'),
        ('cancelada', 'Cancelada'),
    ]

    cliente = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name='reservas',
        limit_choices_to={'rol': 'cliente'}
    )

    cancha = models.ForeignKey(
        Cancha,
        on_delete=models.CASCADE,
        related_name='reservas'
    )

    fecha = models.DateField(db_index=True)
    hora_inicio = models.TimeField()
    hora_fin = models.TimeField()

    estado = models.CharField(
        max_length=20,
        choices=ESTADOS,
        default='confirmada',
        db_index=True
    )

    ticket_code = models.CharField(max_length=20, unique=True, null=True, blank=True)
    participantes = models.ManyToManyField(
        Usuario,
        related_name='reservas_participadas',
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.ticket_code:
            import uuid
            self.ticket_code = f"CG-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.cliente} - {self.cancha} ({self.fecha})"


class Resena(models.Model):
    """Reseña de un cliente sobre una cancha."""
    cliente = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name='resenas'
    )
    cancha = models.ForeignKey(
        Cancha,
        on_delete=models.CASCADE,
        related_name='resenas'
    )
    calificacion = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    comentario = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['cliente', 'cancha']

    def __str__(self):
        return f"{self.cliente} → {self.cancha}: {self.calificacion}⭐"


class Favorito(models.Model):
    """Locales marcados como favoritos por un cliente."""
    cliente = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name='favoritos',
        limit_choices_to={'rol': 'cliente'}
    )
    local = models.ForeignKey(
        Local,
        on_delete=models.CASCADE,
        related_name='favoritos'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['cliente', 'local']
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.cliente.nombre} ♥ {self.local.nombre}"


class Notificacion(models.Model):
    TIPOS = [
        ('reserva_nueva', 'Nueva Reserva'),
        ('reserva_confirmada', 'Reserva Confirmada'),
        ('reserva_cancelada', 'Reserva Cancelada'),
        ('resena_nueva', 'Nueva Reseña'),
        ('sistema', 'Sistema'),
    ]

    usuario = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name='notificaciones'
    )
    titulo = models.CharField(max_length=200)
    mensaje = models.TextField()
    tipo = models.CharField(max_length=30, choices=TIPOS, default='sistema')
    leida = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.usuario}: {self.titulo}"


class Pago(models.Model):
    ESTADOS = [
        ('pendiente', 'Pendiente'),
        ('pagado', 'Pagado'),
        ('rechazado', 'Rechazado'),
        ('reembolsado', 'Reembolsado'),
    ]

    reserva = models.OneToOneField(
        Reserva,
        on_delete=models.CASCADE,
        related_name='pago'
    )
    monto = models.DecimalField(max_digits=10, decimal_places=2)
    comprobante = models.ImageField(upload_to='comprobantes/', blank=True, null=True)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='pendiente', db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Pago {self.reserva.ticket_code} - {self.estado}"
