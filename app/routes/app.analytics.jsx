import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useCallback, useMemo } from "react";
import {
  Badge,
  BlockStack,
  Button,
  Card,
  IndexTable,
  InlineStack,
  Layout,
  Page,
  Text,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import db from "../db.server";
import { getLocale } from "../locales";
import { authenticate } from "../shopify.server";

function getDayKey(date) {
  return date.toISOString().slice(0, 10);
}

function formatDateDisplay(date) {
  return new Date(date).toLocaleDateString();
}

function formatMessage(template, values) {
  return String(template || "").replace(/\{(\w+)\}/g, (_, key) => {
    return values[key] != null ? String(values[key]) : "";
  });
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

  const { lang, messages } = getLocale(request);

  // Get all try-ons for this shop (all-time)
  const allTryOns = await db.tryOnLog.findMany({
    where: { shopDomain },
    select: {
      id: true,
      productId: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Get try-ons for this month
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const thisMonthTryOns = allTryOns.filter(
    (log) => log.createdAt >= monthStart && log.createdAt < monthEnd
  );

  // Calculate per-product breakdown
  const productStats = {};

  for (const log of allTryOns) {
    if (!log.productId) continue;

    if (!productStats[log.productId]) {
      productStats[log.productId] = {
        productId: log.productId,
        totalCount: 0,
        successCount: 0,
        errorCount: 0,
        lastTryOn: null,
      };
    }

    productStats[log.productId].totalCount += 1;
    if (log.status === "success") {
      productStats[log.productId].successCount += 1;
    } else if (log.status === "error") {
      productStats[log.productId].errorCount += 1;
    }

    if (!productStats[log.productId].lastTryOn || log.createdAt > productStats[log.productId].lastTryOn) {
      productStats[log.productId].lastTryOn = log.createdAt;
    }
  }

  const productBreakdown = Object.values(productStats)
    .map((stat) => ({
      ...stat,
      errorRate: stat.totalCount > 0 ? ((stat.errorCount / stat.totalCount) * 100).toFixed(1) : "0",
    }))
    .sort((a, b) => b.totalCount - a.totalCount);

  // Find most popular product
  const mostPopularProduct = productBreakdown.length > 0 ? productBreakdown[0] : null;

  // Calculate success rate
  const successfulTryOns = allTryOns.filter((log) => log.status === "success").length;
  const successRate = allTryOns.length > 0 ? ((successfulTryOns / allTryOns.length) * 100).toFixed(1) : 0;

  return json({
    lang,
    messages,
    shopDomain,
    totalTryOnsAllTime: allTryOns.length,
    tryOnsThisMonth: thisMonthTryOns.length,
    successRate,
    mostPopularProduct,
    productBreakdown,
  });
};

export const action = async ({ request }) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

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
  const action = url.searchParams.get("action");

  if (action === "export") {
    // Get try-ons for this month
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

    const tryOns = await db.tryOnLog.findMany({
      where: {
        shopDomain,
        createdAt: {
          gte: monthStart,
          lt: monthEnd,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Build CSV
    const csvHeader = "ID,Product ID,Status,Result Image,Error Message,Created At\n";
    const csvRows = tryOns
      .map((log) => {
        const createdAt = new Date(log.createdAt).toISOString();
        return `${log.id},"${log.productId || ""}",${log.status},"${log.resultImageUrl || ""}","${(log.errorMessage || "").replace(/"/g, '""')}",${createdAt}`;
      })
      .join("\n");

    const csv = csvHeader + csvRows;

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="tryons-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}.csv"`,
      },
    });
  }

  return json({ error: "Unknown action" }, { status: 400 });
};

export default function AnalyticsPage() {
  const data = useLoaderData();
  const t = data.messages.analytics;

  const handleExportCsv = useCallback(async () => {
    try {
      const response = await fetch("/app/analytics?action=export", {
        method: "POST",
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `tryons-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        window.shopify?.toast?.show(t.exportTitle);
      }
    } catch (error) {
      console.error("Export failed:", error);
      window.shopify?.toast?.show(t.noData || "Export failed");
    }
  }, [t]);

  const summaryCards = useMemo(
    () => [
      {
        title: t.totalTryOns,
        value: data.totalTryOnsAllTime,
      },
      {
        title: t.tryOnsThisMonth,
        value: data.tryOnsThisMonth,
      },
      {
        title: t.successRate,
        value: `${data.successRate}%`,
      },
      {
        title: t.topProduct,
        value: data.mostPopularProduct?.productId || t.noData,
      },
    ],
    [data, t]
  );

  const tableResource = useMemo(
    () => ({
      resourceName: { singular: t.noData, plural: t.productBreakdown },
    }),
    [t]
  );

  const rowMarkup = data.productBreakdown.map((product, index) => (
    <IndexTable.Row key={product.productId} id={product.productId} position={index}>
      <IndexTable.Cell>
        <Text as="span" variant="bodyMd" fontWeight="semibold">
          {product.productId}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span" variant="bodyMd">
          {product.totalCount}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Badge tone={product.successCount > product.errorCount ? "success" : "warning"}>
          {product.successCount}
        </Badge>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span" variant="bodyMd">
          {product.errorRate}%
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span" variant="bodySm" tone="subdued">
          {product.lastTryOn ? formatDateDisplay(product.lastTryOn) : t.never}
        </Text>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page>
      <TitleBar title={t.title} />
      <BlockStack gap="500">
        {/* Summary Cards */}
        <Layout>
          <Layout.Section>
            <Layout>
              {summaryCards.map((card) => (
                <Layout.Section oneQuarter key={card.title}>
                  <Card>
                    <BlockStack gap="200">
                      <Text as="p" variant="bodySm" tone="subdued">
                        {card.title}
                      </Text>
                      <Text as="p" variant="headingLg">
                        {card.value}
                      </Text>
                    </BlockStack>
                  </Card>
                </Layout.Section>
              ))}
            </Layout>
          </Layout.Section>
        </Layout>

        {/* Per-Product Breakdown */}
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingMd">
                    {t.productBreakdown}
                  </Text>
                  <Button variant="secondary" onClick={handleExportCsv}>
                    {t.exportCsv}
                  </Button>
                </InlineStack>

                {data.productBreakdown.length > 0 ? (
                  <IndexTable
                    resourceName={tableResource.resourceName}
                    itemCount={data.productBreakdown.length}
                    headings={[
                      { title: t.productId },
                      { title: t.totalCount },
                      { title: t.successCount },
                      { title: t.errorRate },
                      { title: t.lastTryOn },
                    ]}
                    selectable={false}
                  >
                    {rowMarkup}
                  </IndexTable>
                ) : (
                  <Text as="p" variant="bodyMd" tone="subdued">
                    {t.noData}
                  </Text>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
