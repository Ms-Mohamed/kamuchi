import React, { useState, useRef, useEffect } from 'react';
import './GroupChatHub.css';

const MOCK_MESSAGES = [
    { id: 1, sender: 'System', text: 'Chat initialized.', type: 'system', timestamp: '09:00' },
    { id: 2, sender: 'Client', text: 'Hello, here is the info for my shipment.', type: 'text', timestamp: '09:05' },
];

const GroupChatHub = ({ reference, importId, accessCode, currentUserType = 'Worker', onAssignData }) => {
    const [messages, setMessages] = useState(MOCK_MESSAGES);
    const [inputText, setInputText] = useState('');
    const [detectedData, setDetectedData] = useState(null);
    const [isAttachOpen, setIsAttachOpen] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        const fetchMessages = async () => {
            if (!importId) return;
            try {
                const response = await fetch(`http://localhost:5000/api/chat/${importId}`);
                const result = await response.json();

                // Keep the system message + API messages
                const initialMsg = { id: Date.now(), senderType: 'System', text: `Chat connected to ${reference}`, type: 'system', timestamp: new Date() };
                setMessages([initialMsg, ...result]);
            } catch (err) {
                console.error("Failed to fetch chat:", err);
            }
        };
        fetchMessages();
    }, [reference, importId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const detectAvisInfo = (text) => {
        const matriculeMatch = text.match(/matricule\s*:?\s*([A-Z0-9-]+)/i);
        const portMatch = text.match(/port\s*:?\s*([A-Za-z]+ ?[A-Za-z]*)/i);
        const locationMatch = text.match(/location\s*:?\s*([A-Za-z0-9 ]+)(?:,|$|\n)/i);

        if (matriculeMatch || portMatch || locationMatch) {
            return {
                matricule: matriculeMatch ? matriculeMatch[1].trim() : null,
                port: portMatch ? portMatch[1].trim() : null,
                location: locationMatch ? locationMatch[1].trim() : null,
            };
        }
        return null;
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputText.trim()) return;

        const payload = {
            senderType: currentUserType,
            text: inputText,
            type: 'text',
            fileType: null
        };

        try {
            const res = await fetch(`http://localhost:5000/api/chat/${importId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const savedMsg = await res.json();
            setMessages([...messages, savedMsg]);
            setInputText('');

            // Simulate Client sending "Avis" text back shortly after
            if (inputText.toLowerCase().includes('avis')) {
                setTimeout(async () => {
                    const fakeAvis = "Here is the avis text: Matricule: 9876-B-12, Port: Tanger Med, Location: Zone Franche";

                    const clientPayload = { senderType: 'Client', text: fakeAvis, type: 'text', fileType: null };
                    const cRes = await fetch(`http://localhost:5000/api/chat/${importId}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(clientPayload)
                    });
                    const cSavedMsg = await cRes.json();

                    const extracted = detectAvisInfo(fakeAvis);
                    if (extracted) {
                        cSavedMsg.extractedData = extracted;
                    }

                    setMessages(prev => [...prev, cSavedMsg]);
                }, 1500);
            }
        } catch (err) {
            console.error("Failed to append message", err);
        }
    };

    const handleFileUpload = async (file, fileType) => {
        const formData = new FormData();
        formData.append('senderType', currentUserType);
        formData.append('text', `Uploaded file: ${file.name} (${fileType})`);
        formData.append('type', 'file');
        formData.append('fileType', fileType);
        formData.append('file', file);

        try {
            const res = await fetch(`http://localhost:5000/api/chat/${importId}`, {
                method: 'POST',
                // No 'Content-Type' header: browser automatically sets it with boundary for FormData
                body: formData
            });
            const savedMsg = await res.json();
            setMessages([...messages, savedMsg]);
        } catch (err) {
            console.error("File upload fail", err);
        }
    };

    const openFilePicker = (fileType) => {
        setIsAttachOpen(false);

        // Dynamically create an input to guarantee fresh state and avoid ref timing issues
        const input = document.createElement('input');
        input.type = 'file';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                handleFileUpload(file, fileType);
            }
        };
        input.click();
    };

    const highlightText = (text) => {
        // Simple bolding of keywords for the mockup
        const regex = /(matricule|port|location)/gi;
        const parts = text.split(regex);

        return parts.map((part, i) =>
            regex.test(part) ? <strong key={i} className="highlighted">{part}</strong> : part
        );
    };

    return (
        <div className="chat-hub card">
            <div className="chat-header">
                <div>
                    <h3>Chat: {reference}</h3>
                    {accessCode && <span className="access-code-badge">🔑 Code: {accessCode}</span>}
                </div>
                <span className="badge">Active</span>
            </div>

            <div className="chat-messages" ref={scrollRef}>
                {messages.map(msg => (
                    <div key={msg.id} className={`message-wrapper ${msg.senderType === currentUserType ? 'msg-own' : msg.senderType === 'System' ? 'msg-system' : 'msg-other'}`}>
                        <div className="message-bubble">
                            {msg.type === 'system' ? (
                                <span className="system-text">{msg.text}</span>
                            ) : (
                                <>
                                    <div className="message-sender">{msg.senderType}</div>
                                    <div className="message-content">
                                        {msg.extractedData ? highlightText(msg.text) : msg.text}
                                    </div>
                                    {msg.type === 'file' && (
                                        <div className="file-attachment">
                                            {msg.fileName ? (
                                                <a href={`http://localhost:5000/uploads/${msg.fileName}`} target="_blank" rel="noopener noreferrer">
                                                    <i className="file-icon">📄</i> {msg.text}
                                                </a>
                                            ) : (
                                                <span><i className="file-icon">📄</i> {msg.text}</span>
                                            )}
                                        </div>
                                    )}
                                    {msg.extractedData && (
                                        <div className="smart-detect-panel">
                                            <p>✨ <strong>Avis Data Detected!</strong></p>
                                            <ul>
                                                {msg.extractedData.matricule && <li>Matricule: {msg.extractedData.matricule}</li>}
                                                {msg.extractedData.port && <li>Port: {msg.extractedData.port}</li>}
                                                {msg.extractedData.location && <li>Location: {msg.extractedData.location}</li>}
                                            </ul>
                                            <button
                                                className="btn-primary"
                                                onClick={() => onAssignData(msg.extractedData)}
                                            >
                                                Assign to Table
                                            </button>
                                        </div>
                                    )}
                                    <div className="message-time">
                                        {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="chat-input-area">
                <form onSubmit={handleSendMessage} className="chat-form">
                    <div className="file-upload-dropdown">
                        <button
                            type="button"
                            className="btn-secondary attach-btn"
                            onClick={() => setIsAttachOpen(!isAttachOpen)}
                        >
                            📎
                        </button>
                        {isAttachOpen && (
                            <div className="dropdown-content">
                                <span onClick={() => openFilePicker('Avis')}>Upload Avis</span>
                                <span onClick={() => openFilePicker('Facture')}>Upload Facture</span>
                                <span onClick={() => openFilePicker('BL_file')}>Upload BL_file</span>
                                <span onClick={() => openFilePicker('Bon')}>Upload Bon</span>
                            </div>
                        )}
                    </div>
                    <input
                        type="text"
                        placeholder="Type a message... (hint: type 'send avis' to test smart detection)"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                    />
                    <button type="submit" className="btn-primary send-btn">Send</button>
                </form>
            </div>
        </div>
    );
};

export default GroupChatHub;
