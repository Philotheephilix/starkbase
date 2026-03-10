import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

const team = [
  {
    name: "Alex Chen",
    role: "Creative Director",
    image: "/creative-director-headshot.png",
  },
  {
    name: "Sarah Miller",
    role: "Design Lead",
    image: "/professional-headshot-designer-woman.jpg",
  },
  {
    name: "Marcus Johnson",
    role: "Tech Lead",
    image: "/professional-headshot-developer-man.jpg",
  },
  {
    name: "Emma Wilson",
    role: "Strategy Director",
    image: "/professional-headshot-strategist-woman.jpg",
  },
]

const stats = [
  { value: "150+", label: "Projects Completed" },
  { value: "12", label: "Years Experience" },
  { value: "40+", label: "Team Members" },
  { value: "25", label: "Awards Won" },
]

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      <section className="pt-32 pb-16 px-4 md:px-8">
        <h1 className="font-serif text-[12vw] md:text-[8vw] leading-[0.85] uppercase tracking-tighter">
          About
          <br />
          <span className="text-primary">Us</span>
        </h1>
      </section>

      <section className="px-4 md:px-8 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          <div>
            <p className="font-serif text-2xl md:text-4xl leading-tight">
              We are a collective of designers, developers, and strategists who believe in the power of bold ideas.
            </p>
          </div>
          <div className="space-y-6">
            <p className="font-mono text-muted-foreground">
              Founded in 2012, Superdesign has grown from a small studio into a global creative agency. We work with
              ambitious brands who aren&apos;t afraid to stand out.
            </p>
            <p className="font-mono text-muted-foreground">
              Our approach combines strategic thinking with experimental design, pushing boundaries while delivering
              measurable results. We believe great design should challenge, inspire, and transform.
            </p>
          </div>
        </div>
      </section>

      <section className="px-4 md:px-8 pb-24">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="border-2 border-foreground p-6 md:p-8">
              <span className="font-serif text-4xl md:text-6xl text-primary">{stat.value}</span>
              <p className="font-mono text-xs uppercase mt-2 text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 md:px-8 pb-24">
        <h2 className="font-serif text-4xl md:text-6xl uppercase tracking-tight mb-12">The Team</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {team.map((member) => (
            <div key={member.name} className="group">
              <div className="aspect-square overflow-hidden border-2 border-foreground">
                <img
                  src={member.image || "/placeholder.svg"}
                  alt={member.name}
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                />
              </div>
              <div className="mt-4">
                <h3 className="font-serif text-xl uppercase">{member.name}</h3>
                <p className="font-mono text-xs text-primary uppercase">{member.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 md:px-8 pb-24">
        <div className="bg-foreground text-background p-8 md:p-16">
          <h2 className="font-serif text-4xl md:text-6xl uppercase tracking-tight">Our Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            {[
              {
                title: "Bold",
                description: "We take risks and push boundaries. Safe design is forgettable design.",
              },
              {
                title: "Honest",
                description: "We tell it like it is. Transparency builds trust and better work.",
              },
              {
                title: "Relentless",
                description: "We don't stop until it's right. Good enough is never good enough.",
              },
            ].map((value) => (
              <div key={value.title}>
                <h3 className="font-serif text-2xl text-primary uppercase">{value.title}</h3>
                <p className="font-mono text-sm mt-4 opacity-70">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
