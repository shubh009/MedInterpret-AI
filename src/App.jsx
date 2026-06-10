import React, { useState, useEffect, useRef } from 'react';
import MicButton from './components/MicButton';
import ResultCard from './components/ResultCard';
import LoadingState from './components/LoadingState';
import TestingPlayground from './components/TestingPlayground';
import BidirectionalTimeline from './components/BidirectionalTimeline';
import { createSpeechRecognition } from './services/speechService';
import { interpretPatientSpeech } from './services/openrouterService';

export default function App() {
  const [currentView, setCurrentView] = useState('simple'); // 'simple' | 'bidirectional'
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [recogStatus, setRecogStatus] = useState('Idle');
  
  const recognitionRef = useRef(null);

  // Initialize Speech Recognition on mount
  useEffect(() => {
    const recog = createSpeechRecognition({
      onResult: (text) => {
        setTranscript(text);
      },
      onEnd: () => {
        setIsRecording(false);
        setRecogStatus('Finished recording');
      },
      onError: (errMessage) => {
        setError(`Speech error: ${errMessage}`);
        setIsRecording(false);
        setRecogStatus('Error');
      }
    });

    recognitionRef.current = recog;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Update body class for lighting background effect during speaking
  useEffect(() => {
    if (isRecording) {
      document.body.classList.add('is-speaking');
    } else {
      document.body.classList.remove('is-speaking');
    }
  }, [isRecording]);

  // Toggle speech recording
  const handleToggleRecord = () => {
    if (!recognitionRef.current) return;

    setError(null);
    if (isRecording) {
      recognitionRef.current.stop();
      setRecogStatus('Stopping...');
    } else {
      setTranscript('');
      setResult(null);
      recognitionRef.current.start();
      setIsRecording(true);
      setRecogStatus('Listening (Speak Kannada)...');
    }
  };

  // Run AI Interpretation on the current transcript
  const handleInterpret = async (textToInterpret) => {
    const queryText = textToInterpret || transcript;
    if (!queryText || !queryText.trim()) {
      setError("Please speak or enter some Kannada text first.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const translationResult = await interpretPatientSpeech(queryText);
      setResult(translationResult);
    } catch (err) {
      setError(err.message || "Something went wrong while interpreting the text.");
    } finally {
      setIsLoading(false);
    }
  };

  // Simulation handlers from playground
  const handleSimulateText = (simulatedText) => {
    setTranscript(simulatedText);
    handleInterpret(simulatedText);
  };

  const handleSetTranscript = (text) => {
    setTranscript(text);
    setError(null);
    setResult(null);
  };

  // Clear all states
  const handleClear = () => {
    setTranscript('');
    setResult(null);
    setError(null);
    setRecogStatus('Idle');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', padding: '10px 0' }}>
      
      {/* Premium Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '28px' }}>🩺</span>
            <h1 style={{ display: 'inline' }}>MedInterpret AI</h1>
            <span style={{ background: 'rgba(13, 148, 136, 0.1)', color: '#2dd4bf', border: '1px solid rgba(13, 148, 136, 0.3)', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '500' }}>
              Kannada ⇄ English MVP
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginTop: '6px', textAlign: 'left' }}>
            Clinically-tuned medical interpreter bridge for students and practitioners.
          </p>
        </div>
        
        {/* Reset button (Only shown in simple view and active states) */}
        {currentView === 'simple' && (transcript || result || error) && (
          <button 
            onClick={handleClear}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'var(--text-main)',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
            onMouseOut={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.05)'}
          >
            Clear Screen
          </button>
        )}
      </header>

      {/* View Tabs Selector */}
      <div 
        style={{ 
          display: 'flex', 
          gap: '12px', 
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)', 
          paddingBottom: '1px' 
        }}
      >
        <button
          onClick={() => setCurrentView('simple')}
          style={{
            background: currentView === 'simple' ? 'rgba(6, 182, 212, 0.08)' : 'transparent',
            border: 'none',
            borderBottom: currentView === 'simple' ? '3px solid #06b6d4' : '3px solid transparent',
            color: currentView === 'simple' ? '#22d3ee' : 'var(--text-muted)',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
            borderRadius: '6px 6px 0 0'
          }}
        >
          🔀 Single-Way Interpreter
        </button>
        <button
          onClick={() => setCurrentView('bidirectional')}
          style={{
            background: currentView === 'bidirectional' ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
            border: 'none',
            borderBottom: currentView === 'bidirectional' ? '3px solid #10b981' : '3px solid transparent',
            color: currentView === 'bidirectional' ? '#34d399' : 'var(--text-muted)',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
            borderRadius: '6px 6px 0 0'
          }}
        >
          🔄 Bidirectional Consultation Timeline
        </button>
      </div>

      {currentView === 'simple' ? (
        /* Main Grid Layout - Simple View */
        <main style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)', gap: '30px', alignItems: 'start' }} className="main-grid">
          
          {/* Left Column - Core App Flow */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Patient Speech Card */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'center' }}>
              <div style={{ textAlign: 'left', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '12px' }}>
                <h2 className="sub-heading">Patient Speech Area</h2>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Click the microphone to start recording Kannada speech.
                </p>
              </div>

              {/* Mic and Glow */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <MicButton 
                  isRecording={isRecording} 
                  onToggle={handleToggleRecord} 
                  disabled={isLoading}
                />
                <span style={{ 
                  fontSize: '13px', 
                  color: isRecording ? '#ef4444' : 'var(--text-muted)', 
                  fontWeight: isRecording ? '600' : '400',
                  letterSpacing: '0.02em'
                }}>
                  {recogStatus}
                </span>
              </div>

              {/* Transcript Textbox */}
              <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label htmlFor="transcript" style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: '500' }}>
                  Kannada Transcript:
                </label>
                <textarea
                  id="transcript"
                  placeholder="Transcribed Kannada speech will appear here. You can also type/edit text directly..."
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  disabled={isLoading || isRecording}
                  style={{
                    width: '100%',
                    height: '110px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    padding: '12px',
                    color: '#f1f5f9',
                    fontSize: '16px',
                    resize: 'none',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
                />
              </div>

              {/* Action Trigger Button */}
              {!isRecording && transcript && (
                <button
                  onClick={() => handleInterpret()}
                  disabled={isLoading}
                  style={{
                    background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: '600',
                    boxShadow: '0 4px 15px rgba(13, 148, 136, 0.3)',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  onMouseOver={(e) => e.target.style.transform = 'translateY(-1px)'}
                  onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                >
                  <span>✨ Interpret Kannada to Medical English</span>
                </button>
              )}

              {/* Error Message */}
              {error && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#f87171',
                  padding: '12px',
                  borderRadius: '8px',
                  textAlign: 'left',
                  fontSize: '14px'
                }}>
                  <strong>⚠️ Alert:</strong> {error}
                </div>
              )}
            </div>

            {/* AI Understanding & Doctor Explanation Card */}
            {isLoading && <LoadingState />}
            {result && !isLoading && <ResultCard result={result} />}

          </section>

          {/* Right Column - Playground & Dev Tools */}
          <section>
            <TestingPlayground 
              onSimulateText={handleSimulateText} 
              onSetTranscript={handleSetTranscript}
            />
          </section>

        </main>
      ) : (
        /* Bidirectional Timeline view */
        <BidirectionalTimeline />
      )}

      {/* Footer / Medical Disclaimer */}
      <footer style={{ marginTop: 'auto', paddingTop: '40px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
          <strong>🔒 Disclaimer:</strong> This application is a clinical communication prototype tool. It does not provide medical diagnoses, treatment recommendations, or replace professional medical consulting.
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
          Powered by Gemini 2.5 Flash on OpenRouter & Browser Web Speech API.
        </p>
      </footer>

      {/* CSS style patch to handle responsive layout */}
      <style>{`
        @media (max-width: 968px) {
          .main-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
