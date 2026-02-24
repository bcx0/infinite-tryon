document.addEventListener("DOMContentLoaded", function () {
  const widget = document.getElementById("tryon-widget");
  const form = document.getElementById("tryon-form");
  const resultDiv = document.getElementById("tryon-result");
  const shopId = widget?.dataset.shopId;
  const productId = widget?.dataset.productId;
  const personImageUrl = widget?.dataset.personImageUrl || "";
  const apiBase =
    (window.TRYON_API_BASE || widget?.dataset.backendUrl || "").replace(
      /\/$/,
      "",
    );
  const checkProductUrl = `${apiBase || ""}/api/check-product`;
  const tryOnUrl = `${apiBase || ""}/api/tryon`;
  const limitMessage =
    "Vous avez atteint la limite de produits pour votre abonnement. Passez au plan superieur pour activer l'essayage IA sur ce produit.";

  if (!widget || !form || !resultDiv) {
    return;
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const userPhoto = document.getElementById("userPhoto")?.files?.[0] || null;
    const garmentImageUrl = document.getElementById("productPhoto")?.value || "";

    if (!shopId || !productId) {
      resultDiv.innerHTML =
        "Configuration manquante pour identifier la boutique ou le produit.";
      return;
    }

    if (!garmentImageUrl) {
      resultDiv.innerHTML = "Visuel produit introuvable.";
      return;
    }

    if (!userPhoto && !personImageUrl) {
      alert(
        "Veuillez selectionner une photo de vous ou fournir une URL de photo.",
      );
      return;
    }

    resultDiv.innerHTML = "Verification de l'eligibilite du produit...";
    const allowed = await verifyProductAllowed(shopId, productId);

    if (!allowed) {
      resultDiv.innerHTML = limitMessage;
      return;
    }

    resultDiv.innerHTML = "Generation en cours...";
    form.querySelector("button[type='submit']")?.setAttribute("disabled", "true");

    try {
      const personImageBase64 = userPhoto ? await toBase64(userPhoto) : "";
      const response = await fetch(tryOnUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-shop-domain": shopId,
        },
        body: JSON.stringify({
          shop_id: shopId,
          product_id: productId,
          garmentImageUrl,
          personImageBase64,
          personImageUrl: personImageUrl || undefined,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        resultDiv.innerHTML = payload?.error || "Erreur lors de l'appel a l'API.";
        return;
      }

      if (!payload?.success || !payload?.imageUrl) {
        resultDiv.innerHTML = payload?.error || "Echec de la generation.";
        return;
      }

      resultDiv.innerHTML = `<img src="${payload.imageUrl}" style="max-width:100%;" alt="Resultat IA">`;
    } catch (error) {
      console.error(error);
      resultDiv.innerHTML = "Erreur inattendue.";
    } finally {
      form.querySelector("button[type='submit']")?.removeAttribute("disabled");
    }
  });

  async function verifyProductAllowed(currentShopId, currentProductId) {
    try {
      const response = await fetch(checkProductUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shop_id: currentShopId,
          product_id: currentProductId,
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to verify product status");
      }

      const payload = await response.json();
      return Boolean(payload.allowed);
    } catch (error) {
      console.error(error);
      resultDiv.innerHTML =
        "Impossible de verifier le statut de ce produit pour l'instant.";
      return false;
    }
  }

  function toBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  }
});
