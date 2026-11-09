import json
import os
import sys
import termios

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bcms_backend.settings')
import django
django.setup()
from django.contrib.auth.hashers import check_password

attributes = termios.tcgetattr(sys.stdin.fileno())
attributes[3] &= ~termios.ECHO
termios.tcsetattr(sys.stdin.fileno(), termios.TCSANOW, attributes)
print('Ready for private credential verification.', flush=True)
record = json.loads(sys.stdin.readline())
valid = check_password(record['password'], record['encoded'])
print(json.dumps({'live_account_password_verified': valid}), flush=True)
sys.exit(0 if valid else 1)
