import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import api from '../api/client.js';

export default function Accusation() {
  const { id } = useParams(); const navigate = useNavigate(); const [record, setRecord] = useState(null); const [suspectId, setSuspectId] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { api.get(`/cases/${id}`).then((data) => { setRecord(data); setSuspectId(data.suspects[0]?._id || ''); }).catch((err) => setError(err.message)); }, [id]);
  async function submit() { setBusy(true); setError(''); try { await api.post(`/cases/${id}/accuse`, { suspectId }); navigate(`/case/${id}/result`, { replace: true }); } catch (err) { setError(err.message); } finally { setBusy(false); } }
  return <Layout><section className="accusation-page"><Link className="text-link" to={`/case/${id}`}>← Back to investigation</Link><span className="eyebrow">FINAL DECISION</span><h1>Who did it?</h1><p className="lede">Review your deductions before making an accusation. One accusation per case.</p>{error && <div className="error-box" role="alert">{error}</div>}{!record ? <p>Loading suspects…</p> : <><div className="suspect-options">{record.suspects.map((s) => <label key={s._id}><input type="radio" name="suspect" value={s._id} checked={suspectId === s._id} onChange={() => setSuspectId(s._id)} /><span><strong>{s.name}</strong><small>{s.role} · {s.statedAlibi}</small></span></label>)}</div><div className="confirm-box">Your score is calculated from your clues and hints. The result will reveal the full solution.</div><button className="button button-primary full" disabled={!suspectId || busy} onClick={submit}>{busy ? 'Submitting accusation…' : 'Confirm accusation'}</button></>}</section></Layout>;
}
