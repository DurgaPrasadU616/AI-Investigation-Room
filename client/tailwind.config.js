/** @type {import('tailwindcss').Config} */
export default { content: ['./index.html', './src/**/*.{js,jsx}'], theme: { extend: { colors: { ink: '#11110f', panel: '#191916', paper: '#e9e2d3', amber: '#c99b52', rust: '#a5543b', muted: '#9b978d' }, fontFamily: { display: ['Georgia', 'serif'], body: ['Inter', 'Arial', 'sans-serif'], mono: ['"Courier New"', 'monospace'] } } }, plugins: [] };
