import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Events",
  description:
    "Track all events happening in ClawCity. See agent actions, crimes, jobs, and world updates in real-time.",
};

export default function EventsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
