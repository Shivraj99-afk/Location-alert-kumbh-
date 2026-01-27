"use client";

import {
  Users,
  MapPin,
  Camera,
  Shield,
  Navigation,
  Activity,
  HeartHandshake,
  Info,
  ArrowRight,
  Search,
  Stethoscope,
  Utensils,
  Hotel,
  ShoppingBag
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function LandingPage() {
  const [page, setPage] = useState(1);

  // Common Button Component for large, easy-to-click buttons
  const BigButton = ({ href, icon: Icon, text, subtext, color = "bg-orange-600" }) => (
    <Link href={href} className={`w-full ${color} text-white p-6 rounded-2xl shadow-lg flex items-center gap-6 active:scale-95 transition-transform border-b-4 border-black/20 text-left`}>
      <div className="bg-white/20 p-4 rounded-xl">
        <Icon className="w-8 h-8 md:w-10 md:h-10 text-white" />
      </div>
      <div>
        <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tight">{text}</h3>
        {subtext && <p className="text-sm md:text-base font-bold opacity-90">{subtext}</p>}
      </div>
    </Link>
  );

  return (
    <div className="min-h-screen bg-[#FFFDF5] text-[#1A1A1A] font-sans">
      {/* Logo/Header Bar */}
      <header className="bg-white border-b-4 border-orange-500 p-4 sticky top-0 z-50 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-600 rounded-lg">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase text-orange-600 leading-none">Kumbh Sahayak</h1>
              <p className="text-[10px] font-bold text-blue-900 uppercase tracking-widest mt-0.5">Nashik Mela 2027</p>
            </div>
          </div>
          {page > 1 && (
            <button
              onClick={() => setPage(1)}
              className="bg-blue-900 text-white px-4 py-2 rounded-xl font-bold text-sm uppercase flex items-center gap-2"
            >
              ← Home
            </button>
          )}
        </div>
      </header>

      {/* Page 1: Main Landing */}
      {page === 1 && (
        <main className="max-w-4xl mx-auto p-6 space-y-8 pb-32">
          <section className="text-center py-8">
            <h2 className="text-3xl md:text-5xl font-black text-blue-900 leading-tight mb-4">
              Safe movement and group protection for pilgrims
            </h2>
            <div className="flex flex-wrap justify-center gap-3 text-sm font-bold text-orange-700 uppercase">
              <span>English</span> ∙ <span>हिंदी</span> ∙ <span>मराठी</span>
            </div>
          </section>

          {/* Three Main Sections */}
          <div className="space-y-6">
            {/* Crowd Safety */}
            <div className="bg-white border-2 border-gray-200 rounded-3xl p-6 shadow-sm">
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 bg-green-100 rounded-2xl text-green-700">
                  <Activity className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-black text-blue-900">🧭 Crowd Safety / भीड़ सुरक्षा</h3>
                  <p className="text-lg font-bold text-gray-600 leading-snug mt-1 italic">
                    "Shows crowded and safe areas. Guides you to less crowded routes."
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPage(2)}
                className="w-full bg-green-600 text-white py-6 rounded-2xl text-xl font-black uppercase flex items-center justify-center gap-3 shadow-lg border-b-4 border-green-800"
              >
                Get Started / शुरू करें <ArrowRight className="w-6 h-6" />
              </button>
            </div>

            {/* Group Safety */}
            <div className="bg-white border-2 border-gray-200 rounded-3xl p-6 shadow-sm">
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 bg-blue-100 rounded-2xl text-blue-700">
                  <Users className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className="text-2xl font-black text-blue-900">👨‍👩‍👧 Group Safety / परिवार सुरक्षा</h3>
                    <span className="bg-orange-600 text-white px-3 py-1 rounded-full text-sm font-black italic">₹30 ONLY</span>
                  </div>
                  <p className="text-lg font-bold text-gray-600 leading-snug mt-1 italic">
                    "Do not get separated from family. Get alerts if someone goes missing."
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPage(4)}
                className="w-full bg-blue-900 text-white py-6 rounded-2xl text-xl font-black uppercase flex items-center justify-center gap-3 shadow-lg border-b-4 border-blue-950"
              >
                Setup Group / ग्रुप बनाएँ <ArrowRight className="w-6 h-6" />
              </button>
            </div>

            {/* Nearby Services */}
            <div className="bg-white border-2 border-gray-200 rounded-3xl p-6 shadow-sm">
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 bg-orange-100 rounded-2xl text-orange-700">
                  <MapPin className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-black text-blue-900">📍 Nearby Services / आस-पास की सेवाएँ</h3>
                  <p className="text-lg font-bold text-gray-600 leading-snug mt-1 italic">
                    "Find food, water, hotels, stalls nearby."
                  </p>
                </div>
              </div>
              <Link
                href="/business-map"
                className="w-full bg-orange-600 text-white py-6 rounded-2xl text-xl font-black uppercase flex items-center justify-center gap-3 shadow-lg border-b-4 border-orange-800"
              >
                View Nearby / आस-पास देखें <ArrowRight className="w-6 h-6" />
              </Link>
            </div>
          </div>
        </main>
      )}

      {/* Page 2 & 3 Combined: How Crowd Safety Works */}
      {page === 2 && (
        <main className="max-w-4xl mx-auto p-6 space-y-12 pb-32">
          <section className="text-center">
            <h2 className="text-4xl font-black text-blue-900 uppercase underline decoration-orange-500 underline-offset-8">
              How Crowd Safety Works
            </h2>
            <p className="text-xl font-bold mt-4 text-gray-600 italic leading-tight">
              "Understanding the safety system"
            </p>
          </section>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white border-4 border-blue-900 rounded-[2rem] p-8 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-900 text-white rounded-full flex items-center justify-center font-black text-2xl">1</div>
                <h4 className="text-2xl font-black uppercase">Cameras detect crowd</h4>
              </div>
              <div className="aspect-video bg-gray-100 rounded-2xl flex items-center justify-center border-2 border-dashed border-gray-300">
                <Camera className="w-16 h-16 text-gray-300" />
              </div>
              <p className="font-bold text-gray-600 text-lg">Smart cameras across the Mela watch the crowd density in real-time.</p>
            </div>

            <div className="bg-white border-4 border-blue-900 rounded-[2rem] p-8 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-900 text-white rounded-full flex items-center justify-center font-black text-2xl">2</div>
                <h4 className="text-2xl font-black uppercase">Crowd zones marked</h4>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-green-100 border-2 border-green-600 rounded-2xl">
                  <div className="w-6 h-6 bg-green-600 rounded-full"></div>
                  <span className="text-xl font-black text-green-800 tracking-tight uppercase">Green - Safe Area</span>
                </div>
                <div className="flex items-center gap-4 p-4 bg-yellow-100 border-2 border-yellow-600 rounded-2xl">
                  <div className="w-6 h-6 bg-yellow-600 rounded-full"></div>
                  <span className="text-xl font-black text-yellow-800 tracking-tight uppercase">Yellow - Medium Crowd</span>
                </div>
                <div className="flex items-center gap-4 p-4 bg-red-100 border-2 border-red-600 rounded-2xl">
                  <div className="w-6 h-6 bg-red-600 rounded-full"></div>
                  <span className="text-xl font-black text-red-800 tracking-tight uppercase">Red - High Crowd</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-orange-600 text-white p-8 rounded-[2rem] border-b-8 border-orange-800">
            <div className="flex items-center gap-6 mb-4">
              <Navigation className="w-12 h-12" />
              <h4 className="text-3xl font-black uppercase tracking-tight italic">3. App suggests safer route</h4>
            </div>
            <p className="text-xl font-bold leading-relaxed">
              "Users are guided away from danger. The app finds the best green path for your movement."
            </p>
          </div>

          <div className="space-y-4 pt-8">
            <Link
              href="/location"
              className="w-full bg-blue-900 text-white py-8 rounded-3xl text-2xl font-black uppercase flex items-center justify-center gap-4 shadow-2xl border-b-8 border-black shadow-blue-900/40"
            >
              Open Live Map / लाइव नक्शा देखें
            </Link>
            <Link
              href="/sim-tracker"
              className="w-full bg-orange-600 text-white py-6 rounded-3xl text-xl font-black uppercase flex items-center justify-center gap-4 shadow-xl border-b-6 border-orange-800"
            >
              Try Demo / डेमो देखें
            </Link>
          </div>
        </main>
      )}

      {/* Page 4: Group Safety & Business */}
      {page === 4 && (
        <main className="max-w-4xl mx-auto p-6 space-y-12 pb-32">
          {/* Group Safety Section */}
          <section className="bg-white border-4 border-blue-900 rounded-[2.5rem] p-8 shadow-xl">
            <div className="flex justify-between items-start mb-8">
              <h2 className="text-4xl font-black text-blue-900 uppercase italic">Do Not Get Lost</h2>
              <span className="bg-orange-600 text-white px-6 py-2 rounded-full text-xl font-black animate-pulse">₹30 ONLY</span>
            </div>

            <div className="space-y-6 mb-10">
              {[
                "Create one group for your family",
                "Add unlimited family members",
                "Alert if someone goes too far",
                "Safe route shown to find each other"
              ].map((point, i) => (
                <div key={i} className="flex items-center gap-6">
                  <div className="bg-green-100 p-2 rounded-full">
                    <HeartHandshake className="w-8 h-8 text-green-600" />
                  </div>
                  <p className="text-2xl font-black text-gray-700 leading-tight tracking-tight uppercase">{point}</p>
                </div>
              ))}
            </div>

            <Link
              href="/family"
              className="w-full bg-blue-900 text-white py-8 rounded-3xl text-2xl font-black uppercase flex items-center justify-center gap-4 shadow-2xl border-b-8 border-black"
            >
              Activate Group / परिवार जोड़ें
            </Link>
          </section>

          {/* Nearby Business Section */}
          <section className="bg-orange-50 border-4 border-orange-500 rounded-[2.5rem] p-8">
            <h2 className="text-4xl font-black text-orange-700 uppercase italic mb-8">📍 Nearby Services</h2>

            <div className="grid grid-cols-2 gap-4 mb-10">
              {[
                { icon: Utensils, label: "Food Stalls" },
                { icon: Hotel, label: "Hotels" },
                { icon: Stethoscope, label: "Medical Help" },
                { icon: ShoppingBag, label: "Shops" }
              ].map((item, i) => (
                <div key={i} className="bg-white p-6 rounded-2xl border-2 border-orange-200 flex flex-col items-center gap-3">
                  <item.icon className="w-12 h-12 text-orange-600" />
                  <span className="text-xl font-black uppercase text-blue-900">{item.label}</span>
                </div>
              ))}
            </div>

            <div className="bg-white p-6 rounded-2xl border-2 border-gray-200 mb-8">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Try searching for:</p>
              <div className="flex flex-wrap gap-3">
                {["Ice cream", "Water", "Doctor", "Temple"].map(s => (
                  <span key={s} className="px-4 py-2 bg-gray-100 rounded-lg text-lg font-black text-gray-700 border border-gray-300">"{s}"</span>
                ))}
              </div>
            </div>

            <Link
              href="/business-map"
              className="w-full bg-orange-600 text-white py-8 rounded-3xl text-2xl font-black uppercase flex items-center justify-center gap-4 shadow-2xl border-b-8 border-orange-800"
            >
              View All on Map / नक़्शे पर देखें
            </Link>
          </section>
        </main>
      )}

      {/* Language Selection Footer (Sticky) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-blue-900 p-3 flex justify-around items-center z-50">
        <button className="text-xs font-black uppercase tracking-widest text-blue-900 flex flex-col items-center">
          <Info className="w-5 h-5 mb-1" />
          Help
        </button>
        <div className="h-8 w-px bg-gray-200"></div>
        <button className="text-[10px] font-black uppercase tracking-tighter text-blue-900 text-center leading-none">
          Nashik <br /> 2027
        </button>
        <div className="h-8 w-px bg-gray-200"></div>
        <button className="text-xs font-black uppercase tracking-widest text-blue-900 flex flex-col items-center">
          <HeartHandshake className="w-5 h-5 mb-1" />
          Volunteer
        </button>
      </div>

      <style jsx global>{`
                body {
                    background-color: #FFFDF5;
                }
                h1, h2, h3, h4, button {
                    letter-spacing: -0.02em;
                }
            `}</style>
    </div>
  );
}
