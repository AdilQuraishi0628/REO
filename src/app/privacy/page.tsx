import { LegalPage } from "@/components/legal-page";

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy, thoughtfully."
      intro="This notice describes how TableTap handles information when restaurant teams use the dashboard and guests use a restaurant's TableTap page."
    >
      <section>
        <h2>Information handled</h2>
        <p>
          Restaurant administrators provide account email addresses and restaurant
          settings. Guest pages may collect a feedback rating, optional comment,
          name or optional phone number, a loyalty enrollment name and phone
          number (with legacy email addresses retained where previously supplied), and an
          optional table label. Approximate guest page views may be recorded to
          provide restaurant analytics.
        </p>
      </section>
      <section>
        <h2>How information is used</h2>
        <p>
          Information is used to operate restaurant pages, manage restaurant
          accounts, issue loyalty cards, respond to guest feedback, protect the
          service, and provide basic usage and reliability reporting. Guest
          feedback is private to the restaurant and is not published by TableTap.
        </p>
      </section>
      <section>
        <h2>Restaurant operators and service providers</h2>
        <p>
          Restaurant operators control the guest information submitted to their
          pages and are responsible for their own privacy practices. TableTap
          uses Supabase for authentication and database services, Vercel for
          hosting and privacy-conscious product analytics, and Sentry for
          reliability monitoring when those integrations are configured.
          Wallet providers receive information needed to create a requested
          digital pass.
        </p>
      </section>
      <section>
        <h2>Retention and your choices</h2>
        <p>
          Restaurant teams should remove guest data they no longer need and
          respond to requests concerning information submitted to their page.
          Account holders may request account deletion from Account settings.
          Deleting an account removes restaurants for which that account is the
          only administrator; shared restaurants remain available to their
          remaining administrators.
        </p>
      </section>
      <section>
        <h2>Security and changes</h2>
        <p>
          TableTap uses access controls and tenant-scoped database policies.
          Internet transmission and storage are not risk-free; do not submit
          sensitive personal or payment information through guest feedback.
          This notice may be updated as the service changes.
        </p>
      </section>
      <p className="legal-disclaimer">
        This starter privacy notice is an operational summary, not legal advice.
        The service operator should review it with qualified counsel and add
        jurisdiction-specific contact and retention details before launch.
      </p>
    </LegalPage>
  );
}
