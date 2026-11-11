import json,time
from contextlib import nullcontext
from unittest.mock import Mock
import pytest
from django.test import RequestFactory
from apps.core import schema_inspection as probe

@pytest.mark.parametrize('header', ['', 'Bearer wrong', 'Bearer noto‘g‘ri'])
def test_unauthorized_inspection_never_opens_database(monkeypatch, header):
    monkeypatch.setenv('UZHI_COMPAT_INSPECTION_TOKEN','test-token-'*5)
    monkeypatch.setenv('UZHI_COMPAT_INSPECTION_EXPIRES',str(int(time.time())+300))
    connection=Mock();monkeypatch.setattr(probe,'connection',connection)
    response=probe.inspect_schema(RequestFactory().get('/',HTTP_AUTHORIZATION=header))
    assert response.status_code==404
    connection.cursor.assert_not_called()

def test_inspection_expires_without_database_access(monkeypatch):
    token='test-token-'*5
    monkeypatch.setenv('UZHI_COMPAT_INSPECTION_TOKEN',token)
    monkeypatch.setenv('UZHI_COMPAT_INSPECTION_EXPIRES','1')
    connection=Mock();monkeypatch.setattr(probe,'connection',connection)
    assert probe.inspect_schema(RequestFactory().get('/',HTTP_AUTHORIZATION='Bearer '+token)).status_code==404
    connection.cursor.assert_not_called()

def test_schema_probe_is_get_only(monkeypatch):
    connection=Mock();monkeypatch.setattr(probe,'connection',connection)
    assert probe.inspect_schema(RequestFactory().post('/')).status_code==405
    connection.cursor.assert_not_called()

def test_inspection_uses_read_only_catalog_queries_and_redacts_secret_defaults(monkeypatch):
    token='test-token-'*5
    monkeypatch.setenv('UZHI_COMPAT_INSPECTION_TOKEN',token)
    monkeypatch.setenv('UZHI_COMPAT_INSPECTION_EXPIRES',str(int(time.time())+300))
    cursor=Mock();cursor.__enter__=Mock(return_value=cursor);cursor.__exit__=Mock(return_value=False)
    cursor.fetchall.side_effect=[[
        ('authentication_user','password','character varying','varchar','NO','sensitive-default',128,None,None),
    ],[],[],[],[('core','0001_initial')]]
    connection=Mock(vendor='postgresql');connection.cursor.return_value=cursor
    monkeypatch.setattr(probe,'connection',connection);monkeypatch.setattr(probe.transaction,'atomic',nullcontext)
    response=probe.inspect_schema(RequestFactory().get('/?table=authentication_user',HTTP_AUTHORIZATION='Bearer '+token))
    assert response.status_code==200
    body=json.loads(response.content);assert body['columns'][0]['default']=='<redacted>'
    assert 'sensitive-default' not in response.content.decode()
    commands=[str(call.args[0]) for call in cursor.execute.call_args_list]
    assert commands[0]=='SET TRANSACTION READ ONLY'
    assert not any('FROM authentication_user' in command for command in commands)
    assert 'no-store' in response['Cache-Control']
