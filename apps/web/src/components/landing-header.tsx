import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export function LandingHeader() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-xl"
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary font-malinton text-sm font-black text-black">
            SB
          </div>
          <span className="font-malinton text-2xl font-bold tracking-tight text-white group-hover:text-primary transition-colors">
            Starkbase
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <a href="#features" className="text-sm font-bold uppercase tracking-widest text-white/50 transition-colors hover:text-white">
            Features
          </a>
          <a href="#how" className="text-sm font-bold uppercase tracking-widest text-white/50 transition-colors hover:text-white">
            How it works
          </a>
          <a href="#why" className="text-sm font-bold uppercase tracking-widest text-white/50 transition-colors hover:text-white">
            Why Starkbase
          </a>
          <a href="#pricing" className="text-sm font-bold uppercase tracking-widest text-white/50 transition-colors hover:text-white">
            Pricing
          </a>
          <Button size="sm" asChild className="bg-white text-black hover:bg-white/90 font-bold">
            <Link to="/console">Go to Console</Link>
          </Button>
        </div>

        <div className="md:hidden flex items-center gap-2">
          <Button size="sm" asChild className="bg-white text-black hover:bg-white/90 font-bold text-xs h-8 px-3">
            <Link to="/console">Console</Link>
          </Button>
        </div>
      </nav>
    </motion.header>
  );
}
