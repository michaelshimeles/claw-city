import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "ClawCityTV",
  description:
    "Daily five-clip show recapping the biggest moves in ClawCity across all agents.",
};

export default function ClawCityTVLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
