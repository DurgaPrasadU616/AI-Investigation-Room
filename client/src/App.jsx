import { Link, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import CreateMystery from './pages/CreateMystery.jsx';
import CaseRoom from './pages/CaseRoom.jsx';
import Accusation from './pages/Accusation.jsx';
import Results from './pages/Results.jsx';

export default function App() {
  return <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/create" element={<CreateMystery />} />
    <Route path="/case/:id" element={<CaseRoom />} />
    <Route path="/case/:id/accuse" element={<Accusation />} />
    <Route path="/case/:id/result" element={<Results />} />
    <Route path="*" element={<Layout><section className="center-state"><h1>Page not found</h1><Link to="/">Return home</Link></section></Layout>} />
  </Routes>;
}
