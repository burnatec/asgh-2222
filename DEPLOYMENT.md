# Afro Superstore Ghana — setup and deployment

## Current architecture

The project is a Next.js App Router storefront. The storefront, authenticated checkout API, admin API, and Paystack verification callback currently live in the same Next.js project and are intended to deploy together on Vercel. Supabase provides Postgres, Auth, and the product catalog. A separate Railway service is not configured in this repository yet; the current API routes do not depend on `NEXT_PUBLIC_API_URL`.

## Supabase

The Supabase project has the commerce schema, profile-on-signup trigger, catalog seed, and server-only atomic order-creation function applied. Configure the Supabase Auth Site URL and allowed redirect URLs for the Vercel production domain and preview domains, including `/auth/callback` and `/auth/callback?next=/auth/reset-password`.

The app uses the publishable/anonymous key in browser code and the secret/service-role key only in server handlers. Do not expose the service-role key to client code. The checkout database function validates inventory and prices from the database and is executable only by `service_role`.

## Paystack

Set `PAYSTACK_SECRET_KEY` in Vercel project environment variables for Preview and Production. Use a Paystack test secret while testing and a live secret only after verifying the merchant account and checkout flow. The backend initializes transactions in GHS and enables Mobile Money and card channels. Paystack redirects to `/api/payments/verify`; that server route verifies the reference, currency, status, and amount with Paystack before marking an order paid.

Never put the Paystack secret in a `NEXT_PUBLIC_*` variable. A successful payment has not been tested end-to-end until a valid Paystack account and test/live credentials are configured.

## Order email notifications

After Paystack verifies payment and the order transitions to paid, the server sends the customer an order confirmation through the connected Resend integration. `afrosuperstoregh@gmail.com` is used as the reply-to address and receives a blind copy. The sender uses `orders@${RESEND_EMAIL_DOMAIN}`; this domain must be verified in Resend. A Resend idempotency key is derived from the order reference. Email delivery failures are logged without changing a verified payment to failed. Do not use a free Gmail address as the From domain; Resend requires a verified sending domain.

## Admin access

`/admin` and `/api/admin` require a verified Supabase user whose server-controlled `app_metadata.role` is `admin`. Assign this claim only through a trusted Supabase administrative workflow; do not use editable user metadata or expose a role-editing control to customers. The dashboard supports sales/order overview, order delivery-status updates, customer listing, inventory visibility, and product create/edit/archive. Product image uploads use the connected public Vercel Blob store through `/api/admin/upload`; the API verifies the Supabase admin claim, accepts JPG/PNG/WebP/AVIF files up to 4 MB, and returns a public HTTPS URL saved with the product. `BLOB_READ_WRITE_TOKEN` must be present in the Vercel deployment environment (the connected Blob integration supplies it).

## Vercel frontend and Railway API deployment

The repository is connected to `https://github.com/burnatec/asgh-2222` on `main`. The Next.js route handlers are the API, so Railway runs the same Next.js project while Vercel serves the storefront. Once `RAILWAY_API_ORIGIN` is configured in Vercel, Next.js reverse-proxies `/api/*` to Railway. The browser continues to use same-origin `/api` URLs, so session cookies are forwarded without adding cross-origin browser requests or permissive CORS rules.

### Railway service

1. In Railway, create a service from the GitHub repository `burnatec/asgh-2222`, branch `main`, with the repository root as the service root.
2. Use `pnpm install --frozen-lockfile` as the build command and `pnpm start` as the start command. Railway provides `PORT`; Next.js listens on it.
3. Configure the service health check path as `/api/health`, then generate a public Railway domain.
4. Add these Railway variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`), `PAYSTACK_SECRET_KEY`, `RESEND_API_KEY`, `RESEND_EMAIL_DOMAIN`, `BLOB_READ_WRITE_TOKEN`, and `APP_PUBLIC_URL` (the public Vercel storefront origin). Keep all secret keys server-side; never use a `NEXT_PUBLIC_` prefix for secrets.

### Vercel routing

1. Add `RAILWAY_API_ORIGIN` to the Vercel project environment variables. Its value is the Railway service origin, for example `https://your-service.up.railway.app` (no path).
2. Add `APP_PUBLIC_URL` to Vercel with the public storefront origin. This keeps Paystack callbacks and post-payment redirects on the Vercel storefront while verification runs on Railway.
3. Redeploy Vercel so its rewrite configuration takes effect. Confirm `https://your-storefront/api/health` returns `{"status":"ok"}`; that request should be served by Railway.
4. Configure Supabase Auth Site URL and allowed redirect URLs for the Vercel production and preview domains, including `/auth/callback` and `/auth/callback?next=/auth/reset-password`.

The current Next.js app is deployed as a complete service on Railway, not a separately extracted API-only package; Vercel handles the public UI and proxies API paths to the Railway deployment. This avoids duplicating auth, validation, and payment code across two implementations.

## Remaining launch checks


- Configure production and preview Auth redirect URLs in Supabase.
- Add the administrator claim through a trusted server-side process.
- Set and verify Paystack credentials; complete a test payment and confirm the order status changes only after server verification.
- Add production support contact details, delivery/returns policies, and any required privacy/terms content.
- Configure Railway separately only if the split-backend architecture is still required.
