import type {Config} from 'tailwindcss';

/**
 * Sistema de diseño Estratega 360 — tema TailAdmin.
 *
 * - Los tokens semánticos (primary, background, sidebar-*, ...) siguen leyendo
 *   las variables CSS HSL definidas en `src/app/globals.css`, por lo que los
 *   componentes existentes de shadcn/ui no se rompen.
 * - Se añade, de forma aditiva, la escala cromática completa de TailAdmin
 *   (brand / gray / blue-light / orange / success / error / warning / theme-*)
 *   con sus valores hexadecimales oficiales, junto con las sombras y la escala
 *   tipográfica del tema.
 */
export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      screens: {
        '2xsm': '375px',
        xsm: '425px',
        '3xl': '2000px',
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        body: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        headline: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        outfit: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        code: ['monospace'],
      },
      fontSize: {
        // Escala tipográfica TailAdmin
        'theme-xs': ['0.75rem', {lineHeight: '1.125rem'}], // 12/18
        'theme-sm': ['0.875rem', {lineHeight: '1.25rem'}], // 14/20
        'theme-xl': ['1.25rem', {lineHeight: '1.875rem'}], // 20/30
        'title-sm': ['1.875rem', {lineHeight: '2.375rem'}], // 30/38
        'title-md': ['2.25rem', {lineHeight: '2.75rem'}], // 36/44
        'title-lg': ['3rem', {lineHeight: '3.75rem'}], // 48/60
        'title-xl': ['3.75rem', {lineHeight: '4.5rem'}], // 60/72
        'title-2xl': ['4.5rem', {lineHeight: '5.625rem'}], // 72/90
      },
      boxShadow: {
        'theme-xs': '0px 1px 2px 0px rgba(16, 24, 40, 0.05)',
        'theme-sm':
          '0px 1px 3px 0px rgba(16, 24, 40, 0.1), 0px 1px 2px 0px rgba(16, 24, 40, 0.06)',
        'theme-md':
          '0px 4px 8px -2px rgba(16, 24, 40, 0.1), 0px 2px 4px -2px rgba(16, 24, 40, 0.06)',
        'theme-lg':
          '0px 12px 16px -4px rgba(16, 24, 40, 0.08), 0px 4px 6px -2px rgba(16, 24, 40, 0.03)',
        'theme-xl':
          '0px 20px 24px -4px rgba(16, 24, 40, 0.08), 0px 8px 8px -4px rgba(16, 24, 40, 0.03)',
        'focus-ring': '0px 0px 0px 4px rgba(70, 95, 255, 0.12)',
        tooltip:
          '0px 4px 6px -2px rgba(16, 24, 40, 0.05), -8px 0px 20px 8px rgba(16, 24, 40, 0.05)',
      },
      colors: {
        // ---- Tokens semánticos (variables CSS, no tocar los nombres) ----
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        canvas: 'hsl(var(--canvas))',
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
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          muted: 'hsl(var(--sidebar-muted))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },

        // ---- Paleta TailAdmin (aditiva) ----
        brand: {
          DEFAULT: '#465fff',
          25: '#f2f7ff',
          50: '#ecf3ff',
          100: '#dde9ff',
          200: '#c2d6ff',
          300: '#9cb9ff',
          400: '#7592ff',
          500: '#465fff',
          600: '#3641f5',
          700: '#2a31d8',
          800: '#252dae',
          900: '#262e89',
          950: '#161950',
        },
        gray: {
          DEFAULT: '#667085',
          25: '#fcfcfd',
          50: '#f9fafb',
          100: '#f2f4f7',
          200: '#e4e7ec',
          300: '#d0d5dd',
          400: '#98a2b3',
          500: '#667085',
          600: '#475467',
          700: '#344054',
          800: '#1d2939',
          900: '#101828',
          950: '#0c111d',
          dark: '#1a2231',
        },
        'blue-light': {
          DEFAULT: '#0ba5ec',
          25: '#f5fbff',
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#b9e6fe',
          300: '#7cd4fd',
          400: '#36bffa',
          500: '#0ba5ec',
          600: '#0086c9',
          700: '#026aa2',
          800: '#065986',
          900: '#0b4a6f',
          950: '#062c41',
        },
        orange: {
          DEFAULT: '#fb6514',
          25: '#fffaf5',
          50: '#fff6ed',
          100: '#ffead5',
          200: '#fddcab',
          300: '#feb273',
          400: '#fd853a',
          500: '#fb6514',
          600: '#ec4a0a',
          700: '#c4320a',
          800: '#9c2a10',
          900: '#7e2410',
          950: '#511c10',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
          25: '#f6fef9',
          50: '#ecfdf3',
          100: '#d1fadf',
          200: '#a6f4c5',
          300: '#6ce9a6',
          400: '#32d583',
          500: '#12b76a',
          600: '#039855',
          700: '#027a48',
          800: '#05603a',
          900: '#054f31',
          950: '#053321',
        },
        error: {
          DEFAULT: '#f04438',
          25: '#fffbfa',
          50: '#fef3f2',
          100: '#fee4e2',
          200: '#fecdca',
          300: '#fda29b',
          400: '#f97066',
          500: '#f04438',
          600: '#d92d20',
          700: '#b42318',
          800: '#912018',
          900: '#7a271a',
          950: '#55160c',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
          25: '#fffcf5',
          50: '#fffaeb',
          100: '#fef0c7',
          200: '#fedf89',
          300: '#fec84b',
          400: '#fdb022',
          500: '#f79009',
          600: '#dc6803',
          700: '#b54708',
          800: '#93370d',
          900: '#7a2e0e',
          950: '#4e1d09',
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          foreground: 'hsl(var(--info-foreground))',
        },
        'theme-pink': {
          DEFAULT: '#ee46bc',
          500: '#ee46bc',
        },
        'theme-purple': {
          DEFAULT: '#7a5af8',
          500: '#7a5af8',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
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
} satisfies Config;
