from django.apps import apps
from django.contrib.auth.models import User
from django.db.models.signals import m2m_changed, post_save, pre_delete, pre_save
from django.dispatch import receiver

from .audit import build_diff, get_audit_context, get_m2m_cache, get_pre_save_cache, snapshot_instance
from .models import AuditLog


def should_audit_model(model):
    if model is AuditLog:
        return False
    if model is User:
        return True
    return model._meta.app_label == "api"


def _actor_label(user):
    if not user:
        return "Sistema"
    full_name = user.get_full_name().strip()
    return full_name or user.username


def _create_audit_log(action, instance, before, after, diff, module_override=None):
    context = get_audit_context()
    if not context.get("is_api"):
        return

    request = context.get("request")
    user = request.user if request and request.user.is_authenticated else None
    changed_fields = ", ".join(list(diff.keys())[:6])
    suffix = f" ({changed_fields})" if changed_fields else ""

    AuditLog.objects.create(
        user=user,
        user_label=_actor_label(user),
        action=action,
        module=module_override or context.get("module", "") or instance._meta.model_name,
        model=instance.__class__.__name__,
        object_id=str(instance.pk) if instance.pk is not None else "",
        summary=f"{action} {instance.__class__.__name__} {instance.pk or ''}{suffix}".strip(),
        changes={"before": before, "after": after, "diff": diff},
        ip_address=context.get("ip_address", ""),
        user_agent=context.get("user_agent", ""),
        path=context.get("path", ""),
    )


@receiver(pre_save)
def audit_pre_save(sender, instance, **kwargs):
    if not should_audit_model(sender):
        return
    if instance.pk is None:
        return

    existing = sender.objects.filter(pk=instance.pk).first()
    if not existing:
        return

    cache = get_pre_save_cache()
    cache[(sender, instance.pk)] = snapshot_instance(existing)


@receiver(post_save)
def audit_post_save(sender, instance, created, **kwargs):
    if not should_audit_model(sender):
        return

    cache = get_pre_save_cache()
    before = None if created else cache.pop((sender, instance.pk), None)
    after = snapshot_instance(instance)

    action = AuditLog.ACTION_CREATE if created else AuditLog.ACTION_UPDATE
    diff = build_diff(before or {}, after or {})
    if not diff:
        return

    _create_audit_log(action, instance, before, after, diff)


@receiver(pre_delete)
def audit_pre_delete(sender, instance, **kwargs):
    if not should_audit_model(sender):
        return

    before = snapshot_instance(instance)
    diff = build_diff(before or {}, {})
    _create_audit_log(AuditLog.ACTION_DELETE, instance, before, None, diff)


@receiver(m2m_changed)
def audit_m2m_changed(sender, instance, action, reverse, model, pk_set, **kwargs):
    if not should_audit_model(instance.__class__):
        return
    if action not in {"pre_add", "pre_remove", "pre_clear", "post_add", "post_remove", "post_clear"}:
        return
    if reverse:
        return

    field = kwargs.get("field")
    if not field:
        return

    cache = get_m2m_cache()
    key = (instance.__class__, instance.pk, field.name)

    if action in {"pre_add", "pre_remove", "pre_clear"}:
        before_state = list(getattr(instance, field.name).values_list("pk", flat=True))
        cache[key] = {"before": before_state}
        return

    if action in {"post_add", "post_remove", "post_clear"}:
        cached = cache.pop(key, {})
        before_state = cached.get("before", [])
        after_state = list(getattr(instance, field.name).values_list("pk", flat=True))
        diff = build_diff({"m2m": before_state}, {"m2m": after_state})
        if not diff:
            return
        _create_audit_log(
            AuditLog.ACTION_UPDATE,
            instance,
            {"m2m": before_state},
            {"m2m": after_state},
            diff,
            module_override=f"{instance._meta.model_name}-rel",
        )
