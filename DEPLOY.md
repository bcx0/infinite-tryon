# Deployment Environment Variables (Railway + Supabase)

Set these variables in Railway before deploying:

- `SHOPIFY_API_KEY`: Shopify app API key from your Partner Dashboard.
- `SHOPIFY_API_SECRET`: Shopify app API secret from your Partner Dashboard.
- `SHOPIFY_APP_URL`: Public Railway URL of your app (for example `https://your-app.up.railway.app`).
- `SCOPES`: Shopify OAuth scopes used by the app (for example `write_products`).
- `DATABASE_URL`: Supabase PostgreSQL connection string (for example `postgresql://user:password@host:5432/dbname`).
- `STRIPE_SECRET_KEY`: Stripe secret API key (`sk_live_...` in production).
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook signing secret (`whsec_...`) for your production webhook endpoint.
- `STRIPE_PRICE_STARTER`: Stripe Price ID for Starter plan.
- `STRIPE_PRICE_PREMIUM`: Stripe Price ID for Premium plan.
- `STRIPE_PRICE_PRO`: Stripe Price ID for Pro plan.
- `TRYON_API_KEY`: API key used by the try-on backend service.
- `USE_MOCK`: Set `false` in production to use real try-on generation (`true` keeps mock mode).
