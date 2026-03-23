# Rapport de Rentabilité — Infinite Tryon
**Date :** 23 mars 2026
**Version analysée :** branche `main` (commit `589620e`)

---

## 1. API IA utilisée

### Modèle : `cuuupid/idm-vton` sur Replicate

| Paramètre | Valeur |
|---|---|
| Provider | Replicate |
| Modèle | `cuuupid/idm-vton` (IDM-VTON virtual try-on) |
| GPU | NVIDIA A100 80GB |
| Tarif GPU | $0.0014/seconde |
| Temps d'exécution moyen | ~17 secondes |
| **Coût par génération** | **~$0.024 (2,4 ¢)** |
| Denoise steps configurés | 30 |
| SDK utilisé | `replicate@^1.4.0` |

**Note :** une API alternative (Nano Banana) est référencée dans `.env.example` mais n'est pas active — la fonction `nanoBananaTryOn()` est un alias qui appelle `replicateTryOn()`.

> **Estimation de coût Replicate** : $0.024 correspond à ~17 sec × $0.0014/sec. Avec la variabilité du modèle (17–52 sec selon la charge), le coût peut atteindre $0.07/génération dans le pire cas. **Hypothèse conservatrice retenue : $0.030/génération (~3 ¢).**

---

## 2. Infrastructure et dépenses fixes

### Hébergement : Railway

| Service | Estimation mensuelle |
|---|---|
| App Remix (Node.js 18, ~0.5 vCPU, 512MB RAM) | ~$10–15/mois |
| PostgreSQL Railway (~0.5 vCPU, 1GB RAM) | ~$5–10/mois |
| **Total Railway** | **~$15–25/mois** |

*Calcul : Railway facture $0.000463/vCPU-min + $0.000231/GB-RAM-min. Pour 43 200 min/mois (30 jours) et les ressources ci-dessus.*

### Autres services

| Service | Coût |
|---|---|
| Stripe (frais de transaction) | 2,9% + 0,30 $ par paiement |
| Storage S3/R2 | **$0** — pas de stockage cloud (images transitent directement) |
| Redis / cache | **$0** — pas de cache distribué |
| CDN | **$0** — inclus Railway |
| OpenAI / autres IA | **$0** — uniquement Replicate |

### Résumé dépenses fixes

| Poste | Coût mensuel |
|---|---|
| Railway (app + BDD) | ~$20/mois *(hypothèse centrale)* |
| Stripe (frais fixes) | ~$0.30 × N transactions |
| **Total infrastructure fixe** | **~$20/mois** |

---

## 3. Modèle de pricing

### Plans tarifaires (Stripe subscriptions, facturation mensuelle récurrente)

| Plan | Prix/mois | Produits activables | Try-ons inclus | Essai |
|---|---|---|---|---|
| **Free** | $0 | 1 | 10 | — |
| **Starter** | $19 | 3 | 200 | 14 jours |
| **Premium** | $49 | 5 | 400 | 14 jours |
| **Pro** | $59 | 15 | 1 000 | 14 jours |
| **Ultimate** | $119 | illimité (999) | 3 000 | 14 jours |
| **Add-on** | +$15 | +2 | +150 | — |

**Architecture de facturation :**
- Abonnements récurrents Stripe (pas de billing Shopify natif — Stripe est intégré directement)
- Webhooks Stripe gérés : `checkout.session.completed`, `customer.subscription.updated/deleted`, `invoice.payment_failed`
- Quotas réinitialisés chaque 1er du mois (calendrier UTC)
- Période d'essai 14 jours (coût IA pendant l'essai = à la charge du produit)

---

## 4. Calcul de rentabilité par plan

### Méthode

```
Marge brute = Revenu - Coût Replicate - Frais Stripe
Marge nette = Marge brute - Quote-part infrastructure
```

*Hypothèses :*
- Coût Replicate : **$0.030/génération** (hypothèse conservatrice, inclut variabilité)
- Frais Stripe : **2,9% + $0.30** par paiement mensuel
- Utilisation : **100% du quota** (worst-case pour les coûts)
- Infrastructure fixe : **$20/mois**

---

### Plan Free

| Élément | Valeur |
|---|---|
| Revenu | $0 |
| Coût Replicate (10 try-ons × $0.030) | -$0.30 |
| **Perte par client Free actif** | **-$0.30/mois** |

> Le plan Free coûte 30 centimes/mois par client qui utilise ses try-ons. À surveiller si la base Free grossit.

---

### Plan Starter ($19/mois — 200 try-ons)

