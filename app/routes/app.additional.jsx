import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useState, useCallback } from "react";
import {
  Badge,
  Banner,
  BlockStack,
  Button,
  Card,
  InlineStack,
  Layout,
  List,
  Page,
  Text,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { getLocale } from "../locales";
import { ADDON } from "../config/plans";
import db from "../db.server";

export const loader = async ({ request }) => {
  const auth = await authenticate.admin(request);
  const shopDomain = String(auth?.session?.shop || "").trim().toLowerCase();
  const { messages } = getLocale(request);

  const shop = await db.shop.findUnique({
    where: { shopDomain },
    select: {
      plan: true,
      addonActive: true,
      stripeCustomerId: true,
      stripeStatus: true,
    },
  });

  const hasPaidPlan =
    shop?.plan && shop.plan !== "free" && Boolean(shop?.stripeCustomerId);

  return json({
    messages,
    shopDomain,
    addonActive: shop?.addonActive || false,
    hasPaidPlan,
    addonPrice: ADDON.priceMonthly,
    addonExtraProducts: ADDON.extraProducts,
    addonExtraTryOns: ADDON.extraTryOns,
  });
};

export default function AdditionalPage() {
  const data = useLoaderData();
  const shopify = useAppBridge();
  const t = data.messages.addon;
  const [loading, setLoading] = useState(false);

  const handleActivate = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/stripe/addon-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopDomain: data.shopDomain,
          returnBaseUrl: `${window.location.origin}/app/additional`,
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload?.checkoutUrl) {
        shopify.toast.show(payload?.error || t.checkoutError);
        return;
      }

      window.location.href = payload.checkoutUrl;
    } catch {
      shopify.toast.show(t.checkoutError);
    } finally {
      setLoading(false);
    }
  }, [data.shopDomain, shopify.toast, t.checkoutError]);

  const handlePortal = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopDomain: data.shopDomain,
          returnUrl: `${window.location.origin}/app/additional`,
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload?.portalUrl) {
        shopify.toast.show(t.portalError);
        return;
      }

      window.location.href = payload.portalUrl;
    } catch {
      shopify.toast.show(t.portalError);
    } finally {
      setLoading(false);
    }
  }, [data.shopDomain, shopify.toast, t.portalError]);

  return (
    <Page>
      <TitleBar title={t.pageTitle} />
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h2" variant="headingMd">
                  {t.title}
                </Text>
                {data.addonActive ? (
                  <Badge tone="success">{t.activeBadge}</Badge>
                ) : (
                  <Badge tone="new">{t.inactiveBadge}</Badge>
                )}
              </InlineStack>

              <Text as="p" variant="bodyMd">
                {t.description}
              </Text>

              <List>
                <List.Item>
                  <Text as="span" fontWeight="semibold">
                    {`+${data.addonExtraProducts} ${t.extraProducts}`}
                  </Text>
                </List.Item>
                <List.Item>
                  <Text as="span" fontWeight="semibold">
                    {`+${data.addonExtraTryOns} ${t.extraTryOns}`}
                  </Text>
                </List.Item>
                <List.Item>
                  <Text as="span">{`${data.addonPrice} EUR / ${t.perMonth}`}</Text>
                </List.Item>
              </List>

              {data.addonActive ? (
                <BlockStack gap="200">
                  <Banner tone="success" title={t.activeTitle}>
                    <Text as="p" variant="bodyMd">
                      {t.activeBody}
                    </Text>
                  </Banner>
                  <Button variant="secondary" loading={loading} onClick={handlePortal}>
                    {t.manageButton}
                  </Button>
                </BlockStack>
              ) : data.hasPaidPlan ? (
                <Button variant="primary" loading={loading} onClick={handleActivate}>
                  {t.activateButton}
                </Button>
              ) : (
                <Banner tone="warning" title={t.requiresPlanTitle}>
                  <Text as="p" variant="bodyMd">
                    {t.requiresPlanBody}
                  </Text>
                </Banner>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
