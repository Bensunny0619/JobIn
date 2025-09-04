/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
  extend: {
    colors: {
      brand: {
        blue: "#2563EB",
        green: "#10B931",
        purple: "#7C3AED",
        light: "#F3F4F6",
        red: "#EF4444",
      }
    },
    fontFamily: {
      sans: ["Inter", "sans-serif"],
      heading: ["Poppins", "sans-serif"],
    }
  },
},
  plugins: [],
}

