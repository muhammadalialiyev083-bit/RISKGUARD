# UzHi account services

Apply additive authentication migration `0003` against the existing database;
never seed production or reset existing user passwords.

Configure Google with `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and
`GOOGLE_REDIRECT_URI=https://uzhi.netlify.app/api/v1/auth/google/callback`.
Set `FRONTEND_URL=https://uzhi.netlify.app`. Register this exact redirect URI in
the Google OAuth client and allow the provider discovery/token/JWKS hosts in the
environment network policy. Existing users first sign in with their password,
then explicitly link Google from account security. A matching email never grants
membership or links an account. Administrators invite new members by email.

Configure email through `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`,
`EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS`/`EMAIL_USE_SSL`, and `DEFAULT_FROM_EMAIL`.
Use secure hosting environment settings for secrets. The configuration API only
indicates whether bindings exist; real consent and delivery need separate live
validation. Password-reset responses stay generic even if delivery fails; a
bounded, token-free error is recorded so operators can check provider delivery.

Rate limits use shared database counters. The peer address comes exclusively
from `REMOTE_ADDR`; arbitrary `X-Forwarded-For` headers never alter the bucket.
When a trusted reverse proxy supplies one shared peer address, size rate limits
and trusted upstream address handling for the deployment before high-volume use.

Do not enable raw query-string access logging for the OAuth callback. Provider
callbacks include short-lived authorization codes and state. Configure upstream,
proxy, and application access logs to omit/redact query strings, for example use
Gunicorn's `%(U)s` path field rather than `%(r)s` or `%(q)s`. Django `runserver`
is a local development server and its default request log prints queries; do not
use it to exercise real provider credentials. Application code never logs OAuth
tokens, authorization codes, reset tokens or passwords. Emailed reset/invitation
tokens use URL fragments, so they are not sent in HTTP requests or referrers.