| Élément | Calcul | Montant |
|---|---|---|
| Revenu | | **$19.00** |
| Coût Replicate | 200 × $0.030 | -$6.00 |
| Frais Stripe | $19 × 2,9% + $0.30 | -$0.85 |
| **Marge brute** | | **$12.15 (64%)** |
| Quote-part infra (÷ N clients payants) | | variable |

*Marge nette selon nombre de clients Starter :*

| Clients Starter | MRR | Coût total | Infra amortie | Marge nette |
|---|---|---|---|---|
| 1 | $19 | $6.85 | $20 | **-$7.85** ❌ |
| 2 | $38 | $13.70 | $10 | **+$14.30** ✅ |
| 5 | $95 | $34.25 | $4 | **+$56.75** ✅ |
| 10 | $190 | $68.50 | $2 | **+$119.50** ✅ |

---

### Plan Premium ($49/mois — 400 try-ons)

| Élément | Calcul | Montant |
|---|---|---|
| Revenu | | **$49.00** |
| Coût Replicate | 400 × $0.030 | -$12.00 |
| Frais Stripe | $49 × 2,9% + $0.30 | -$1.72 |
| **Marge brute** | | **$35.28 (72%)** |

> Un seul client Premium couvre entièrement l'infrastructure fixe ($35.28 > $20).

---

### Plan Pro ($59/mois — 1 000 try-ons)

| Élément | Calcul | Montant |
|---|---|---|
| Revenu | | **$59.00** |
| Coût Replicate | 1 000 × $0.030 | -$30.00 |
| Frais Stripe | $59 × 2,9% + $0.30 | -$2.01 |
| **Marge brute** | | **$26.99 (46%)** |

> Ce plan est **le moins rentable en proportion** : le ratio coût IA/revenu est le plus élevé (50,8% du revenu part en Replicate).

---

### Plan Ultimate ($119/mois — 3 000 try-ons)

| Élément | Calcul | Montant |
|---|---|---|
| Revenu | | **$119.00** |
| Coût Replicate | 3 000 × $0.030 | -$90.00 |
| Frais Stripe | $119 × 2,9% + $0.30 | -$3.75 |
| **Marge brute** | | **$25.25 (21%)** |

> Ce plan est **dangereusement peu rentable** : 75,6% du revenu part en coûts IA si le quota est utilisé à 100%. La marge nette peut devenir négative avec l'infrastructure.

---

### Add-on ($15/mois — +150 try-ons)

| Élément | Calcul | Montant |
|---|---|---|
| Revenu add-on | | **$15.00** |
| Coût Replicate | 150 × $0.030 | -$4.50 |
| Frais Stripe | $15 × 2,9% + $0.30 | -$0.74 |
| **Marge brute add-on** | | **$9.76 (65%)** |

---

## 5. Tableau de synthèse des marges

| Plan | Prix | Coût IA (100%) | Frais Stripe | Marge brute | % marge |
|---|---|---|---|---|---|
| Free | $0 | -$0.30 | $0 | **-$0.30** | — |
| Starter | $19 | -$6.00 | -$0.85 | **$12.15** | 64% |
| Premium | $49 | -$12.00 | -$1.72 | **$35.28** | 72% |
| Pro | $59 | -$30.00 | -$2.01 | **$26.99** | 46% |
| Ultimate | $119 | -$90.00 | -$3.75 | **$25.25** | 21% |
| Add-on | +$15 | -$4.50 | -$0.74 | **+$9.76** | 65% |

---

## 6. Seuil de rentabilité (break-even)

### Infrastructure seule ($20/mois fixes)

| Scénario | Clients nécessaires |
|---|---|
| 100% clients Starter | **2 clients** (2 × $12.15 = $24.30) |
| 100% clients Premium | **1 client** (1 × $35.28 > $20) |
| 100% clients Pro | **1 client** (1 × $26.99 > $20) |
| 100% clients Ultimate | **1 client** (1 × $25.25 > $20) |
| Mix réaliste (50% Starter, 50% Premium) | **1–2 clients** |

> **Break-even minimal : 1 client Premium ou Pro, ou 2 clients Starter.**

### Utilisation partielle du quota (scénario réaliste)

En pratique, les clients n'utilisent pas 100% de leur quota. Si on suppose **50% d'utilisation** :

| Plan | Coût IA réel | Marge brute réelle | % marge |
|---|---|---|---|
| Starter | -$3.00 | **$15.15** | 80% |
| Premium | -$6.00 | **$41.28** | 84% |
| Pro | -$15.00 | **$41.99** | 71% |
| Ultimate | -$45.00 | **$70.25** | 59% |

> À 50% d'utilisation, même le plan Ultimate devient confortable.

---

