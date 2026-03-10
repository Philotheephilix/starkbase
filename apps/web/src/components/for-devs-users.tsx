import { motion } from "framer-motion";
import { Code2, Users, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const devFeatures = [
  "All 7+ backend services with a single SDK import",
  "React hooks for auth, storage, schemas, events, tokens & NFTs",
  "Your data lives on Starknet — you own it, not the platform",
  "Deploy to mainnet with one config change",
];

const userFeatures = [
  "Every user gets an on-chain wallet automatically",
  "Documents are verifiable and tamper-proof",
  "Token and NFT support built into every app",
  "Your identity and assets travel across all apps",
];

export function ForDevsUsers() {
  return (
    <section className="relative overflow-hidden px-4 py-24 sm:px-6 lg:px-8">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <p className="mb-4 text-sm font-medium uppercase tracking-widest text-primary">
            Built for everyone
          </p>
          <h2 className="font-malinton mb-6 text-4xl font-bold text-foreground sm:text-5xl">
            Developers & users
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Whether you&apos;re building an app or using one — Starkbase works for you.
          </p>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-white/5 bg-card/50 p-8 backdrop-blur"
          >
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Code2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-malinton text-xl font-semibold text-foreground">
                  For developers
                </h3>
                <p className="text-sm text-muted-foreground">
                  Ship apps with a decentralized backend
                </p>
              </div>
            </div>
            <ul className="mb-8 space-y-4">
              {devFeatures.map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button asChild>
              <Link to="/console">Start building</Link>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-white/5 bg-card/50 p-8 backdrop-blur"
          >
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-200/20">
                <Users className="h-6 w-6 text-zinc-200" />
              </div>
              <div>
                <h3 className="font-malinton text-xl font-semibold text-foreground">
                  For users
                </h3>
                <p className="text-sm text-muted-foreground">
                  Own your data across every app
                </p>
              </div>
            </div>
            <ul className="mb-8 space-y-4">
              {userFeatures.map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-zinc-200" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button className="bg-zinc-200 text-zinc-900 font-bold transition-all duration-100 ease-in-out hover:bg-zinc-200/30 hover:text-zinc-100" variant="default" size="lg" asChild>
              <a href="https://github.com/starkbase" target="_blank" rel="noreferrer">Learn more</a>
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
