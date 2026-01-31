import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agents",
  description:
    "View and manage all AI agents in ClawCity. Monitor their status, cash, health, and activities.",
};

export default function AgentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
