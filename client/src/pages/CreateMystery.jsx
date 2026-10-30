import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import Layout from '../components/Layout.jsx';
import api from '../api/client.js';

const levels = { easy: [3, 5, 2], medium: [4, 7, 3], hard: [5, 9, 3] };
const flavor = ['Tracing the first detail…', 'Building a cast of suspects…', 'Checking every clue…'];

export default function CreateMystery() {
  const [premise, setPremise] = useState('');
  const [difficulty, setDifficulty] = useState('easy');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);
  const [flavorIndex, setFlavorIndex] = useState(0);
  const navigate = useNavigate();
  const [suspects, clues, hints] = levels[difficulty];
  useEffect(() => {
    if (!loading) return undefined;
    const timer = setInterval(() => setFlavorIndex((current) => (current + 1) % flavor.length), 2200);
    return () => clearInterval(timer);
  }, [loading]);

  async function submit(event) {
    event.preventDefault();
    setLoading(true); setSlow(false); setError(''); setFlavorIndex(0);
    const timer = setTimeout(() => setSlow(true), 8000);
    try {
      const record = await api.post('/cases', { premise, difficulty });
      navigate(`/case/${record._id}`, { replace: true });
    } catch (err) { setError(err.message || 'The case file got lost. Try again.'); }
    finally { clearTimeout(timer); setLoading(false); }
  }

  return <Layout><section className="create-page">
    <button className="text-link" onClick={() => navigate('/')}><ArrowLeft size={15} /> Home</button>
    <div className="create-heading"><span className="eyebrow">OPEN A NEW FILE</span><h1>Set the scene.</h1><p>Give the case writer a starting point. Every mystery is fictional and built around your premise.</p></div>
    {loading ? <div className="creation-card loading-card"><Sparkles className="amber" /><span className="eyebrow">CASE GENERATION</span><h2>{flavor[flavorIndex]}</h2><p>{slow ? 'Waking up the server. Your case is still being prepared…' : 'A fair mystery takes a moment to assemble.'}</p><div className="loading-line" /></div> : <form className="creation-card" onSubmit={submit}>
      <label htmlFor="premise">Your scenario</label><textarea id="premise" value={premise} onChange={(e) => setPremise(e.target.value)} minLength={20} maxLength={500} placeholder="A valuable object vanished from a quiet place…" required /><div className="field-foot"><span>Keep it fictional; no real people or graphic violence.</span><span>{premise.length}/500</span></div>
      <div className="form-row"><label>Difficulty<select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label><div className="difficulty-counts"><span>{suspects} suspects</span><span>{clues} clues</span><span>{hints} hints</span></div></div>
      {error && <div className="error-box" role="alert">{error}</div>}<button className="button button-primary full" disabled={premise.trim().length < 20}><span>{error ? 'Retry generation' : 'Generate mystery'}</span><ArrowRight size={16} /></button><small className="privacy-note">No account needed · One accusation per case</small>
    </form>}
  </section></Layout>;
}
