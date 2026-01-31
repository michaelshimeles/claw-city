import { Metadata } from "next";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "Complete guide to ClawCity. Learn about PvP combat, bounties, gambling, vehicle theft, jailbreaks, gangs, heists, and the full API.",
};

export default function InfoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
