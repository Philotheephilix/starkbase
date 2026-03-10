import { Star } from "lucide-react"
import { ServiceCard } from "./service-card"

const services = [
  { title: "Auth", tags: ["Wallets", "Sessions", "Permissions"] },
  { title: "Storage", tags: ["Blobs", "Schemas", "Documents"] },
  { title: "Events", tags: ["On-Chain", "Webhooks", "Real-Time"] },
  { title: "Tokens", tags: ["ERC-20", "NFTs", "Minting"] },
]

export function Services() {
  return (
    <section className="bg-black min-h-screen py-12 relative flex flex-col justify-center">
      <div className="max-w-5xl mx-auto px-6 mb-10 flex items-end justify-between">
        <h2 className="font-serif text-4xl md:text-5xl leading-none text-white uppercase font-black">Services</h2>
        <Star className="w-10 h-10 text-[#FF4D00] animate-pulse hidden md:block" fill="currentColor" />
      </div>

      <div className="flex flex-col">
        {services.map((s, i) => (
          <ServiceCard key={i} number={`0${i + 1}`} title={s.title} tags={s.tags} />
        ))}
      </div>
    </section>
  )
}
