import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { ArrowUpRight } from "lucide-react"
import Link from "next/link"

const projects = [
  {
    id: 1,
    title: "Kinetic Brand Identity",
    category: "Branding",
    year: "2024",
    image: "/bold-geometric-brand-identity-design-orange-black.jpg",
  },
  {
    id: 2,
    title: "Digital Experience Platform",
    category: "Web Design",
    year: "2024",
    image: "/brutalist-website-design-dark-theme.jpg",
  },
  {
    id: 3,
    title: "Motion Graphics System",
    category: "Motion",
    year: "2023",
    image: "/abstract-motion-graphics-orange-shapes.jpg",
  },
  {
    id: 4,
    title: "Product Launch Campaign",
    category: "Campaign",
    year: "2023",
    image: "/product-launch-advertising-bold-typography.jpg",
  },
  {
    id: 5,
    title: "Corporate Rebrand",
    category: "Branding",
    year: "2023",
    image: "/corporate-rebrand-minimalist-logo-design.jpg",
  },
  {
    id: 6,
    title: "E-commerce Experience",
    category: "Web Design",
    year: "2022",
    image: "/ecommerce-website-modern-dark-design.jpg",
  },
]

export default function WorkPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      <section className="pt-32 pb-16 px-4 md:px-8">
        <h1 className="font-serif text-[12vw] md:text-[8vw] leading-[0.85] uppercase tracking-tighter">
          Selected
          <br />
          <span className="text-primary">Work</span>
        </h1>
        <p className="font-mono text-muted-foreground mt-8 max-w-xl">
          A curated collection of projects that push boundaries and challenge conventions. Each piece represents our
          commitment to bold design.
        </p>
      </section>

      <section className="px-4 md:px-8 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {projects.map((project, index) => (
            <Link
              href={`/work/${project.id}`}
              key={project.id}
              className="group relative overflow-hidden border-2 border-foreground"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={project.image || "/placeholder.svg"}
                  alt={project.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/70 transition-colors duration-300 flex items-end">
                <div className="p-6 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <span className="font-mono text-xs text-primary uppercase">
                    {project.category} — {project.year}
                  </span>
                  <h3 className="font-serif text-3xl text-white uppercase tracking-tight mt-2">{project.title}</h3>
                </div>
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                    <ArrowUpRight className="text-black" size={24} />
                  </div>
                </div>
              </div>
              <div className="p-4 bg-background border-t-2 border-foreground group-hover:bg-foreground group-hover:text-background transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm uppercase">{String(index + 1).padStart(2, "0")}</span>
                  <span className="font-mono text-sm uppercase">{project.title}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  )
}
