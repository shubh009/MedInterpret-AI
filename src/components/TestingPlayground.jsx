import React, { useState, useEffect } from 'react';

// Common medical statements in Kannada for easy testing
const TEST_PHRASES = [
  {
    id: 1,
    kannada: "ನನಗೆ ಉಸಿರಾಟಕ್ಕೆ ತೊಂದರೆ ಆಗುತ್ತಿದೆ",
    englishMeaning: "Difficulty breathing",
    category: "Respirator"
  },
  {
    id: 2,
    kannada: "ನನಗೆ ಎದೆ ನೋವು ಇದೆ ಮತ್ತು ಎಡಗೈ ನೋಯುತ್ತಿದೆ",
    englishMeaning: "Chest pain radiating to left arm",
    category: "Cardiac"
  },
  {
    id: 3,
    kannada: "ನನಗೆ ತಲೆ ಸುತ್ತುತ್ತಿದೆ ಮತ್ತು ವಾಂತಿ ಬರುತ್ತಿದೆ",
    englishMeaning: "Dizziness and nausea/vomiting",
    category: "Neurology"
  },
  {
    id: 4,
    kannada: "ನನ್ನ ಹೊಟ್ಟೆಯಲ್ಲಿ ತೀವ್ರವಾದ ನೋವು ಇದೆ",
    englishMeaning: "Severe abdominal pain",
    category: "Gastro"
  },
  {
    id: 5,
    kannada: "ನನಗೆ ಮೂರು ದಿನದಿಂದ ಜ್ವರ ಮತ್ತು ವಿಪರೀತ ಚಳಿ ಇದೆ",
    englishMeaning: "High fever and chills for three days",
    category: "Infection"
  },
  {
    id: 6,
    kannada: "ನನಗೆ ಇವತ್ತು ಬೆಳಿಗ್ಗೆಯಿಂದ ಮಲದಲ್ಲಿ ರಕ್ತ ಹೋಗುತ್ತಿದೆ",
    englishMeaning: "Blood in stool since morning",
    category: "Gastro"
  },
  {
    id: 7,
    kannada: "ನನ್ನ ತಲೆ ತುಂಬಾ ಸಿಡಿಯುತ್ತಿದೆ, ಬೆಳಕು ನೋಡಲು ಆಗುತ್ತಿಲ್ಲ",
    englishMeaning: "Severe headache with photophobia",
    category: "Neurology"
  },
  {
    id: 8,
    kannada: "ನನ್ನ ಕಾಲುಗಳು ತುಂಬಾ ಊದಿಕೊಂಡಿವೆ ಮತ್ತು ನಡೆಯಲು ಕಷ್ಟವಾಗುತ್ತಿದೆ",
    englishMeaning: "Swollen legs and difficulty walking",
    category: "Orthopedics"
  },
  {
    id: 9,
    kannada: "ನನಗೆ ಮೂತ್ರ ವಿಸರ್ಜನೆ ಮಾಡುವಾಗ ಉರಿ ಆಗುತ್ತಿದೆ",
    englishMeaning: "Burning micturition (painful urination)",
    category: "Urology"
  },
  {
    id: 10,
    kannada: "ನನ್ನ ಮಗುವಿಗೆ ನಿನ್ನೆಯಿಂದ ಭೇದಿ ಆಗುತ್ತಿದೆ ಮತ್ತು ಸುಸ್ತಾಗಿದ್ದಾನೆ",
    englishMeaning: "Pediatric diarrhea and lethargy since yesterday",
    category: "Pediatric"
  }
];

// Transliterates Kannada script to Devanagari script for native Hindi voice playback compatibility
const kannadaToDevanagari = (text) => {
  if (!text) return "";
  return text.split('').map(char => {
    const code = char.charCodeAt(0);
    // Kannada unicode block range is U+0C80 to U+0CFF, offset to Devanagari U+0900 is 0x0380 (896 decimal)
    if (code >= 0x0C80 && code <= 0x0CFF) {
      return String.fromCharCode(code - 0x0380);
    }
    return char;
  }).join('');
};

/**
 * TestingPlayground component provides simulated inputs and Kannada audio generation
 * to test the translation application without speaking Kannada.
 */
