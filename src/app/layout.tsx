import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DSV Global Logistics",
  description: "Global logistics and courier services",
  icons: {
        icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
        {children}
          <Toaster />
        </AuthProvider>

        
        <script type="text/javascript" id="hs-script-loader" async defer src="//js-eu1.hs-scripts.com/146872740.js"></script>
  
      </body>
    </html>
  );
}
