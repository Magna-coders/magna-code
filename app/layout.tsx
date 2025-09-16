import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/supabase/auth-context";

export const metadata: Metadata = {
  title: "Magna Coders - Build. Collaborate. Solve.",
  description: "A collaborative platform where developers, designers, and problem-solvers unite to showcase their skills, form teams, and create tech solutions for real-world challenges.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Magna Coders",
  },
  themeColor: "#F9E4AD",
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/icon-192x192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="icon" href="/icons/icon-192x192.png" />
        <meta name="theme-color" content="#F9E4AD" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Magna Coders" />
      </head>
      <body className="antialiased">
        <AuthProvider>
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js')
                      .then(function(registration) {
                        console.log('SW registered: ', registration);
                      })
                      .catch(function(registrationError) {
                        console.log('SW registration failed: ', registrationError);
                      });
                  });
                }
              `,
            }}
          />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
