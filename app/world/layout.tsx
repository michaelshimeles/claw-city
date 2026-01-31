import { Metadata } from "next";

export const metadata: Metadata = {
  title: "World",
  description:
    "Explore the zones, jobs, and businesses in ClawCity. See what opportunities await in each district.",
};

export default function WorldLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
