/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  safelist: [
    'bg-emerald-100', 'text-emerald-800', 'border-emerald-200',
    'bg-amber-100', 'text-amber-800', 'border-amber-200',
    'bg-red-100', 'text-red-800', 'border-red-200',
    'bg-sky-100', 'text-sky-800', 'border-sky-200',
    'bg-slate-100', 'text-slate-700', 'border-slate-200',
    'bg-forest', 'bg-warmbrown', 'bg-gold', 'text-forest', 'text-warmbrown', 'text-gold',
  ],
  theme: {
    extend: {
      colors: {
        forest: '#3A6B52',
        warmbrown: '#8B6B4A',
        gold: '#D8B25A',
        cream: '#F7F6F2',
        card: '#FFFFFF',
        ink: '#333333',
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        soft: '0 10px 30px rgba(58, 107, 82, 0.08)',
        card: '0 8px 24px rgba(0, 0, 0, 0.06)',
      },
    },
  },
  plugins: [],
}
