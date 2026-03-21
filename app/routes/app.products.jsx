import { json } from "@remix-run/node";
import { useLoaderData, useSubmit } from "@remix-run/react";
import {
  BlockStack,
  Button,
  Card,
  EmptyState,
  IndexTable,
  Layout,
  Page,
  Text,
  useIndexResourceState,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import {
  deactivateProductAccess,
  getPlanStatus,
  listActiveProducts,
} from "../services/productAccess.server";

export const loader = async ({ request }) => {
  const auth = await authenticate.admin(request);
  const shopDomain = String(auth?.session?.shop || "").trim().toLowerCase();

  const [productIds, planStatus] = await Promise.all([
    listActiveProducts(shopDomain),
    getPlanStatus(shopDomain),
  ]);

  const products = productIds.map((id) => ({
    id: String(id),
    name: `Produit ${id}`,
    tryOnsRemaining: planStatus.maxProductsAllowed > 0 ? "Illimité" : "0",
    status: "Actif",
  }));

  return json({ products, planStatus });
};

export const action = async ({ request }) => {
  const auth = await authenticate.admin(request);
  const shopDomain = String(auth?.session?.shop || "").trim().toLowerCase();

  const formData = await request.formData();
  const productId = formData.get("productId");

  if (!productId) {
    return json({ error: "productId is required" }, { status: 400 });
  }

  await deactivateProductAccess(shopDomain, String(productId));

  return json({ success: true });
};

export default function ProductsPage() {
  const { products } = useLoaderData();
  const submit = useSubmit();

  const resourceName = { singular: "produit", plural: "produits" };
  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(products);

  function handleDeactivate(productId) {
    const formData = new FormData();
    formData.append("productId", productId);
    submit(formData, { method: "post" });
  }

  const rowMarkup = products.map(({ id, name, tryOnsRemaining, status }, index) => (
    <IndexTable.Row
      id={id}
      key={id}
      selected={selectedResources.includes(id)}
      position={index}
    >
      <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="bold" as="span">
          {name}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>{tryOnsRemaining}</IndexTable.Cell>
      <IndexTable.Cell>{status}</IndexTable.Cell>
      <IndexTable.Cell>
        <Button
          variant="plain"
          tone="critical"
          onClick={() => handleDeactivate(id)}
        >
          Désactiver
        </Button>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page>
      <TitleBar title="Produits" />
      <Layout>
        <Layout.Section>
          <Card padding="0">
            {products.length === 0 ? (
              <EmptyState
                heading="Aucun produit activé"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <Text as="p" variant="bodyMd">
                  Les produits activés pour l'essayage virtuel apparaîtront ici.
                  Ouvrez une fiche produit dans votre boutique pour activer le widget try-on.
                </Text>
              </EmptyState>
            ) : (
              <BlockStack>
                <IndexTable
                  resourceName={resourceName}
                  itemCount={products.length}
                  selectedItemsCount={
                    allResourcesSelected ? "All" : selectedResources.length
                  }
                  onSelectionChange={handleSelectionChange}
                  headings={[
                    { title: "Produit" },
                    { title: "Try-ons restants" },
                    { title: "Statut" },
                    { title: "Actions" },
                  ]}
                >
                  {rowMarkup}
                </IndexTable>
              </BlockStack>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
