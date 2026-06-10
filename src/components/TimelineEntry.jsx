import React, { useState, useEffect, useRef } from 'react';

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

export default function TimelineEntry({ entry }) {
  const { sender, originalText, translatedText, symptoms, languageName, langCode, autoPlay } = entry;
  
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioPlayer, setAudioPlayer] = useState(null);
  const isSpeakingRef = useRef(false);

  // Sync isSpeaking with ref
  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  // Handle autoplay if requested (for doctor turns speaking to patient)
  useEffect(() => {
    if (autoPlay && sender === 'doctor' && translatedText) {
      // Small timeout to allow UI transition to settle before speaking
      const t = setTimeout(() => {
        handleSpeak();
      }, 500);
      return () => clearTimeout(t);
    }
  }, [autoPlay, translatedText]);

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      isSpeakingRef.current = false;
      if (audioPlayer) {
        try {
          audioPlayer.pause();
        } catch (e) {}
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [audioPlayer]);

  const handleSpeak = () => {
    if (isSpeaking) {
      isSpeakingRef.current = false;
      if (audioPlayer) {
        try {
          audioPlayer.pause();
          audioPlayer.src = '';
          audioPlayer.onended = null;
          audioPlayer.onerror = null;
        } catch (e) {}
        setAudioPlayer(null);
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
      return;
    }

    // For doctor entries, speak the native translation to the patient.
    // For patient entries, speak the clinical English translation to the doctor.
    const textToSpeak = translatedText;
    const speakLangCode = sender === 'doctor' ? langCode.split('-')[0] : 'en';

    console.log(`[TTS Timeline] Speaking: "${textToSpeak}" in ${speakLangCode}`);

    if (speakLangCode === 'hi' || speakLangCode === 'mr' || speakLangCode === 'kn') {
      playSequentialAudio(textToSpeak, speakLangCode);
    } else {
      speakNativeText(textToSpeak, sender === 'doctor' ? langCode : 'en-US');
    }
  };

  const playSequentialAudio = (text, langCode) => {
    const sentences = text.match(/[^.!?।;,:]+[.!?।;,:]?/g) || [text];
    const chunks = sentences.map(s => s.trim()).filter(s => s.length > 0);

    if (chunks.length === 0) {
      setIsSpeaking(false);
      return;
    }

    let currentIndex = 0;
    isSpeakingRef.current = true;
    setIsSpeaking(true);
    let fallbackTriggered = false;

    const playNextChunk = () => {
      if (!isSpeakingRef.current) return;

      if (currentIndex >= chunks.length) {
        setIsSpeaking(false);
        setAudioPlayer(null);
        return;
      }

      const chunkText = chunks[currentIndex];

      const triggerFallback = () => {
        if (!isSpeakingRef.current) return;
        if (fallbackTriggered) return;
        fallbackTriggered = true;
        speakNativeText(text, entry.langCode);
      };

      try {
        const googleUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${langCode}&client=tw-ob&q=${encodeURIComponent(chunkText)}`;
        const proxies = [
          `https://corsproxy.io/?${encodeURIComponent(googleUrl)}`,
          `https://api.allorigins.win/raw?url=${encodeURIComponent(googleUrl)}`
        ];
        
        let proxyIndex = 0;
        let attemptSettled = false;

        const tryPlayWithProxy = () => {
          if (!isSpeakingRef.current) return;

          if (proxyIndex >= proxies.length) {
            triggerFallback();
            return;
          }

          const proxiedUrl = proxies[proxyIndex];
          const player = document.createElement('audio');
          player.setAttribute('referrerpolicy', 'no-referrer');
          player.src = proxiedUrl;
          setAudioPlayer(player);

          player.onended = () => {
            if (attemptSettled) return;
            attemptSettled = true;
            player.onended = null;
            player.onerror = null;
            currentIndex++;
            playNextChunk();
          };

          player.onerror = (err) => {
            if (attemptSettled) return;
            attemptSettled = true;
            player.onended = null;
            player.onerror = null;
            try { player.pause(); } catch (e) {}
            proxyIndex++;
            tryPlayWithProxy();
          };

          player.play().catch(err => {
            if (attemptSettled) return;
            attemptSettled = true;
            player.onended = null;
            player.onerror = null;
            try { player.pause(); } catch (e) {}
            proxyIndex++;
            tryPlayWithProxy();
          });
        };

        tryPlayWithProxy();
      } catch (err) {
        triggerFallback();
      }
    };

    playNextChunk();
  };

  const speakNativeText = (text, lang) => {
    if (!('speechSynthesis' in window)) return;

    // Set speaking states immediately to prevent timeout race condition
    isSpeakingRef.current = true;
    setIsSpeaking(true);

    window.speechSynthesis.cancel();
    
    let processedText = text;
    let utteranceLang = lang;

    const voices = window.speechSynthesis.getVoices();
    let voice = voices.find(v => 
      v.lang.toLowerCase() === lang.toLowerCase() || 
      v.lang.toLowerCase().startsWith(lang.split('-')[0])
    );

    if (!voice && lang.startsWith('mr')) {
      voice = voices.find(v => v.lang.toLowerCase().startsWith('hi'));
      if (voice) utteranceLang = 'hi-IN';
    }

    if (!voice && lang.startsWith('kn')) {
      voice = voices.find(v => v.lang.toLowerCase().startsWith('hi'));
      if (voice) {
        processedText = kannadaToDevanagari(text);
        utteranceLang = 'hi-IN';
      }
    }

    setTimeout(() => {
      if (!isSpeakingRef.current) return;

      const utterance = new SpeechSynthesisUtterance(processedText);
      utterance.lang = utteranceLang;
      if (voice) utterance.voice = voice;

      window._activeUtterance = utterance;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        window._activeUtterance = null;
      };
      utterance.onerror = (e) => {
        setIsSpeaking(false);
        window._activeUtterance = null;
      };

      window.speechSynthesis.speak(utterance);
    }, 150);
  };

  const isPatient = sender === 'patient';

  return (
    <div 
      className={`glass-panel ${isPatient ? 'glow-border-cyan' : 'glow-border-emerald'}`} 
      style={{
        padding: '20px',
        alignSelf: isPatient ? 'flex-start' : 'flex-end',
        width: '85%',
        background: isPatient ? 'rgba(6, 182, 212, 0.03)' : 'rgba(16, 185, 129, 0.03)',
        borderLeftWidth: '4px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        textAlign: 'left',
        animation: 'fadeIn 0.3s ease-out forwards'
      }}
    >
      {/* Header Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            backgroundColor: isPatient ? '#06b6d4' : '#10b981' 
          }}></span>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {isPatient ? `Patient Intake (${languageName})` : `Doctor Direction (${languageName})`}
          </span>
        </div>
        <button 
          onClick={handleSpeak}
          style={{
            background: isSpeaking ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: isSpeaking ? 'white' : isPatient ? '#06b6d4' : '#10b981',
            padding: '4px 10px',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            fontWeight: '500',
            transition: 'all 0.2s'
          }}
        >
          <span>{isSpeaking ? '🛑 Stop' : '🔊 Play Audio'}</span>
        </button>
      </div>

      {/* Main text area */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
          {isPatient ? 'Transcribed Patient Speech:' : 'Transcribed Doctor Speech:'}
        </div>
        <p style={{ fontSize: '16px', color: '#f1f5f9', fontWeight: '500', margin: 0, fontStyle: isPatient ? 'normal' : 'italic' }}>
          {originalText}
        </p>
      </div>

      {/* Translated / Summary block */}
      <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
        <div style={{ fontSize: '12px', color: isPatient ? 'var(--color-secondary)' : '#10b981', fontWeight: '600', textTransform: 'uppercase', marginBottom: '6px' }}>
          {isPatient ? "AI Clinical Interpretation (English)" : "Native Translation"}
        </div>
        <p style={{ fontSize: '15px', color: '#cbd5e1', lineHeight: '1.6', margin: 0 }}>
          {translatedText}
        </p>
      </div>

      {/* Symptoms tags for patient */}
      {isPatient && symptoms && symptoms.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
          {symptoms.map((symptom, idx) => (
            <span 
              key={idx}
              style={{
                background: 'rgba(6, 182, 212, 0.12)',
                border: '1px solid rgba(6, 182, 212, 0.25)',
                color: '#22d3ee',
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '500',
                textTransform: 'capitalize'
              }}
            >
              🏷️ {symptom}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
