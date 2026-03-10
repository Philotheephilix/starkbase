import { Menu, Github } from "lucide-react"
import { Link, useLocation } from "react-router-dom"

const navItems = [
  { label: "Console", href: "/login" },
  { label: "Docs", href: "/docs" },
]

const socialLinks = [
  { icon: Github, href: "https://github.com/starkbase", label: "GitHub" },
  {
    icon: () => (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    href: "https://twitter.com/starkbase",
    label: "X / Twitter",
  },
]

export function Navbar() {
  const { pathname } = useLocation()

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-around px-8 py-6 md:px-16 lg:px-20">
      <Link to="/" className="flex items-center">
        <span className="font-serif text-2xl md:text-3xl font-bold uppercase tracking-tighter text-black">
          Starkbase
        </span>
      </Link>

      <div className="hidden md:flex items-center gap-4 bg-black/90 px-2 py-2 rounded-full backdrop-blur-sm border-none">
        {navItems.map((item) => (
          <Link
            key={item.label}
            to={item.href}
            className={`px-2 py-1 rounded-full font-mono text-lg transition-colors uppercase ${
              pathname === item.href
                ? "bg-white text-black"
                : "bg-transparent text-white hover:bg-white hover:text-black"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <button className="md:hidden p-2.5 bg-black text-white rounded-full">
          <Menu size={22} />
        </button>
        <div className="hidden md:flex gap-3">
          {socialLinks.map(({ icon: Icon, href, label }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer"
              aria-label={label}
              className="p-2.5 bg-black text-white rounded-full hover:bg-white hover:text-black transition-colors border border-black"
            >
              <Icon size={18} />
            </a>
          ))}
        </div>
      </div>
    </nav>
  )
}
