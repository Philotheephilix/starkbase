import { motion } from "framer-motion";
import { Layers, PenTool, Code2, Rocket } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const steps = [
  {
    step: 1,
    icon: Layers,
    title: "Create a platform",
    description: "Get your platformId and API key in one click. No wallet needed to start.",
  },
  {
    step: 2,
    icon: PenTool,
    title: "Define your schemas",
    description: "Model your data with typed fields and validation rules at the protocol level.",
  },
  {
    step: 3,
    icon: Code2,
    title: "Integrate the SDK",
    description: "Drop in the React SDK — hooks for auth, storage, events, tokens, and more.",
  },
  {
    step: 4,
    icon: Rocket,
    title: "Ship to production",
    description: "Your app is live with decentralized infrastructure. No servers to manage.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="relative overflow-hidden px-4 py-24 sm:px-6 lg:px-8">
      <div className="absolute inset-0 -z-10">
        <div className="absolute right-0 top-1/4 h-[400px] w-[400px] rounded-full bg-secondary/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <p className="mb-4 text-sm font-medium uppercase tracking-widest text-primary">
            How it works
          </p>
          <h2 className="font-malinton mb-6 text-4xl font-bold text-foreground sm:text-5xl">
            From zero to decentralized
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            A simple flow that gives your app a full decentralized backend
            in minutes, not months.
          </p>
        </motion.div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative rounded-2xl border border-white/5 bg-card/50 p-6 backdrop-blur"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-lg font-semibold text-primary">
                  {item.step}
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-200/20">
                  <item.icon className="h-6 w-6 text-zinc-200" />
                </div>
              </div>
              <h3 className="font-malinton mb-2 text-lg font-semibold text-foreground">
                {item.title}
              </h3>
              <p className="text-sm text-muted-foreground">{item.description}</p>
              {i < steps.length - 1 && (
                <div className="absolute -right-4 top-1/2 hidden -translate-y-1/2 text-muted-foreground/30 lg:block">
                  →
                </div>
              )}
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 flex justify-center"
        >
          <Button size="lg" asChild>
            <Link to="/console">Go to Console</Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
