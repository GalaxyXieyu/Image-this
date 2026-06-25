/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ['class'],
    content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
  	extend: {
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))',
  				hover: 'var(--brand-text)'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			brand: {
  				DEFAULT: 'var(--brand)',
  				to: 'var(--brand-2)',
  				soft: 'var(--brand-soft)',
  				text: 'var(--brand-text)'
  			},
  			surface: {
  				DEFAULT: 'var(--surface)',
  				muted: 'var(--surface-2)',
  				glass: 'var(--glass)'
  			},
  			ink: {
  				DEFAULT: 'var(--ink)',
  				2: 'var(--ink-2)',
  				3: 'var(--ink-3)'
  			},
  			line: {
  				DEFAULT: 'var(--line-soft)',
  				strong: 'var(--line-strong)'
  			},
  			ok: 'var(--ok)',
  			warn: 'var(--warn)',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			ai: {
  				DEFAULT: '#7C3AED',
  				foreground: '#FFFFFF',
  				hover: '#6D28D9',
  				soft: '#EDE9FE',
  				light: '#DDD6FE'
  			},
  			success: {
  				DEFAULT: '#10B981',
  				foreground: '#FFFFFF',
  				soft: '#D1FAE5'
  			},
  			warning: {
  				DEFAULT: '#FBBF24',
  				foreground: '#0F172A',
  				soft: '#FEF3C7'
  			},
  			danger: {
  				DEFAULT: '#EF4444',
  				foreground: '#FFFFFF',
  				soft: '#FEE2E2'
  			},
  			processing: {
  				DEFAULT: '#7B5CFF',
  				foreground: '#FFFFFF',
  				soft: 'rgba(123, 92, 255, 0.14)'
  			}
  		},
  		fontFamily: {
  			sans: ['var(--font-sans)', 'var(--font-noto-sans-sc)', 'system-ui', '-apple-system', 'sans-serif'],
  			serif: ['var(--font-serif)', 'var(--font-noto-serif-sc)', 'Georgia', 'serif'],
  			mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
  		},
  		fontSize: {
  			'display': ['56px', { lineHeight: '1.1', letterSpacing: '-0.01em', fontWeight: '700' }],
  			'h1': ['56px', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '700' }],
  			'h2': ['32px', { lineHeight: '1.4', letterSpacing: '0', fontWeight: '600' }],
  			'h3': ['20px', { lineHeight: '1.3', letterSpacing: '0', fontWeight: '600' }],
  			'body': ['16px', { lineHeight: '1.75', letterSpacing: '0', fontWeight: '400' }],
  			'caption': ['12px', { lineHeight: '1.6', letterSpacing: '0', fontWeight: '400' }],
  			'data': ['14px', { lineHeight: '1.3', letterSpacing: '0', fontWeight: '500' }],
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)',
  			card: 'var(--radius-card)'
  		},
  		boxShadow: {
  			soft: 'var(--shadow-soft)',
  			float: 'var(--shadow-float)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
