export default function Footer() {
  return (
    <footer className="bg-green-900 text-green-200 mt-auto py-6">
      <div className="max-w-6xl mx-auto px-4 text-center text-sm">
        <p>© {new Date().getFullYear()} GreenVac Services. All rights reserved.</p>
        <p className="mt-1 text-green-400">
          Eco-friendly cleaning for a healthier home and planet.
        </p>
      </div>
    </footer>
  );
}