## 7. Points d'attention et risques

### Risque #1 — Plan Pro sous-pricé

Le plan Pro à $59 avec 1 000 try-ons génère la marge **la plus faible** (46% à 100% d'utilisation). Un client e-commerce actif avec un catalogue de 15 produits peut facilement consommer ses 1 000 try-ons/mois.

**Recommandation :** Monter le Pro à $79–$89, ou réduire le quota à 500–750 try-ons.

### Risque #2 — Plan Ultimate non rentable à pleine utilisation

À 3 000 try-ons/mois utilisés à 100% ($90 de coût Replicate pour $119 de revenu), la marge brute est de seulement $25.25, soit moins que l'infrastructure fixe.

**Recommandation :** Monter l'Ultimate à $149–$179, ou cap à 2 000 try-ons.

### Risque #3 — Variabilité du coût Replicate

Le modèle IDM-VTON peut prendre 17 à 52 secondes par génération. Dans le pire cas (52 sec), le coût monte à $0.073/génération, soit 3× l'hypothèse centrale.

**Scénario pessimiste (coût = $0.07/génération) :**

| Plan | Coût IA réel | Marge brute | % marge |
|---|---|---|---|
| Starter (200) | -$14.00 | **$4.15** | 22% |
| Pro (1 000) | -$70.00 | **-$13.01** | **négatif ❌** |
| Ultimate (3 000) | -$210.00 | **-$94.75** | **très négatif ❌** |

> **Ce risque est critique.** Si le modèle est lent (charge Replicate élevée), les plans Pro et Ultimate deviennent déficitaires. Il faut surveiller le temps moyen d'exécution ou négocier un tarif forfaitaire Replicate.

### Risque #4 — Période d'essai de 14 jours

Pendant les 14 jours d'essai, les clients utilisent les try-ons sans générer de revenus. Si un client Pro utilise 500 try-ons pendant l'essai puis annule, le coût est de $15 sans contrepartie.

**Recommandation :** Limiter les try-ons pendant la période d'essai (ex. : 50 try-ons gratuits, pas 100% du quota).

### Opportunité — Taux de conversion Free → Payant

Si le funnel est bien optimisé (bouton upgrade visible après les 10 try-ons Free), les clients Free peuvent convertir. Le coût de 30 ¢/client Free actif est négligeable.

---

## 8. Scénarios de MRR et rentabilité nette

### Hypothèse : utilisation à 60% du quota

| Mix clients | MRR | Coût Replicate | Frais Stripe | Infra | **Bénéfice net** |
|---|---|---|---|---|---|
| 5 Starter | $95 | -$18.00 | -$4.25 | -$20 | **$52.75** |
| 5 Starter + 2 Premium | $193 | -$30.24 | -$8.23 | -$20 | **$134.53** |
| 10 Starter + 5 Premium | $435 | -$66.00 | -$18.35 | -$20 | **$330.65** |
| 3 Pro + 2 Premium | $275 | -$72.00 | -$10.39 | -$20 | **$172.61** |
| 10 Pro | $590 | -$180.00 | -$23.10 | -$20 | **$366.90** |
| 5 Ultimate + 5 Pro | $890 | -$360.00 | -$34.55 | -$20 | **$475.45** |
| 20 Starter + 10 Premium + 5 Pro | $970 | -$171.60 | -$40.12 | -$20 | **$738.28** |

---

## 9. Résumé exécutif

| Indicateur | Valeur |
|---|---|
| Coût par génération IA | ~$0.024–$0.030 (Replicate A100) |
| Infrastructure fixe | ~$20/mois (Railway app + BDD) |
| **Break-even** | **1–2 clients payants** |
| Marge brute la plus haute | Plan Premium : 72–84% |
| Marge brute la plus faible | Plan Ultimate : 21–59% |
| Plan sous-pricé à risque | **Pro ($59/1 000 try-ons)** et **Ultimate ($119/3 000)** |
| Levier principal | Taux d'utilisation réel du quota (50% = sain, 100% = risque) |

**Conclusion :** Le modèle est rentable dès 1–2 clients payants grâce aux faibles coûts d'infrastructure. Les marges sur Starter et Premium sont excellentes (64–84%). Les plans Pro et Ultimate sont fragiles si l'utilisation est maximale — une révision des prix ou des quotas est recommandée avant une mise à l'échelle.

---

*Rapport généré automatiquement à partir de l'analyse du codebase. Sources : `app/config/plans.js`, `app/services/replicateTryOn.server.js`, `app/services/stripeService.server.js`, `railway.toml`, pricing Replicate (replicate.com/cuuupid/idm-vton).*
