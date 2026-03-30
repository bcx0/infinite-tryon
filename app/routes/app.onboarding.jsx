import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useState, useCallback } from "react";
import {
  Badge,
  Banner,
  BlockStack,
  Button,
  Card,
  Icon,
  InlineStack,
  Layout,
  List,
  Page,
  Text,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { getOrCreateShop, normalizePlanKey } from "../services/shopService.server";
import { getLocale } from "../locales";
import { PLANS } from "../config/plans";
import db from "../db.server";

export const loader = async ({ request }) => {
  const auth = await authenticate.admin(request);
  const shopDomain = String(auth?.session?.shop || "").trim().toLowerCase();

  if (!shopDomain) {
    throw json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { lang, messages } = getLocale(request);
  const shop = await getOrCreateShop(shopDomain);
  const planKey = normalizePlanKey(shop.plan);

  const activeProductsCount = await db.product.count({
    where: { shopDomain, isActive: true },
  });

  // Check if the theme extension block has been activated
  // (We can't check directly, but we can infer from product activation)
  const hasActiveProduct = activeProductsCount > 0;
  const hasPaidPlan = planKey !== "free";

  return json({
    lang,
    messages,
    shopDomain,
    planKey,
    hasPaidPlan,
    hasActiveProduct,
    activeProductsCount,
    onboarding: messages.onboarding || {},
  });
};

const STEPS = [
  { key: "plan", icon: "💳" },
  { key: "theme", icon: "🎨" },
  { key: "products", icon: "👕" },
  { key: "test", icon: "✅" },
];

function StepCard({ step, index, isCompleted, isActive, t }) {
  const stepT = t[step.key] || {};

  return (
    <Card>
      <BlockStack gap="300">
        <InlineStack align="space-between" blockAlign="center">
          <InlineStack gap="200" blockAlign="center">
            <Text as="span" variant="headingLg">{step.icon}</Text>
            <Text as="h2" variant="headingMd">
              {`Étape ${index + 1} : ${stepT.title || step.key}`}
            </Text>
          </InlineStack>
          {isCompleted ? (
            <Badge tone="success">Fait</Badge>
          ) : isActive ? (
            <Badge tone="attention">À faire</Badge>
          ) : (
            <Badge tone="info">En attente</Badge>
          )}
        </InlineStack>

        <Text as="p" variant="bodyMd">
          {stepT.description || ""}
        </Text>

        {stepT.instructions && stepT.instructions.length > 0 ? (
          <div style={{ background: "#f9fafb", borderRadius: "8px", padding: "12px 16px" }}>
            <BlockStack gap="100">
              {stepT.instructions.map((instruction, i) => (
                <Text as="p" variant="bodySm" key={i}>
                  {`${i + 1}. ${instruction}`}
                </Text>
              ))}
            </BlockStack>
          </div>
        ) : null}

        {stepT.important ? (
          <Banner tone="warning">
            <Text as="p" variant="bodySm">{stepT.important}</Text>
          </Banner>
        ) : null}
      </BlockStack>
    </Card>
  );
}

export default function OnboardingPage() {
  const data = useLoaderData();
  const t = data.onboarding;

  // Determine which steps are done
  const stepStatus = {
    plan: data.hasPaidPlan,
    theme: false, // Can't check automatically, user self-validates
    products: data.hasActiveProduct,
    test: false, // Manual validation
  };

  // Find current active step
  let currentStepIndex = STEPS.findIndex((s) => !stepStatus[s.key]);
  if (currentStepIndex === -1) currentStepIndex = STEPS.length;

  const completedCount = STEPS.filter((s) => stepStatus[s.key]).length;

  return (
    <Page>
      <TitleBar title={t.title || "Guide d'installation"} />
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="h1" variant="headingLg">
                  {t.welcome || "Bienvenue sur Infinite Tryon ! 🎉"}
                </Text>
                <Text as="p" variant="bodyMd">
                  {t.intro || "Suivez ces 4 étapes pour activer l'essayage virtuel sur votre boutique. Temps estimé : 10 minutes."}
                </Text>
                <InlineStack gap="200">
                  <Badge tone={completedCount === STEPS.length ? "success" : "info"}>
                    {`${completedCount} / ${STEPS.length} étapes complétées`}
                  </Badge>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          {STEPS.map((step, index) => (
            <Layout.Section key={step.key}>
              <StepCard
                step={step}
                index={index}
                isCompleted={stepStatus[step.key]}
                isActive={index === currentStepIndex}
                t={t}
              />
            </Layout.Section>
          ))}

          <Layout.Section>
            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">
                  {t.helpTitle || "Besoin d'aide ?"}
                </Text>
                <Text as="p" variant="bodyMd">
                  {t.helpBody || "Contactez-nous à support@infinitetryon.com — on vous répond en moins de 24h."}
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
