from __future__ import annotations

from datetime import date, datetime, time
from decimal import Decimal
from threading import local
from uuid import UUID

from django.db import models

_thread_locals = local()

SENSITIVE_FIELDS = {"password"}


def _set_attr(name, value):
    setattr(_thread_locals, name, value)


def _get_attr(name, default=None):
    return getattr(_thread_locals, name, default)


def resolve_module(request):
    if not request:
        return ""
    path = request.path_info or request.path or ""
    parts = [p for p in path.split("/") if p]
    if "api" in parts:
        idx = parts.index("api")
        if len(parts) > idx + 1:
            return parts[idx + 1]
    match = getattr(request, "resolver_match", None)
    if match:
        view_name = match.view_name or match.url_name
        if view_name:
            return view_name.split("-")[0]
    return ""


def set_current_request(request):
    _set_attr("request", request)
    _set_attr("module", resolve_module(request))
    path = request.path_info or request.path or ""
    _set_attr("is_api", path.startswith("/api/"))
    _set_attr("ip_address", request.META.get("REMOTE_ADDR", "") if request else "")
    user_agent = (request.META.get("HTTP_USER_AGENT", "") if request else "") or ""
    _set_attr("user_agent", user_agent[:255])
    _set_attr("path", path[:255])
    _set_attr("pre_save_cache", {})
    _set_attr("m2m_cache", {})


def clear_current_request():
    for key in [
        "request",
        "module",
        "is_api",
        "ip_address",
        "user_agent",
        "path",
        "pre_save_cache",
        "m2m_cache",
    ]:
        if hasattr(_thread_locals, key):
            delattr(_thread_locals, key)


def get_audit_context():
    return {
        "request": _get_attr("request"),
        "module": _get_attr("module", ""),
        "is_api": _get_attr("is_api", False),
        "ip_address": _get_attr("ip_address", ""),
        "user_agent": _get_attr("user_agent", ""),
        "path": _get_attr("path", ""),
    }


def get_pre_save_cache():
    cache = _get_attr("pre_save_cache")
    if cache is None:
        cache = {}
        _set_attr("pre_save_cache", cache)
    return cache


def get_m2m_cache():
    cache = _get_attr("m2m_cache")
    if cache is None:
        cache = {}
        _set_attr("m2m_cache", cache)
    return cache


def _serialize_value(value):
    if value is None:
        return None
    if isinstance(value, (datetime, date, time)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, models.Model):
        return str(value.pk)
    if isinstance(value, (list, tuple)):
        return [_serialize_value(item) for item in value]
    if isinstance(value, dict):
        return {str(k): _serialize_value(v) for k, v in value.items()}
    return value


def snapshot_instance(instance):
    data = {}
    for field in instance._meta.fields:
        name = field.name
        if name in SENSITIVE_FIELDS:
            data[name] = "***"
            continue
        value = getattr(instance, name, None)

        if isinstance(field, models.ForeignKey):
            data[name] = str(value.pk) if value else None
        elif isinstance(field, models.FileField):
            data[name] = value.name if value else None
        else:
            data[name] = _serialize_value(value)
    return data


def build_diff(before, after):
    before = before or {}
    after = after or {}
    diff = {}
    for key in sorted(set(before.keys()) | set(after.keys())):
        b_val = before.get(key)
        a_val = after.get(key)
        if b_val != a_val:
            diff[key] = {"before": b_val, "after": a_val}
    return diff
