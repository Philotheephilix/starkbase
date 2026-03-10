import { motion, useScroll, useTransform } from "framer-motion"
import { ArrowDown, Database } from "lucide-react"

export function Hero() {
  const { scrollYProgress } = useScroll()
  const rotate = useTransform(scrollYProgress, [0, 1], [0, 360])

  return (
    <section className="relative min-h-screen bg-[#FF4D00] flex flex-col justify-center overflow-hidden pt-24 pb-16">
      <div className="w-full px-8 md:px-16 relative z-10">
        <motion.h1
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "circOut" }}
          className="font-serif text-[18vw] leading-[0.85] font-black uppercase tracking-tighter text-black text-center mix-blend-normal"
        >
          Stark
          <br />
          base
        </motion.h1>

        <div className="flex flex-col md:flex-row justify-between items-end mt-8 border-t-2 border-black pt-6 gap-6">
          <div className="font-mono text-lg md:text-xl font-bold uppercase">
            <Database className="inline mr-2 mb-1" />
            Built on Starknet
          </div>

          <div className="font-mono text-lg md:text-xl font-bold uppercase text-right">
            Decentralized BaaS <br />
            Verifiable On-Chain
          </div>
        </div>
      </div>

      {/* Scroll-down spinner — pinned at bottom center */}
      <motion.div
        style={{ rotate }}
        className="hidden md:flex items-center justify-center w-28 h-28 bg-black rounded-full absolute bottom-8 left-1/2 -translate-x-1/2 z-20"
      >
        <div className="absolute inset-0 flex items-center justify-center animate-spin-slow">
          <svg viewBox="0 0 100 100" width="100" height="100" className="w-full h-full fill-white">
            <path id="curve" d="M 50 50 m -37 0 a 37 37 0 1 1 74 0 a 37 37 0 1 1 -74 0" fill="transparent" />
            <text className="text-[12px] font-mono font-bold uppercase tracking-widest">
              <textPath href="#curve">Scroll Down • Scroll Down •</textPath>
            </text>
          </svg>
        </div>
        <ArrowDown className="text-white w-8 h-8" />
      </motion.div>

      {/* Decorative Elements */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 w-[40vw] h-[40vw] bg-black rounded-full blur-[100px] opacity-10 pointer-events-none" />
    </section>
  )
}
