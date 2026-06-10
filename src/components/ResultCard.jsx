import React, { useState, useEffect, useRef } from 'react';
import { translateText } from '../services/openrouterService';

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
 * ResultCard component to display structured AI analysis output with multilingual TTS.
 * @param {Object} props
 * @param {Object} props.result - Interpretation result
 * @param {string} props.result.languageDetected - The detected language
 * @param {string[]} props.result.symptoms - The symptoms array
 * @param {string} props.result.doctorExplanation - The clinical medical translation
 */
export default function ResultCard({ result }) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedLang, setSelectedLang] = useState('en-US');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationsCache, setTranslationsCache] = useState({});
  const [audioPlayer, setAudioPlayer] = useState(null);

  const isSpeakingRef = useRef(false);

  // Sync isSpeaking with ref
  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  // Pre-load voices on mount to wake up Chrome's cloud speech engine
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

  // Reset speech state and cache if input results change or component unmounts
  useEffect(() => {
    setTranslationsCache({});
    setSelectedLang('en-US');
    setIsSpeaking(false);
    setIsTranslating(false);
    
    if (audioPlayer) {
      audioPlayer.pause();
      setAudioPlayer(null);
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, [result]);

  if (!result) return null;

  const handleSpeak = async () => {
    if (isSpeaking) {
      isSpeakingRef.current = false;
      if (audioPlayer) {
        try {
          audioPlayer.pause();
          audioPlayer.src = '';
          audioPlayer.onended = null;
          audioPlayer.onerror = null;
        } catch (e) {
          console.warn("[TTS] Error pausing audio player:", e);
        }
        setAudioPlayer(null);
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
      return;
    }

    let textToSpeak = result.doctorExplanation;

    // Translate if Hindi, Marathi, or Kannada is selected and not cached
    if (selectedLang !== 'en-US') {
      if (translationsCache[selectedLang]) {
        textToSpeak = translationsCache[selectedLang];
      } else {
        setIsTranslating(true);
        try {
          const langName = selectedLang === 'hi-IN' ? 'Hindi' : selectedLang === 'kn-IN' ? 'Kannada' : 'Marathi';
          console.log(`[TTS] Translating clinical text to: ${langName}`);
          const translated = await translateText(result.doctorExplanation, langName);
          console.log(`[TTS] Translated result: "${translated}"`);
          setTranslationsCache(prev => ({ ...prev, [selectedLang]: translated }));
          textToSpeak = translated;
        } catch (e) {
          console.error("[TTS] Translation failed:", e);
          alert("Translation failed: " + e.message);
          setIsTranslating(false);
          return;
        } finally {
          setIsTranslating(false);
        }
      }
    }

    const langCodeOnly = selectedLang.split('-')[0]; // 'en', 'hi', 'mr', 'kn'
    console.log(`[TTS] Initiating voice playback. Language code: ${langCodeOnly}`);

    // Play Indian languages via high-quality Google Translate TTS proxied
    if (langCodeOnly === 'hi' || langCodeOnly === 'mr' || langCodeOnly === 'kn') {
      playSequentialAudio(textToSpeak, langCodeOnly);
    } else {
      // English works natively perfectly on all platforms
      speakNativeText(textToSpeak, selectedLang);
    }
  };

  const playSequentialAudio = (text, langCode) => {
    // Split text into chunks by punctuation marks to avoid 200 char limits in Google TTS
    const sentences = text.match(/[^.!?।;,:]+[.!?।;,:]?/g) || [text];
    const chunks = sentences
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`[TTS] Split text into ${chunks.length} chunks for lang code: ${langCode}`, chunks);

    if (chunks.length === 0) {
      console.warn("[TTS] No speech chunks found to play.");
      setIsSpeaking(false);
      return;
    }

    let currentIndex = 0;
    isSpeakingRef.current = true;
    setIsSpeaking(true);
    let fallbackTriggered = false;

    const playNextChunk = () => {
      if (!isSpeakingRef.current) {
        console.log("[TTS] Playback stopped by user gesture.");
        return;
      }

      if (currentIndex >= chunks.length) {
        console.log("[TTS] All chunks played successfully.");
        setIsSpeaking(false);
        setAudioPlayer(null);
        return;
      }

      const chunkText = chunks[currentIndex];
      console.log(`[TTS] Playing chunk ${currentIndex + 1}/${chunks.length}: "${chunkText}"`);

      const triggerFallback = () => {
        if (!isSpeakingRef.current) {
          console.log("[TTS] Fallback aborted because playback was stopped by user.");
          return;
        }
        if (fallbackTriggered) return;
        fallbackTriggered = true;
        speakNativeText(text, selectedLang);
      };

      try {
        const googleUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${langCode}&client=tw-ob&q=${encodeURIComponent(chunkText)}`;
        // Try multiple public CORS proxies to bypass local browser CORS/Origin blocks completely
        const proxies = [
          `https://corsproxy.io/?${encodeURIComponent(googleUrl)}`,
          `https://api.allorigins.win/raw?url=${encodeURIComponent(googleUrl)}`
        ];
        
        let proxyIndex = 0;

        const tryPlayWithProxy = () => {
          if (!isSpeakingRef.current) {
            console.log("[TTS] Playback stopped by user, aborting proxy load.");
            return;
          }

          if (proxyIndex >= proxies.length) {
            console.warn("[TTS] All TTS proxies failed. Falling back to native SpeechSynthesis.");
            triggerFallback();
            return;
          }

          const proxiedUrl = proxies[proxyIndex];
          console.log(`[TTS] Trying proxy ${proxyIndex + 1}/${proxies.length}: ${proxiedUrl}`);

          let attemptSettled = false;

          const handleProxyFailure = (err, source) => {
            if (attemptSettled) return;
            attemptSettled = true;

            console.warn(`[TTS] Proxy ${proxyIndex + 1} failed via ${source}:`, err);
            
            // Clean up current player
            player.onended = null;
            player.onerror = null;
            try {
              player.pause();
            } catch (e) {}

            // Move to next proxy
            proxyIndex++;
            tryPlayWithProxy();
          };

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
            handleProxyFailure(err, "onerror event");
          };

          player.play().catch(err => {
            handleProxyFailure(err, "play promise catch");
          });
        };

        tryPlayWithProxy();
      } catch (err) {
        console.error("[TTS] Failed to initialize Audio object for chunk:", err);
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

    // Load available voices
    const voices = window.speechSynthesis.getVoices();
    let voice = voices.find(v => 
      v.lang.toLowerCase() === lang.toLowerCase() || 
      v.lang.toLowerCase().startsWith(lang.split('-')[0])
    );

    // Marathi fallback to Hindi voice
    if (!voice && lang.startsWith('mr')) {
      console.log("[TTS Fallback] Marathi voice not found. Using Hindi voice for Devanagari playback.");
      voice = voices.find(v => 
        v.lang.toLowerCase() === 'hi-in' || 
        v.lang.toLowerCase().startsWith('hi') ||
        v.name.toLowerCase().includes('hindi')
      );
      if (voice) {
        utteranceLang = 'hi-IN';
      }
    }

    // Kannada fallback to Hindi voice
    if (!voice && lang.startsWith('kn')) {
      console.log("[TTS Fallback] Kannada voice not found. Transliterating to Devanagari for Hindi playback.");
      voice = voices.find(v => 
        v.lang.toLowerCase() === 'hi-in' || 
        v.lang.toLowerCase().startsWith('hi') ||
        v.name.toLowerCase().includes('hindi')
      );
      if (voice) {
        processedText = kannadaToDevanagari(text);
        utteranceLang = 'hi-IN';
      }
    }

    // Small delay to let the browser cancel process settle before speaking
    setTimeout(() => {
      // Check if user has stopped playback in the meantime
      if (!isSpeakingRef.current) {
        console.log("[TTS] SpeechSynthesis aborted because isSpeakingRef is false.");
        return;
      }

      const utterance = new SpeechSynthesisUtterance(processedText);
      utterance.lang = utteranceLang;

      if (voice) {
        utterance.voice = voice;
        console.log(`[TTS] Using native SpeechSynthesis voice: ${voice.name} (${utterance.lang})`);
      } else {
        console.warn(`[TTS] No suitable native voice found for lang ${lang}. Using default voice.`);
      }

      // Store in window/global to prevent garbage collection bug in Chrome
      window._activeUtterance = utterance;

      utterance.onstart = () => {
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        window._activeUtterance = null;
      };

      utterance.onerror = (e) => {
        if (e.error !== 'interrupted') {
          console.error("[TTS] Native SpeechSynthesis error:", e);
        } else {
          console.log("[TTS] Native SpeechSynthesis interrupted (expected behavior on cancel).");
        }
        setIsSpeaking(false);
        window._activeUtterance = null;
      };

      window.speechSynthesis.speak(utterance);
    }, 150);
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
      
      {/* Detected Language Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#06b6d4' }}></span>
          <span style={{ fontSize: '14px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Language Detected</span>
        </div>
        <span style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee', padding: '4px 12px', borderRadius: '20px', fontSize: '14px', fontWeight: '500' }}>
          {result.languageDetected || "Kannada"}
        </span>
      </div>

      {/* Identified Symptoms Area */}
      <div className="glow-border-cyan" style={{ paddingLeft: '16px' }}>
        <h3 className="sub-heading" style={{ color: 'var(--text-main)', marginBottom: '8px' }}>Symptoms Detected</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {result.symptoms && result.symptoms.length > 0 ? (
            result.symptoms.map((symptom, index) => (
              <span 
                key={index}
                style={{ 
                  background: 'rgba(13, 148, 136, 0.15)', 
                  border: '1px solid rgba(13, 148, 136, 0.3)', 
                  color: '#2dd4bf', 
                  padding: '6px 12px', 
                  borderRadius: '6px', 
                  fontSize: '14px',
                  textTransform: 'capitalize'
                }}
              >
                {symptom}
              </span>
            ))
          ) : (
            <span style={{ color: 'var(--text-muted)', fontSize: '14px', fontStyle: 'italic' }}>
              No specific symptoms identified.
            </span>
          )}
        </div>
      </div>

      {/* Clinical Explanation Output */}
      <div className="glow-border-emerald" style={{ paddingLeft: '16px', marginTop: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '10px' }}>
          <h3 className="sub-heading" style={{ color: 'var(--text-main)', margin: 0 }}>Doctor's Explanation (Clinical English)</h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Language Selection Dropdown */}
            <select
              value={selectedLang}
              onChange={(e) => {
                setSelectedLang(e.target.value);
                if (isSpeaking) {
                  window.speechSynthesis.cancel();
                  setIsSpeaking(false);
                }
              }}
              disabled={isTranslating}
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#2dd4bf',
                padding: '6px 10px',
                borderRadius: '6px',
                outline: 'none',
                fontSize: '13px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              <option value="en-US">English 🇺🇸</option>
              <option value="hi-IN">Hindi 🇮🇳</option>
              <option value="mr-IN">Marathi 🇮🇳</option>
              <option value="kn-IN">Kannada 💛</option>
            </select>

            {/* Speak Button */}
            <button 
              onClick={handleSpeak}
              disabled={isTranslating}
              style={{
                background: isSpeaking ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: isSpeaking ? 'white' : '#2dd4bf',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: isTranslating ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                transition: 'all 0.2s',
                opacity: isTranslating ? 0.7 : 1
              }}
            >
              <span>{isTranslating ? '⏳ Translating...' : isSpeaking ? '🛑 Stop' : '🔊 Speak'}</span>
            </button>
          </div>
        </div>

        {/* Translation text display */}
        <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <p style={{ fontSize: '16px', color: '#f1f5f9', fontWeight: '400', lineHeight: '1.6' }}>
            {result.doctorExplanation || "Waiting for patient interpretation..."}
          </p>

          {/* Render Translated content dynamically */}
          {selectedLang !== 'en-US' && translationsCache[selectedLang] && (
            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '10px', marginTop: '5px' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                Translation ({selectedLang === 'hi-IN' ? 'Hindi' : selectedLang === 'kn-IN' ? 'Kannada' : 'Marathi'})
              </span>
              <p style={{ fontSize: '15px', color: '#cbd5e1', fontStyle: 'italic', lineHeight: '1.6' }}>
                {translationsCache[selectedLang]}
              </p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
