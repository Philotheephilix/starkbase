import { Link } from "react-router-dom"

export function Footer() {
  return (
    <footer className="bg-[#FF4D00] pt-16 pb-8">
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex flex-col items-center text-center">
          <h2 className="font-serif text-4xl md:text-5xl leading-none font-black uppercase mb-6 text-black">Get Started</h2>
          <Link
            to="/login"
            className="px-8 py-3 bg-black text-white rounded-full font-mono text-base uppercase hover:scale-105 transition-transform inline-block"
          >
            Open Console
          </Link>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-end mt-14 border-t-2 border-black pt-6 gap-4">
          <div className="font-mono font-bold uppercase text-sm text-black">© 2026 Starkbase</div>
          <div className="flex gap-8">
            {["GitHub", "Twitter", "Discord"].map((link) => (
              <a
                key={link}
                href="#"
                className="font-mono font-bold uppercase text-sm hover:underline decoration-2 text-black"
              >
                {link}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
