from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Count
from django.db.models.functions import Lower

from rest_framework.authtoken.models import Token

from api.models import PerfilUsuario
from api.roles import CANONICAL_ROLE_VALUES, ROLE_ADMINISTRADOR, ROLE_TRABAJADOR, normalize_role


class Command(BaseCommand):
    help = (
        "Audita y limpia datos de login (usuarios, perfiles y tokens) "
        "para evitar errores al autenticar."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--fix",
            action="store_true",
            help="Aplica correcciones seguras (crear perfiles faltantes y normalizar roles).",
        )
        parser.add_argument(
            "--reset-tokens",
            action="store_true",
            help="Elimina todos los tokens para regenerarlos en el proximo login.",
        )
        parser.add_argument(
            "--default-role",
            default=ROLE_TRABAJADOR,
            help="Rol por defecto para perfiles creados automaticamente.",
        )

    def handle(self, *args, **options):
        User = get_user_model()
        default_role = normalize_role(options["default_role"]) or ROLE_TRABAJADOR

        if default_role not in CANONICAL_ROLE_VALUES:
            self.stderr.write("Rol por defecto invalido.")
            return

        users_without_profile = User.objects.filter(perfil__isnull=True)
        invalid_roles = PerfilUsuario.objects.exclude(rol__in=CANONICAL_ROLE_VALUES)
        missing_trabajador = PerfilUsuario.objects.filter(
            rol__in=["SUPERVISOR", "TRABAJADOR"], trabajador__isnull=True
        )
        duplicate_emails = (
            User.objects.exclude(email__isnull=True)
            .exclude(email__exact="")
            .annotate(email_lower=Lower("email"))
            .values("email_lower")
            .annotate(total=Count("id"))
            .filter(total__gt=1)
        )

        self.stdout.write(f"Usuarios sin perfil: {users_without_profile.count()}")
        self.stdout.write(f"Perfiles con rol invalido: {invalid_roles.count()}")
        self.stdout.write(f"Perfiles sin trabajador requerido: {missing_trabajador.count()}")
        self.stdout.write(f"Correos duplicados: {duplicate_emails.count()}")

        if not options["fix"] and not options["reset_tokens"]:
            self.stdout.write("Sin cambios (ejecuta con --fix o --reset-tokens para aplicar).")
            return

        with transaction.atomic():
            if options["fix"]:
                created = 0
                for user in users_without_profile:
                    role = ROLE_ADMINISTRADOR if user.is_superuser else default_role
                    PerfilUsuario.objects.create(user=user, rol=role)
                    created += 1

                normalized = 0
                for perfil in invalid_roles:
                    normalized_role = normalize_role(perfil.rol) or default_role
                    if normalized_role not in CANONICAL_ROLE_VALUES:
                        normalized_role = default_role
                    if perfil.rol != normalized_role:
                        perfil.rol = normalized_role
                        perfil.save(update_fields=["rol"])
                        normalized += 1

                self.stdout.write(f"Perfiles creados: {created}")
                self.stdout.write(f"Roles normalizados: {normalized}")

            if options["reset_tokens"]:
                deleted, _ = Token.objects.all().delete()
                self.stdout.write(f"Tokens eliminados: {deleted}")
