import Replicate from "replicate";

const MODEL_SLUG = "cuuupid/idm-vton";
const TIMEOUT_MS = 120000;
const POLL_INTERVAL_MS = 2500;
const DEFAULT_MOCK_IMAGE_URL =
  "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800";

function isMockEnabled() {
  return String(process.env.USE_MOCK || "").toLowerCase() === "true";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getReplicateClient() {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new Error("Replicate is not configured: missing REPLICATE_API_TOKEN");
  }

  return new Replicate({ auth: token });
}

async function getModelVersionId(replicate) {
  const pinned = process.env.REPLICATE_MODEL_VERSION;
  if (pinned) {
    return pinned;
  }

  let model = null;

  try {
    model = await replicate.models.get(MODEL_SLUG);
  } catch {
    const [owner, name] = MODEL_SLUG.split("/");
    model = await replicate.models.get(owner, name);
  }

  const versionId = model?.latest_version?.id;
  if (!versionId) {
    throw new Error(`Unable to resolve latest model version for ${MODEL_SLUG}`);
  }

  return versionId;
}

function extractImageUrl(output) {
  if (typeof output === "string") {
    return output;
  }

  if (Array.isArray(output)) {
    const firstString = output.find((entry) => typeof entry === "string");
    if (firstString) {
      return firstString;
    }

    const firstUrlObject = output.find(
      (entry) => entry && typeof entry === "object" && typeof entry.url === "string",
    );
    if (firstUrlObject?.url) {
      return firstUrlObject.url;
    }
  }

  if (output && typeof output === "object") {
    if (typeof output.url === "string") {
      return output.url;
    }
    if (typeof output.image === "string") {
      return output.image;
    }
  }

  return null;
}

export async function generateTryOn(personImageUrl, garmentImageUrl) {
  if (!personImageUrl || !garmentImageUrl) {
    return { success: false, error: "Missing personImageUrl or garmentImageUrl" };
  }

  if (isMockEnabled()) {
    return {
      success: true,
      imageUrl: DEFAULT_MOCK_IMAGE_URL,
      mock: true,
    };
  }

  try {
    const replicate = getReplicateClient();
    const version = await getModelVersionId(replicate);

    const prediction = await replicate.predictions.create({
      version,
      input: {
        human_img: personImageUrl,
        garm_img: garmentImageUrl,
        garment_des: "garment",
        is_checked: true,
        is_checked_crop: false,
        denoise_steps: 20,
        seed: 42,
      },
    });

    const startedAt = Date.now();
    let currentPrediction = prediction;

    while (
      currentPrediction.status !== "succeeded" &&
      currentPrediction.status !== "failed" &&
      currentPrediction.status !== "canceled"
    ) {
      if (Date.now() - startedAt > TIMEOUT_MS) {
        return { success: false, error: "Replicate prediction timed out after 120 seconds" };
      }

      await sleep(POLL_INTERVAL_MS);
      currentPrediction = await replicate.predictions.get(currentPrediction.id);
    }

    if (currentPrediction.status !== "succeeded") {
      return {
        success: false,
        error: currentPrediction.error || "Replicate prediction failed",
      };
    }

    const imageUrl = extractImageUrl(currentPrediction.output);
    if (!imageUrl) {
      return { success: false, error: "Replicate response missing output image URL" };
    }

    return { success: true, imageUrl };
  } catch (error) {
    return { success: false, error: error?.message || "Unexpected Replicate error" };
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

