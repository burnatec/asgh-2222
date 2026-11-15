# Afro Superstore Ghana — setup and deployment

## Current architecture

The project is a Next.js App Router storefront. The storefront, authenticated checkout API, admin API, and Paystack verification callback currently live in the same Next.js project and are intended to deploy together on Vercel. Supabase provides Postgres, Auth, and the product catalog. A separate Railway service is not configured in this repository yet; the current API routes do not depend on `NEXT_PUBLIC_API_URL`.

## Supabase

The Supabase project has the commerce schema, profile-on-signup trigger, catalog seed, and server-only atomic order-creation function applied. Configure the Supabase Auth Site URL and allowed redirect URLs for the Vercel production domain and preview domains, including `/auth/callback` and `/auth/callback?next=/auth/reset-password`.

The app uses the publishable/anonymous key in browser code and the secret/service-role key only in server handlers. Do not expose the service-role key to client code. The checkout database function validates inventory and prices from the database and is executable only by `service_role`.

## Paystack

Set `PAYSTACK_SECRET_KEY` in Vercel project environment variables for Preview and Production. Use a Paystack test secret while testing and a live secret only after verifying the merchant account and checkout flow. The backend initializes transactions in GHS and enables Mobile Money and card channels. Paystack redirects to `/api/payments/verify`; that server route verifies the reference, currency, status, and amount with Paystack before marking an order paid.

Never put the Paystack secret in a `NEXT_PUBLIC_*` variable. A successful payment has not been tested end-to-end until a valid Paystack account and test/live credentials are configured.

## Admin access

`/admin` and `/api/admin` require a verified Supabase user whose server-controlled `app_metadata.role` is `admin`. Assign this claim only through a trusted Supabase administrative workflow; do not use editable user metadata or expose a role-editing control to customers. The dashboard supports sales/order overview, order delivery-status updates, customer listing, inventory visibility, and product create/edit/archive. Product images currently use HTTPS image URLs; direct file upload is not configured.

## Deploying the current project

Connect the repository to Vercel and deploy the Next.js project. Configure the Supabase and Paystack environment variables in the Vercel project settings for the relevant environments. The project build is `pnpm build`.

The originally requested split deployment (Next.js frontend on Vercel and a separate API on Railway) remains a deployment task: the current checkout/admin endpoints run on Vercel as Next.js route handlers. If a separate Railway API is required, move those handlers behind a Railway service and configure the frontend API origin and CORS/auth forwarding before directing production traffic to it.

## Remaining launch checks

- Configure production and preview Auth redirect URLs in Supabase.
- Add the administrator claim through a trusted server-side process.
- Set and verify Paystack credentials; complete a test payment and confirm the order status changes only after server verification.
- Add production support contact details, delivery/returns policies, and any required privacy/terms content.
- Configure Railway separately only if the split-backend architecture is still required.
