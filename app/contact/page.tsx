'use client'

import { useState } from "react";
import { usePostHog } from "posthog-js/react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function ContactPage() {
  const posthog = usePostHog();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    service: "",
    message: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    posthog?.capture("quote_form_submitted", {
      service_requested: form.service,
      has_phone: Boolean(form.phone),
      page: "contact",
    });
    setSubmitted(true);
  };

  return (
    <>
      <Navbar />
      <section className="bg-green-700 text-white py-16 px-4 text-center">
        <h1 className="text-4xl font-extrabold mb-3">Get a Free Quote</h1>
        <p className="text-green-100 text-lg max-w-xl mx-auto">
          Fill out the form below and we&apos;ll get back to you within one
          business day.
        </p>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-xl mx-auto">
          {submitted ? (
            <div className="bg-green-50 border border-green-300 rounded-2xl p-8 text-center">
              <p className="text-4xl mb-3">🌿</p>
              <h2 className="text-2xl font-bold text-green-800 mb-2">
                Thank you, {form.name}!
              </h2>
              <p className="text-gray-600">
                We&apos;ve received your request and will reach out to{" "}
                <strong>{form.email}</strong> shortly.
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="space-y-5 bg-white border border-green-100 rounded-2xl p-8 shadow-sm"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  required
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  required
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone (optional)
                </label>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Needed *
                </label>
                <select
                  required
                  name="service"
                  value={form.service}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select a service…</option>
                  <option>Residential Cleaning</option>
                  <option>Commercial Cleaning</option>
                  <option>Eco-Friendly Deep Clean</option>
                  <option>Window & Exterior</option>
                  <option>Move-In / Move-Out</option>
                  <option>Recurring Plan</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-green-700 text-white font-bold py-3 rounded-full hover:bg-green-600 transition"
              >
                Send My Request
              </button>
            </form>
          )}
        </div>
      </section>
      <Footer />
    </>
  );
}
