import './Note.css';

function Note() {
    return (
        // Naya wrapper div jo card ko screen ke center mein rakhega
        <div className="note-container">
            <div className="privacy-guarantee-box">


                <div className="privacy-text-content">
                    <h4>100% Privacy & Session Note</h4>

                    <p>
                        <p>
                            <strong>No Databases. No Chat History.</strong> As a RAG-based
                            chatbot, your PDFs and documents are processed in real-time via Pinecone
                            & Gemini. We never save your data.
                        </p>
                    </p>

                </div>
            </div>
        </div>
    );
}

export default Note;