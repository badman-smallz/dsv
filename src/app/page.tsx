"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <nav className="flex justify-between items-center p-6">
        <h1 className="text-2xl font-bold">DSV Global Logistics</h1>
        <div className="space-x-4">
          <Link
            href="/auth/login"
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition"
          >
            Login
          </Link>
          <Link
            href="/auth/register"
            className="px-4 py-2 rounded-lg bg-white text-gray-900 hover:bg-gray-100 transition"
          >
            Sign Up
          </Link>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h2 className="text-5xl font-bold mb-6">
            Global Logistics Made Simple
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Track your deliveries in real-time, manage your shipments, and
            experience seamless logistics solutions with DSV Global Logistics.
          </p>
          <div className="space-x-4">
            <Link
              href="/auth/register"
              className="px-8 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 transition text-lg font-medium inline-block"
            >
              Get Started
            </Link>
            <Link
              href="/auth/login?track=true"
              className="px-8 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 transition text-lg font-medium inline-block"
        >
              Track Delivery
            </Link>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="p-6 rounded-lg bg-gray-800 hover:bg-gray-700 transition"
        >
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-gray-400">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}

const features = [
  {
    title: "Real-time Tracking",
    description:
      "Monitor your deliveries in real-time with our advanced tracking system.",
  },
  {
    title: "Global Coverage",
    description:
      "We deliver to locations worldwide with reliable and efficient service.",
  },
  {
    title: "Secure Platform",
    description:
      "Your data and deliveries are protected with enterprise-grade security.",
  },
];
