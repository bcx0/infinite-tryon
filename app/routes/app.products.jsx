import { json } from "@remix-run/node";
import { useLoaderData, useSubmit } from "@remix-run/react";
import {
  Badge,
  BlockStack,
  Button,
  Card,
  EmptyState,
  IndexTable,
  InlineStack,
  Layout,
  Page,
  Text,
  useIndexResourceState,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { getPlanStatus } from "../services/productAccess.server";
import { getLocale } from "../locales";
import db from "../db.server";

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

export const loader = async ({ request }) => {
  const auth = await authenticate.admin(request);
  const shopDomain = String(auth?.session?.shop || "").trim().toLowerCase();
  const { messages } = getLocale(request);

  const [products, planStatus] = await Promise.all([
    db.product.findMany({
      where: { shopDomain, isActive: true },
      select: { productId: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    getPlanStatus(shopDomain),
  ]);

  return json({
    messages,
    products: products.map(({ productId, createdAt }) => ({
      id: productId,
      activatedAt: formatDate(createdAt),
    })),
    planStatus,
  });
};

export const action = async ({ request }) => {
  const auth = await authenticate.admin(request);
  const shopDomain = String(auth?.session?.shop || "").trim().toLowerCase();

  const formData = await request.formData();
  const productId = formData.get("productId");

  if (!productId) {
    return json({ error: "productId is required" }, { status: 400 });
  }

  await db.product.updateMany({
    where: { shopDomain, productId: String(productId), isActive: true },
    data: { isActive: false },
  });

  return json({ success: true });
};

export default function ProductsPage() {
  const { products, planStatus, messages } = useLoaderData();
  const t = messages.products;
  const submit = useSubmit();

  const resourceName = { singular: t.resourceSingular, plural: t.resourcePlural };
  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(products);

  function handleDeactivate(productId) {
    const formData = new FormData();
    formData.append("productId", productId);
    submit(formData, { method: "post" });
  }

  const rowMarkup = products.map(({ id, activatedAt }, index) => (
    <IndexTable.Row
      id={id}
      key={id}
      selected={selectedResources.includes(id)}
      position={index}
    >
      <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="bold" as="span">
          {id}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>{activatedAt}</IndexTable.Cell>
      <IndexTable.Cell>
        <Badge tone="success">{t.statusActive}</Badge>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Button variant="plain" tone="critical" onClick={() => handleDeactivate(id)}>
          {t.deactivate}
        </Button>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page>
      <TitleBar title={t.title} />
      <Layout>
        <Layout.Section>
          <BlockStack gap="300">
            <Text as="p" variant="bodySm" tone="subdued">
              {`${planStatus.activeProductsCount} / ${planStatus.maxProductsAllowed} ${t.slotsUsed}`}
              {planStatus.addonActive ? ` · ${t.addonActive}` : ""}
            </Text>
            <Card padding="0">
              {products.length === 0 ? (
                <EmptyState
                  heading={t.emptyHeading}
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <Text as="p" variant="bodyMd">
                    {t.emptyDescription}
                  </Text>
                </EmptyState>
              ) : (
                <BlockStack>
                  <IndexTable
                    resourceName={resourceName}
                    itemCount={products.length}
                    selectedItemsCount={allResourcesSelected ? "All" : selectedResources.length}
                    onSelectionChange={handleSelectionChange}
                    headings={[
                      { title: t.columnProduct },
                      { title: t.columnActivatedAt },
                      { title: t.columnStatus },
                      { title: t.columnActions },
                    ]}
                  >
                    {rowMarkup}
                  </IndexTable>
                </BlockStack>
              )}
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
