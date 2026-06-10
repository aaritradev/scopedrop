import { PortalClient } from "./PortalClient";

export const metadata = {
  title: "Client Portal",
  description: "View project scope, share files, and manage payments.",
};

export default function PortalPage({ params }: { params: { slug: string } }) {
  return <PortalClient slug={params.slug} />;
}
