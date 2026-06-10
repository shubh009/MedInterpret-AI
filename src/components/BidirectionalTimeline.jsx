import React, { useState, useEffect, useRef } from 'react';
import MicButton from './MicButton';
import TimelineEntry from './TimelineEntry';
import LoadingState from './LoadingState';
import TestingPlayground from './TestingPlayground';
import { createSpeechRecognition } from '../services/speechService';
import { interpretPatientSpeech, translateText } from '../services/openrouterService';

const PATIENT_LANGUAGES = [
  { code: 'kn-IN', name: 'Kannada', icon: '💛' },
  { code: 'hi-IN', name: 'Hindi', icon: '🇮🇳' },
  { code: 'mr-IN', name: 'Marathi', icon: '🇮🇳' }
];

export default function BidirectionalTimeline() {
  // Config & View State
  const [patientLang, setPatientLang] = useState('kn-IN');
  const [showPlayground, setShowPlayground] = useState(false);
  const [timeline, setTimeline] = useState([]);
  
  // Input Transcripts
  const [patientTranscript, setPatientTranscript] = useState('');
  const [doctorTranscript, setDoctorTranscript] = useState('');

  // Status & Loaders
  const [activeSpeaker, setActiveSpeaker] = useState(null); // 'patient' | 'doctor' | null
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recogStatus, setRecogStatus] = useState('Idle');

  const recognitionRef = useRef(null);
  const timelineEndRef = useRef(null);

  // Auto-scroll to bottom of timeline when entries update
  useEffect(() => {
    if (timelineEndRef.current) {
      timelineEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [timeline, isLoading]);

  // Handle Speech Recognition setup based on speaker and language
  const startRecording = (speaker) => {
    if (isRecording) {
      stopRecording();
      return;
    }

    setError(null);
    setActiveSpeaker(speaker);
    setIsRecording(true);

    const langCode = speaker === 'patient' ? patientLang : 'en-US';
    const langName = speaker === 'patient' 
      ? PATIENT_LANGUAGES.find(l => l.code === patientLang).name 
      : 'English';

    setRecogStatus(`Listening to ${langName}...`);

    try {
      const recognition = createSpeechRecognition({
        onResult: (text) => {
          if (speaker === 'patient') {
            setPatientTranscript(text);
          } else {
            setDoctorTranscript(text);
          }
        },
        onEnd: () => {
          setIsRecording(false);
          setActiveSpeaker(null);
          setRecogStatus('Finished recording');
        },
        onError: (errMessage) => {
          setError(`Speech Error: ${errMessage}`);
          setIsRecording(false);
          setActiveSpeaker(null);
          setRecogStatus('Error');
        }
      });

      if (recognition.supported) {
        // Force the recognition language config
        if (window.webkitSpeechRecognition || window.SpeechRecognition) {
          const rawRecog = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
          rawRecog.lang = langCode;
          rawRecog.continuous = true;
          rawRecog.interimResults = true;
          
          rawRecog.onresult = (event) => {
            let finalText = "";
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                finalText += event.results[i][0].transcript + " ";
              }
            }
            if (finalText.trim()) {
              if (speaker === 'patient') {
                setPatientTranscript(finalText.trim());
              } else {
                setDoctorTranscript(finalText.trim());
              }
            }
          };

          rawRecog.onerror = (e) => {
            setError(`Recognition error: ${e.error}`);
            setIsRecording(false);
            setActiveSpeaker(null);
          };

          rawRecog.onend = () => {
            setIsRecording(false);
            setActiveSpeaker(null);
          };

          recognitionRef.current = rawRecog;
          rawRecog.start();
        } else {
          recognitionRef.current = recognition;
          recognition.start();
        }
      } else {
        setError("Web Speech API is not supported in this browser. Please use Chrome.");
        setIsRecording(false);
        setActiveSpeaker(null);
      }
    } catch (err) {
      setError(`Failed to start recording: ${err.message}`);
      setIsRecording(false);
      setActiveSpeaker(null);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsRecording(false);
    setActiveSpeaker(null);
    setRecogStatus('Idle');
  };

  // Process Patient speech entry (Patient to Doctor)
  const submitPatientSpeech = async (customText) => {
    const textToProcess = customText || patientTranscript;
    if (!textToProcess || !textToProcess.trim()) {
      setError("Patient speech transcript is empty.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const selectedLangObj = PATIENT_LANGUAGES.find(l => l.code === patientLang);

    try {
      const summary = await interpretPatientSpeech(textToProcess, selectedLangObj.name);
      
      const newEntry = {
        id: Date.now().toString(),
        sender: 'patient',
        originalText: textToProcess,
        translatedText: summary.doctorExplanation,
        symptoms: summary.symptoms,
        languageName: selectedLangObj.name,
        langCode: patientLang
      };

      setTimeline(prev => [...prev, newEntry]);
      setPatientTranscript('');
    } catch (err) {
      setError(`Interpretation failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Process Doctor speech entry (Doctor to Patient)
  const submitDoctorSpeech = async () => {
    if (!doctorTranscript || !doctorTranscript.trim()) {
      setError("Doctor advice transcript is empty.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const selectedLangObj = PATIENT_LANGUAGES.find(l => l.code === patientLang);

    try {
      const translation = await translateText(doctorTranscript, selectedLangObj.name);

      const newEntry = {
        id: Date.now().toString(),
        sender: 'doctor',
        originalText: doctorTranscript,
        translatedText: translation,
        languageName: 'English',
        langCode: patientLang,
        autoPlay: true // Signals TimelineEntry to trigger voice playback on load
      };

      setTimeline(prev => [...prev, newEntry]);
      setDoctorTranscript('');
    } catch (err) {
      setError(`Doctor translation failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Playground simulation helpers
  const handleSimulateText = (simText) => {
    setPatientTranscript(simText);
    submitPatientSpeech(simText);
  };

  const handleSetTranscript = (text) => {
    setPatientTranscript(text);
    setError(null);
  };

  const handleClearTimeline = () => {
    setTimeline([]);
    setPatientTranscript('');
    setDoctorTranscript('');
    setError(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Header Control Bar */}
      <div 
        className="glass-panel" 
        style={{
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          background: 'rgba(255, 255, 255, 0.02)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {/* Patient Language Select */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>Patient Language:</span>
            <select
              value={patientLang}
              onChange={(e) => setPatientLang(e.target.value)}
              disabled={isLoading || isRecording}
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#2dd4bf',
                padding: '6px 12px',
                borderRadius: '6px',
                outline: 'none',
                fontSize: '13px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              {PATIENT_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.name} {lang.icon}
                </option>
              ))}
            </select>
          </div>

          {/* Doctor Language fixed label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>Doctor Language:</span>
            <span style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#38bdf8', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: '600' }}>
              English 🇺🇸
            </span>
          </div>
        </div>

        {/* Global Controls */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setShowPlayground(!showPlayground)}
            style={{
              background: showPlayground ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: showPlayground ? 'white' : '#2dd4bf',
              padding: '6px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          >
            🧪 Test Playground
          </button>
          
          {timeline.length > 0 && (
            <button
              onClick={handleClearTimeline}
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#f87171',
                padding: '6px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
            >
              Clear Conversation
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Left is Timeline, Right is Playground (if toggled) */}
      <div style={{ display: 'grid', gridTemplateColumns: showPlayground ? '1.2fr 0.8fr' : '1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Timeline Desktop Container */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Timeline Feed Panel */}
          <div 
            className="glass-panel" 
            style={{
              padding: '24px',
              minHeight: '400px',
              maxHeight: '500px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              background: 'rgba(10, 13, 20, 0.6)'
            }}
          >
            {timeline.length === 0 && !isLoading ? (
              <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                <span style={{ fontSize: '40px' }}>💬</span>
                <span style={{ fontSize: '15px' }}>No conversation turns yet. Record the patient's concern below to start!</span>
              </div>
            ) : (
              timeline.map(entry => (
                <TimelineEntry key={entry.id} entry={entry} />
              ))
            )}
            
            {isLoading && <LoadingState />}
            
            <div ref={timelineEndRef} />
          </div>

          {/* Active Error Panel */}
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#f87171',
              padding: '12px 16px',
              borderRadius: '8px',
              textAlign: 'left',
              fontSize: '14px'
            }}>
              <strong>⚠️ Error Alert:</strong> {error}
            </div>
          )}

          {/* Recording Control Desk (Side-by-Side Patient & Doctor consoles) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }} className="main-grid">
            
            {/* Patient Console */}
            <div 
              className="glass-panel" 
              style={{
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                borderTop: '3px solid #06b6d4',
                background: activeSpeaker === 'patient' ? 'rgba(6, 182, 212, 0.02)' : 'rgba(255, 255, 255, 0.01)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#06b6d4', textTransform: 'uppercase' }}>Patient Console</span>
                {activeSpeaker === 'patient' && <span style={{ fontSize: '12px', color: '#ef4444', animation: 'pulse 1.5s infinite' }}>🎙️ Listening...</span>}
              </div>

              {/* Mic Area */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '10px 0' }}>
                <MicButton
                  isRecording={isRecording && activeSpeaker === 'patient'}
                  onToggle={() => startRecording('patient')}
                  disabled={isLoading || (isRecording && activeSpeaker !== 'patient')}
                />
              </div>

              {/* Text Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <textarea
                  placeholder="Patient speech transcript will appear here. Edit directly if needed..."
                  value={patientTranscript}
                  onChange={(e) => setPatientTranscript(e.target.value)}
                  disabled={isLoading || (isRecording && activeSpeaker === 'patient')}
                  style={{
                    width: '100%',
                    height: '80px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: '#f1f5f9',
                    fontSize: '15px',
                    resize: 'none',
                    outline: 'none'
                  }}
                />
                
                {patientTranscript && !isRecording && (
                  <button
                    onClick={() => submitPatientSpeech()}
                    disabled={isLoading}
                    style={{
                      background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                      color: 'white',
                      border: 'none',
                      padding: '8px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '13px',
                      transition: 'all 0.2s'
                    }}
                  >
                    Send to Doctor ➔
                  </button>
                )}
              </div>
            </div>

            {/* Doctor Console */}
            <div 
              className="glass-panel" 
              style={{
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                borderTop: '3px solid #10b981',
                background: activeSpeaker === 'doctor' ? 'rgba(16, 185, 129, 0.02)' : 'rgba(255, 255, 255, 0.01)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#10b981', textTransform: 'uppercase' }}>Doctor Console</span>
                {activeSpeaker === 'doctor' && <span style={{ fontSize: '12px', color: '#ef4444', animation: 'pulse 1.5s infinite' }}>🎙️ Listening...</span>}
              </div>

              {/* Mic Area */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '10px 0' }}>
                <MicButton
                  isRecording={isRecording && activeSpeaker === 'doctor'}
                  onToggle={() => startRecording('doctor')}
                  disabled={isLoading || (isRecording && activeSpeaker !== 'doctor')}
                />
              </div>

              {/* Text Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <textarea
                  placeholder="Doctor English advice transcript will appear here. Edit directly if needed..."
                  value={doctorTranscript}
                  onChange={(e) => setDoctorTranscript(e.target.value)}
                  disabled={isLoading || (isRecording && activeSpeaker === 'doctor')}
                  style={{
                    width: '100%',
                    height: '80px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: '#f1f5f9',
                    fontSize: '15px',
                    resize: 'none',
                    outline: 'none'
                  }}
                />
                
                {doctorTranscript && !isRecording && (
                  <button
                    onClick={submitDoctorSpeech}
                    disabled={isLoading}
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      border: 'none',
                      padding: '8px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '13px',
                      transition: 'all 0.2s'
                    }}
                  >
                    Send to Patient ➔
                  </button>
                )}
              </div>
            </div>

          </div>

        </div>

        {/* Dynamic Testing Playground Sidebar */}
        {showPlayground && (
          <div style={{ animation: 'slideIn 0.3s ease-out forwards' }}>
            <TestingPlayground 
              onSimulateText={handleSimulateText} 
              onSetTranscript={handleSetTranscript}
            />
          </div>
        )}

      </div>
    </div>
  );
}
