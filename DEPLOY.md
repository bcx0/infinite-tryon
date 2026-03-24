# Infinite Tryon — Guide de déploiement

Ce guide couvre le déploiement complet en production sur Railway + Supabase.

---

## Prérequis

- Compte [Railway](https://railway.app)
- Compte [Supabase](https://supabase.com)
- Compte [Stripe](https://stripe.com) (mode live activé)
- Accès au [Shopify Partner Dashboard](https://partners.shopify.com)
- Node.js 18+ en local

---

## 1. Base de données — Supabase

1. Créer un projet Supabase (région : EU West pour conformité RGPD).
2. Aller dans **Settings → Database → Connection string → URI**.
3. Copier l'URI de connexion (format `postgresql://...`).
4. Ajouter `?pgbouncer=true&connection_limit=1` à la fin de l'URI pour Railway.

---

## 2. Stripe — Créer les produits et prix

Utiliser le script fourni pour créer automatiquement tous les produits et prix :

```bash
STRIPE_SECRET_KEY=sk_live_... node scripts/setup-stripe.mjs
```

Le script affiche les variables d'environnement à copier dans Railway :

```
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PREMIUM=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_ULTIMATE=price_...
STRIPE_PRICE_ADDON=price_...
```

> Le script est idempotent — relancer ne crée pas de doublons.

### Portail de facturation Stripe

Dans **Billing → Customer portal** :
- Activer **Allow customers to cancel subscriptions**
- Activer **Allow customers to switch plans**
- Ajouter les plans disponibles (Starter, Premium, Pro, Ultimate)

### Webhook Stripe

Dans **Developers → Webhooks → Add endpoint** :

- **URL** : `https://infinite-tryon-production-b5cf.up.railway.app/api/stripe/webhook`
- **Événements** :
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`

Copier la **Signing secret** (`whsec_...`) → variable `STRIPE_WEBHOOK_SECRET`.

---

## 3. Railway — Variables d'environnement

Dans **Railway → Variables**, ajouter :

| Variable | Valeur |
|----------|--------|
| `DATABASE_URL` | URI Supabase avec `?pgbouncer=true&connection_limit=1` |
| `SHOPIFY_API_KEY` | Depuis Shopify Partner Dashboard |
| `SHOPIFY_API_SECRET` | Depuis Shopify Partner Dashboard |
| `SCOPES` | `read_products,write_products` |
| `HOST` | `https://infinite-tryon-production-b5cf.up.railway.app` |
| `SESSION_SECRET` | Chaîne aléatoire longue (`openssl rand -hex 32`) |
| `STRIPE_SECRET_KEY` | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` |
| `STRIPE_PRICE_STARTER` | Depuis le script setup-stripe |
| `STRIPE_PRICE_PREMIUM` | Depuis le script setup-stripe |
| `STRIPE_PRICE_PRO` | Depuis le script setup-stripe |
| `STRIPE_PRICE_ULTIMATE` | Depuis le script setup-stripe |
| `STRIPE_PRICE_ADDON` | Depuis le script setup-stripe |
| `REPLICATE_API_TOKEN` | Depuis replicate.com/account |
| `REPLICATE_MODEL_VERSION` | *(optionnel)* Épingler une version IDM-VTON |
| `LOG_LEVEL` | `debug` en staging, vide en prod |

Railway utilisera `/health` comme healthcheck (configuré dans `railway.toml`).

---

## 4. Migrations Prisma

Les migrations se lancent automatiquement au démarrage. Pour les appliquer manuellement :

```bash
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

---

## 5. Shopify Partner Dashboard

### Configuration de l'application

1. **App URL** : `https://infinite-tryon-production-b5cf.up.railway.app`
2. **Allowed redirection URLs** :
   ```
   https://infinite-tryon-production-b5cf.up.railway.app/auth/callback
   https://infinite-tryon-production-b5cf.up.railway.app/auth/shopify/callback
   ```
3. **GDPR webhooks** (obligatoires pour l'App Store) :
   - Customer data request → `/api/webhooks/gdpr/customers/data_request`
   - Customer data erasure → `/api/webhooks/gdpr/customers/redact`
   - Shop data erasure → `/api/webhooks/gdpr/shop/redact`

### Soumettre à l'App Store *(quand prêt)*

- Vérifier que la Privacy Policy est accessible : `/privacy-policy`
- Tester le flux complet sur une boutique de développement
- Suivre le checklist dans **Partner Dashboard → Distribution**

---

## 6. Checklist premier déploiement

- [ ] Variables Railway toutes configurées
- [ ] `DATABASE_URL` pointe sur Supabase production
- [ ] Migrations Prisma appliquées
- [ ] Webhook Stripe actif + `STRIPE_WEBHOOK_SECRET` configuré
- [ ] Produits/prix Stripe créés (script `setup-stripe.mjs`)
- [ ] Portail de facturation Stripe configuré
- [ ] URLs Shopify mises à jour dans le Partner Dashboard
- [ ] Healthcheck `/health` répond 200

---

## 7. Vérification post-déploiement

```bash
curl https://infinite-tryon-production-b5cf.up.railway.app/health
# {"status":"ok","db":"ok","latency_ms":12,"timestamp":"..."}
```

Flux à tester manuellement :
1. Installer l'app sur une boutique de dev Shopify
2. Dashboard → vérifier la bannière CTA essai 3 jours
3. Cliquer "Start free trial" → compléter le checkout Stripe (carte test `4242 4242 4242 4242`)
4. Vérifier que le plan est mis à jour dans le dashboard
5. Ouvrir une fiche produit → vérifier que le widget try-on s'active

---

## 8. Tâches opérationnelles récurrentes

| Tâche | Fréquence | Comment |
|-------|-----------|---------|
| Surveiller les logs Railway | En continu | Logs JSON filtrables par `level`, `msg` |
| Vérifier les paiements en retard | Hebdomadaire | Stripe → Subscriptions → Past due |
| Mettre à jour `REPLICATE_MODEL_VERSION` | Si modèle mis à jour | Vérifier replicate.com/cuuupid/idm-vton |
| Backup base de données | Automatique | Supabase Daily Backups (plan Pro) |
