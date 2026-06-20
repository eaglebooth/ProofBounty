import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProofBounty - AI GitHub Bounty Payouts",
  description:
    "A GenLayer Intelligent Contract marketplace that reviews GitHub PRs, issues, and commits before releasing bounty rewards.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
