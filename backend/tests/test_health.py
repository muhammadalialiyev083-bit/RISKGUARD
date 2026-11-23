from unittest.mock import patch

from django.db import DatabaseError
from django.urls import reverse


def test_health_is_public_and_does_not_touch_database(client):
    with patch('apps.core.health.connection.cursor') as cursor:
        response = client.get(reverse('health'))
    assert response.status_code == 200
    assert response.json() == {'status': 'ok'}
    assert 'no-store' in response['Cache-Control']
    cursor.assert_not_called()


def test_readiness_checks_database_without_exposing_errors(client, db):
    ready = client.get(reverse('readiness'))
    assert ready.status_code == 200
    assert ready.json() == {'status': 'ready'}

    with patch('apps.core.health.connection.cursor', side_effect=DatabaseError('secret database detail')):
        unavailable = client.get(reverse('readiness'))
    assert unavailable.status_code == 503
    assert unavailable.json() == {'status': 'unavailable'}
    assert 'secret' not in unavailable.content.decode()
