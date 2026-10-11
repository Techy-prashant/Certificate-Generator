/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          midnight: "#191724",
          violet: "#7760B5",
          "violet-hover": "#654FA1",
          "violet-light": "#ECE7F6",
          ivory: "#F7F5F0",
          "ivory-dark": "#EFECE4",
          gold: "#D9C7A1",
        },
        neutral: {
          main: "#252330",
          secondary: "#6E6A78",
          subtle: "#E7E3EB",
          surface: "#F0EDF5",
          input: "#FFFFFF",
        },
        status: {
          success: {
            text: "#17653C",
            bg: "#E2F4E9",
            border: "#A3D9B8",
          },
          pending: {
            text: "#8C5800",
            bg: "#FFF0D7",
            border: "#F3D19C",
          },
          error: {
            text: "#A52A2A",
            bg: "#FBE5E5",
            border: "#F4AFAF",
          },
          info: {
            text: "#4A358A",
            bg: "#EBE5F7",
            border: "#C6B8EC",
          },
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};
