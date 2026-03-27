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

async function uploadBase64ToFal(base64DataUri) {
  if (base64DataUri.startsWith("http://") || base64DataUri.startsWith("https://")) {
    return base64DataUri;
  }
  const matches = base64DataUri.match(/^data:(.+?);base64,(.+)$/);
  if (!matches) {
    throw new Error("Invalid base64 data URI format");
  }
  const mimeType = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, "base64");
  const url = await fal.storage.upload(new Blob([buffer], { type: mimeType }));
  return url;
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
    console.info("[tryon] Uploading person image to fal.ai storage...");
    const personImageUrl = await uploadBase64ToFal(personImage);
    console.info("[tryon] Calling FASHN v1.6 via fal.ai...");

    const result = await fal.subscribe(FASHN_MODEL_ID, {
      input: {
        model_image: personImageUrl,
        garment_image: garmentImageUrl,
        category: "auto",
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

    const imageUrl =
      result?.data?.image?.url ||
      result?.data?.image ||
      result?.data?.output?.url ||
      result?.data?.output ||
      (typeof result?.data === "string" ? result.data : null);

    if (!imageUrl) {
      console.error("[tryon] Unexpected FASHN response:", JSON.stringify(result?.data)?.substring(0, 500));
      return { success: false, error: "FASHN response missing output image URL" };
    }

    console.info("[tryon] FASHN generation succeeded");
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

export async function replicateTryOn({ userImage, productImage, garmentType: _garmentType, options: _options = {} }) {
  return generateTryOn(userImage, productImage);
}
