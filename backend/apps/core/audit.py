from apps.core.models import AuditLog


def get_client_ip(request):
    """Foydalanuvchi IP manzilini xavfsiz aniqlash."""
    if not request:
        return None
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def record_audit(request=None, action='UPDATE', entity='', entity_id='', before_state=None, after_state=None, actor=None, organization=None):
    """
    FR-12: Audit jurnaliga hodisani immutable shaklda yozish.
    """
    if request:
        if not actor and hasattr(request, 'user') and request.user.is_authenticated:
            actor = request.user
        if not organization and actor and hasattr(actor, 'organization'):
            organization = actor.organization
        ip = get_client_ip(request)
    else:
        ip = None

    return AuditLog.objects.create(
        organization=organization,
        actor=actor,
        action=action,
        entity=entity,
        entity_id=str(entity_id),
        before_state=before_state or {},
        after_state=after_state or {},
        ip_address=ip
    )
