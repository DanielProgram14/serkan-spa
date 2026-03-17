import getpass

from decouple import config
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from api.models import PerfilUsuario, Trabajador
from api.roles import (
    CANONICAL_ROLE_VALUES,
    ROLE_ADMINISTRADOR,
    ROLE_SUPERVISOR,
    ROLE_TRABAJADOR,
    normalize_role,
)


class Command(BaseCommand):
    help = (
        "Crea el usuario inicial de forma segura (admin por defecto) "
        "si no existen usuarios en la base de datos."
    )

    def add_arguments(self, parser):
        parser.add_argument("--username")
        parser.add_argument("--email")
        parser.add_argument("--password")
        parser.add_argument("--role", default=ROLE_ADMINISTRADOR)
        parser.add_argument("--trabajador")
        parser.add_argument("--force", action="store_true")
        parser.add_argument("--no-input", action="store_true")

    def _pick_value(self, option_value, env_key, default=""):
        if option_value:
            return option_value
        return config(env_key, default=default)

    def _prompt(self, label, secret=False):
        if self.no_input:
            raise CommandError(f"Falta valor requerido: {label}")
        if secret:
            return getpass.getpass(label)
        return input(label).strip()

    def _validate_password(self, password, username, email):
        try:
            validate_password(password, user=User(username=username, email=email))
        except ValidationError as exc:
            raise CommandError("; ".join(exc.messages)) from exc

    def handle(self, *args, **options):
        self.no_input = options["no_input"]

        if User.objects.exists() and not options["force"]:
            raise CommandError(
                "Ya existen usuarios en la base de datos. "
                "Usa --force si quieres crear otro usuario inicial."
            )

        username = self._pick_value(options["username"], "BOOTSTRAP_ADMIN_USERNAME").strip()
        email = self._pick_value(options["email"], "BOOTSTRAP_ADMIN_EMAIL").strip()
        password = self._pick_value(options["password"], "BOOTSTRAP_ADMIN_PASSWORD").strip()
        role_raw = self._pick_value(options["role"], "BOOTSTRAP_ADMIN_ROLE", ROLE_ADMINISTRADOR).strip()
        trabajador_rut = self._pick_value(options["trabajador"], "BOOTSTRAP_TRABAJADOR_RUT").strip()

        if not username:
            username = self._prompt("Usuario (username): ")
        if not password:
            password = self._prompt("Password: ", secret=True)
        if not email and not self.no_input:
            email = self._prompt("Email (opcional): ")

        if User.objects.filter(username__iexact=username).exists():
            raise CommandError("El nombre de usuario ya existe.")

        normalized_role = normalize_role(role_raw) or ROLE_ADMINISTRADOR
        if normalized_role not in CANONICAL_ROLE_VALUES:
            raise CommandError("Rol no valido.")

        trabajador_instance = None
        if trabajador_rut:
            try:
                trabajador_instance = Trabajador.objects.get(pk=trabajador_rut)
            except Trabajador.DoesNotExist as exc:
                raise CommandError("Trabajador no existe.") from exc

        if normalized_role in {ROLE_SUPERVISOR, ROLE_TRABAJADOR} and not trabajador_instance:
            raise CommandError("Supervisor y Trabajador requieren un trabajador asociado.")

        if trabajador_instance and PerfilUsuario.objects.filter(trabajador=trabajador_instance).exists():
            raise CommandError("El trabajador ya esta vinculado a otro usuario.")

        self._validate_password(password, username, email)

        with transaction.atomic():
            if normalized_role == ROLE_ADMINISTRADOR:
                user = User.objects.create_superuser(
                    username=username,
                    email=email or "",
                    password=password,
                )
            else:
                user = User.objects.create_user(
                    username=username,
                    email=email or "",
                    password=password,
                )

            PerfilUsuario.objects.create(
                user=user,
                rol=normalized_role,
                trabajador=trabajador_instance,
            )

        self.stdout.write(self.style.SUCCESS(f"Usuario inicial creado: {user.username}"))
