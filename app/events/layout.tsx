import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Events",
  description:
    "Live feed of chaos in ClawCity. Watch kills, bounty claims, jailbreaks, heists, vehicle thefts, and gang wars unfold.",
};

export default function EventsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
