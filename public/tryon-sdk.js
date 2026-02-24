(function () {
  const currentScript = document.currentScript;
  const apiBase =
    (window.TRYON_API_BASE ||
      currentScript?.dataset.backendUrl ||
      currentScript?.dataset.apiBase ||
      "").replace(/\/$/, "");
  const defaultShopId =
    currentScript?.dataset.shopId ||
    currentScript?.dataset.shopDomain ||
    currentScript?.dataset.shop;
  const defaultProductId = currentScript?.dataset.productId;
  const defaultApiKey = currentScript?.dataset.apiKey;
  const defaultTriggerSelector =
    currentScript?.dataset.triggerSelector || "[data-tryon-sdk]";
  const limitMessage =
    "Vous avez atteint la limite de produits pour votre abonnement. Passez au plan superieur pour activer l'essayage IA sur ce produit.";

  function buildCheckUrl() {
    return `${apiBase || ""}/api/check-product`;
  }

  function renderInlineMessage(target, message) {
    if (!target) {
      return;
    }

    let container = target.parentElement?.querySelector(
      ".tryon-sdk-inline-message",
    );

    if (!container) {
      container = document.createElement("div");
      container.className = "tryon-sdk-inline-message";
      container.style.marginTop = "8px";
      container.style.color = "#cc0000";
      container.style.fontSize = "14px";
      container.style.lineHeight = "18px";
      target.parentElement?.appendChild(container);
    }

    container.textContent = message;
  }

  async function checkProductAllowed({ shopId, productId, apiKey }) {
    const payload = {
      shop_id: shopId,
      product_id: productId,
    };

    const response = await fetch(buildCheckUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { "x-api-key": apiKey } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("Unable to verify product status");
    }

    const result = await response.json();
    return {
      allowed: Boolean(result.allowed),
      reason: result.reason,
      data: result,
    };
  }

  async function guardTryOn({ shopId, productId, apiKey, target, onAllowed }) {
    try {
      const result = await checkProductAllowed({ shopId, productId, apiKey });

      if (!result.allowed) {
        renderInlineMessage(target, limitMessage);
        return { allowed: false, reason: result.reason || "LIMIT_REACHED" };
      }

      if (typeof onAllowed === "function") {
        await onAllowed(result);
      }

      return { allowed: true };
    } catch (error) {
      console.error(error);
      renderInlineMessage(
        target,
        "Impossible de verifier si ce produit est autorise pour l'instant.",
      );
      return { allowed: false, reason: "CHECK_FAILED" };
    }
  }

  function bindTriggers() {
    const triggers = document.querySelectorAll(defaultTriggerSelector);

    triggers.forEach((trigger) => {
      const triggerShopId = trigger.dataset.shopId || defaultShopId;
      const triggerProductId =
        trigger.dataset.productId ||
        trigger.dataset.productImage ||
        defaultProductId;
      const triggerApiKey = trigger.dataset.apiKey || defaultApiKey;

      if (!triggerShopId || !triggerProductId) {
        renderInlineMessage(
          trigger,
          "Configuration manquante pour identifier la boutique ou le produit.",
        );
        return;
      }

      trigger.addEventListener("click", async (event) => {
        const result = await guardTryOn({
          shopId: triggerShopId,
          productId: triggerProductId,
          apiKey: triggerApiKey,
          target: trigger,
        });

        if (result.allowed) {
          trigger.dispatchEvent(
            new CustomEvent("tryon:allowed", {
              detail: {
                shopId: triggerShopId,
                productId: triggerProductId,
              },
            }),
          );
        } else {
          event.preventDefault();
        }
      });
    });
  }

  window.TryOnSDK = {
    checkProductAllowed,
    guardTryOn,
    bindTriggers,
  };

  bindTriggers();
})();
