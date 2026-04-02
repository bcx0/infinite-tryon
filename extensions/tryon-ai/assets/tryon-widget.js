document.addEventListener("DOMContentLoaded", function () {
  const widget = document.getElementById("tryon-widget");
  const form = document.getElementById("tryon-form");
  const resultDiv = document.getElementById("tryon-result");
  const shopId = widget?.dataset.shopId;
  const productId = widget?.dataset.productId;
  const personImageUrl = widget?.dataset.personImageUrl || "";
  const apiBase =
    (window.TRYON_API_BASE || widget?.dataset.backendUrl || "https://infinite-tryon-production-b5cf.up.railway.app").replace(
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
    let garmentImageUrl = document.getElementById("productPhoto")?.value || "";
    if (garmentImageUrl.startsWith("//")) {
      garmentImageUrl = "https:" + garmentImageUrl;
    }

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

    let seconds = 0;
    const timerEl = '__tryon_timer__';
    resultDiv.innerHTML =
      '<div class="loader"></div>' +
      '<p style="margin-top:12px;font-weight:600;font-size:15px;">Notre IA cr\u00e9e votre essayage virtuel\u2026</p>' +
      '<p id="' + timerEl + '" style="margin-top:4px;color:#888;font-size:13px;">Temps estim\u00e9 : ~20 secondes</p>';
    const timer = setInterval(function () {
      seconds++;
      const el = document.getElementById(timerEl);
      if (el) {
        if (seconds < 15) {
          el.textContent = 'Analyse du v\u00eatement et de votre photo\u2026 (' + seconds + 's)';
        } else if (seconds < 25) {
          el.textContent = 'G\u00e9n\u00e9ration en cours, presque termin\u00e9\u2026 (' + seconds + 's)';
        } else {
          el.textContent = 'Finalisation de l\u2019image\u2026 (' + seconds + 's)';
        }
      }
    }, 1000);
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

      resultDiv.innerHTML =
        '<img src="' + payload.imageUrl + '" style="max-width:100%;border-radius:8px;" alt="Aper\u00e7u essayage virtuel">' +
        '<p style="margin-top:10px;font-size:12px;color:#999;text-align:center;line-height:1.4;">' +
        '\u2728 Aper\u00e7u g\u00e9n\u00e9r\u00e9 par IA \u2014 le rendu r\u00e9el peut l\u00e9g\u00e8rement varier.' +
        '</p>';
    } catch (error) {
      console.error("[TryOn Widget] Error:", error);
      resultDiv.innerHTML = "Erreur de connexion au serveur. Veuillez r\u00e9essayer.";
    } finally {
      clearInterval(timer);
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
