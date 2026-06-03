import { FaBolt, FaBrain, FaChartBar, FaFileAlt, FaLock, FaSearch } from 'react-icons/fa';
import "./Feature.css"

export default function Feature() {
    const features = [
        { icon: <FaSearch />, title: "Semantic search", desc: "Understands the meaning behind your question, not just keywords." },
        { icon: <FaChartBar />, title: "Multi-modal", desc: "Reads text, interprets data tables, and extracts insights from charts." },
        { icon: <FaFileAlt />, title: "Smart chunking", desc: "Documents are split logically to keep the context accurate." },
        { icon: <FaLock />, title: "Private by design", desc: "Your files stay yours. No training on your private data." },
        { icon: <FaBolt />, title: "Instant retrieval", desc: "Sub-second search across thousands of pages instantly." },
        { icon: <FaBrain />, title: "Gemini Pro", desc: "Powered by Google's frontier-level reasoning engine." },
    ];
    
    return (
        <section className="section-how">
            <div className="section-inner">
                <div className="section-label">Features</div>
                <h2 className="section-title">Everything you need for <em>deep analysis</em></h2>
                <p className="section-sub">
                    Unlock insights from your PDFs and documents with powerful AI reasoning.
                    Fast, secure, and designed for deep contextual analysis.
                </p>
                <div className="features-grid">
                    {features.map((feat, idx) => (
                        <div className="feature-card" key={idx}>
                            <div className="feat-icon">{feat.icon}</div>
                            <h3 className="feat-title">{feat.title}</h3>
                            <p className="feat-desc">{feat.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
