import "./globals.css";
import { LangProvider } from "./components/Lang";
export const metadata = {
  title: "رادار أمان | Radar Aman",
  description: "افحص إعلانات ورسائل ومواقع الاحتيال قبل أن تدفع | Check scam ads, messages and websites before you pay"
};
export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0A47A8" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/icon-192.png" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans+Arabic:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&family=Readex+Pro:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body><LangProvider>{children}</LangProvider></body>
    </html>
  );
}
