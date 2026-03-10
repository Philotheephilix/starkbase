import { Link } from "react-router-dom"
import { Check } from "lucide-react"

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Get started with the basics",
    features: [
      "10,000 requests / month",
      "1 platform",
      "Community support",
      "Gas sponsorship included",
      "Blob storage (10 MB)",
      "Basic auth & tokens",
    ],
    cta: "Start Free",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$20",
    period: "/ month",
    description: "For growing apps and teams",
    features: [
      "500,000 requests / month",
      "5 platforms",
      "Priority support",
      "Gas sponsorship included",
      "Blob storage (10 GB)",
      "Schemas, events & NFTs",
      "On-chain verification",
      "Custom token deployment",
    ],
    cta: "Go Pro",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "$100",
    period: "/ month",
    description: "For production workloads at scale",
    features: [
      "Unlimited requests",
      "Unlimited platforms",
      "Dedicated support",
      "Gas sponsorship included",
      "Blob storage (100 GB)",
      "All Pro features",
      "Custom SLAs",
      "SSO & team management",
      "Dedicated infrastructure",
    ],
    cta: "Contact Us",
    highlight: false,
  },
]

export function PricingSection() {
  return (
    <section className="bg-black min-h-screen flex items-center py-20">
      <div className="max-w-5xl mx-auto px-6 w-full">
        <div className="text-center mb-14">
          <h2 className="font-serif text-4xl md:text-5xl font-black uppercase text-white mb-4">
            Simple <span className="text-[#FF4D00]">Pricing</span>
          </h2>
          <p className="font-mono text-sm text-white/50 max-w-md mx-auto">
            All plans include gas sponsorship. No hidden fees, no surprise bills.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl p-6 flex flex-col ${
                plan.highlight
                  ? "bg-[#FF4D00] text-black border-2 border-[#FF4D00] scale-[1.03]"
                  : "bg-white/5 text-white border border-white/10"
              }`}
            >
              <div className="mb-6">
                <div className={`font-mono text-xs uppercase tracking-wider mb-2 ${plan.highlight ? "text-black/60" : "text-white/40"}`}>
                  {plan.name}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-serif text-4xl font-black">{plan.price}</span>
                  <span className={`font-mono text-sm ${plan.highlight ? "text-black/60" : "text-white/40"}`}>
                    {plan.period}
                  </span>
                </div>
                <p className={`font-mono text-xs mt-2 ${plan.highlight ? "text-black/70" : "text-white/50"}`}>
                  {plan.description}
                </p>
              </div>

              <ul className="flex-1 space-y-2.5 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 font-mono text-xs">
                    <Check className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${plan.highlight ? "text-black" : "text-[#FF4D00]"}`} />
                    {feature}
                  </li>
                ))}
              </ul>

              {plan.name === "Free" ? (
                <Link
                  to="/login"
                  className="block text-center py-3 rounded-full font-mono text-sm uppercase font-bold transition-transform hover:scale-105 bg-white/10 text-white hover:bg-white/20"
                >
                  {plan.cta}
                </Link>
              ) : (
                <div className="text-center py-3 rounded-full font-mono text-xs uppercase text-white/30">
                  Coming soon
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="text-center font-mono text-xs text-white/30 mt-8">
          All plans include Starknet gas sponsorship — your users never pay gas fees.
        </p>
      </div>
    </section>
  )
}
