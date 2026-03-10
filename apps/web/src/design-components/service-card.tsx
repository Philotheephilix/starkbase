import { ArrowUpRight } from "lucide-react"

interface ServiceCardProps {
  number: string
  title: string
  tags: string[]
}

export function ServiceCard({ number, title, tags }: ServiceCardProps) {
  return (
    <div className="group border-t border-white/20 py-6 hover:bg-white/5 transition-colors duration-500 cursor-pointer">
      <div className="max-w-5xl mx-auto px-6 flex flex-row items-center justify-between gap-6">
        <div className="font-mono text-[#FF4D00] text-base">({number})</div>
        <div className="flex-1">
          <h3 className="font-serif text-3xl md:text-4xl font-bold uppercase text-white mb-2 group-hover:translate-x-2 transition-transform duration-300">
            {title}
          </h3>
          <div className="flex gap-3 flex-wrap">
            {tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 border border-white/30 rounded-full text-white/60 font-mono text-xs uppercase"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="md:self-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform group-hover:rotate-45">
          <ArrowUpRight className="w-8 h-8 text-[#FF4D00]" />
        </div>
      </div>
    </div>
  )
}
