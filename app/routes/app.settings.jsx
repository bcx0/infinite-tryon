import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { useEffect, useState } from "react";
import {
  Page,
  Card,
  BlockStack,
  FormLayout,
  Select,
  TextField,
  Checkbox,
  Button,
  Layout,
  Text,
  InlineStack,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import db from "../db.server";
import { getLocale } from "../locales";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const auth = await authenticate.admin(request);
  const shopDomain = String(
    auth?.session?.shop || request.headers.get("x-shop-domain") || ""
  )
    .trim()
    .toLowerCase();

  if (!shopDomain) {
    throw json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { lang, messages } = getLocale(request);
  const shop = await db.shop.findUnique({
    where: { shopDomain },
  });

  if (!shop) {
    throw json({ error: "SHOP_NOT_FOUND" }, { status: 404 });
  }

  // Format createdAt for display
  const createdAtFormatted = new Date(shop.createdAt).toLocaleDateString(
    lang === "fr" ? "fr-FR" : "en-US",
    { year: "numeric", month: "long", day: "numeric" }
  );

  return json({
    lang,
    messages,
    shop: {
      id: shop.id,
      shopDomain: shop.shopDomain,
      plan: shop.plan,
      createdAt: createdAtFormatted,
      widgetLanguage: shop.widgetLanguage,
      widgetPrimaryColor: shop.widgetPrimaryColor,
      widgetButtonStyle: shop.widgetButtonStyle,
      widgetShowDisclaimer: shop.widgetShowDisclaimer,
    },
  });
};

export const action = async ({ request }) => {
  if (request.method !== "POST") {
    return json({ error: "METHOD_NOT_ALLOWED" }, { status: 405 });
  }

  const auth = await authenticate.admin(request);
  const shopDomain = String(
    auth?.session?.shop || request.headers.get("x-shop-domain") || ""
  )
    .trim()
    .toLowerCase();

  if (!shopDomain) {
    return json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const formData = await request.formData();
  const widgetLanguage = String(formData.get("widgetLanguage") || "auto");
  const widgetPrimaryColor = String(formData.get("widgetPrimaryColor") || "#111111");
  const widgetButtonStyle = String(formData.get("widgetButtonStyle") || "filled");
  const widgetShowDisclaimer = formData.get("widgetShowDisclaimer") === "on";

  try {
    const updatedShop = await db.shop.update({
      where: { shopDomain },
      data: {
        widgetLanguage,
        widgetPrimaryColor,
        widgetButtonStyle,
        widgetShowDisclaimer,
      },
    });

    return json({
      success: true,
      shop: {
        widgetLanguage: updatedShop.widgetLanguage,
        widgetPrimaryColor: updatedShop.widgetPrimaryColor,
        widgetButtonStyle: updatedShop.widgetButtonStyle,
        widgetShowDisclaimer: updatedShop.widgetShowDisclaimer,
      },
    });
  } catch (error) {
    return json(
      { error: "UPDATE_FAILED", message: error.message },
      { status: 500 }
    );
  }
};

export default function SettingsPage() {
  const { shop, messages, lang } = useLoaderData();
  const fetcher = useFetcher();
  const [formData, setFormData] = useState({
    widgetLanguage: shop.widgetLanguage,
    widgetPrimaryColor: shop.widgetPrimaryColor,
    widgetButtonStyle: shop.widgetButtonStyle,
    widgetShowDisclaimer: shop.widgetShowDisclaimer,
  });

  const t = messages.settings;
  const tPlans = messages.dashboard.plans;
  const appVersion = "1.0.0";

  // Show toast on successful save
  useEffect(() => {
    if (fetcher.data?.success) {
      window.shopify?.toast?.show(t.saved);
    } else if (fetcher.data?.error) {
      window.shopify?.toast?.show(t.saveError);
    }
  }, [fetcher.data]);

  const handleLanguageChange = (value) => {
    setFormData((prev) => ({ ...prev, widgetLanguage: value }));
  };

  const handleColorChange = (value) => {
    setFormData((prev) => ({ ...prev, widgetPrimaryColor: value }));
  };

  const handleButtonStyleChange = (value) => {
    setFormData((prev) => ({ ...prev, widgetButtonStyle: value }));
  };

  const handleDisclaimerChange = (checked) => {
    setFormData((prev) => ({ ...prev, widgetShowDisclaimer: checked }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formDataObj = new FormData();
    formDataObj.append("widgetLanguage", formData.widgetLanguage);
    formDataObj.append("widgetPrimaryColor", formData.widgetPrimaryColor);
    formDataObj.append("widgetButtonStyle", formData.widgetButtonStyle);
    if (formData.widgetShowDisclaimer) {
      formDataObj.append("widgetShowDisclaimer", "on");
    }
    fetcher.submit(formDataObj, { method: "POST" });
  };

  const isLoading = fetcher.state === "submitting";

  return (
    <Page>
      <TitleBar title={t.title} />
      <BlockStack gap="500">
        <Layout>
          {/* Widget Settings Card */}
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  {t.widgetSettings}
                </Text>

                <form onSubmit={handleSubmit}>
                  <FormLayout>
                    {/* Language Selection */}
                    <Select
                      label={t.language}
                      options={[
                        { label: t.languageAuto, value: "auto" },
                        { label: t.languageFr, value: "fr" },
                        { label: t.languageEn, value: "en" },
                      ]}
                      value={formData.widgetLanguage}
                      onChange={handleLanguageChange}
                    />

                    {/* Primary Color */}
                    <TextField
                      label={t.primaryColor}
                      helpText={t.primaryColorHint}
                      type="color"
                      value={formData.widgetPrimaryColor}
                      onChange={handleColorChange}
                    />

                    {/* Button Style */}
                    <Select
                      label={t.buttonStyle}
                      options={[
                        { label: t.buttonFilled, value: "filled" },
                        { label: t.buttonOutline, value: "outline" },
                      ]}
                      value={formData.widgetButtonStyle}
                      onChange={handleButtonStyleChange}
                    />

                    {/* Show Disclaimer Checkbox */}
                    <Checkbox
                      label={t.showDisclaimer}
                      helpText={t.disclaimerHint}
                      checked={formData.widgetShowDisclaimer}
                      onChange={handleDisclaimerChange}
                    />

                    {/* Save Button */}
                    <Button
                      variant="primary"
                      submit
                      loading={isLoading}
                    >
                      {t.save}
                    </Button>
                  </FormLayout>
                </form>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Account Information Card */}
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  {t.accountInfo}
                </Text>

                <BlockStack gap="200">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="span" variant="bodyMd" tone="subdued">
                      {t.shopDomain}
                    </Text>
                    <Text as="span" variant="bodyMd" fontWeight="semibold">
                      {shop.shopDomain}
                    </Text>
                  </InlineStack>

                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="span" variant="bodyMd" tone="subdued">
                      {t.currentPlan}
                    </Text>
                    <Text as="span" variant="bodyMd" fontWeight="semibold">
                      {tPlans[shop.plan] || shop.plan}
                    </Text>
                  </InlineStack>

                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="span" variant="bodyMd" tone="subdued">
                      {t.memberSince}
                    </Text>
                    <Text as="span" variant="bodyMd" fontWeight="semibold">
                      {shop.createdAt}
                    </Text>
                  </InlineStack>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Support Card */}
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  {t.support}
                </Text>

                <Text as="p" variant="bodyMd" tone="subdued">
                  {t.supportText}
                </Text>

                <Button
                  variant="secondary"
                  url="mailto:support@infinitetryon.com"
                >
                  {t.supportEmail}
                </Button>

                <Text as="p" variant="bodySm" tone="subdued">
                  {t.appVersion}: {appVersion}
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
