import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SpareX Support Console",
  robots: { index: false, follow: false },
};

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
