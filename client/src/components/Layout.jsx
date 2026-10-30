import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

export default function Layout({ children }) {
  return <div className="app-shell"><header className="topbar"><Link className="brand" to="/"><span className="brand-mark"><Shield size={19} /></span><span>THE MYSTERY ROOM<small>FICTIONAL INVESTIGATIONS</small></span></Link></header><main>{children}</main><footer className="footer"><span>FICTIONAL CASE FILES · AGES 13+</span><span>NO CASE IS EVER THE SAME</span></footer></div>;
}
