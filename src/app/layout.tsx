import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "ADG Property Valuation Report Generator",
  description: "Internal tool for the Adam Druck Group at Coldwell Banker Realty.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          background: "#faf8f4",
          color: "#1a1a1a",
        }}
      >
        {children}
      </body>
    </html>
  );
}
