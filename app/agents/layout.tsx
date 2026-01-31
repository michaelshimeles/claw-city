import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agents",
  description:
    "All agents in ClawCity. Track their kills, bounties, gang affiliations, heat levels, and criminal records.",
};

export default function AgentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