export default function TestingPlayground({ onSimulateText, onSetTranscript }) {
  const [playingId, setPlayingId] = useState(null);

  // Pre-load speech synthesis voices on component load
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      const loadVoices = () => {
        window.speechSynthesis.getVoices();
      };
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      };
    }
  }, []);

  // Play Kannada Text-to-Speech using 100% native browser Web Speech API
  const playKannadaAudio = (text, id) => {
    if (!('speechSynthesis' in window)) {
      alert("TTS not supported in this browser.");
      return;
    }

    // Stop any current web speech synthesis
    window.speechSynthesis.cancel();
    setPlayingId(id);

    // Wrap in small timeout to give synthesis a clean start
    setTimeout(() => {
      let processedText = text;
      let utteranceLang = 'kn-IN';

      // Find Kannada or Google Kannada voice
      const voices = window.speechSynthesis.getVoices();
      let knVoice = voices.find(voice => 
        voice.lang.toLowerCase() === 'kn-in' || 
        voice.lang.toLowerCase().startsWith('kn') ||
        voice.name.toLowerCase().includes('kannada')
      );

      // CRITICAL FALLBACK: If Kannada voice is not installed, use Hindi voice with Devanagari transliteration
      if (!knVoice) {
        console.log("[TTS Playground] Kannada voice not found. Transliterating to Devanagari for Hindi voice fallback.");
        knVoice = voices.find(voice => 
          voice.lang.toLowerCase() === 'hi-in' || 
          voice.lang.toLowerCase().startsWith('hi') ||
          voice.name.toLowerCase().includes('hindi')
        );
        if (knVoice) {
          processedText = kannadaToDevanagari(text);
          utteranceLang = 'hi-IN';
        }
      }

      const utterance = new SpeechSynthesisUtterance(processedText);
      utterance.lang = utteranceLang;

      if (knVoice) {
        utterance.voice = knVoice;
        console.log(`[TTS Playground] Speaking Kannada using voice: ${knVoice.name} (${utterance.lang})`);
      } else {
        console.warn("[TTS Playground] No suitable native voice found. Using default voice.");
      }

      // Store in window/global to prevent garbage collection bug in Chrome
      window._activeUtterance = utterance;

      utterance.onstart = () => setPlayingId(id);
      utterance.onend = () => {
        setPlayingId(null);
        window._activeUtterance = null;
      };
      utterance.onerror = (e) => {
        if (e.error !== 'interrupted') {
          console.error("[TTS Playground] Kannada speech synthesis failed:", e);
        } else {
          console.log("[TTS Playground] Speech synthesis interrupted (expected on cancel).");
        }
        setPlayingId(null);
        window._activeUtterance = null;
      };

      window.speechSynthesis.speak(utterance);
    }, 150);
  };


  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
      <div>
        <h2 className="sub-heading" style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>🧪</span> Kannada Testing Playground
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
          Since you might not speak Kannada, play these sentences to your microphone or click "Interpret Directly" to send them to the AI!
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', maxHeight: '350px', overflowY: 'auto', paddingRight: '8px' }}>
        {TEST_PHRASES.map((phrase) => (
          <div 
            key={phrase.id} 
            className="test-phrase-card"
            style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
          >
            {/* Header info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-secondary)', background: 'rgba(6, 182, 212, 0.1)', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: '500' }}>
                {phrase.category}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Ref: {phrase.englishMeaning}
              </span>
            </div>

            {/* Kannada script text */}
            <div style={{ fontSize: '15px', color: '#f1f5f9', fontWeight: '500', letterSpacing: '0.02em', background: 'rgba(0, 0, 0, 0.15)', padding: '8px 12px', borderRadius: '6px' }}>
              {phrase.kannada}
            </div>

            {/* Control buttons */}
            <div style={{ display: 'flex', gap: '8px' }}>
              {/* Play Audio Button */}
              <button
                onClick={() => playKannadaAudio(phrase.kannada, phrase.id)}
                className="content-text"
                style={{
                  background: playingId === phrase.id ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: playingId === phrase.id ? '#white' : '#f1f5f9',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  transition: 'all 0.2s'
                }}
              >
                <span>{playingId === phrase.id ? '🔊 Speaking...' : '🔊 Play Audio'}</span>
              </button>

              {/* Feed directly into Mic Transcript State */}
              <button
                onClick={() => onSetTranscript(phrase.kannada)}
                style={{
                  background: 'rgba(13, 148, 136, 0.1)',
                  border: '1px solid rgba(13, 148, 136, 0.2)',
                  color: '#2dd4bf',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  transition: 'all 0.2s'
                }}
              >
                📝 Set Transcript
              </button>

              {/* Directly Translate */}
              <button
                onClick={() => onSimulateText(phrase.kannada)}
                style={{
                  background: 'rgba(6, 182, 212, 0.1)',
                  border: '1px solid rgba(6, 182, 212, 0.2)',
                  color: '#22d3ee',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  marginLeft: 'auto',
                  transition: 'all 0.2s'
                }}
              >
                ⚡ Interpret Directly
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
