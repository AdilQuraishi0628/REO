import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy | TableTap Raipur",
  description: "DPDP Act 2023 compliant privacy notice detailing how TableTap processes, protects, and retains restaurant and guest data in Raipur, Chhattisgarh.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="This Privacy Policy describes how TableTap ('we', 'us', or 'our') operates, processes personal data, and upholds privacy commitments under the Digital Personal Data Protection Act, 2023 (DPDP Act 2023). It applies to restaurant owners, staff, and guests using TableTap QR ordering."
    >
      <section>
        <h2>Data Fiduciary &amp; Service Operator</h2>
        <p>
          TableTap is operated by <strong>{`{COMPANY_NAME}`}</strong>. For any inquiries, compliance requests, or grievance escalations, contact us at <strong>{`{SUPPORT_EMAIL}`}</strong> or postal address: <strong>{`{POSTAL_ADDRESS}`}</strong>.
        </p>
      </section>

      <section>
        <h2>DPDP Act 2023: Purpose of Processing</h2>
        <p>
          We process personal data solely for specified, lawful, and operational dining purposes:
        </p>
        <ul>
          <li><strong>Restaurant Administrators &amp; Staff:</strong> Managing account authentication, restaurant settings, digital menu items, and kitchen display systems.</li>
          <li><strong>Dining Guests:</strong> Transmitting table-side food and drink orders to the kitchen, notifying guests of order status, routing service calls (water, waiter, bill), and delivering optional digital loyalty cards to mobile wallets.</li>
          <li><strong>Private Feedback:</strong> Relaying direct, non-public reviews to restaurant managers to resolve hospitality concerns.</li>
          <li><strong>System Reliability &amp; Abuse Prevention:</strong> Enforcing rate limits, preventing denial of service, securing staff PINs, and diagnosing technical issues.</li>
        </ul>
      </section>

      <section>
        <h2>Consent &amp; Voluntary Provision</h2>
        <p>
          Guests are informed at the point of collection when submitting optional personal data such as phone numbers for loyalty passes or feedback. Consent is collected on an affirmative, unambiguous basis. Dining and viewing the digital menu does not require creating a guest account.
        </p>
      </section>

      <section>
        <h2>Withdrawal of Consent</h2>
        <p>
          Under the DPDP Act 2023, data principals have the right to withdraw their consent at any time. Guests or restaurant operators who wish to withdraw consent for loyalty communications or stored feedback can email <strong>{`{SUPPORT_EMAIL}`}</strong> with their phone number or account details. Upon withdrawal verification, processing is halted promptly.
        </p>
      </section>

      <section>
        <h2>Data Retention Periods</h2>
        <p>
          Personal data is retained only for the duration necessary to satisfy the purpose for which it was gathered, in line with statutory requirements:
        </p>
        <ul>
          <li><strong>Active Table Orders &amp; Sessions:</strong> Order details and table sessions are stored for immediate fulfillment and cleared from active queues within 24 hours. Aggregated sales records are maintained for restaurant operational history.</li>
          <li><strong>Guest Loyalty Information:</strong> Retained for the duration of active loyalty membership or until 36 months of consecutive inactivity, after which inactive phone records are anonymized or purged.</li>
          <li><strong>Server Logs &amp; Security Telemetry:</strong> Network connection metadata and rate limit hashes are retained for a rolling window of up to 90 days for fraud and intrusion detection.</li>
        </ul>
      </section>

      <section>
        <h2>Cross-Border Data Processing &amp; Sub-Processors</h2>
        <p>
          To deliver resilient cloud infrastructure, TableTap engages trusted enterprise technology vendors. In accordance with applicable Indian cross-border transfer guidelines, personal data may be processed through:
        </p>
        <ul>
          <li><strong>Supabase Inc.:</strong> Managed relational database hosting, Row Level Security (RLS), and authentication token management.</li>
          <li><strong>Vercel Inc.:</strong> Secure Edge application hosting, serverless compute runtime, and performance routing.</li>
          <li><strong>Functional Software, Inc. (Sentry):</strong> Application error telemetry and system crash diagnostics, configured with automated data scrubbing to exclude payment details and customer identifiers.</li>
        </ul>
      </section>

      <section>
        <h2>Right to Erasure &amp; Correction</h2>
        <p>
          You have the right to access, correct, or request the complete erasure of your personal data held by TableTap. Restaurant administrators may close accounts and delete restaurant data directly in Workspace Settings. Guests can request erasure of their loyalty profile or past feedback records by writing to <strong>{`{SUPPORT_EMAIL}`}</strong> or our Grievance Officer.
        </p>
      </section>

      <section>
        <h2>Grievance Redressal Mechanism</h2>
        <p>
          In accordance with the DPDP Act 2023 and the Information Technology Rules, our designated Grievance Officer is responsible for addressing queries or complaints regarding personal data handling:
        </p>
        <p>
          <strong>Grievance Officer:</strong> {`{GRIEVANCE_OFFICER_NAME_AND_EMAIL}`}
          <br />
          <strong>Postal Address:</strong> {`{POSTAL_ADDRESS}`}
          <br />
          <strong>Response Timeline:</strong> All privacy grievances are acknowledged within 24 hours and addressed within 15 business days.
        </p>
      </section>
    </LegalPage>
  );
}
