"use client";

import { motion } from "framer-motion";
import {
  Users,
  MapPin,
  Camera,
  Shield,
  Navigation,
  Smartphone,
  Activity,
  Bot,
  HeartHandshake,
  Search,
  ChevronRight,
  Zap,
  Eye,
  Grid,
  AlertTriangle
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const FEATURE_CATEGORIES = [
  {
    title: "Real-Time Group Safety",
    description: "Advanced proximity tracking for individuals and family units.",
    color: "blue",
    features: [
      { name: "Family Radar", icon: Users, path: "/family", desc: "Private group sync with drift alerts.", tag: "LIVE" },
      { name: "Live Swarm", icon: MapPin, path: "/location", desc: "Global presence with A* safe routing.", tag: "NEW" },
      { name: "Proximity HUD", icon: Activity, path: "/live-crowd", desc: "Surrounding density analytics." },
    ]
  },
  {
    title: "Infrastructure & AI",
    description: "Sovereign oversight and predictive crowd management.",
    color: "purple",
    features: [
      { name: "CCTV Command", icon: Camera, path: "/cctv", desc: "AI density analysis on live feeds.", tag: "POWERFUL" },
      { name: "Sector Management", icon: Grid, path: "/sector-map", desc: "Road saturation & flow control.", tag: "ADMIN" },
      { name: "Stress Tester", icon: Bot, path: "/sim-tracker", desc: "50+ bot swarm stress simulation." },
    ]
  },
  {
    title: "Community & Recovery",
    description: "Closing the gap between pilgrims and vital services.",
    color: "orange",
    features: [
      { name: "Safety Feed", icon: Search, path: "/lost/feed", desc: "Real-time lost & found ecosystem." },
      { name: "Volunteer Portal", icon: HeartHandshake, path: "/volunteer", desc: "AI-verified incident reporting.", tag: "STAFF" },
      { name: "Business Map", icon: Smartphone, path: "/business-map", desc: "Vendor road-routing & pricing." },
    ]
  }
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30 overflow-x-hidden">
      {/* Background Mesh Gradients */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-orange-600/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full"></div>
        <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full"></div>
      </div>

      {/* Navbar */}
      <nav className="relative z-50 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg shadow-orange-500/20">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-black tracking-tighter uppercase italic">Kumbh Sahayak</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          {["Features", "Technology", "Demo", "Safety"].map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`} className="text-sm font-bold text-zinc-400 hover:text-white transition-colors uppercase tracking-widest">{item}</a>
          ))}
          <Link href="/location" className="px-6 py-2.5 bg-white text-black rounded-full font-black text-xs uppercase tracking-widest hover:bg-zinc-200 transition-all">
            Launch Live Map
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-16 pb-24 px-8 max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-black uppercase tracking-[0.2em] mb-8">
            <Zap className="w-3 h-3 fill-current" /> Next-Gen Safety Tech
          </div>
          <h1 className="text-6xl md:text-8xl font-black leading-[0.9] tracking-tighter mb-8 bg-gradient-to-r from-white via-white to-zinc-500 bg-clip-text text-transparent italic">
            AI-Powered Safety for <span className="text-orange-500 italic">Kumbh Mela</span>
          </h1>
          <p className="text-lg text-zinc-400 font-medium leading-relaxed max-w-xl mb-12">
            Experience the safest Kumbh Mela ever. Smart routing. AI CCTV synthesis. Private group sync. We unite tradition with state-of-the-art technology to protect millions.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/location" className="px-10 py-5 bg-orange-600 hover:bg-orange-700 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl shadow-orange-600/40 transition-all active:scale-95 flex items-center gap-3">
              <Navigation className="w-5 h-5" /> Explore Live Map
            </Link>
            <Link href="/lost/feed" className="px-10 py-5 bg-white/5 border border-white/10 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5" /> Report Incident
            </Link>
          </div>

          <div className="mt-16 grid grid-cols-3 gap-8">
            {[
              { label: "Pilgrims expected", value: "2M+" },
              { label: "AI Cam Coverage", value: "24/7" },
              { label: "Safety Precision", value: "16m" }
            ].map((stat, i) => (
              <div key={i}>
                <div className="text-3xl font-black text-white">{stat.value}</div>
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9, rotateY: 10 }}
          animate={{ opacity: 1, scale: 1, rotateY: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="relative"
        >
          <div className="absolute -inset-4 bg-orange-600/20 blur-3xl rounded-[3rem]"></div>
          <div className="relative rounded-[3rem] overflow-hidden border border-white/10 shadow-3xl aspect-[4/3] group">
            <Image
              src="/kumbh-hero.jpg"
              alt="Kumbh Mela Nashik"
              fill
              className="object-cover transition-transform duration-1000 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
            <div className="absolute bottom-10 left-10">
              <div className="bg-black/60 backdrop-blur-xl p-6 rounded-3xl border border-white/10 max-w-[280px]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Ghat Entrance Cam C</span>
                </div>
                <p className="text-sm font-bold text-white mb-4 italic">Crowd density within safety parameters.</p>
                <Link href="/cctv" className="text-[10px] font-black uppercase tracking-widest text-orange-500 flex items-center gap-1 group/link">
                  View Full Analytics <ChevronRight className="w-3 h-3 transition-transform group-hover/link:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Main Features Grid */}
      <section id="features" className="relative z-10 py-32 px-8 max-w-7xl mx-auto">
        <div className="text-center mb-24">
          <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter mb-6">Explore Our Command Center</h2>
          <p className="text-zinc-500 max-w-2xl mx-auto font-medium">Modular technology built to handle massive scale. Hover over each sector to explore the tools optimized for the 2027 Nashik Mela.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {FEATURE_CATEGORIES.map((cat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-4 py-4 border-b border-white/10 mb-4">
                <div className={`w-3 h-3 rounded-full ${cat.color === 'blue' ? 'bg-blue-600' : cat.color === 'purple' ? 'bg-purple-600' : 'bg-orange-600'}`}></div>
                <h3 className="text-xl font-black uppercase tracking-tighter italic">{cat.title}</h3>
              </div>

              <div className="grid gap-4">
                {cat.features.map((feature, fIdx) => (
                  <Link key={fIdx} href={feature.path}>
                    <div className="group relative bg-[#0a0a0a] border border-white/5 rounded-3xl p-6 hover:border-white/20 hover:bg-neutral-900 transition-all duration-300">
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-zinc-800 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <feature.icon className="w-6 h-6" />
                        </div>
                        {feature.tag && (
                          <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 bg-white/5 text-zinc-500 rounded-full border border-white/5 group-hover:border-blue-500 group-hover:text-blue-500 transition-colors">
                            {feature.tag}
                          </span>
                        )}
                      </div>
                      <h4 className="text-lg font-bold text-white mb-2">{feature.name}</h4>
                      <p className="text-sm text-zinc-500 group-hover:text-zinc-300 transition-colors mb-6">{feature.desc}</p>
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-white transition-colors">
                        Initialize Module <ChevronRight className="w-3 h-3" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Technical Foundation */}
      <section id="technology" className="relative z-10 py-32 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-8 grid md:grid-cols-2 gap-24 items-center">
          <div>
            <h2 className="text-4xl font-black italic tracking-tighter mb-8 italic">The Technology Of Truth</h2>
            <div className="space-y-4">
              {[
                { title: "Supabase WebSockets", desc: "Nano-latency presence tracking for millions of concurrent users.", icon: Zap },
                { title: "A* Logic Engine", desc: "Dynamic pathfinding that treats dense crowds as solid obstacles.", icon: Navigation },
                { title: "Gemini Vision Integration", desc: "AI-verified photo reporting to eliminate false rumors in crowds.", icon: Eye },
                { title: "Geo-Grid Partitioning", desc: "Precision spatial indexing at 16.7-meter resolution.", icon: Grid },
              ].map((tech, i) => (
                <div key={i} className="flex gap-6 p-6 rounded-3xl hover:bg-white/[0.02] transition-colors border border-transparent hover:border-white/5 group">
                  <div className="shrink-0 w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all">
                    <tech.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-md font-bold text-white mb-1 tracking-tight">{tech.title}</h4>
                    <p className="text-sm text-zinc-500 leading-relaxed font-medium">{tech.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative aspect-square">
            <div className="absolute inset-0 bg-blue-600/10 blur-[100px] animate-pulse"></div>
            <div className="relative h-full w-full border border-white/10 rounded-[3rem] bg-zinc-950 p-12 overflow-hidden flex flex-col justify-center gap-8">
              {/* Mock Grid Visualization */}
              <div className="grid grid-cols-6 gap-3 opacity-20">
                {Array.from({ length: 36 }).map((_, i) => (
                  <div key={i} className={`aspect-square rounded-md border border-white/20 ${i % 7 === 0 ? 'bg-orange-500 border-orange-500' : i % 13 === 0 ? 'bg-red-600 border-red-600' : ''}`}></div>
                ))}
              </div>
              <div className="bg-neutral-900 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-10 rounded-[2rem] border border-white/10 shadow-2xl text-center w-[80%]">
                <Activity className="w-12 h-12 text-blue-500 mx-auto mb-6" />
                <h3 className="text-2xl font-black uppercase tracking-tighter italic mb-4">Swarm Logic v4.1</h3>
                <p className="text-sm text-zinc-500 font-medium">Processing 2,401 vectors/sec. All safe-zones identified.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick QR CTA */}
      <section className="relative z-10 py-32 px-8 text-center bg-gradient-to-b from-transparent to-orange-600/5">
        <div className="max-w-4xl mx-auto p-12 bg-zinc-950 border border-white/10 rounded-[3rem] shadow-3xl">
          <Shield className="w-16 h-16 text-orange-500 mx-auto mb-10" />
          <h2 className="text-5xl font-black italic tracking-tighter mb-6 italic">Scan. Connect. Stay Safe.</h2>
          <p className="text-zinc-400 font-medium text-lg leading-relaxed mb-12">
            Ready to deploy the safest pilgrimage in history? Launch the modules directly from your mobile device and experience the future of mass management.
          </p>
          <div className="inline-block p-6 bg-white rounded-3xl mb-12">
            {/* Conceptual QR Code Placeholder */}
            <div className="w-48 h-48 bg-neutral-900 rounded-2xl flex items-center justify-center p-4">
              <Smartphone className="w-24 h-24 text-white opacity-20" />
            </div>
            <p className="text-black text-[10px] font-black uppercase tracking-widest mt-4">Kumbh Guard v2.0</p>
          </div>
          <div>
            <Link href="/location" className="px-12 py-6 bg-orange-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-orange-700 transition-all shadow-xl shadow-orange-600/30">
              Start Real-Time Demo
            </Link>
          </div>
        </div>
      </section>

      <footer className="relative z-10 py-16 px-8 border-t border-white/5 opacity-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5" />
            <span className="text-sm font-black uppercase italic">Kumbh Sahayak 2027</span>
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            &copy; 2026 AI-Powered Massive Safety Systems. Nashik Division.
          </div>
        </div>
      </footer>
    </div>
  );
}
