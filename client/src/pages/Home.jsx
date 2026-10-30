import { Link } from 'react-router-dom';
import { ArrowRight, Fingerprint, Search, Sparkles } from 'lucide-react';
import Layout from '../components/Layout.jsx';

export default function Home() {
  return <Layout><div className="home-page"><section className="home-intro"><div className="case-number"><span>INDEPENDENT INVESTIGATIONS</span><span>EST. AFTER DARK</span></div><span className="eyebrow"><span className="live-dot" /> A NEW CASE EVERY TIME</span><h1>Truth hides in<br /><em>the details.</em></h1><p>Imagine the mystery. Follow the clues. Decide who did it.</p><Link className="button button-primary" to="/create">Start <ArrowRight size={16} /></Link></section><section className="home-steps" aria-label="How it works"><article><Sparkles size={18} /><span className="eyebrow">01 · SET THE SCENE</span><h2>Give us a premise.</h2><p>Choose the kind of mystery you want to solve.</p></article><article><Search size={18} /><span className="eyebrow">02 · READ THE CLUES</span><h2>Look closer.</h2><p>Discover evidence and ask for a nudge when you need one.</p></article><article><Fingerprint size={18} /><span className="eyebrow">03 · MAKE YOUR CALL</span><h2>Name the culprit.</h2><p>Your deductions decide the final score.</p></article></section></div></Layout>;
}
