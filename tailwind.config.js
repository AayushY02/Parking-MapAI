/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        mist: "#e2e8f0",
        tide: "#0ea5e9",
        ember: "#f97316",
        leaf: "#22c55e",
        sun: "#facc15",
      },
      boxShadow: {
        glow: "0 10px 30px rgba(15, 23, 42, 0.2)",
      },
    },
  },
  plugins: [],
};
