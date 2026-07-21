import type { Metadata } from "next";

/** SpareX-internal admin area — never indexed, never linked from the product. */
export const metadata: Metadata = {
  title: "SpareX Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
