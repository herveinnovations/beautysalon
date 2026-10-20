# Bloom Beauty Studio

Beauty salon website for lashes, nails and hair, with Supabase appointment requests and a private admin panel.

## Hosting

Deploy `dist/` as the website root. No build command is needed. The admin panel is `/admin.html`. Add the hosted admin URL to Supabase Auth redirect URLs before using confirmation and password-reset emails on a new domain.

## Database and security

The existing Supabase project is already configured. Database setup scripts are kept locally and excluded from this repository. Customer records and account sessions are not included. The frontend uses a Supabase publishable key; authorization is enforced by database row-level security. Never commit passwords, private keys, service-role keys, session tokens or customer exports.

## Included

Treatment catalogue, appointment requests, manual WhatsApp handoff, admin management, photo uploads, editable website content, and privacy/booking policies.

## Not yet connected

Payments and automatic messaging are not configured. Staff scheduling and overlap prevention are not implemented. Appointments require manual confirmation.
