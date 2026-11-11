"""Keep authorization codes and tokens out of application access logs.

Gunicorn loads this file from the backend working directory. Configure upstream
Render/Netlify logs to redact query strings independently as documented.
"""
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(m)s %(U)s %(H)s" %(s)s %(b)s'
