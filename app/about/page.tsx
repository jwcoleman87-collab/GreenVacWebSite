import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <section className="bg-green-700 text-white py-16 px-4 text-center">
        <h1 className="text-4xl font-extrabold mb-3">About GreenVac</h1>
        <p className="text-green-100 text-lg max-w-xl mx-auto">
          Founded on a simple belief: your home should be clean <em>and</em> the
          planet should be, too.
        </p>
      </section>

      <section className="py-16 px-4 max-w-3xl mx-auto prose prose-green">
        <h2 className="text-2xl font-bold text-green-800">Our Story</h2>
        <p className="text-gray-700 mt-4">
          GreenVac Services was started in 2017 by two friends who were tired of
          harsh chemical cleaners irritating their families and harming local
          waterways. We spent a year sourcing the best biodegradable, non-toxic
          products and training a crew that shares our values.
        </p>
        <p className="text-gray-700 mt-4">
          Today we serve 500+ clients across the metro area — from busy
          families and pet owners to corporate offices and property managers —
          all with the same commitment: a spotless result you can feel good
          about.
        </p>

        <h2 className="text-2xl font-bold text-green-800 mt-10">Our Values</h2>
        <ul className="mt-4 space-y-3 text-gray-700 list-none pl-0">
          {[
            ["🌿", "Eco-first", "Every product is certified biodegradable and cruelty-free."],
            ["🤝", "Trust", "Background-checked, insured, and always punctual."],
            ["✨", "Quality", "We don't leave until the job meets our standard."],
            ["♻️", "Sustainability", "Reusable microfiber cloths, zero single-use plastics."],
          ].map(([icon, title, desc]) => (
            <li key={String(title)} className="flex gap-3">
              <span className="text-2xl">{icon}</span>
              <div>
                <strong className="text-green-800">{title}:</strong>{" "}
                <span>{desc}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <Footer />
    </>
  );
}
