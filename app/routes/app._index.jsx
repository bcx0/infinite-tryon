import { json, redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { TitleBar } from "@shopify/app-bridge-react";
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
import { PLANS } from "../config/plans";
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

function deriveStatusKey(planKey) {
  if (planKey === "free") {
    return "canceled";
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

  // Redirect new merchants (no plan yet) to onboarding guide
  if (planKey === "free" && !checkoutResult) {
    return redirect("/app/onboarding");
  }

  // Effective limits (addon temporarily disabled during Shopify Billing migration)
  const effectiveMaxProducts = planConfig.maxProducts;
  const effectiveMaxTryOns = planConfig.maxTryOnsPerMonth;

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

  const statusKey = deriveStatusKey(planKey);
  const usageRatio = effectiveMaxTryOns > 0 ? tryOnsMonth / effectiveMaxTryOns : 0;

  // Boost stats
  const boostTryOns = Math.max(0, tryOnsMonth - effectiveMaxTryOns);
  const boostCost = (boostTryOns * 0.15).toFixed(2);


  return json({
    lang,
    messages,
    shopDomain,
    planKey,
    statusKey,
    activeProductsCount,
    maxProducts: effectiveMaxProducts,
    tryOnsMonth,
    maxTryOns: effectiveMaxTryOns,
    remainingQuota: Math.max(0, effectiveMaxTryOns - tryOnsMonth),
    usageRatio,
    activity,
    checkoutResult,
    boostEnabled: shop.boostEnabled || false,
    boostTryOns,
    boostCost,
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
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [boostEnabled, setBoostEnabled] = useState(data.boostEnabled);
  const [boostLoading, setBoostLoading] = useState(false);
  const t = data.messages.dashboard;

  const usagePercent = useMemo(() => {
    return Math.max(0, Math.min(100, Math.round(data.usageRatio * 100)));
  }, [data.usageRatio]);

  const statusTone = getStatusTone(data.statusKey);
  const progressTone = getProgressTone(data.usageRatio);

  // Show a toast for checkout outcomes on mount (useEffect = client-only, avoids SSR crash)
  useEffect(() => {
    const shopify = window.shopify;
    if (!shopify) return;
    if (data.checkoutResult === "success") {
      shopify.toast.show(t.checkoutSuccess || "Plan activated!");
    } else if (data.checkoutResult === "addon_success") {
      shopify.toast.show(t.addonActivatedToast);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpgrade = useCallback(
    (planKey) => {
      setLoadingPlan(planKey);
      // Navigate to the Shopify Billing route (server-side redirect to Shopify payment page)
      window.open(`/app/billing?plan=${planKey}`, "_top");
    },
    [],
  );

  const handleBoostToggle = useCallback(async () => {
    setBoostLoading(true);
    try {
      const response = await fetch("/app/boost-toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const payload = await response.json();
      if (response.ok) {
        setBoostEnabled(payload.boostEnabled);
        window.shopify?.toast?.show(
          payload.boostEnabled
            ? (t.boost?.activated || "Mode Boost activé !")
            : (t.boost?.deactivated || "Mode Boost désactivé"),
        );
      }
    } catch {
      window.shopify?.toast?.show(t.boost?.error || "Erreur");
    } finally {
      setBoostLoading(false);
    }
  }, [t.boost]);


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

          {/* Mode Boost — only shown on paid plans */}
          {data.planKey !== "free" ? (
            <Layout.Section>
              <Card>
                <BlockStack gap="300">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h2" variant="headingMd">
                      {t.boost?.title || "Mode Boost"}
                    </Text>
                    <Badge tone={boostEnabled ? "success" : "new"}>
                      {boostEnabled
                        ? (t.boost?.enabled || "Activé")
                        : (t.boost?.disabled || "Désactivé")}
                    </Badge>
                  </InlineStack>

                  <Text as="p" variant="bodyMd">
                    {t.boost?.description || "Continuez à offrir l'essayage virtuel même après votre quota. Chaque essai supplémentaire est facturé 0.15€ sur votre facture Shopify."}
                  </Text>

                  {data.boostTryOns > 0 ? (
                    <Banner tone="info">
                      <Text as="p" variant="bodyMd">
                        {formatMessage(t.boost?.usage || "{count} essais boost ce mois ({cost}€)", {
                          count: data.boostTryOns,
                          cost: data.boostCost,
                        })}
                      </Text>
                    </Banner>
                  ) : null}

                  <Text as="p" variant="bodySm" tone="subdued">
                    {t.boost?.cappedInfo || "Plafonné à 50€/mois maximum."}
                  </Text>

                  <Button
                    variant={boostEnabled ? "secondary" : "primary"}
                    loading={boostLoading}
                    onClick={handleBoostToggle}
                  >
                    {boostEnabled
                      ? (t.boost?.deactivate || "Désactiver le Mode Boost")
                      : (t.boost?.activate || "Activer le Mode Boost")}
                  </Button>
                </BlockStack>
              </Card>
            </Layout.Section>
          ) : null}

        </Layout>
      </BlockStack>
    </Page>
  );
}
