# Infinite Tryon — Application Shopify d'essayage virtuel IA

![Remix](https://img.shields.io/badge/Remix-2-black?logo=remix) ![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue?logo=typescript) ![Shopify](https://img.shields.io/badge/Shopify-Embedded_App-96BF48?logo=shopify) ![Prisma](https://img.shields.io/badge/Prisma-6.2-2D3748?logo=prisma) ![Stripe](https://img.shields.io/badge/Stripe-abonnements-635BFF?logo=stripe) ![Replicate](https://img.shields.io/badge/Replicate-IDM--VTON-black)

Application Shopify embarquée permettant aux marchands d'offrir à leurs clients un essayage virtuel de vêtements par IA. Propulsée par le modèle IDM-VTON via Replicate, avec facturation par abonnement Stripe et un widget intégrable dans les thèmes Shopify.

---

## Stack technique

- **Framework** — Remix 2 (full-stack)
- **Langage** — TypeScript
- **Build** — Vite 6
- **ORM** — Prisma 6 (PostgreSQL)
- **Shopify** — Shopify App Remix + Polaris + App Bridge
- **IA try-on** — Replicate API (modèle `cuuupid/idm-vton`)
- **Paiements** — Stripe (abonnements + webhooks)
- **UI** — Shopify Polaris + Recharts

---

## Prérequis

- Node.js ≥ 18.20
- CLI Shopify (`npm install -g @shopify/cli`)
- Compte Shopify Partners avec une application configurée
- Compte Stripe
- Compte Replicate
- Base de données PostgreSQL

---

## Installation

```bash
git clone <repo-url>
cd infinite-tryon
npm install
cp .env.example .env
# Remplir toutes les variables d'environnement
npm run setup   # prisma generate + prisma migrate deploy
```

---

## Variables d'environnement

| Variable | Description | Requis |
|---|---|---|
| `DATABASE_URL` | URL de connexion PostgreSQL | ✅ |
| `SHOPIFY_API_KEY` | Clé API de l'application Shopify | ✅ |
| `SHOPIFY_API_SECRET` | Secret API Shopify | ✅ |
| `SHOPIFY_APP_URL` | URL publique de l'application | ✅ |
| `SCOPES` | Permissions Shopify (ex: `write_products,read_products`) | ✅ |
| `STRIPE_SECRET_KEY` | Clé secrète Stripe | ✅ |
| `STRIPE_WEBHOOK_SECRET` | Secret pour valider les webhooks Stripe | ✅ |
| `STRIPE_PRICE_STARTER` | ID du prix Stripe — plan Starter | ✅ |
| `STRIPE_PRICE_PREMIUM` | ID du prix Stripe — plan Premium | ✅ |
| `STRIPE_PRICE_PRO` | ID du prix Stripe — plan Pro | ✅ |
| `STRIPE_PRICE_ULTIMATE` | ID du prix Stripe — plan Ultimate | ✅ |
| `STRIPE_PRICE_ADDON` | ID du prix Stripe — add-on | ✅ |
| `REPLICATE_API_TOKEN` | Token API Replicate | ✅ |
| `USE_MOCK` | Désactiver les appels Replicate réels en dev | Non |
| `RUN_MIGRATIONS` | Lancer les migrations au démarrage (`true`) | Non |

---

## Lancement en développement

```bash
npm run dev   # Lance shopify app dev (tunnel Cloudflare + Remix HMR)
```

---

## Structure des dossiers

```
infinite-tryon/
├── app/
│   ├── config/
│   │   └── plans.js             # Configuration des plans tarifaires
│   ├── locales/                 # Traductions (EN, FR)
│   ├── routes/
│   │   ├── app._index.jsx       # Dashboard marchand
│   │   ├── api.tryon.jsx        # Endpoint try-on — appelle Replicate
│   │   ├── api.stripe.*.jsx     # Checkout, portail, webhook Stripe
│   │   ├── api.plan-status.jsx  # Statut du plan actif
│   │   ├── auth.$.jsx           # Authentification Shopify OAuth
│   │   └── webhooks.*.jsx       # Webhooks Shopify (uninstall, scopes)
│   └── services/
│       ├── replicateTryOn.server.js  # Intégration IDM-VTON
│       ├── stripeService.server.js   # Gestion des abonnements Stripe
│       ├── shopService.server.js     # Quotas et plans par boutique
│       └── productAccess.server.js   # Contrôle d'accès aux produits
├── extensions/
│   └── tryon-ai/                # Extension thème Shopify (widget JS)
│       └── assets/tryon-widget.js
├── prisma/
│   ├── schema.prisma            # Modèles: Session, Shop, Product, TryOnLog
│   └── migrations/
├── public/
│   └── tryon-sdk.js             # SDK public pour intégration widget côté storefront
└── shopify.app.toml             # Configuration officielle de l'application Shopify
```

---

## Plans tarifaires

| Plan | Prix | Produits activés | Try-ons / mois |
|---|---|---|---|
| Free | Gratuit | 1 | 10 |
| Starter | 19 $/mois | 3 | 200 |
| Premium | 49 $/mois | 5 | 400 |
| Pro | 59 $/mois | 15 | 1 000 |
| Ultimate | 119 $/mois | 999 | 3 000 |
| Add-on | +15 $/mois | +2 | +150 |

---

## Fonctionnalités principales

- Essayage virtuel IA de vêtements via IDM-VTON (Replicate)
- Widget intégrable dans n'importe quel thème Shopify
- Gestion des quotas par boutique (produits activés, try-ons consommés)
- Abonnements Stripe avec portail client et webhooks de cycle de vie
- Dashboard marchand embarqué dans l'admin Shopify (Polaris)
- Logs des essayages par produit et par boutique
- Support multi-langue EN / FR

---

## Déploiement

```bash
npm run build
npm run deploy   # shopify app deploy
```

Voir `DEPLOY.md` pour les instructions détaillées.

---

## Statut du projet

**WIP** — Application fonctionnelle, en cours d'optimisation avant soumission à l'App Store Shopify.
