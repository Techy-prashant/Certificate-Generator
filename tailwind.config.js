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
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "SF Pro Text", "SF Pro Display", "Segoe UI", "Roboto", "sans-serif"],
      },
      boxShadow: {
        '2xs': '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'xs': '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        'mac-panel': '0 8px 30px -4px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.03)',
        'mac-window': '0 18px 45px -10px rgba(0, 0, 0, 0.1), 0 8px 16px -8px rgba(0, 0, 0, 0.05)',
        'mac-floating': '0 24px 60px -12px rgba(0, 0, 0, 0.18)',
        'spotlight': '0 0 35px -5px rgba(119, 96, 181, 0.22)',
      },
      borderRadius: {
        'mac-sm': '10px',
        'mac-md': '14px',
        'mac-lg': '18px',
        'mac-xl': '22px',
      },
      transitionTimingFunction: {
        'mac-spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
