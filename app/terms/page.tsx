import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

const lastUpdated = "June 4, 2026";

export const metadata: Metadata = {
  title: "Terms of Service | ScopeDrop",
  description: "Terms of Service for ScopeDrop, an AI-powered project scoping and proposal intelligence platform.",
};

const sections = [
  {
    title: "Agreement",
    body: [
      "These Terms of Service govern your access to and use of ScopeDrop, an AI-powered project scoping and proposal intelligence platform. ScopeDrop helps users analyze client briefs, generate discovery questions, score proposal readiness, export reports, and manage credit-based usage through user accounts and paid subscriptions.",
      "By creating an account, signing in, subscribing, purchasing credits, or using ScopeDrop, you agree to these Terms.",
    ],
  },
  {
    title: "Eligibility and Accounts",
    body: [
      "You must provide accurate account information and keep your account access secure. ScopeDrop currently supports account access through Google OAuth. You are responsible for all activity under your account, including content submitted, reports generated, credits used, and billing activity.",
      "You may not share access to your account in a way that bypasses plan limits, credit limits, security controls, or subscription requirements.",
    ],
  },
  {
    title: "Acceptable Use",
    items: [
      "Do not use ScopeDrop for unlawful, abusive, fraudulent, deceptive, harmful, or infringing activity.",
      "Do not submit content that you do not have the right to process, including confidential client material submitted without permission.",
      "Do not submit sensitive personal data, payment credentials, government identifiers, health information, or regulated data unless you have all required rights and safeguards.",
      "Do not attempt to reverse engineer, overload, scrape, probe, disrupt, or bypass ScopeDrop, its rate limits, security controls, billing systems, or provider integrations.",
      "Do not use ScopeDrop outputs to mislead clients, misrepresent capabilities, violate contracts, or make promises you cannot review and support.",
    ],
  },
  {
    title: "User Content",
    body: [
      "You retain ownership of the client messages, briefs, notes, documents, edits, and other content you submit to ScopeDrop. You grant ScopeDrop the limited rights needed to host, process, analyze, transmit, display, export, and store that content for the purpose of providing and improving the service.",
      "You are responsible for the legality, accuracy, confidentiality, and permissions associated with your submitted content.",
    ],
  },
  {
    title: "AI-Generated Outputs",
    body: [
      "ScopeDrop uses AI systems to generate brief analysis, discovery questions, proposal readiness scores, scope recommendations, risk indicators, payment term suggestions, and related reports. These outputs are advisory tools.",
      "AI-generated outputs may be incomplete, inaccurate, outdated, inconsistent, or unsuitable for a specific client, industry, region, budget, project, or contract. ScopeDrop does not guarantee proposal accuracy, pricing accuracy, legal sufficiency, client acceptance, project profitability, or business outcomes.",
      "You remain responsible for reviewing, editing, validating, and approving all proposals, scopes, prices, timelines, payment terms, client messages, exports, and business decisions before using them with clients.",
    ],
  },
  {
    title: "Subscriptions and Billing",
    body: [
      "ScopeDrop offers paid subscriptions through Razorpay. The Starter plan is INR 499 per month. Subscription availability, pricing, features, and plan limits may change over time, but changes will not reduce the features of an active paid period without reasonable notice.",
      "By subscribing, you authorize Razorpay to process recurring subscription payments according to the plan you select. Your plan may remain active only while payment is successful and the subscription is active. If a renewal fails, is cancelled, is completed, or is otherwise not active, ScopeDrop may downgrade your account or limit paid features.",
    ],
  },
  {
    title: "Credit System",
    body: [
      "ScopeDrop uses credits to control report generation usage. A credit is consumed only when a report is successfully generated and saved. Failed AI provider calls, invalid responses, timeout failures, network failures, report validation failures, and database save failures should not consume credits.",
      "Free accounts receive a limited monthly allowance. Starter and Pro accounts receive unlimited briefs. Credits are account-specific, non-transferable, and may expire or reset according to the applicable plan rules.",
    ],
  },
  {
    title: "Refund Policy",
    body: [
      "Payments for subscriptions and credits are generally non-refundable once the paid service, billing cycle, or credit has been made available, except where required by applicable law or where ScopeDrop determines that a billing error occurred.",
      "If you believe you were charged incorrectly, contact ScopeDrop support from the email address associated with your account and include the relevant Razorpay payment or subscription details. Approved refunds, if any, may be processed through Razorpay and may take time to appear in your payment method.",
    ],
  },
  {
    title: "Service Availability",
    body: [
      "ScopeDrop depends on third-party providers, including Google OAuth, Supabase, Razorpay, Google Gemini, and possible future Anthropic Claude failover support. Service availability may be affected by maintenance, provider outages, AI model limits, rate limits, payment gateway availability, network issues, abuse prevention, or other operational events.",
      "We aim to provide a reliable product, but ScopeDrop is provided without any guarantee of uninterrupted, error-free, or always-available service.",
    ],
  },
  {
    title: "Intellectual Property",
    body: [
      "ScopeDrop, including its product design, software, workflows, branding, interface, analysis logic, and platform materials, is owned by ScopeDrop or its licensors. These Terms do not grant you ownership of ScopeDrop intellectual property.",
      "Subject to your compliance with these Terms and your plan limits, ScopeDrop grants you a limited, revocable, non-exclusive, non-transferable right to use the service for your own freelance, consulting, agency, or internal business workflows.",
    ],
  },
  {
    title: "Third-Party Services",
    body: [
      "Your use of ScopeDrop may involve third-party services such as Google OAuth, Supabase, Razorpay, Google Gemini, and future AI failover providers. Those services may have their own terms, policies, and availability constraints. ScopeDrop is not responsible for third-party services except to the extent required by applicable law.",
    ],
  },
  {
    title: "Termination",
    body: [
      "You may stop using ScopeDrop at any time. ScopeDrop may suspend or terminate access if you violate these Terms, create security or abuse risk, fail to pay subscription fees, misuse credits, infringe rights, or use the service in a way that may harm ScopeDrop, users, providers, or third parties.",
      "Termination may result in loss of access to paid features, generated reports, brief history, credits, exports, and account data, subject to applicable retention and deletion practices.",
    ],
  },
  {
    title: "Client Portals and Payments",
    body: [
      "ScopeDrop provides tools to generate scope documents and manage client portals (including file sharing and invoice tracking). ScopeDrop does not act as a payment gateway, payment processor, or escrow service for payments between freelancers and their clients.",
      "Freelancers must use their own payment methods (such as UPI or bank transfers) to collect payments directly from their clients outside of the ScopeDrop platform. ScopeDrop is not responsible for any payment disputes, chargebacks, unpaid invoices, or transaction failures between users and their clients.",
    ],
  },
  {
    title: "Limitation of Liability",
    body: [
      "To the maximum extent permitted by law, ScopeDrop will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for lost profits, lost revenue, lost business opportunities, lost data, client disputes, proposal rejection, pricing mistakes, or project outcomes arising from your use of ScopeDrop.",
      "To the maximum extent permitted by law, ScopeDrop's total liability for any claim related to the service is limited to the amount you paid to ScopeDrop for the service in the three months before the event giving rise to the claim.",
    ],
  },
  {
    title: "Changes to Terms",
    body: [
      "ScopeDrop may update these Terms as the product, pricing, providers, and legal requirements evolve. If changes are material, ScopeDrop will take reasonable steps to notify users through the product, by email, or by updating the Last Updated date on this page.",
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      label="Terms"
      title="Terms of Service"
      intro="These terms explain how ScopeDrop may be used, how subscriptions and credits work, and what responsibility users keep when using AI-generated project outputs."
      lastUpdated={lastUpdated}
      sections={sections}
    />
  );
}
