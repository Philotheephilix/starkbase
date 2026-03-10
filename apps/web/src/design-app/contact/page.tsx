"use client"

import type React from "react"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { useState } from "react"
import { ArrowRight, Mail, MapPin, Phone } from "lucide-react"

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    budget: "",
    message: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission
    console.log(formData)
  }

  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      <section className="pt-32 pb-16 px-4 md:px-8">
        <h1 className="font-serif text-[12vw] md:text-[8vw] leading-[0.85] uppercase tracking-tighter">
          Let&apos;s
          <br />
          <span className="text-primary">Talk</span>
        </h1>
        <p className="font-mono text-muted-foreground mt-8 max-w-xl">
          Have a project in mind? We&apos;d love to hear about it. Fill out the form below and we&apos;ll get back to
          you within 24 hours.
        </p>
      </section>

      <section className="px-4 md:px-8 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="font-mono text-xs uppercase mb-2 block">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-transparent border-b-2 border-foreground py-3 font-mono focus:outline-none focus:border-primary transition-colors"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="font-mono text-xs uppercase mb-2 block">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-transparent border-b-2 border-foreground py-3 font-mono focus:outline-none focus:border-primary transition-colors"
                  placeholder="john@company.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="font-mono text-xs uppercase mb-2 block">Company</label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full bg-transparent border-b-2 border-foreground py-3 font-mono focus:outline-none focus:border-primary transition-colors"
                  placeholder="Company Inc."
                />
              </div>
              <div>
                <label className="font-mono text-xs uppercase mb-2 block">Budget Range</label>
                <select
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  className="w-full bg-transparent border-b-2 border-foreground py-3 font-mono focus:outline-none focus:border-primary transition-colors cursor-pointer"
                >
                  <option value="">Select budget</option>
                  <option value="10k-25k">$10k - $25k</option>
                  <option value="25k-50k">$25k - $50k</option>
                  <option value="50k-100k">$50k - $100k</option>
                  <option value="100k+">$100k+</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-mono text-xs uppercase mb-2 block">Tell us about your project *</label>
              <textarea
                required
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={5}
                className="w-full bg-transparent border-2 border-foreground p-4 font-mono focus:outline-none focus:border-primary transition-colors resize-none"
                placeholder="Describe your project, goals, and timeline..."
              />
            </div>

            <button
              type="submit"
              className="group flex items-center gap-4 bg-foreground text-background px-8 py-4 font-mono uppercase hover:bg-primary hover:text-black transition-colors"
            >
              Send Message
              <ArrowRight className="group-hover:translate-x-2 transition-transform" size={20} />
            </button>
          </form>

          <div className="space-y-12">
            <div>
              <h3 className="font-serif text-2xl uppercase mb-6">Contact Info</h3>
              <div className="space-y-4">
                <a
                  href="mailto:hello@superdesign.co"
                  className="flex items-center gap-4 font-mono hover:text-primary transition-colors"
                >
                  <Mail size={20} />
                  hello@superdesign.co
                </a>
                <a
                  href="tel:+1234567890"
                  className="flex items-center gap-4 font-mono hover:text-primary transition-colors"
                >
                  <Phone size={20} />
                  +1 (234) 567-890
                </a>
                <div className="flex items-center gap-4 font-mono">
                  <MapPin size={20} />
                  New York, NY
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-serif text-2xl uppercase mb-6">Office</h3>
              <p className="font-mono text-muted-foreground">
                123 Design Street
                <br />
                Suite 456
                <br />
                New York, NY 10001
              </p>
            </div>

            <div className="border-2 border-foreground p-8 bg-foreground text-background">
              <h3 className="font-serif text-2xl uppercase mb-4">Quick Response</h3>
              <p className="font-mono text-sm opacity-70">
                We typically respond within 24 hours. For urgent inquiries, feel free to call us directly.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
