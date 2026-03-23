/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                clinical: {
                    50: 'var(--clinical-50, #f0fdfa)',
                    100: 'var(--clinical-100, #ccfbf1)',
                    200: 'var(--clinical-200, #99f6e4)',
                    300: 'var(--clinical-300, #5eead4)',
                    400: 'var(--clinical-400, #2dd4bf)',
                    500: 'var(--clinical-500, #14b8a6)',
                    600: 'var(--clinical-600, #0d9488)',
                    700: 'var(--clinical-700, #0f766e)',
                    800: 'var(--clinical-800, #115e59)',
                    900: 'var(--clinical-900, #134e4a)',
                },
                brand: {
                    blue: '#111827',
                    green: '#10b981',
                    teal: '#14b8a6',
                }
            }
        },
    },
    plugins: [],
}
