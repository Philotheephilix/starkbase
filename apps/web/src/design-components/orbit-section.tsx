import { motion } from "framer-motion"

const orbitItems = [
  "EigenDA",
  "Tokens",
  "ERC-20",
  "ERC-721",
  "BLOB",
  "Documents",
  "Schemas",
  "Events",
]

export function OrbitSection() {
  const count = orbitItems.length

  return (
    <section className="bg-[#FF4D00] min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Center — Starkbase */}
      <div className="absolute z-10">
        <div className="w-36 h-36 rounded-full bg-black flex items-center justify-center shadow-[0_0_60px_rgba(0,0,0,0.4)]">
          <span className="font-serif text-xl font-black uppercase tracking-tighter text-[#FF4D00]">
            Starkbase
          </span>
        </div>
      </div>

      {/* Orbit track */}
      <div className="absolute w-[500px] h-[500px] rounded-full border border-black/15" />

      {/* Rotating container */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        className="absolute w-0 h-0"
      >
        {orbitItems.map((label, i) => {
          const angle = (i / count) * 360

          return (
            <div
              key={label}
              className="absolute"
              style={{
                transform: `rotate(${angle}deg) translateX(250px)`,
                transformOrigin: "0 0",
              }}
            >
              {/* Counter-rotate so text stays upright */}
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                style={{ transform: `rotate(-${angle}deg)` }}
              >
                <div className="px-7 py-3.5 bg-black rounded-full font-mono text-sm uppercase text-white whitespace-nowrap shadow-lg -translate-x-1/2 -translate-y-1/2">
                  {label}
                </div>
              </motion.div>
            </div>
          )
        })}
      </motion.div>
    </section>
  )
}
