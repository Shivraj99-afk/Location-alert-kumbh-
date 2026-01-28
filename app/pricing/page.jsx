"use client";

import { motion } from "framer-motion";
import {
    Shield,
    MapPin,
    Users,
    Zap,
    CheckCircle2,
    Star,
    TrendingUp,
    BarChart3,
    Globe,
    Headphones,
    ArrowRight,
    Sparkles
} from "lucide-react";
import Link from "next/link";

export default function PricingPage() {
    const pricingPlans = [
        {
            name: "Starter",
            price: "₹4,999",
            period: "/month",
            description: "Perfect for small businesses and local vendors",
            features: [
                "Business location on interactive map",
                "Basic analytics dashboard",
                "Up to 100 customer views/month",
                "Standard support",
                "Mobile-friendly listing",
                "Basic SEO optimization"
            ],
            icon: MapPin,
            color: "from-blue-500 to-cyan-500",
            popular: false
        },
        {
            name: "Professional",
            price: "₹12,999",
            period: "/month",
            description: "Ideal for growing businesses during Kumbh Mela",
            features: [
                "Everything in Starter",
                "Premium map placement",
                "Advanced analytics & insights",
                "Unlimited customer views",
                "Priority support (24/7)",
                "Featured business badge",
                "Social media integration",
                "Real-time crowd density data",
                "Custom promotional campaigns"
            ],
            icon: TrendingUp,
            color: "from-orange-500 to-red-500",
            popular: true
        },
        {
            name: "Enterprise",
            price: "Custom",
            period: "",
            description: "For large organizations and event sponsors",
            features: [
                "Everything in Professional",
                "Dedicated account manager",
                "API access for integration",
                "White-label solutions",
                "Custom analytics reports",
                "Multi-location support",
                "Advanced targeting options",
                "Exclusive sponsorship opportunities",
                "On-site technical support"
            ],
            icon: Globe,
            color: "from-purple-500 to-pink-500",
            popular: false
        }
    ];

    const benefits = [
        {
            icon: Users,
            title: "Reach 2M+ Pilgrims",
            description: "Connect with millions of visitors during Kumbh Mela 2027"
        },
        {
            icon: BarChart3,
            title: "Real-Time Analytics",
            description: "Track customer engagement and foot traffic patterns"
        },
        {
            icon: Zap,
            title: "Instant Visibility",
            description: "Get discovered by nearby customers looking for services"
        },
        {
            icon: Shield,
            title: "Verified Business",
            description: "Build trust with official verification badge"
        }
    ];

    return (
        <div className="min-h-screen bg-white text-gray-900 font-sans overflow-x-hidden">

            {/* Navbar */}
            <nav className="sticky top-0 z-[100] bg-white/80 backdrop-blur-xl border-b border-gray-100 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
                <Link href="/" className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg shadow-sm">
                        <Shield className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-blue-900">Kumbh Sahayak</span>
                </Link>
                <div className="hidden md:flex items-center gap-6">
                    <Link href="/" className="text-sm font-bold text-gray-500 hover:text-orange-600 transition-colors">Home</Link>
                    <Link href="/pricing" className="text-sm font-bold text-orange-600 px-4 py-2 bg-orange-50 rounded-full">Pricing</Link>
                    <Link href="/location" className="text-sm font-bold text-gray-500 hover:text-orange-600 transition-colors">Live Map</Link>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative py-20 px-6 overflow-hidden">
                {/* Animated Background Elements */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-20 left-10 w-72 h-72 bg-orange-200/30 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
                </div>

                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-100 to-red-100 rounded-full mb-6">
                            <Sparkles className="w-4 h-4 text-orange-600" />
                            <span className="text-xs font-black uppercase tracking-widest text-orange-700">Business Solutions for Kumbh Mela 2027</span>
                        </div>

                        <h1 className="text-5xl md:text-7xl font-black leading-tight tracking-tighter mb-6 bg-gradient-to-r from-blue-900 via-purple-800 to-orange-600 bg-clip-text text-transparent">
                            Grow Your Business<br />
                            During Kumbh Mela
                        </h1>

                        <p className="text-lg md:text-xl text-gray-600 font-medium leading-relaxed mb-10 max-w-2xl mx-auto">
                            Connect with millions of pilgrims through our AI-powered location platform.
                            Get discovered, increase footfall, and maximize your revenue during the world's largest gathering.
                        </p>

                        <div className="flex flex-wrap gap-4 justify-center">
                            <Link
                                href="#pricing"
                                className="px-8 py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-full font-black text-sm uppercase tracking-widest hover:shadow-2xl hover:shadow-orange-500/50 transition-all transform hover:scale-105 flex items-center gap-3"
                            >
                                View Pricing <ArrowRight className="w-5 h-5" />
                            </Link>
                            <Link
                                href="/business-map"
                                className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-full font-black text-sm uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center gap-3"
                            >
                                Try Demo <Zap className="w-5 h-5" />
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Benefits Section */}
            <section className="py-16 px-6 bg-gradient-to-br from-gray-50 to-blue-50/30">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-black text-blue-900 mb-4">Why Choose Our Platform?</h2>
                        <p className="text-gray-600 font-medium">Powerful features to help your business thrive</p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {benefits.map((benefit, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                viewport={{ once: true }}
                                className="bg-white p-6 rounded-2xl border border-gray-100 hover:shadow-xl transition-all group"
                            >
                                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <benefit.icon className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="text-lg font-black text-gray-900 mb-2">{benefit.title}</h3>
                                <p className="text-sm text-gray-600 font-medium leading-relaxed">{benefit.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-20 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            viewport={{ once: true }}
                        >
                            <h2 className="text-4xl md:text-6xl font-black text-blue-900 mb-4 tracking-tighter">
                                Simple, Transparent Pricing
                            </h2>
                            <p className="text-gray-600 font-medium text-lg">Choose the perfect plan for your business needs</p>
                        </motion.div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {pricingPlans.map((plan, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: index * 0.15 }}
                                viewport={{ once: true }}
                                className={`relative bg-white rounded-3xl border-2 p-8 transition-all hover:shadow-2xl ${plan.popular
                                        ? 'border-orange-500 shadow-xl shadow-orange-500/20 scale-105'
                                        : 'border-gray-200 hover:border-orange-300'
                                    }`}
                            >
                                {/* Popular Badge */}
                                {plan.popular && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                        <div className="px-6 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-full text-xs font-black uppercase tracking-widest shadow-lg flex items-center gap-2">
                                            <Star className="w-4 h-4 fill-current" />
                                            Most Popular
                                        </div>
                                    </div>
                                )}

                                {/* Icon */}
                                <div className={`w-16 h-16 bg-gradient-to-br ${plan.color} rounded-2xl flex items-center justify-center mb-6 shadow-lg`}>
                                    <plan.icon className="w-8 h-8 text-white" />
                                </div>

                                {/* Plan Name */}
                                <h3 className="text-2xl font-black text-gray-900 mb-2">{plan.name}</h3>
                                <p className="text-sm text-gray-600 font-medium mb-6 min-h-[40px]">{plan.description}</p>

                                {/* Price */}
                                <div className="mb-8">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-5xl font-black text-gray-900">{plan.price}</span>
                                        <span className="text-lg text-gray-500 font-bold">{plan.period}</span>
                                    </div>
                                </div>

                                {/* Features */}
                                <ul className="space-y-4 mb-8">
                                    {plan.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-start gap-3 text-sm">
                                            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                                            <span className="text-gray-700 font-medium">{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                {/* CTA Button */}
                                <Link
                                    href="/business-map"
                                    className={`block w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest text-center transition-all ${plan.popular
                                            ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white hover:shadow-xl hover:shadow-orange-500/50 transform hover:scale-105'
                                            : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                                        }`}
                                >
                                    Try Demo
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-6 bg-gradient-to-br from-blue-900 via-purple-900 to-orange-800 text-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')]"></div>
                </div>

                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight">
                            Ready to Boost Your Business?
                        </h2>
                        <p className="text-xl text-white/80 font-medium mb-10 max-w-2xl mx-auto">
                            Join hundreds of businesses already registered for Kumbh Mela 2027.
                            Don't miss this once-in-a-lifetime opportunity.
                        </p>
                        <div className="flex flex-wrap gap-4 justify-center">
                            <Link
                                href="/business-map"
                                className="px-10 py-5 bg-white text-blue-900 rounded-full font-black text-sm uppercase tracking-widest hover:bg-gray-100 transition-all shadow-2xl transform hover:scale-105 flex items-center gap-3"
                            >
                                <MapPin className="w-5 h-5" />
                                Explore Business Map
                            </Link>
                            <a
                                href="mailto:business@kumbhsahayak.com"
                                className="px-10 py-5 border-2 border-white/30 text-white rounded-full font-black text-sm uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-3"
                            >
                                <Headphones className="w-5 h-5" />
                                Contact Sales
                            </a>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-gray-100 text-center bg-white">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                    © 2026 Kumbh Sahayak ∙ Business Solutions ∙ Nashik Division
                </p>
            </footer>

            <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.05); }
        }
        .animate-pulse {
          animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
        </div>
    );
}
