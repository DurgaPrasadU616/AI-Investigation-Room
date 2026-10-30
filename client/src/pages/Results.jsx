import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import Layout from '../components/Layout.jsx';
import api from '../api/client.js';

export default function Results() {
  const { id } = useParams(); const navigate = useNavigate(); const [record, setRecord] = useState(null); const [error, setError] = useState('');
  useEffect(() => { api.get(`/cases/${id}/result`).then(setRecord).catch((err) => { if (err.status === 403) navigate(`/case/${id}`, { replace: true }); else setError(err.message); }); }, [id, navigate]);
  if (error) return <Layout><section className="center-state"><h1>We couldn’t load the result.</h1><p>{error}</p><Link to={`/case/${id}`}>Return to the case</Link></section></Layout>;
  if (!record) return <Layout><section className="center-state"><h1>Opening the result…</h1></section></Layout>;
  const culprit = record.suspects.find((s) => s._id === record.solution.culpritSuspectId);
  return <Layout><section className="results-page"><div className={`verdict-icon ${record.accusation.correct ? 'correct' : 'incorrect'}`}>{record.accusation.correct ? <Check /> : <X />}</div><span className="eyebrow">CASE CLOSED</span><h1>{record.accusation.correct ? 'A sharp deduction.' : 'The details led elsewhere.'}</h1><p className="lede">The culprit was <strong>{culprit?.name}</strong>, {culprit?.role.toLowerCase()}.</p><article className="solution-panel"><div><span className="eyebrow">MOTIVE</span><p>{record.solution.motive}</p></div><div><span className="eyebrow">METHOD</span><p>{record.solution.method}</p></div><div><span className="eyebrow">HOW THE CLUES FIT</span><p>{record.solution.explanation}</p></div><div><span className="eyebrow">KEY CLUES</span><p>{record.clues.filter((c) => record.solution.keyClueIds.includes(c._id)).map((c) => c.title).join(' · ')}</p></div></article><section className="score-panel"><span className="eyebrow">YOUR SCORE</span><strong>{record.score.total}</strong><div><span>Accusation base <b>+{record.score.base}</b></span><span>Clues found <b>+{record.score.cluePoints}</b></span><span>Hints used <b>−{record.score.hintPenalty}</b></span></div></section><Link className="button button-primary" to="/create">Play again</Link></section></Layout>;
}
