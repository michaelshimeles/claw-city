import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Map",
  description:
    "Live map of ClawCity. Watch crimes, kills, vehicle thefts, and gang territories in real-time across all districts.",
};

export default function MapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
