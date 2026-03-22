export default function PrivacyPolicy() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Privacy Policy — Infinite Try-On</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1a1a1a;
            background: #fff;
            line-height: 1.7;
          }
          .container {
            max-width: 760px;
            margin: 0 auto;
            padding: 60px 24px 80px;
          }
          h1 {
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: 8px;
            color: #111;
          }
          .subtitle {
            color: #666;
            font-size: 0.95rem;
            margin-bottom: 48px;
          }
          h2 {
            font-size: 1.15rem;
            font-weight: 600;
            margin-top: 40px;
            margin-bottom: 12px;
            color: #111;
          }
          p { margin-bottom: 14px; color: #333; }
          ul {
            margin: 10px 0 14px 20px;
            color: #333;
          }
          ul li { margin-bottom: 6px; }
          a { color: #5c6ac4; text-decoration: none; }
          a:hover { text-decoration: underline; }
          .divider {
            border: none;
            border-top: 1px solid #eee;
            margin: 40px 0;
          }
        `}</style>
      </head>
      <body>
        <div className="container">
          <h1>Privacy Policy</h1>
          <p className="subtitle">Last updated: March 22, 2026</p>

          <p>
            This Privacy Policy describes how <strong>Infinite Try-On</strong> ("we", "us", or "our")
            collects, uses, and protects information when you use our Shopify application. We are
            committed to protecting your privacy and handling your data with transparency.
          </p>

          <hr className="divider" />

          <h2>1. Information We Collect</h2>
          <p>When you or your customers use Infinite Try-On, we may collect:</p>
          <ul>
            <li>
              <strong>Product images</strong> — photos of your products uploaded to enable the
              virtual try-on experience.
            </li>
            <li>
              <strong>Customer photos</strong> — images submitted by end customers to preview how
              products look on them. These are processed solely to generate the try-on result and
              are not retained after processing.
            </li>
            <li>
              <strong>Store information</strong> — your Shopify store domain and basic configuration
              data necessary to operate the app.
            </li>
            <li>
              <strong>Usage data</strong> — anonymised logs such as number of try-ons generated, for
              billing and performance monitoring purposes.
            </li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <p>We use collected data exclusively to:</p>
          <ul>
            <li>Deliver the virtual try-on feature to your store's customers.</li>
            <li>Process and render AI-generated try-on images in real time.</li>
            <li>Maintain, improve, and secure the service.</li>
            <li>Manage your subscription and billing.</li>
          </ul>
          <p>
            <strong>We never sell, rent, or trade your data or your customers' data to third parties.</strong>
          </p>

          <h2>3. Temporary Storage &amp; Retention</h2>
          <p>
            Customer photos submitted for try-on are stored <strong>temporarily</strong> — only for
            the duration required to generate the result (typically a few seconds to a few minutes).
            They are automatically deleted once the try-on image is returned. We do not build
            databases of customer photos.
          </p>
          <p>
            Product images and store configuration data are retained for as long as your store has
            the app installed. Upon uninstallation, we delete your store data within 30 days.
          </p>

          <h2>4. Third-Party Services</h2>
          <p>
            We use the following sub-processors to deliver the service:
          </p>
          <ul>
            <li><strong>Railway</strong> — cloud hosting and infrastructure.</li>
            <li><strong>Stripe</strong> — payment processing (we never store full card details).</li>
            <li>
              <strong>AI model providers</strong> — images may be sent to AI inference APIs solely
              to generate try-on results. These providers are contractually prohibited from using
              your data for their own training.
            </li>
          </ul>

          <h2>5. Data Security</h2>
          <p>
            All data is transmitted over encrypted HTTPS connections. We apply industry-standard
            security practices to protect stored data. Access to production systems is restricted
            to authorised personnel only.
          </p>

          <h2>6. GDPR Compliance (EEA &amp; UK)</h2>
          <p>
            If you or your customers are located in the European Economic Area or the United Kingdom,
            you have the following rights under the General Data Protection Regulation (GDPR):
          </p>
          <ul>
            <li>Right to access the personal data we hold about you.</li>
            <li>Right to rectification of inaccurate data.</li>
            <li>Right to erasure ("right to be forgotten").</li>
            <li>Right to restrict or object to processing.</li>
            <li>Right to data portability.</li>
          </ul>
          <p>
            To exercise any of these rights, please contact us at the email address below.
            We will respond within 30 days.
          </p>

          <h2>7. CCPA Compliance (California)</h2>
          <p>
            If you are a California resident, you have the right to know what personal information
            we collect, to request deletion of your personal information, and to opt out of the
            sale of personal information. We do not sell personal information.
          </p>

          <h2>8. Shopify Mandatory Webhooks</h2>
          <p>
            In compliance with Shopify's requirements, we honour the following data subject requests
            via webhooks:
          </p>
          <ul>
            <li>
              <strong>Customer data request</strong> — we will provide all data held for a given
              customer within 30 days.
            </li>
            <li>
              <strong>Customer data erasure</strong> — we will delete all personal data for a given
              customer upon request.
            </li>
            <li>
              <strong>Shop data erasure</strong> — we will delete all store data within 30 days of
              app uninstallation.
            </li>
          </ul>

          <h2>9. Children's Privacy</h2>
          <p>
            Our service is not directed to individuals under the age of 13. We do not knowingly
            collect personal information from children.
          </p>

          <h2>10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. When we do, we will revise the
            "Last updated" date at the top of this page. We encourage you to review this policy
            periodically.
          </p>

          <h2>11. Contact</h2>
          <p>
            If you have any questions or requests regarding this Privacy Policy, please contact us
            at:{" "}
            <a href="mailto:battiste.crevieaux@icloud.com">battiste.crevieaux@icloud.com</a>
          </p>

          <hr className="divider" />
          <p style={{ color: "#999", fontSize: "0.85rem" }}>
            Infinite Try-On is an independent Shopify app. This policy applies to the app available
            in the Shopify App Store.
          </p>
        </div>
      </body>
    </html>
  );
}
