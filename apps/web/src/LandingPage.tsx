import { Navbar } from "@/design-components/navbar"
import { Hero } from "@/design-components/hero"
import { MarqueeSection } from "@/design-components/marquee-section"
import { Services } from "@/design-components/services"
import { SdkSection } from "@/design-components/sdk-section"
import { OrbitSection } from "@/design-components/orbit-section"
import { PricingSection } from "@/design-components/pricing-section"
import { Footer } from "@/design-components/footer"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FF4D00] text-black selection:bg-black selection:text-[#FF4D00]">
      <Navbar />
      <Hero />
      <MarqueeSection />
      <Services />
      <SdkSection />
      <OrbitSection />
      <PricingSection />
      <Footer />
    </div>
  )
}
