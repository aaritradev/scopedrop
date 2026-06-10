import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

const lastUpdated = "June 4, 2026";

export const metadata: Metadata = {
  title: "Privacy Policy | ScopeDrop",
  description: "Privacy Policy for ScopeDrop, an AI-powered project scoping and proposal intelligence platform.",
};

const sections = [
  {
    title: "Overview",
    body: [
      "ScopeDrop is an AI-powered project scoping and proposal intelligence platform. This Privacy Policy explains how we collect, use, store, and protect information when you use ScopeDrop, including AI brief analysis, client portals, file sharing, invoice tracking, PDF exports, user accounts, Google OAuth, Razorpay subscriptions, and credit-based usage.",
      "By using ScopeDrop, you agree that we may process information as described in this Privacy Policy.",
    ],
  },
  {
    title: "Information We Collect",
    items: [
      "Account information, such as your name, email address, profile image, account identifier, plan, credit balance, subscription status, and account activity.",
      "Google OAuth data, such as your Google account identifier, email address, display name, and profile image when you choose to sign in with Google.",
      "Project brief content that you paste or upload into ScopeDrop, including client messages, meeting notes, requirements, budgets, timelines, and related project context.",
      "Generated reports, including project briefs, discovery questions, proposal readiness analysis, risks, scope items, payment terms, PDF exports, and edited report content.",
      "Client portal data, including files uploaded by you or your clients, invoice records, payment details shared for manual collection, and portal activity logs.",
      "Usage data, such as pages visited, features used, generation attempts, credits consumed, export activity, authentication events, subscription events, and operational logs.",
      "Payment and subscription metadata, such as Razorpay order IDs, payment IDs, subscription IDs, invoice IDs, plan type, payment status, and webhook events.",
      "Device and technical data, such as IP address, browser type, device type, operating system, referring pages, cookies, session identifiers, and security logs.",
    ],
  },
  {
    title: "How We Use Information",
    items: [
      "To create and manage your ScopeDrop account.",
      "To authenticate you through Google OAuth and maintain secure sessions.",
      "To analyze project briefs and generate reports, discovery questions, proposal readiness scores, and related outputs.",
      "To provide PDF exports, brief history, credit-based usage, and subscription features.",
      "To process payments, subscriptions, renewals, failed payments, cancellations, and credit purchases through Razorpay.",
      "To monitor service reliability, prevent abuse, debug errors, improve product quality, and protect ScopeDrop and its users.",
      "To communicate account, billing, security, and product updates where appropriate.",
    ],
  },
  {
    title: "AI Processing",
    body: [
      "When you submit project brief content, ScopeDrop may send that content to AI providers to generate analysis and reports. ScopeDrop currently supports Google Gemini for AI generation and may support Anthropic Claude as a future failover provider.",
      "You should not submit sensitive personal data, financial account credentials, government identifiers, health information, trade secrets, or confidential third-party information unless you have the right to process it through ScopeDrop.",
    ],
  },
  {
    title: "Payment Information",
    body: [
      "ScopeDrop uses Razorpay to process subscriptions and payments. Payment card numbers, CVV values, UPI credentials, bank account credentials, and similar payment method details are handled by Razorpay and are not stored directly by ScopeDrop.",
      "ScopeDrop stores payment and subscription metadata needed to verify payments, apply credits, manage plan status, process renewals, handle cancellations, and reconcile billing records.",
    ],
  },
  {
    title: "Cookies and Sessions",
    body: [
      "ScopeDrop uses cookies and similar technologies to keep you signed in, protect authentication sessions, remember redirects, secure Google OAuth flows, measure usage, and support core product functionality.",
      "You can control cookies through your browser settings, but disabling cookies may prevent sign-in, billing, generation, or account features from working correctly.",
    ],
  },
  {
    title: "Third-Party Providers",
    body: [
      "ScopeDrop relies on trusted third-party providers to operate the service. These providers process information only as needed to provide their services to ScopeDrop.",
    ],
    items: [
      "Google OAuth for account sign-in and identity data.",
      "Supabase for database, server-side storage, authentication support, and application infrastructure.",
      "Razorpay for payment processing, subscriptions, payment verification, and billing events.",
      "Google Gemini for AI brief analysis and report generation.",
      "Anthropic Claude for possible future AI failover support.",
    ],
  },
  {
    title: "Data Retention",
    body: [
      "We retain account information, project briefs, generated reports, billing metadata, and usage records for as long as needed to provide ScopeDrop, maintain your account, comply with billing and legal obligations, prevent abuse, resolve disputes, and improve service reliability.",
      "If you delete generated content or request account deletion, we will delete or anonymize eligible data within a reasonable period, except where retention is required for security, fraud prevention, backup recovery, tax, accounting, legal, or dispute purposes.",
    ],
  },
  {
    title: "Data Deletion Requests",
    body: [
      "You may request deletion of your account, project briefs, generated reports, and related personal information by contacting ScopeDrop support from the email address associated with your account.",
      "We may need to verify your identity before processing a deletion request. Some billing records, security logs, and backup copies may be retained for a limited period where necessary for legitimate business, legal, tax, accounting, or security reasons.",
    ],
  },
  {
    title: "Security Practices",
    body: [
      "ScopeDrop uses practical security measures designed to protect user data, including server-side access controls, protected service-role operations, signed sessions, webhook signature verification, rate limiting, and provider-managed infrastructure security.",
      "No online service can guarantee absolute security. You are responsible for protecting access to your Google account, devices, email, and any exported reports or shared links.",
    ],
  },
  {
    title: "Your Responsibilities",
    body: [
      "You are responsible for ensuring that you have the right to submit client communications, project information, and other content to ScopeDrop. If your brief includes personal data or confidential client material, you are responsible for obtaining any required permissions before using ScopeDrop.",
    ],
  },
  {
    title: "Changes to This Policy",
    body: [
      "We may update this Privacy Policy as ScopeDrop evolves. If changes are material, we will take reasonable steps to notify users through the product, by email, or by updating the Last Updated date on this page.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      label="Privacy"
      title="Privacy Policy"
      intro="This policy explains what ScopeDrop collects, how the product uses it, and how account, brief, AI, and billing data are handled."
      lastUpdated={lastUpdated}
      sections={sections}
    />
  );
}
