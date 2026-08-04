import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      colors: {
        gray: {
          50: '#F7FBFE', 100: '#E9F5FD', 200: '#D6E8F3', 300: '#D6E8F3',
          400: '#7A91A3', 500: '#687783', 600: '#687783', 700: '#687783',
          800: '#17212B', 900: '#17212B', 950: '#17212B',
        },
        slate: {
          50: '#F7FBFE', 100: '#E9F5FD', 200: '#D6E8F3', 300: '#D6E8F3',
          400: '#7A91A3', 500: '#687783', 600: '#687783', 700: '#687783',
          800: '#17212B', 900: '#17212B', 950: '#17212B',
        },
        neutral: {
          50: '#F7FBFE', 100: '#E9F5FD', 200: '#D6E8F3', 300: '#D6E8F3',
          400: '#7A91A3', 500: '#687783', 600: '#687783', 700: '#687783',
          800: '#17212B', 900: '#17212B', 950: '#17212B',
        },
        zinc: {
          50: '#F7FBFE', 100: '#E9F5FD', 200: '#D6E8F3', 300: '#D6E8F3',
          400: '#7A91A3', 500: '#687783', 600: '#687783', 700: '#687783',
          800: '#17212B', 900: '#17212B', 950: '#17212B',
        },
        blue: {
          50: '#E9F5FD', 100: '#E9F5FD', 200: '#D9EEFA', 300: '#82CAF2',
          400: '#69B6E5', 500: '#4C9ED6', 600: '#4C9ED6', 700: '#327FB5',
          800: '#327FB5', 900: '#327FB5', 950: '#327FB5',
        },
        cyan: {
          50: '#E9F5FD', 100: '#E9F5FD', 200: '#D9EEFA', 300: '#82CAF2',
          400: '#69B6E5', 500: '#4C9ED6', 600: '#4C9ED6', 700: '#327FB5',
          800: '#327FB5', 900: '#327FB5', 950: '#327FB5',
        },
        sky: {
          50: '#E9F5FD', 100: '#E9F5FD', 200: '#D9EEFA', 300: '#82CAF2',
          400: '#69B6E5', 500: '#4C9ED6', 600: '#4C9ED6', 700: '#327FB5',
          800: '#327FB5', 900: '#327FB5', 950: '#327FB5',
        },
        teal: {
          50: '#E9F5FD', 100: '#D9EEFA', 200: '#D9EEFA', 300: '#82CAF2',
          400: '#69B6E5', 500: '#4C9ED6', 600: '#4C9ED6', 700: '#327FB5',
          800: '#327FB5', 900: '#327FB5', 950: '#327FB5',
        },
        green: {
          50: '#E9F5FD', 100: '#E9F5FD', 200: '#D9EEFA', 300: '#75B9A9',
          400: '#75B9A9', 500: '#35A28D', 600: '#35A28D', 700: '#35A28D',
          800: '#35A28D', 900: '#35A28D', 950: '#35A28D',
        },
        emerald: {
          50: '#E9F5FD', 100: '#E9F5FD', 200: '#D9EEFA', 300: '#75B9A9',
          400: '#75B9A9', 500: '#35A28D', 600: '#35A28D', 700: '#35A28D',
          800: '#35A28D', 900: '#35A28D', 950: '#35A28D',
        },
        red: {
          50: '#F7FBFE', 100: '#E9F5FD', 200: '#D6E8F3', 300: '#E8899A',
          400: '#E8899A', 500: '#B85C68', 600: '#B85C68', 700: '#B85C68',
          800: '#B85C68', 900: '#B85C68', 950: '#B85C68',
        },
        rose: {
          50: '#F7FBFE', 100: '#E9F5FD', 200: '#D6E8F3', 300: '#E8899A',
          400: '#E8899A', 500: '#B85C68', 600: '#B85C68', 700: '#B85C68',
          800: '#B85C68', 900: '#B85C68', 950: '#B85C68',
        },
        amber: {
          50: '#F7FBFE', 100: '#E9F5FD', 200: '#D9EEFA', 300: '#7A91A3',
          400: '#7A91A3', 500: '#7A91A3', 600: '#687783', 700: '#687783',
          800: '#687783', 900: '#687783', 950: '#687783',
        },
        'primary-teal': 'var(--primary-teal)',
        'primary-dark': 'var(--primary-dark)',
        'navy-blue': 'var(--navy-blue)',
        'hero-blue': 'var(--hero-blue)',
        'light-teal': 'var(--light-teal)',
        'light-cyan': 'var(--light-cyan)',
        'yellow-cream': 'var(--yellow-cream)',
        'salmon-peach': 'var(--salmon-peach)',
        'dark-gray': 'var(--dark-gray)',
        'light-bg': 'var(--light-bg)',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
export default config;
