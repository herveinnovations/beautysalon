# Bloom Beauty Studio

Beauty salon website for lashes, nails and hair, with Supabase appointment requests and an owner-only admin panel.

## Run and deploy

Serve `dist/` as the website root with a static HTTP server. The homepage is `index.html`; the admin panel is `/admin.html`. A static hosting provider can deploy this folder without a build command.

## Database

The `supabase-*.sql` files describe the existing Supabase configuration and were already applied to the connected project. They are not idempotent; do not run them again on that project. Review them before setting up a different database. Configure the hosted admin URL in Supabase Auth redirect URLs before using password reset or confirmation emails on a new domain.

## Current features

- Treatment catalogue and Kwacha/USD display
- Appointment requests saved to Supabase
- Customer-initiated WhatsApp messages
- Admin appointment management and treatment editing
- Photo uploads, editable site content, draft preview and publishing
- Privacy and booking/cancellation information

## Not connected

Lenco/other payment processing and automatic email/WhatsApp delivery are not configured. Staff scheduling and overlap prevention are not implemented. Appointment requests require manual confirmation.

## Security

Only Supabase publishable credentials are used in the frontend. Row-level security protects customer records and admin actions. Never add service-role keys, passwords, or exported customer records to this repository.
