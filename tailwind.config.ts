import type { Config } from 'tailwindcss';
const config: Config = {content:['./app/**/*.{ts,tsx}','./components/**/*.{ts,tsx}','./lib/**/*.{ts,tsx}'],theme:{extend:{fontFamily:{display:['Inter','system-ui','sans-serif']},boxShadow:{glow:'0 0 40px rgba(253,224,105,.18)'}}},plugins:[]};
export default config;
