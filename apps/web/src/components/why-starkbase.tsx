import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
  type MotionValue,
} from "framer-motion";
import { useRef, useEffect } from "react";
import {
  Shield,
  Database,
  Coins,
  Unlock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import ShinyText from "@/components/ui/shiny-text";

const differentiators = [
  {
    icon: Database,
    title: "You own your data",
    description:
      "Documents, schemas, and user data live on Starknet — not on our servers. Developers and users own their data. Firebase keeps everything on Google's infrastructure.",
    starkbase: "Your data, on-chain",
    others: "Google-owned data",
  },
  {
    icon: Coins,
    title: "Native tokens & NFTs",
    description:
      "Create fungible tokens and NFTs with a few API calls. Token economics and digital assets are built into every app. No other BaaS platform offers this natively.",
    starkbase: "Built-in token support",
    others: "No token support",
  },
  {
    icon: Shield,
    title: "Cryptographic verification",
    description:
      "Every document and transaction is verifiable on-chain. No central authority can fake or delete your records. Firebase relies on trust in Google's database.",
    starkbase: "Cryptographic proof",
    others: "Trust the platform",
  },
  {
    icon: Unlock,
    title: "Zero vendor lock-in",
    description:
      "Your apps aren't tied to a single company. If Starkbase disappears, your data lives on Starknet. With Firebase, you're locked to Google's ecosystem.",
    starkbase: "Portable, forever",
    others: "Locked to platform",
  },
];

const cardLayout = [
  { top: "8%", left: "-5%", right: undefined, width: "min(440px,85vw)", rotate: -3, z: 1, depth: 1.2 },
  { top: "12%", left: "auto", right: "-10%", width: "min(420px,80vw)", rotate: 2, z: 2, depth: 0.8 },
  { top: "58%", left: "-10%", right: undefined, width: "min(440px,82vw)", rotate: 1.5, z: 3, depth: 1.4 },
  { top: "62%", left: "auto", right: "-8%", width: "min(400px,78vw)", rotate: -2.5, z: 0, depth: 1 },
];

function MobileCard({ item }: { item: (typeof differentiators)[0] }) {
  return (
    <div className="relative flex flex-col gap-4 rounded-2xl border border-white/10 bg-card/80 p-5 backdrop-blur-xl shadow-xl">
      <div className="absolute top-5 right-5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
        <item.icon className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0 pr-12">
        <h3 className="font-malinton mb-1.5 text-lg font-semibold text-foreground">
          {item.title}
        </h3>
        <p className="mb-4 text-sm text-muted-foreground">{item.description}</p>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs text-primary">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Starkbase: {item.starkbase}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">
            <XCircle className="h-3.5 w-3.5" />
            Firebase: {item.others}
          </span>
        </div>
      </div>
    </div>
  );
}

function ParallaxCard({
  item,
  index,
  mouseX,
  mouseY,
  scrollYProgress,
  layout,
}: {
  item: (typeof differentiators)[0];
  index: number;
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
  scrollYProgress: MotionValue<number>;
  layout: (typeof cardLayout)[0];
}) {
  const springX = useSpring(
    useTransform(mouseX, [-1, 1], [layout.depth * 28, -layout.depth * 28])
  );
  const springY = useSpring(
    useTransform(mouseY, [-1, 1], [layout.depth * 18, -layout.depth * 18])
  );

  const scrollY = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [
    layout.depth * 80,
    layout.depth * 15,
    -layout.depth * 15,
    -layout.depth * 80,
  ]);
  const scrollX = useTransform(scrollYProgress, [0, 0.5, 1], [
    layout.depth * 40,
    0,
    -layout.depth * 40,
  ]);

  const x = useTransform([springX, scrollX], ([mx, sx]: number[]) => (mx ?? 0) + (sx ?? 0));
  const y = useTransform([springY, scrollY], ([my, sy]: number[]) => (my ?? 0) + (sy ?? 0));

  return (
    <motion.div
      style={{
        position: "absolute",
        top: layout.top,
        left: layout.left,
        right: layout.right,
        width: layout.width,
        zIndex: layout.z,
        x,
        y,
        rotate: layout.rotate,
      }}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ delay: index * 0.08, duration: 0.5 }}
      className="relative flex flex-col gap-4 rounded-2xl border border-white/10 bg-card/80 p-6 backdrop-blur-xl shadow-xl"
    >
      <div className="absolute top-6 right-6 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 sm:h-12 sm:w-12">
        <item.icon className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
      </div>
      <div className="flex-1 min-w-0 pr-14 sm:pr-16">
        <h3 className="font-malinton mb-1.5 text-lg font-semibold text-foreground sm:text-xl">
          {item.title}
        </h3>
        <p className="mb-4 text-sm text-muted-foreground sm:text-base">{item.description}</p>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs text-primary sm:text-sm">
            <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Starkbase: {item.starkbase}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground sm:text-sm">
            <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Firebase: {item.others}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export function WhyStarkbase() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  useEffect(() => {
    const el = cardsRef.current;
    if (!el) return;

    const handleMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const x = (e.clientX - centerX) / (rect.width / 2);
      const y = (e.clientY - centerY) / (rect.height / 2);
      mouseX.set(Math.max(-1, Math.min(1, x)));
      mouseY.set(Math.max(-1, Math.min(1, y)));
    };

    const handleLeave = () => {
      mouseX.set(0);
      mouseY.set(0);
    };

    el.addEventListener("mousemove", handleMove);
    el.addEventListener("mouseleave", handleLeave);
    return () => {
      el.removeEventListener("mousemove", handleMove);
      el.removeEventListener("mouseleave", handleLeave);
    };
  }, [mouseX, mouseY]);

  return (
    <section
      id="why"
      ref={sectionRef}
      className="relative overflow-hidden px-4 py-24 sm:px-6 lg:px-8"
    >
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/10 to-transparent" />
      </div>

      {/* Mobile */}
      <div className="md:hidden w-full max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10 text-center px-2"
        >
          <p className="mb-4 text-sm font-medium uppercase tracking-widest text-primary">
            Why Starkbase
          </p>
          <h2 className="font-malinton mb-6 text-3xl font-bold text-foreground">
            Not another BaaS.
            <br />
            <ShinyText
              text="A new paradigm."
              color="#FF52A2"
              shineColor="#ffffff"
              speed={2.5}
              spread={150}
            />
          </h2>
          <p className="mx-auto max-w-2xl text-base text-muted-foreground">
            Firebase, Supabase, and Appwrite are great — but they own your data. Starkbase is
            built on Starknet so you own your backend, your users&apos; data, and your infrastructure.
          </p>
        </motion.div>
        <div className="flex flex-col gap-6">
          {differentiators.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <MobileCard item={item} />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Desktop */}
      <div
        ref={cardsRef}
        className="hidden md:flex relative min-h-[800px] w-full max-w-7xl mx-auto items-center justify-center"
        style={{ perspective: "1200px" }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative z-10 mx-auto max-w-3xl text-center px-4"
        >
          <p className="mb-4 text-sm font-medium uppercase tracking-widest text-primary">
            Why Starkbase
          </p>
          <h2 className="font-malinton mb-6 text-4xl font-bold text-foreground sm:text-5xl">
            Not another BaaS.
            <br />
            <ShinyText
              text="A new paradigm."
              color="#FF52A2"
              shineColor="#ffffff"
              speed={2.5}
              spread={150}
            />
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Firebase, Supabase, and Appwrite are great — but they own your data. Starkbase is
            built on Starknet so you own your backend, your users' data, and your infrastructure.
          </p>
        </motion.div>

        {differentiators.map((item, i) => (
          <ParallaxCard
            key={item.title}
            item={item}
            index={i}
            mouseX={mouseX}
            mouseY={mouseY}
            scrollYProgress={scrollYProgress}
            layout={cardLayout[i]}
          />
        ))}
      </div>
    </section>
  );
}
