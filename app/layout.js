import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import "leaflet/dist/leaflet.css";

export const metadata = {
  title: "CrowdSafe - Group Safety Tracker",
  description: "Real-time proximity safety for large crowds",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased selection:bg-blue-500/30`}
      >
        {children}
        <Script id="botsonic-widget" strategy="afterInteractive">
          {`
            (function (w, d, s, o, f, js, fjs) {
              w["botsonic_widget"] = o;
              w[o] =
                w[o] ||
                function () {
                  (w[o].q = w[o].q || []).push(arguments);
                };
              (js = d.createElement(s)), (fjs = d.getElementsByTagName(s)[0]);
              js.id = o;
              js.src = f;
              js.async = 1;
              fjs.parentNode.insertBefore(js, fjs);
            })(window, document, "script", "Botsonic", "https://widget.botsonic.com/CDN/botsonic.min.js");
            Botsonic("init", {
              serviceBaseUrl: "https://api-bot.writesonic.com",
              token: "0ee50a95-5d03-4ece-bd73-1f9935764f87",
            });
          `}
        </Script>
      </body>
    </html>
  );
}
