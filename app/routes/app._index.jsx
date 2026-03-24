import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useCallback, useMemo, useState } from "react";
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
  ProgressBar,
  Text,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import db from "../db.server";
import { getLocale } from "../locales";
import { PLANS, ADDON } from "../config/plans";
import { authenticate } from "../shopify.server";
import { getOrCreateShop, normalizePlanKey } from "../services/shopService.server";

const DASHBOARD_PLAN_KEYS = ["starter", "premium", "pro", "ultimate"];
const ACTIVITY_DAYS = 30;

function formatMessage(template, values) {
  return String(template || "").replace(/\{(\w+)\}/g, (_, key) => {
    return values[key] != null ? String(values[key]) : "";
  });
}

function getDayKey(date) {
  return date.toISOString().slice(0, 10);
}

function formatDayLabel(date) {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

function normalizeStripeStatus(stripeStatus, trialDaysRemaining) {
  const normalized = String(stripeStatus || "").trim().toLowerCase();

  if (normalized === "past_due") {
    return "pastDue";
  }

  if (
    normalized === "canceled" ||
    normalized === "unpaid" ||
    normalized === "incomplete_expired"
  ) {
    return "canceled";
  }

  if (trialDaysRemaining > 0) {
    return "trial";
  }

  return "active";
}

function getStatusTone(statusKey) {
  if (statusKey === "active") {
    return "success";
  }

  if (statusKey === "trial") {
    return "info";
  }

  if (statusKey === "pastDue") {
    return "warning";
  }

  return "critical";
}

function getProgressTone(usageRatio) {
  if (usageRatio > 0.9) {
    return "critical";
  }

  if (usageRatio >= 0.7) {
    return "warning";
  }

  return "success";
}

export const loader = async ({ request }) => {
  const auth = await authenticate.admin(request);
  const shopDomain = String(
    auth?.session?.shop || request.headers.get("x-shop-domain") || "",
  )
    .trim()
    .toLowerCase();

  if (!shopDomain) {
    throw json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const url = new URL(request.url);
  const checkoutResult = url.searchParams.get("checkout") || null;

  const { lang, messages } = getLocale(request);
  const shop = await getOrCreateShop(shopDomain);
  const planKey = normalizePlanKey(shop.plan);
  const planConfig = PLANS[planKey] || PLANS.free;

  // Effective limits account for active addon
  const effectiveMaxProducts = planConfig.maxProducts + (shop.addonActive ? ADDON.extraProducts : 0);
  const effectiveMaxTryOns = planConfig.maxTryOnsPerMonth + (shop.addonActive ? ADDON.extraTryOns : 0);

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const activeProductsCount = await db.product.count({
    where: {
      shopDomain,
      isActive: true,
    },
  });

  const tryOnsMonth = await db.tryOnLog.count({
    where: {
      shopDomain,
      createdAt: {
        gte: monthStart,
        lt: monthEnd,
      },
    },
  });

  const historyStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (ACTIVITY_DAYS - 1)),
  );

  const recentTryOns = await db.tryOnLog.findMany({
    where: {
      shopDomain,
      createdAt: {
        gte: historyStart,
        lte: now,
      },
    },
    select: {
      createdAt: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const byDay = new Map();
  for (const entry of recentTryOns) {
    const key = getDayKey(entry.createdAt);
    byDay.set(key, (byDay.get(key) || 0) + 1);
  }

  const activity = [];
  for (let index = ACTIVITY_DAYS - 1; index >= 0; index -= 1) {
    const day = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - index),
    );
    const key = getDayKey(day);

    activity.push({
      dayKey: key,
      label: formatDayLabel(day),
      count: byDay.get(key) || 0,
    });
  }

  const trialEndsAt = shop.trialEndsAt ? new Date(shop.trialEndsAt) : null;
  const trialDaysRemaining =
    trialEndsAt && trialEndsAt.getTime() > now.getTime()
      ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
      : 0;

  const statusKey = normalizeStripeStatus(shop.stripeStatus, trialDaysRemaining);
  const usageRatio = effectiveMaxTryOns > 0 ? tryOnsMonth / effectiveMaxTryOns : 0;

  // Whether the merchant is on a paid plan (required to purchase addon)
  const hasPaidPlan = planKey !== "free" && shop.stripeCustomerId !== null;

  return json({
    lang,
    messages,
    shopDomain,
    planKey,
    stripeStatus: shop.stripeStatus || null,
    trialDaysRemaining,
    statusKey,
    activeProductsCount,
    maxProducts: effectiveMaxProducts,
    tryOnsMonth,
    maxTryOns: effectiveMaxTryOns,
    remainingQuota: Math.max(0, effectiveMaxTryOns - tryOnsMonth),
    usageRatio,
    activity,
    addonActive: shop.addonActive,
    hasPaidPlan,
    addonPrice: ADDON.priceMonthly,
    addonExtraProducts: ADDON.extraProducts,
    addonExtraTryOns: ADDON.extraTryOns,
    checkoutResult,
    plans: DASHBOARD_PLAN_KEYS.map((key) => ({
      key,
      name: PLANS[key].name,
      priceMonthly: PLANS[key].priceMonthly,
      maxProducts: PLANS[key].maxProducts,
      maxTryOnsPerMonth: PLANS[key].maxTryOnsPerMonth,
      highlighted: PLANS[key].highlighted || false,
    })),
  });
};

export default function DashboardPage() {
  const data = useLoaderData();
  const shopify = useAppBridge();
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [loadingAddon, setLoadingAddon] = useState(false);

  const t = data.messages.dashboard;

  const usagePercent = useMemo(() => {
    return Math.max(0, Math.min(100, Math.round(data.usageRatio * 100)));
  }, [data.usageRatio]);

  const statusTone = getStatusTone(data.statusKey);
  const progressTone = getProgressTone(data.usageRatio);

  // Show a toast for checkout outcomes on mount
  useMemo(() => {
    if (data.checkoutResult === "success") {
      shopify.toast.show(t.checkoutSuccess || "Plan activated!");
    } else if (data.checkoutResult === "addon_success") {
      shopify.toast.show(t.addonActivatedToast);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpgrade = useCallback(
    async (planKey) => {
      setLoadingPlan(planKey);

      try {
        const response = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            planKey,
            shopDomain: data.shopDomain,
            returnBaseUrl: `${window.location.origin}/app`,
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
        setLoadingPlan(null);
      }
    },
    [data.shopDomain, shopify.toast, t.checkoutError],
  );

  const handleAddonCheckout = useCallback(async () => {
    setLoadingAddon(true);

    try {
      const response = await fetch("/api/stripe/addon-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopDomain: data.shopDomain,
          returnBaseUrl: `${window.location.origin}/app`,
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload?.checkoutUrl) {
        shopify.toast.show(payload?.error || t.addonCheckoutError);
        return;
      }

      window.location.href = payload.checkoutUrl;
    } catch {
      shopify.toast.show(t.addonCheckoutError);
    } finally {
      setLoadingAddon(false);
    }
  }, [data.shopDomain, shopify.toast, t.addonCheckoutError]);

  return (
    <Page>
      <TitleBar title={t.title} />
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <BlockStack gap="300">
              {data.planKey === "free" ? (
                <Banner
                  tone="info"
                  title={t.trialCtaTitle}
                  action={{
                    content: t.trialCtaButton,
                    loading: loadingPlan === "starter",
                    onAction: () => handleUpgrade("starter"),
                  }}
                >
                  <Text as="p" variant="bodyMd">
                    {t.trialCtaBody}
                  </Text>
                </Banner>
              ) : null}

              {data.trialDaysRemaining > 0 ? (
                <Banner tone="info" title={t.alertTrial}>
                  <Text as="p" variant="bodyMd">
                    {`${data.trialDaysRemaining} ${t.trialDays}`}
                  </Text>
                </Banner>
              ) : null}

              {data.stripeStatus === "past_due" ? (
                <Banner tone="warning" title={t.alertPayment} />
              ) : null}

              {data.usageRatio >= 1 ? (
                <Banner tone="critical" title={t.quotaExceeded} />
              ) : data.usageRatio >= 0.9 ? (
                <Banner tone="warning" title={t.alertQuota} />
              ) : null}
            </BlockStack>
          </Layout.Section>

          <Layout.Section>
            <Layout>
              {/* Card 1 — Plan actuel */}
              <Layout.Section oneHalf>
                <Card>
                  <BlockStack gap="200">
                    <Text as="h2" variant="headingSm">
                      {t.plan}
                    </Text>
                    <InlineStack align="space-between" blockAlign="center">
                      <Text as="p" variant="bodyLg">
                        {t.plans[data.planKey] || data.planKey}
                      </Text>
                      <Badge tone={statusTone}>{t.status[data.statusKey]}</Badge>
                    </InlineStack>
                  </BlockStack>
                </Card>
              </Layout.Section>

              {/* Cards 2–4 — Only shown when on a paid plan */}
              {data.planKey !== "free" ? (
                <>
                  {/* Card 2 — Produits actifs (métrique principale) */}
                  <Layout.Section oneHalf>
                    <Card>
                      <BlockStack gap="200">
                        <Text as="h2" variant="headingSm">
                          {t.activeProducts}
                        </Text>
                        <Text as="p" variant="bodyLg">
                          {formatMessage(t.productsLabel, {
                            used: data.activeProductsCount,
                            total: data.maxProducts,
                          })}
                        </Text>
                      </BlockStack>
                    </Card>
                  </Layout.Section>

                  {/* Card 3 — Try-ons ce mois (fair use) */}
                  <Layout.Section oneHalf>
                    <Card>
                      <BlockStack gap="200">
                        <Text as="h2" variant="headingSm">
                          {t.tryonsMonth}
                        </Text>
                        <Text as="p" variant="bodyLg">
                          {formatMessage(t.currentPlanLabel, {
                            used: data.tryOnsMonth,
                            total: data.maxTryOns,
                          })}
                        </Text>
                        <ProgressBar progress={usagePercent} tone={progressTone} size="small" />
                      </BlockStack>
                    </Card>
                  </Layout.Section>

                  {/* Card 4 — Quota restant */}
                  <Layout.Section oneHalf>
                    <Card>
                      <BlockStack gap="200">
                        <Text as="h2" variant="headingSm">
                          {t.remainingQuota}
                        </Text>
                        <Text as="p" variant="bodyLg">
                          {formatMessage(t.remainingLabel, { count: data.remainingQuota })}
                        </Text>
                      </BlockStack>
                    </Card>
                  </Layout.Section>
                </>
              ) : (
                <Layout.Section oneHalf>
                  <Card>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      {t.noActivePlan}
                    </Text>
                  </Card>
                </Layout.Section>
              )}
            </Layout>
          </Layout.Section>

          {/* Activity chart */}
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  {t.activity}
                </Text>
                <div style={{ width: "100%", height: 280 }}>
                  <ResponsiveContainer>
                    <LineChart data={data.activity}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" name={t.chart.xAxis} />
                      <YAxis allowDecimals={false} name={t.chart.yAxis} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#1f5199"
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Plan selection */}
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  {t.choosePlan}
                </Text>
                <Layout>
                  {data.plans.map((plan) => {
                    const isCurrentPlan = plan.key === data.planKey;
                    const isMaxPlan = data.planKey === "ultimate";

                    return (
                      <Layout.Section oneThird key={plan.key}>
                        <Card>
                          <BlockStack gap="200">
                            <InlineStack align="space-between" blockAlign="center">
                              <Text as="h3" variant="headingSm">
                                {t.plans[plan.key] || plan.name}
                              </Text>
                              <InlineStack gap="100">
                                {plan.highlighted ? (
                                  <Badge tone="success">{t.planHighlightBadge}</Badge>
                                ) : null}
                                {isCurrentPlan ? (
                                  <Badge tone="info">{t.currentPlanBadge}</Badge>
                                ) : null}
                              </InlineStack>
                            </InlineStack>

                            <Text as="p" variant="bodyMd">
                              {formatMessage(t.planCardPrice, {
                                price: plan.priceMonthly,
                              })}
                            </Text>

                            <Text as="p" variant="bodySm" tone="subdued">
                              {t.planValueProp}
                            </Text>

                            <List>
                              <List.Item>
                                <Text as="span" fontWeight="semibold">
                                  {formatMessage(t.planCardProducts, {
                                    count: plan.maxProducts,
                                  })}
                                </Text>
                              </List.Item>
                              <List.Item>
                                <Text as="span" tone="subdued">
                                  {formatMessage(t.planCardTryons, {
                                    count: plan.maxTryOnsPerMonth,
                                  })}
                                </Text>
                              </List.Item>
                              <List.Item>
                                <Text as="span" variant="bodySm" tone="subdued">
                                  {t.planCardFairUse}
                                </Text>
                              </List.Item>
                            </List>

                            {isMaxPlan ? (
                              <Text as="p" variant="bodyMd">
                                {t.maxPlan}
                              </Text>
                            ) : isCurrentPlan ? null : (
                              <Button
                                variant="primary"
                                loading={loadingPlan === plan.key}
                                onClick={() => handleUpgrade(plan.key)}
                              >
                                {t.upgrade}
                              </Button>
                            )}
                          </BlockStack>
                        </Card>
                      </Layout.Section>
                    );
                  })}
                </Layout>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Addon section — only shown on paid plans */}
          {data.hasPaidPlan ? (
            <Layout.Section>
              <Card>
                <BlockStack gap="300">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h2" variant="headingMd">
                      {t.addonTitle}
                    </Text>
                    {data.addonActive ? (
                      <Badge tone="success">{t.addonActiveBadge}</Badge>
                    ) : null}
                  </InlineStack>

                  <Text as="p" variant="bodyMd">
                    {formatMessage(t.addonDescription, {
                      products: data.addonExtraProducts,
                      tryons: data.addonExtraTryOns,
                      price: data.addonPrice,
                    })}
                  </Text>

                  {data.addonActive ? (
                    <Text as="p" variant="bodySm" tone="subdued">
                      {t.addonManageHint}
                    </Text>
                  ) : (
                    <Button
                      variant="secondary"
                      loading={loadingAddon}
                      onClick={handleAddonCheckout}
                    >
                      {t.addonAdd}
                    </Button>
                  )}
                </BlockStack>
              </Card>
            </Layout.Section>
          ) : null}
        </Layout>
      </BlockStack>
    </Page>
  );
}
