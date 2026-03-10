import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { ArrowRight } from "lucide-react"

const services = [
  {
    number: "01",
    title: "Brand Strategy",
    description:
      "We craft comprehensive brand strategies that define your market position, voice, and visual identity. From startups to enterprises, we build brands that resonate.",
    deliverables: ["Brand Audit", "Positioning", "Messaging", "Guidelines"],
  },
  {
    number: "02",
    title: "Visual Identity",
    description:
      "Bold, memorable visual systems that capture attention and communicate your brand essence across every touchpoint.",
    deliverables: ["Logo Design", "Color Systems", "Typography", "Iconography"],
  },
  {
    number: "03",
    title: "Digital Design",
    description:
      "Websites and digital experiences that push boundaries while delivering exceptional user experiences and business results.",
    deliverables: ["Web Design", "UI/UX", "Prototyping", "Design Systems"],
  },
  {
    number: "04",
    title: "Motion & 3D",
    description:
      "Dynamic motion graphics and 3D visuals that bring your brand to life and create unforgettable experiences.",
    deliverables: ["Animation", "3D Modeling", "Video Production", "AR/VR"],
  },
  {
    number: "05",
    title: "Development",
    description:
      "Custom web development that transforms designs into performant, accessible, and scalable digital products.",
    deliverables: ["Frontend", "Backend", "CMS", "E-commerce"],
  },
]

export default function ServicesPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      <section className="pt-32 pb-16 px-4 md:px-8">
        <h1 className="font-serif text-[12vw] md:text-[8vw] leading-[0.85] uppercase tracking-tighter">
          Our
          <br />
          <span className="text-primary">Services</span>
        </h1>
        <p className="font-mono text-muted-foreground mt-8 max-w-xl">
          Full-spectrum creative services designed to elevate your brand and drive meaningful results. We don&apos;t
          just design—we transform.
        </p>
      </section>

      <section className="px-4 md:px-8 pb-24">
        <div className="border-t-2 border-foreground">
          {services.map((service) => (
            <div
              key={service.number}
              className="group border-b-2 border-foreground py-12 hover:bg-foreground hover:text-background transition-colors cursor-pointer"
            >
              <div className="flex flex-col md:flex-row md:items-start gap-8">
                <span className="font-mono text-primary text-sm group-hover:text-primary">{service.number}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h2 className="font-serif text-4xl md:text-6xl uppercase tracking-tight">{service.title}</h2>
                    <ArrowRight
                      className="hidden md:block transform group-hover:translate-x-2 transition-transform"
                      size={32}
                    />
                  </div>
                  <p className="font-mono text-sm mt-6 max-w-2xl opacity-70">{service.description}</p>
                  <div className="flex flex-wrap gap-2 mt-6">
                    {service.deliverables.map((item) => (
                      <span
                        key={item}
                        className="font-mono text-xs px-3 py-1 border border-current rounded-full uppercase"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 md:px-8 pb-24">
        <div className="bg-primary p-8 md:p-16">
          <h2 className="font-serif text-4xl md:text-6xl uppercase tracking-tight text-black">Ready to start?</h2>
          <p className="font-mono text-black/70 mt-4 max-w-xl">
            Let&apos;s discuss your project and see how we can help bring your vision to life.
          </p>
          <a
            href="/contact"
            className="inline-block mt-8 px-8 py-4 bg-black text-white font-mono uppercase hover:bg-white hover:text-black transition-colors border-2 border-black"
          >
            Get in Touch
          </a>
        </div>
      </section>

      <Footer />
    </main>
  )
}
