# TryOn IA - Pricing par nombre d'articles

## Principe
- La facturation est basee sur le nombre de produits Shopify actives (pages produit ou le widget TryOn IA est autorise), et non sur le nombre d'essais IA.
- Plans exemples par defaut :
  - Starter : jusqu'a 5 produits actifs
  - Pro : jusqu'a 25 produits actifs
  - Brand : jusqu'a 100 produits actifs

## Activation automatique des produits
- Lors du premier affichage du widget (ou via le SDK), le frontend envoie `shop_id` et `product_id` au backend.
- Le backend verifie si le produit est deja actif :
  - Si oui : le widget est autorise immediatement.
  - Si non et que le quota n'est pas atteint : le produit est ajoute automatiquement a la liste des actifs et le widget est autorise.
  - Si la limite est deja atteinte : le produit est refuse et le widget n'est pas rendu.

## Experience marchand lorsque la limite est atteinte
- Widget Shopify : le widget n'affiche pas l'IA et affiche le message :
  > "Vous avez atteint la limite de produits pour votre abonnement. Passez au plan superieur pour activer l'essayage IA sur ce produit."
- SDK universel : le message d'erreur est injecte a cote du declencheur et aucun appel IA n'est lance.

## Endpoints backend
- `GET /api/plan-status?shop_id=xxx`
  - Retourne `plan_name`, `max_products_allowed`, `active_products_count`, `active_product_ids`.
- `POST /api/check-product`
  - Input : `shop_id`, `product_id`
  - Output : `{ allowed: boolean, reason?: "LIMIT_REACHED", plan_name, max_products_allowed, active_products_count }`

## Stockage
- Implementation MVP en memoire (structure par boutique : `shop_id`, `plan_name`, `max_products_allowed`, `active_product_ids`).
- Structure prete a etre remplacee par une base de donnees plus tard.

## Moteur IA - Nano Banana
- L'endpoint `/api/tryon` appelle Nano Banana (image editing/try-on leger) via `app/services/nanoBananaTryOn.js`.
- Le controle "article autorise" reste applique en amont si `shop_id` et `product_id` sont fournis dans la requete.
- Les prompts insistent pour ne modifier que le vetement cible et preservent visage, pose, lumiere, fond, morphologie et teinte de peau.

### Configuration
- Variables d'env (voir `.env.example`) :
  - `NANO_API_KEY` : cle API Nano Banana
  - `NANO_ENDPOINT_URL` : endpoint HTTP a appeler
  - `NANO_MODEL` : optionnel, modele a utiliser
  - `USE_MOCK` : si `true`, retourne une image de demo sans appeler Nano
- Les variables `RUNPOD_*` peuvent rester pour compatibilite, mais la generation TryOn passe par Nano.

### Mode mock
- Mettre `USE_MOCK=true` pour forcer `/api/tryon` a renvoyer une image stable de test (aucun appel IA).
- Utile pour des tests front rapides sans consommer de credits.

### Tester rapidement /api/tryon
Requete POST JSON (exemple minimal) :
```json
{
  "shop_id": "demo-shop.myshopify.com",
  "product_id": "gid://shopify/Product/123",
  "userImage": "data:image/png;base64,...",
  "productImage": "https://example.com/product.png",
  "garmentType": "tshirt"
}
```
Reponse attendue : `{ "success": true, "imageUrl": "https://..." }` ou `{ "success": false, "error": "..." }` (et `reason: "LIMIT_REACHED"` si quota depasse).

### URLs de sortie
- Nano Banana peut renvoyer une URL distante. Le MVP la renvoie telle quelle (pas de re-upload automatique). Prevoir un re-upload si l'URL est temporaire.
