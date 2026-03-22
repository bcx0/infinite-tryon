import { redirect } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { login } from "../../shopify.server";
import styles from "./styles.module.css";

export const loader = async ({ request }) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function App() {
  const { showForm } = useLoaderData();

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>TryOn AI — Virtual Try-On for Shopify</h1>
        <p className={styles.text}>
          Let your customers virtually try on your products before they buy.
          Powered by AI, integrated directly into your Shopify store.
        </p>
        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <label className={styles.label}>
              <span>Shop domain</span>
              <input className={styles.input} type="text" name="shop" />
              <span>e.g: my-shop-domain.myshopify.com</span>
            </label>
            <button className={styles.button} type="submit">
              Log in
            </button>
          </Form>
        )}
        <ul className={styles.list}>
          <li>
            <strong>AI-powered try-on</strong>. Customers upload their photo and
            see themselves wearing your products in seconds.
          </li>
          <li>
            <strong>Easy product activation</strong>. Select which products get
            the try-on button — no code required.
          </li>
          <li>
            <strong>Flexible plans</strong>. Start free, upgrade as you grow.
            Starter, Premium, Pro and Ultimate plans available.
          </li>
        </ul>
      </div>
    </div>
  );
}
