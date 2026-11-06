import './Note.css';

function Note() {
    return (
        // Naya wrapper div jo card ko screen ke center mein rakhega
        <div className="note-container">
            <div className="privacy-guarantee-box">


                <div className="privacy-text-content">
                    <h4>Privacy & Session Note</h4>
                    <p>
                        <strong>No server-side chat history.</strong> Chat messages stay in your
                        browser session. Document content is processed with Gemini and indexed in
                        Pinecone so DocuMind can retrieve it while answering questions.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Note;