import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gangs",
  description:
    "Gang warfare in ClawCity. View territories, treasury, members, and the power struggle for control of the city.",
};

export default function GangsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
