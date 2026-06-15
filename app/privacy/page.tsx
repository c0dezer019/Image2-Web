import type { Metadata } from "next";
import { LegalPage, EFFECTIVE_DATE_STYLE, SECTION_STYLE, SECTION_LABEL_STYLE, P_STYLE } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy — Image2",
  description: "Privacy Policy for Image2, the image-to-text-art converter.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p style={EFFECTIVE_DATE_STYLE}>Effective date: June 14, 2026</p>

      <section style={SECTION_STYLE}>
        <div style={SECTION_LABEL_STYLE}>01 / What We Collect</div>
        <p style={P_STYLE}>
          When you upload an image to Image2, it is sent to our conversion server for
          processing. The server writes the image to a temporary file, performs the
          conversion, and immediately deletes the file once processing completes. We do
          not store, retain, or back up your images.
        </p>
      </section>

      <section style={SECTION_STYLE}>
        <div style={SECTION_LABEL_STYLE}>02 / Analytics</div>
        <p style={P_STYLE}>
          We use Vercel Analytics to understand aggregate, anonymized usage of the
          Service (e.g. page views). This does not use cookies and does not collect
          personally identifiable information.
        </p>
      </section>

      <section style={SECTION_STYLE}>
        <div style={SECTION_LABEL_STYLE}>03 / No Accounts</div>
        <p style={P_STYLE}>
          Image2 does not require an account, login, or registration. We do not collect
          names, email addresses, or other personal information through the Service
          itself.
        </p>
      </section>

      <section style={SECTION_STYLE}>
        <div style={SECTION_LABEL_STYLE}>04 / Third-Party Processing</div>
        <p style={P_STYLE}>
          Image conversion is performed by a separate server operated by us, hosted
          independently from the Vercel-hosted frontend. Image data is transmitted to
          this server solely to perform the requested conversion, as described in
          Section 1.
        </p>
      </section>

      <section style={SECTION_STYLE}>
        <div style={SECTION_LABEL_STYLE}>05 / Children&rsquo;s Privacy</div>
        <p style={P_STYLE}>
          Image2 is not directed at children under 13, and we do not knowingly collect
          information from children under 13.
        </p>
      </section>

      <section style={SECTION_STYLE}>
        <div style={SECTION_LABEL_STYLE}>06 / Changes to This Policy</div>
        <p style={P_STYLE}>
          We may update this Privacy Policy from time to time. Changes take effect when
          posted on this page.
        </p>
      </section>

      <section style={SECTION_STYLE}>
        <div style={SECTION_LABEL_STYLE}>07 / Contact</div>
        <p style={P_STYLE}>
          Questions about this Privacy Policy? Contact us at{" "}
          <a href="mailto:contact@theappfoundry.tech" style={{ color: "inherit", textDecoration: "underline" }}>
            contact@theappfoundry.tech
          </a>
          .
        </p>
      </section>
    </LegalPage>
  );
}
