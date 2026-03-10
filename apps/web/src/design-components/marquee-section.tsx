import { Marquee } from "./marquee"

export function MarqueeSection() {
  return (
    <section className="bg-black text-[#FF4D00] py-10 overflow-hidden -skew-y-2 origin-left">
      <Marquee text="AUTH • STORAGE • EVENTS •" direction={1} className="opacity-80" />
      <Marquee text="TOKENS • SCHEMAS • VERIFIABLE •" direction={-1} className="text-white opacity-90" />
    </section>
  )
}
