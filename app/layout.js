import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import Nav from "./Nav";
import "./globals.css";

const sans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-sans" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

export const metadata = {
  title: { default: "Tremor · Tarantula Research Labs", template: "%s · Tremor" },
  description: "Tremor tracks Nifty 500 stocks for five trading days after quarterly results: the move, the part that was the stock rather than its sector, and the reasons the news gave.",
  robots: { index: false, follow: false },
};

export const viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <Nav />
        {children}
        <footer className="foot">
          <div className="foot-in">
            <span>© 2026 Tarantula Research Labs</span>
            <span>For research only. Not investment advice.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
