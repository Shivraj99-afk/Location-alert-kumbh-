"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Shield,
    Users,
    CheckCircle2,
    Crown,
    Zap,
    Heart,
    ArrowRight,
    Lock,
    CreditCard,
    Sparkles
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function FamilyPaymentPage() {
    const router = useRouter();
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [showPayment, setShowPayment] = useState(false);
    const [paymentProcessing, setPaymentProcessing] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);

    const pricingPlans = [
        {
            id: "small",
            name: "Small Family",
            members: "Up to 5 Members",
            price: 30,
            icon: Users,
            color: "from-blue-500 to-cyan-500",
            features: [
                "Track up to 5 family members",
                "Real-time location sharing",
                "Drift alerts",
                "24-hour access",
                "Basic support"
            ]
        },
        {
            id: "medium",
            name: "Medium Group",
            members: "Up to 10 Members",
            price: 50,
            icon: Heart,
            color: "from-orange-500 to-red-500",
            popular: true,
            features: [
                "Track up to 10 family members",
                "Real-time location sharing",
                "Instant drift alerts",
                "24-hour access",
                "Priority support",
                "Group chat feature"
            ]
        },
        {
            id: "unlimited",
            name: "Unlimited Groups",
            members: "100+ Members",
            price: 100,
            icon: Crown,
            color: "from-purple-500 to-pink-500",
            features: [
                "Unlimited group members",
                "Real-time location sharing",
                "Advanced drift alerts",
                "Full day access",
                "Premium 24/7 support",
                "Group chat & messaging",
                "Custom group zones",
                "Priority routing"
            ]
        }
    ];

    const handleSelectPlan = (plan) => {
        setSelectedPlan(plan);
        setShowPayment(true);
    };

    const handlePayment = () => {
        setPaymentProcessing(true);

        // Mock Razorpay payment simulation
        setTimeout(() => {
            setPaymentProcessing(false);
            setPaymentSuccess(true);

            // Redirect to family tracker after 2 seconds
            setTimeout(() => {
                router.push("/family");
            }, 2000);
        }, 2000);
    };

    const handleBackToPricing = () => {
        setShowPayment(false);
        setSelectedPlan(null);
        setPaymentSuccess(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 text-gray-900 font-sans overflow-x-hidden">

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
                    <Link href="/family-payment" className="text-sm font-bold text-orange-600 px-4 py-2 bg-orange-50 rounded-full">Family Radar</Link>
                    <Link href="/location" className="text-sm font-bold text-gray-500 hover:text-orange-600 transition-colors">Live Map</Link>
                </div>
            </nav>

            <AnimatePresence mode="wait">
                {!showPayment ? (
                    // Pricing Selection View
                    <motion.div
                        key="pricing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="py-16 px-6"
                    >
                        {/* Hero Section */}
                        <div className="max-w-4xl mx-auto text-center mb-16">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6 }}
                            >
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-100 to-orange-100 rounded-full mb-6">
                                    <Sparkles className="w-4 h-4 text-orange-600" />
                                    <span className="text-xs font-black uppercase tracking-widest text-orange-700">Family Safety First</span>
                                </div>

                                <h1 className="text-5xl md:text-6xl font-black leading-tight tracking-tighter mb-6 bg-gradient-to-r from-blue-900 via-purple-800 to-orange-600 bg-clip-text text-transparent">
                                    Keep Your Family<br />
                                    Together & Safe
                                </h1>

                                <p className="text-lg md:text-xl text-gray-600 font-medium leading-relaxed mb-8 max-w-2xl mx-auto">
                                    Real-time GPS tracking for your entire family during Kumbh Mela.
                                    Never lose sight of your loved ones in the crowd.
                                </p>
                            </motion.div>
                        </div>

                        {/* Pricing Cards */}
                        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8 mb-12">
                            {pricingPlans.map((plan, index) => (
                                <motion.div
                                    key={plan.id}
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.6, delay: index * 0.15 }}
                                    className={`relative bg-white rounded-3xl border-2 p-8 transition-all hover:shadow-2xl cursor-pointer ${plan.popular
                                            ? 'border-orange-500 shadow-xl shadow-orange-500/20 scale-105'
                                            : 'border-gray-200 hover:border-orange-300'
                                        }`}
                                    onClick={() => handleSelectPlan(plan)}
                                >
                                    {plan.popular && (
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                            <div className="px-6 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-full text-xs font-black uppercase tracking-widest shadow-lg flex items-center gap-2">
                                                <Zap className="w-4 h-4 fill-current" />
                                                Most Popular
                                            </div>
                                        </div>
                                    )}

                                    <div className={`w-16 h-16 bg-gradient-to-br ${plan.color} rounded-2xl flex items-center justify-center mb-6 shadow-lg`}>
                                        <plan.icon className="w-8 h-8 text-white" />
                                    </div>

                                    <h3 className="text-2xl font-black text-gray-900 mb-2">{plan.name}</h3>
                                    <p className="text-sm text-gray-600 font-medium mb-6">{plan.members}</p>

                                    <div className="mb-8">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-5xl font-black text-gray-900">₹{plan.price}</span>
                                            <span className="text-lg text-gray-500 font-bold">/day</span>
                                        </div>
                                    </div>

                                    <ul className="space-y-3 mb-8">
                                        {plan.features.map((feature, idx) => (
                                            <li key={idx} className="flex items-start gap-3 text-sm">
                                                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                                                <span className="text-gray-700 font-medium">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    <button
                                        onClick={() => handleSelectPlan(plan)}
                                        className={`block w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest text-center transition-all ${plan.popular
                                                ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white hover:shadow-xl hover:shadow-orange-500/50 transform hover:scale-105'
                                                : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                                            }`}
                                    >
                                        Select Plan
                                    </button>
                                </motion.div>
                            ))}
                        </div>

                        {/* Trust Badges */}
                        <div className="max-w-4xl mx-auto">
                            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
                                <div className="flex flex-wrap justify-center items-center gap-8">
                                    <div className="flex items-center gap-3">
                                        <Lock className="w-6 h-6 text-green-600" />
                                        <span className="text-sm font-bold text-gray-700">Secure Payment</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Shield className="w-6 h-6 text-blue-600" />
                                        <span className="text-sm font-bold text-gray-700">Data Protected</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <CheckCircle2 className="w-6 h-6 text-orange-600" />
                                        <span className="text-sm font-bold text-gray-700">Instant Activation</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ) : paymentSuccess ? (
                    // Payment Success View
                    <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="min-h-[80vh] flex items-center justify-center px-6"
                    >
                        <div className="max-w-md w-full bg-white rounded-3xl p-12 text-center shadow-2xl border border-gray-100">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                                className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-500/30"
                            >
                                <CheckCircle2 className="w-12 h-12 text-white" />
                            </motion.div>

                            <h2 className="text-3xl font-black text-gray-900 mb-4">Payment Successful!</h2>
                            <p className="text-gray-600 font-medium mb-6">
                                Your {selectedPlan?.name} plan is now active. Redirecting to Family Radar...
                            </p>

                            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                                <span className="font-bold">Activating your family tracker</span>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    // Payment View (Mock Razorpay)
                    <motion.div
                        key="payment"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="py-16 px-6"
                    >
                        <div className="max-w-2xl mx-auto">
                            <button
                                onClick={handleBackToPricing}
                                className="mb-8 text-sm font-bold text-gray-600 hover:text-orange-600 transition-colors flex items-center gap-2"
                            >
                                ← Back to Plans
                            </button>

                            <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
                                {/* Payment Header */}
                                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-white">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-2xl font-black">Complete Payment</h2>
                                        <CreditCard className="w-8 h-8" />
                                    </div>
                                    <p className="text-blue-100 font-medium">Powered by Razorpay (Mock)</p>
                                </div>

                                {/* Order Summary */}
                                <div className="p-8 border-b border-gray-100">
                                    <h3 className="text-lg font-black text-gray-900 mb-4">Order Summary</h3>
                                    <div className="bg-gray-50 rounded-2xl p-6">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className={`w-12 h-12 bg-gradient-to-br ${selectedPlan?.color} rounded-xl flex items-center justify-center`}>
                                                {selectedPlan?.icon && <selectedPlan.icon className="w-6 h-6 text-white" />}
                                            </div>
                                            <div>
                                                <h4 className="font-black text-gray-900">{selectedPlan?.name}</h4>
                                                <p className="text-sm text-gray-600 font-medium">{selectedPlan?.members}</p>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                                            <span className="text-sm font-bold text-gray-600">Total Amount</span>
                                            <span className="text-3xl font-black text-gray-900">₹{selectedPlan?.price}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Mock Payment Form */}
                                <div className="p-8">
                                    <div className="space-y-4 mb-6">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Card Number</label>
                                            <input
                                                type="text"
                                                placeholder="1234 5678 9012 3456"
                                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl font-mono text-gray-900 focus:border-orange-500 focus:outline-none transition-colors"
                                                defaultValue="4111 1111 1111 1111"
                                                disabled={paymentProcessing}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-2">Expiry</label>
                                                <input
                                                    type="text"
                                                    placeholder="MM/YY"
                                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl font-mono text-gray-900 focus:border-orange-500 focus:outline-none transition-colors"
                                                    defaultValue="12/25"
                                                    disabled={paymentProcessing}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-2">CVV</label>
                                                <input
                                                    type="text"
                                                    placeholder="123"
                                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl font-mono text-gray-900 focus:border-orange-500 focus:outline-none transition-colors"
                                                    defaultValue="123"
                                                    disabled={paymentProcessing}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handlePayment}
                                        disabled={paymentProcessing}
                                        className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:shadow-xl hover:shadow-orange-500/50 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3"
                                    >
                                        {paymentProcessing ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                Pay ₹{selectedPlan?.price} <ArrowRight className="w-5 h-5" />
                                            </>
                                        )}
                                    </button>

                                    <p className="text-xs text-gray-500 text-center mt-4 font-medium">
                                        🔒 This is a mock payment for demonstration purposes
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Footer */}
            <footer className="py-8 border-t border-gray-100 text-center bg-white">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                    © 2026 Kumbh Sahayak ∙ Family Safety System ∙ Nashik Division
                </p>
            </footer>
        </div>
    );
}
