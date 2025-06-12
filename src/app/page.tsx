import { Header } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { Services } from "@/components/landing/services";
import { GlobalNetwork } from "@/components/landing/global-network";
import { News } from "@/components/landing/news";
import { Footer } from "@/components/landing/footer";

export default function LandingPage() {
  return (
    <div className="bg-white">
      <Header />
      <main>
        <Hero />
        <Services />
        <GlobalNetwork />
        <News />
      </main>
      <Footer />
    </div>
  );
}
