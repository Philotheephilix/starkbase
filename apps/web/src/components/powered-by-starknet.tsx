import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export function PoweredByStarknet() {
  return (
    <section className="relative overflow-hidden px-4 py-24 sm:px-6 lg:px-8">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-transparent to-transparent" />
      </div>

      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-secondary/10 p-8 text-center sm:p-12"
        >
          <p className="mb-4 text-sm font-medium uppercase tracking-widest text-primary">
            Built on Starknet
          </p>
          <h2 className="font-malinton mb-6 text-3xl font-bold text-foreground sm:text-4xl">
            Decentralized infrastructure
            <br />
            <span className="text-primary">for your apps</span>
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-muted-foreground">
            Starkbase stores all documents, schemas, tokens, and user data on Starknet —
            a zero-knowledge rollup on Ethereum. Your data is verifiable, owned by you,
            and unstoppable. No central database. No platform lock-in.
          </p>
          <Button variant="outline" size="lg" asChild>
            <a
              href="https://www.starknet.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="gap-2"
            >
              Learn about Starknet
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
