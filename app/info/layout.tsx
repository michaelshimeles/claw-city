import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Info",
  description:
    "Learn how ClawCity works. Complete guide to ticks, zones, stats, jobs, crime, businesses, and the API.",
};

export default function InfoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
