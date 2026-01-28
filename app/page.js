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
  CheckCircle2,
  ChevronRight,
  QrCode,
  Utensils,
  Navigation2
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-[#1A1A1A] font-sans selection:bg-orange-100 overflow-x-hidden">

      {/* 1. Navbar */}
      <nav className="sticky top-0 z-[100] bg-white border-b border-gray-100 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg shadow-sm">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-blue-900">Kumbh Sahayak</span>
        </div>
        <div className="hidden md:flex items-center gap-6">
          <Link href="/" className="text-sm font-bold text-orange-600 px-4 py-2 bg-orange-50 rounded-full">Home</Link>
          <Link href="/family-payment" className="text-sm font-bold text-gray-500 hover:text-orange-600">Family Radar</Link>
          <Link href="/pricing" className="text-sm font-bold text-gray-500 hover:text-orange-600">Businesses</Link>
          <Link href="/location" className="text-sm font-bold text-gray-500 hover:text-orange-600">Live Map</Link>
        </div>
      </nav>

      {/* 2. Hero Section (Inspired by Second Image) */}
      <section className="relative bg-gradient-to-br from-[#E65100] via-[#C62828] to-[#1A237E] text-white py-16 md:py-24 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl md:text-7xl font-black leading-tight tracking-tighter mb-6 uppercase italic">
              AI-Powered Safety <br />
              for <span className="text-yellow-400">Kumbh Mela</span> <br />
              Nashik 2027
            </h1>
            <p className="text-lg md:text-xl font-medium text-white/80 leading-relaxed mb-10 max-w-lg">
              Smart routing. Real-time family group tracking.
              Local business discovery. Experience the safest
              Kumbh Mela with technology and tradition united.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/location" className="px-8 py-4 bg-white text-blue-900 rounded-full font-black text-sm uppercase tracking-widest hover:bg-zinc-100 transition-all shadow-xl flex items-center gap-3">
                <MapPin className="w-5 h-5 fill-current" /> Explore Live Map
              </Link>
              <Link href="/family-payment" className="px-8 py-4 border-2 border-white/30 text-white rounded-full font-black text-sm uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-3">
                Family Safety
              </Link>
            </div>

            {/* Stats Info (Bottom of Hero) */}
            <div className="mt-16 flex flex-wrap gap-12">
              {[
                { label: "Expected Pilgrims", value: "2M+" },
                { label: "Volunteer Support", value: "24/7" },
                { label: "Registered Businesses", value: "1000+" }
              ].map((stat, i) => (
                <div key={i}>
                  <div className="text-3xl font-black text-white">{stat.value}</div>
                  <div className="text-[10px] font-bold text-white/60 uppercase tracking-widest mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="relative rounded-[2rem] overflow-hidden border-8 border-white/10 shadow-3xl aspect-video md:aspect-[4/3]">
              <Image
                src="/kumbh-hero.jpg"
                alt="Kumbh Mela Crowds"
                fill
                className="object-cover"
                priority
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* 3. How It Works Section (Inspired by First Image) */}
      <section className="py-24 px-6 bg-gray-50/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-blue-900 uppercase italic tracking-tighter mb-4">How It Works</h2>
            <p className="text-gray-500 font-bold uppercase text-xs tracking-[0.2em]">Simple, safe, and smart technology to make your Kumbh experience seamless</p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                title: "QR-Based GPS Tracking",
                desc: "Scan QR code to activate real-time location tracking for safety and coordination.",
                icon: QrCode,
                color: "bg-orange-500"
              },
              {
                title: "Family Radar System",
                desc: "Keep your group together. Receive drift alerts and see everyone's live location on one map.",
                icon: Users,
                color: "bg-purple-600"
              },
              {
                title: "Local Business Discovery",
                desc: "Find nearby food stalls, shops, hotels, and essential services with real-road routing.",
                icon: Utensils,
                color: "bg-red-500"
              },
              {
                title: "Smart Route Navigation",
                desc: "AI-powered route suggestions based on real-time crowd density to avoid bottlenecks.",
                icon: Navigation2,
                color: "bg-orange-600"
              }
            ].map((card, i) => (
              <div key={i} className="bg-white border border-gray-100 p-8 rounded-[2rem] shadow-sm hover:shadow-xl transition-shadow group">
                <div className={`w-12 h-12 ${card.color} rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-current/20 group-hover:scale-110 transition-transform`}>
                  <card.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-black text-blue-900 mb-3 leading-tight">{card.title}</h3>
                <p className="text-sm text-gray-500 font-medium leading-relaxed">
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Scanner UI Section (Inspired by Third Image) */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto bg-[#E8F5E9] rounded-[3rem] p-8 md:p-16 flex flex-col md:flex-row items-center gap-12 border border-green-200">
          <div className="flex-1 space-y-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest mb-6">
                <Shield className="w-3 h-3" /> Verified Safe Technology
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-blue-900 leading-tight mb-6">Scan. Connect. <br /> Stay Safe.</h2>
              <p className="text-lg text-blue-900/70 font-medium leading-relaxed">
                When you arrive at Kumbh Mela, simply scan the QR code
                displayed at entry points. This will activate GPS tracking on
                your device, allowing:
              </p>
            </div>

            <ul className="space-y-4">
              {[
                "Real-time location sharing for family safety",
                "Emergency assistance coordination with volunteers",
                "Personalized route suggestions based on crowd levels"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-4 text-sm font-bold text-blue-900">
                  <CheckCircle2 className="w-5 h-5 text-green-700 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>

            <Link href="/sim-tracker" className="inline-flex items-center gap-3 px-10 py-5 bg-green-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-green-800 transition-all shadow-xl shadow-green-900/20 active:scale-95">
              View Demo <ChevronRight className="w-5 h-5" />
            </Link>
          </div>

          <div className="shrink-0">
            <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-white relative group">
              <div className="absolute inset-0 bg-green-500/5 blur-3xl rounded-full"></div>
              <div className="relative z-10 space-y-6 flex flex-col items-center">
                <QrCode className="w-48 h-48 text-blue-900" strokeWidth={1.5} />
                <p className="text-green-800 font-bold italic tracking-tight text-center">Scan at Entry Points</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-100 text-center">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
          &copy; 2026 Kumbh Sahayak ∙ Public Safety System ∙ Nashik Division
        </p>
      </footer>

      <style jsx global>{`
                h1, h2, h3 { letter-spacing: -0.02em; }
            `}</style>
    </div>
  );
}
