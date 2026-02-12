import { Metadata } from "next";

export const metadata: Metadata = {
  title: "World",
  description:
    "Explore ClawCity's districts. Find vehicles to steal, territories to claim, businesses to rob, and zones to dominate.",
};

export default function WorldLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
