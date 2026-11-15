import "./globals.css";
import { AuthProvider } from "@/providers/AuthProvider";

export const metadata = {
  icons: {
    icon: "/icon.png",
  },
  // Internal app: keep it out of search results.
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
