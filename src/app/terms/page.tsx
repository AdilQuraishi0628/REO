import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service | TableTap Raipur",
  description: "Terms and conditions governing the TableTap digital ordering platform, SaaS subscriptions, guest dining, and restaurant operations.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro="These Terms of Service ('Terms') govern your access to and use of TableTap, operated by {COMPANY_NAME} ('we', 'us', or 'TableTap'). By creating a restaurant workspace, accessing kitchen tools, or using QR dining, you agree to these Terms."
    >
      <section>
        <h2>1. Service Operator &amp; Contact</h2>
        <p>
          TableTap is owned and operated by <strong>{`{COMPANY_NAME}`}</strong>, having its principal place of business at <strong>{`{POSTAL_ADDRESS}`}</strong>. For commercial inquiries, billing support, or terms notices, contact <strong>{`{SUPPORT_EMAIL}`}</strong>.
        </p>
      </section>

      <section>
        <h2>2. Use of Restaurant Workspace &amp; Staff Access</h2>
        <p>
          Restaurant operators (&apos;Subscribers&apos;) must provide accurate business credentials. You are responsible for safeguarding your owner authentication credentials and staff kitchen PINs. Any order, menu alteration, or table session conducted through your credentials is your responsibility.
        </p>
      </section>

      <section>
        <h2>3. Pricing, Subscriptions &amp; Payment Terms</h2>
        <p>
          TableTap is offered under clear SaaS subscription plans for food and beverage establishments:
        </p>
        <ul>
          <li><strong>Monthly Subscription:</strong> <strong>{`{PRICING_MONTHLY}`}</strong> per restaurant location, billed monthly in advance in <strong>{`{BILLING_CURRENCY}`}</strong>.</li>
          <li><strong>Annual Subscription:</strong> <strong>{`{PRICING_ANNUAL}`}</strong> per restaurant location, billed annually with applicable discounts.</li>
          <li><strong>Beta Period:</strong> Selected features may be provided on a complimentary trial basis as noted on your billing dashboard. We reserve the right to establish pricing upon 30 days prior written notice.</li>
          <li><strong>Payment Processing:</strong> Online payments and recurring invoices are processed via secure authorized payment partners <strong>{`{PAYMENT_GATEWAY_PROVIDER}`}</strong>. All taxes, including applicable Goods and Services Tax (GST), will be itemized on invoices.</li>
          <li><strong>Cancellations &amp; Refunds:</strong> Subscriptions can be cancelled prior to the renewal billing cycle from your Account settings. Subscription fees are non-refundable for partial months.</li>
        </ul>
      </section>

      <section>
        <h2>4. Restaurant Content, Menus &amp; Pricing Accuracy</h2>
        <p>
          Subscribers hold sole legal responsibility for all menu data, item prices, alcohol compliance, taxes, vegetarian/non-vegetarian markings, and allergen disclosures displayed to guests. TableTap acts as a technical infrastructure provider and does not prepare, inspect, or sell food or beverages.
        </p>
      </section>

      <section>
        <h2>5. Compliance with DPDP Act 2023 &amp; Guest Data</h2>
        <p>
          Restaurants using TableTap to collect guest phone numbers, reservations, or customer feedback act as Data Fiduciaries under the Digital Personal Data Protection Act, 2023 (DPDP Act 2023). Restaurants agree to process guest data strictly for legitimate dining and service fulfillment purposes and to honor guest requests for consent withdrawal or data erasure.
        </p>
      </section>

      <section>
        <h2>6. Service Availability &amp; Modifications</h2>
        <p>
          We strive for 99.9% platform availability. TableTap may update, modify, or temporarily suspend aspects of the service for security updates, system maintenance, or feature releases. Analytics and live trackers are operational tools and do not constitute certified accounting records.
        </p>
      </section>

      <section>
        <h2>7. Account Closure &amp; Data Termination</h2>
        <p>
          You may terminate your account at any time within your Workspace Settings. Upon verified termination, access to the kitchen display and admin tools is deactivated immediately, and restaurant table QR codes will cease routing to active menus.
        </p>
      </section>

      <section>
        <h2>8. Grievance Redressal &amp; Dispute Resolution</h2>
        <p>
          Any disputes arising out of or related to these Terms will be governed by the laws of India and subject to the exclusive jurisdiction of the competent courts in Raipur, Chhattisgarh.
        </p>
        <p>
          <strong>Grievance Officer:</strong> {`{GRIEVANCE_OFFICER_NAME_AND_EMAIL}`}
          <br />
          <strong>Postal Address:</strong> {`{POSTAL_ADDRESS}`}
        </p>
      </section>
    </LegalPage>
  );
}
