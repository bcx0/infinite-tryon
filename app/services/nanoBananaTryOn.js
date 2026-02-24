const DEFAULT_NEGATIVE_PROMPT =
  "Do not change face, hair, pose, background, lighting, body shape, hands, skin tone, camera angle, or add extra garments, text, watermarks, or logos that are not present.";

function buildPrompt(garmentType) {
  const garmentLabel = garmentType
    ? garmentType.toLowerCase()
    : "upper garment";

  return `Replace ONLY the ${garmentLabel} with the product shown in the reference image. Keep the same person identity, face, hair, pose, background, lighting. Do not change skin tone. Keep hands and body shape. Preserve realism and fabric texture. Do not add logos unless present. Do not alter camera angle.`;
}

function isMockEnabled() {
  return String(process.env.USE_MOCK || "").toLowerCase() === "true";
}

export async function nanoBananaTryOn({
  userImage,
  productImage,
  garmentType,
  options = {},
}) {
  const useMock = isMockEnabled();
  const prompt = buildPrompt(garmentType);
  const nanoEndpoint = process.env.NANO_ENDPOINT_URL;
  const nanoApiKey = process.env.NANO_API_KEY;
  const nanoModel = process.env.NANO_MODEL;

  console.info("[tryon] nano banana request", {
    useMock,
    garmentType,
    hasUserImage: Boolean(userImage),
    hasProductImage: Boolean(productImage),
    model: nanoModel || "default",
  });

  if (!userImage || !productImage) {
    return { success: false, error: "Missing userImage or productImage" };
  }

  if (useMock) {
    return {
      success: true,
      imageUrl:
        "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800",
      mock: true,
    };
  }

  if (!nanoEndpoint || !nanoApiKey) {
    return { success: false, error: "Nano Banana is not configured" };
  }

  try {
    const payload = {
      prompt,
      negative_prompt: DEFAULT_NEGATIVE_PROMPT,
      user_image: userImage,
      product_image: productImage,
      options: {
        garmentType,
        ...options,
      },
    };

    if (nanoModel) {
      payload.model = nanoModel;
    }

    const response = await fetch(nanoEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${nanoApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const bodyText = await response.text();
    let data = null;

    try {
      data = JSON.parse(bodyText);
    } catch {
      // leave data as null if parsing fails
    }

    if (!response.ok) {
      const message =
        data?.error || data?.message || `Nano Banana error ${response.status}`;
      console.error("[tryon] nano banana failed", { status: response.status, message });
      return { success: false, error: message };
    }

    const imageUrl =
      data?.imageUrl ||
      data?.image_url ||
      data?.result?.image_url ||
      (Array.isArray(data?.output) ? data.output[0] : undefined);

    if (!imageUrl) {
      console.error("[tryon] nano banana missing imageUrl", { data });
      return { success: false, error: "Missing imageUrl in Nano Banana response" };
    }

    return { success: true, imageUrl, raw: data };
  } catch (error) {
    console.error("[tryon] nano banana exception", { error });
    return { success: false, error: error.message || "Unexpected error" };
  }
}

// Compatibility: keep the historical name if other modules import it.
export async function runpodTryOn(args) {
  return nanoBananaTryOn(args);
}
