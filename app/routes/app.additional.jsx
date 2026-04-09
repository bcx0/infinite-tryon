import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Banner,
  BlockStack,
  Card,
  Layout,
  List,
  Page,
  Text,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
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
    },
  });

  return json({
    messages,
    shopDomain,
    addonActive: shop?.addonActive || false,
    addonPrice: ADDON.priceMonthly,
    addonExtraProducts: ADDON.extraProducts,
    addonExtraTryOns: ADDON.extraTryOns,
  });
};

export default function AdditionalPage() {
  const data = useLoaderData();
  const t = data.messages.addon;

  return (
    <Page>
      <TitleBar title={t.pageTitle} />
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                {t.title}
              </Text>

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

              <Banner tone="info" title="Bientôt disponible">
                <Text as="p" variant="bodyMd">
                  L'addon sera disponible prochainement via la facturation Shopify.
                </Text>
              </Banner>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
