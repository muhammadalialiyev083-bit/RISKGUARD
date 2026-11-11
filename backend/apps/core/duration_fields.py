"""Keep public hour/minute inputs and retained seconds columns consistent."""
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP


def synchronize_seconds(instance, kwargs, pairs):
    update_fields = kwargs.get('update_fields')
    selected = set(update_fields) if update_fields is not None else None
    sources = [source for source, _, _ in pairs]
    if selected is not None and not (selected & set(sources)):
        return
    previous = None
    if not instance._state.adding and instance.pk and selected is None:
        previous = type(instance).objects.filter(pk=instance.pk).values(*sources).first()
    changed = set()
    for source, target, multiplier in pairs:
        value = getattr(instance, source, None)
        if value is None or (selected is not None and source not in selected):
            continue
        if not instance._state.adding and selected is None and previous and previous[source] == value:
            continue
        try:
            amount = Decimal(str(value))
            if not amount.is_finite():
                continue
            seconds = int((amount * multiplier).quantize(Decimal('1'), rounding=ROUND_HALF_UP))
        except (InvalidOperation, ValueError, TypeError):
            continue  # The declared public field's normal validation reports invalid input.
        setattr(instance, target, seconds)
        changed.add(target)
    if selected is not None:
        kwargs['update_fields'] = selected | changed
