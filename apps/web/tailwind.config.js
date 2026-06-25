/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        solana: {
          purple: "#9945FF",
          green: "#14F195",
          dark: "#0d0d12",
          card: "#16161f",
          border: "#2a2a3a",
        },
      },
    },
  },
  plugins: [],
};
