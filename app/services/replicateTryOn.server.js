import { fal } from "@fal-ai/client";

const FASHN_MODEL_ID = "fal-ai/fashn/tryon/v1.6";
const DEFAULT_MOCK_IMAGE_URL =
  "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800";

function isMockEnabled() {
  return String(process.env.USE_MOCK || "").toLowerCase() === "true";
}

function getFalClient() {
  const key = process.env.FAL_KEY;
  if (!key) {
    throw new Error("fal.ai is not configured: missing FAL_KEY environment variable");
  }
  fal.config({ credentials: key });
}

function prepareImageInput(imageData) {
  if (!imageData || typeof imageData !== "string") {
    throw new Error("Invalid image data");
  }
  if (imageData.startsWith("http://") || imageData.startsWith("https://")) {
    return imageData;
  }
  if (imageData.startsWith("data:")) {
    return imageData;
  }
  throw new Error("Unsupported image format: expected URL or base64 data URI");
}

export async function generateTryOn(personImage, garmentImageUrl) {
  if (!personImage || !garmentImageUrl) {
    return { success: false, error: "Missing personImage or garmentImageUrl" };
  }

  if (isMockEnabled()) {
    return { success: true, imageUrl: DEFAULT_MOCK_IMAGE_URL, mock: true };
  }

  try {
    getFalClient();

    console.info("[tryon] Preparing person image...");
    const personImageUrl = prepareImageInput(personImage);
    console.info("[tryon] Person image ready (type: %s)", personImageUrl.startsWith("data:") ? "base64" : "url");

    console.info("[tryon] Calling FASHN v1.6 via fal.ai (quality mode)...", {
      model: FASHN_MODEL_ID,
      garmentUrl: garmentImageUrl.substring(0, 80),
    });

    const result = await fal.subscribe(FASHN_MODEL_ID, {
      input: {
        model_image: personImageUrl,
        garment_image: garmentImageUrl,
        category: "auto",
        mode: "quality",
        garment_photo_type: "auto",
        output_format: "png",
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          const messages = update.logs?.map((log) => log.message) || [];
          if (messages.length > 0) {
            console.info("[tryon] FASHN progress:", messages.join(", "));
          }
        }
      },
    });

    console.info("[tryon] FASHN raw response keys:", Object.keys(result || {}));

    const imageUrl =
      result?.images?.[0]?.url ||
      result?.image?.url ||
      result?.data?.images?.[0]?.url ||
      result?.data?.image?.url ||
      result?.output?.url ||
      result?.data?.output?.url ||
      (typeof result === "string" ? result : null);

    if (!imageUrl) {
      console.error("[tryon] Unexpected FASHN response structure:", JSON.stringify(result)?.substring(0, 1000));
      return { success: false, error: "FASHN response missing output image URL" };
    }

    console.info("[tryon] FASHN generation succeeded:", imageUrl.substring(0, 80) + "...");
    return { success: true, imageUrl };
  } catch (error) {
    const msg = error?.message || String(error);
    console.error("[tryon] FASHN error:", msg);

    if (msg.includes("402") || msg.includes("Payment") || msg.includes("Insufficient") || msg.includes("balance")) {
      return { success: false, error: "REPLICATE_BILLING_ERROR", raw: msg };
    }
    if (msg.includes("401") || msg.includes("Unauthorized") || msg.includes("Invalid") || msg.includes("credentials")) {
      return { success: false, error: "REPLICATE_AUTH_ERROR", raw: msg };
    }
    if (msg.includes("429") || msg.includes("Too Many") || msg.includes("rate")) {
      return { success: false, error: "REPLICATE_RATE_LIMITED", raw: msg };
    }
    return { success: false, error: msg || "Unexpected FASHN error" };
  }
}

export async function replicateTryOn({
  userImage,
  productImage,
  garmentType: _garmentType,
  options: _options = {},
}) {
  return generateTryOn(userImage, productImage);
}
