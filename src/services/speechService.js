/**
 * Creates and configures a Speech Recognition instance.
 * @param {Object} options
 * @param {Function} options.onResult - Called with the transcribed text (string)
 * @param {Function} options.onEnd - Called when recording ends
 * @param {Function} options.onError - Called when an error occurs
 * @param {string} [options.lang] - BCP-47 language code (default: 'kn-IN')
 * @param {number} [options.silenceTimeout] - Ms of silence before auto-stop (default: 2000)
 * @returns {Object} SpeechRecognition helper control object
 */
export function createSpeechRecognition({ onResult, onEnd, onError, lang = 'kn-IN', silenceTimeout = 2000 }) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    return {
      supported: false,
      start: () => onError("Web Speech API is not supported in this browser. Please use Chrome."),
      stop: () => {}
    };
  }

  const recognition = new SpeechRecognition();
  recognition.lang = lang;
  recognition.continuous = true;
  recognition.interimResults = true;

  let silenceTimer = null;
  let accumulatedText = "";

  const resetSilenceTimer = () => {
    if (silenceTimer) clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => {
      // Auto-stop after silence
      try {
        recognition.stop();
      } catch (e) {}
    }, silenceTimeout);
  };

  recognition.onresult = (event) => {
    let finalTranscript = "";
    let interimTranscript = "";

    for (let i = 0; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript + " ";
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }

    if (finalTranscript.trim()) {
      accumulatedText = finalTranscript.trim();
      onResult(accumulatedText);
      // Reset silence timer on every final result — 2s silence = auto stop
      resetSilenceTimer();
    } else if (interimTranscript) {
      // Got interim results, reset timer since user is still speaking
      resetSilenceTimer();
    }
  };

  recognition.onerror = (event) => {
    if (silenceTimer) clearTimeout(silenceTimer);
    console.error("Speech Recognition Error:", event.error);
    onError(event.error);
  };

  recognition.onend = () => {
    if (silenceTimer) clearTimeout(silenceTimer);
    onEnd();
  };

  return {
    supported: true,
    start: () => {
      try {
        accumulatedText = "";
        recognition.start();
        // Start silence timer immediately — if user doesn't speak for 2s, stop
        resetSilenceTimer();
      } catch (err) {
        console.error("Failed to start speech recognition:", err);
      }
    },
    stop: () => {
      try {
        if (silenceTimer) clearTimeout(silenceTimer);
        recognition.stop();
      } catch (err) {
        console.error("Failed to stop speech recognition:", err);
      }
    }
  };
}
