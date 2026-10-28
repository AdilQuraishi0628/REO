import { LegalPage } from "@/components/legal-page";

export default function TermsPage() {
  return (
    <LegalPage
      title="A few ground rules."
      intro="These starter terms cover use of TableTap's restaurant dashboard and guest experience."
    >
      <section>
        <h2>Using TableTap</h2>
        <p>
          Keep account credentials secure, provide accurate restaurant
          information, and use the service lawfully. Account holders are
          responsible for activity under their accounts and for granting access
          only to people they authorize.
        </p>
      </section>
      <section>
        <h2>Restaurant content and guest data</h2>
        <p>
          You must have the rights and permissions needed to upload menus,
          images, branding, Wi-Fi details, and review links. Restaurant operators
          are responsible for their menus, offers, guest communications, privacy
          disclosures, and compliance with applicable law.
        </p>
      </section>
      <section>
        <h2>Availability and changes</h2>
        <p>
          TableTap is provided on an evolving basis. We may update, suspend, or
          discontinue features to maintain or improve the service. Analytics are
          approximate and should not be used as financial or operational records.
        </p>
      </section>
      <section>
        <h2>Account closure</h2>
        <p>
          You may delete your account in Account settings. If you are the sole
          administrator of a restaurant, that restaurant and its associated
          records will be permanently deleted. Restaurants with other
          administrators remain available to them.
        </p>
      </section>
      <p className="legal-disclaimer">
        These starter terms are not legal advice. Before launch, the service
        operator should have qualified counsel adapt them to the business,
        applicable law, support details, and any future paid features.
      </p>
    </LegalPage>
  );
}
