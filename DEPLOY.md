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
- `STRIPE_PRICE_ULTIMATE`: Stripe Price ID for Ultimate plan.
- `STRIPE_PRICE_ADDON`: Stripe Price ID for the add-on (extra try-ons).
- `REPLICATE_API_TOKEN`: API token for Replicate (used for IDM-VTON try-on generation).
- `USE_MOCK`: Set `false` in production to use real try-on generation (`true` keeps mock mode).
- `RUN_MIGRATIONS`: Set `true` on the primary instance only to run `prisma migrate deploy` on startup (prevents race conditions in multi-instance deployments).

## Stripe Webhook Endpoint

In the Stripe Dashboard, configure a webhook endpoint pointing to:

```
https://your-app.up.railway.app/api/stripe/webhook
```

Events to enable:
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

Copy the generated webhook signing secret (`whsec_...`) and set it as `STRIPE_WEBHOOK_SECRET` in Railway.
