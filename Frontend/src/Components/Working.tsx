import { FaBrain, FaComments, FaUpload } from 'react-icons/fa';
import "./Working.css"

function Working() {
    const steps = [
        {
            number: "01",
            icon: <FaUpload />,
            title: "Upload your documents",
            desc: "Drop in any PDF, research paper, report, or doc. We handle multi-file uploads and large documents easily.",
        },
        {
            number: "02",
            icon: <FaBrain />,
            title: "AI indexes everything",
            desc: "Our pipeline chunks and stores your content in a vector database — text, tables, and charts are all understood.",
        },
        {
            number: "03",
            icon: <FaComments />,
            title: "Ask anything, get answers",
            desc: "Type a question in plain language. DocuMind retrieves relevant passages and generates cited responses.",
        },
    ];

    return (
        <section className="section-how">
            <div className="section-inner">
                <div className="section-label">How it works</div>
                <h2 className="section-title">
                    From upload to answer in <em>seconds</em>
                </h2>
                <p className="section-sub">
                    No setup, no configuration. Just drop your documents and start asking questions
                    to unlock instant AI-driven insights from your data.
                </p>
                <div className="steps-grid">
                    {steps.map((step) => (
                        <div className="step-card" key={step.number}>
                            <div className="step-top">
                                <span className="step-number">{step.number}</span>
                                <span className="step-icon">{step.icon}</span>
                            </div>
                            <h3 className="step-title">{step.title}</h3>
                            <p className="step-desc">{step.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

export default Working;