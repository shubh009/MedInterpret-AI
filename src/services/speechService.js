/**
 * Creates and configures a Speech Recognition instance.
 * @param {Object} options
 * @param {Function} options.onResult - Called with the transcribed text (string)
 * @param {Function} options.onEnd - Called when recording ends
 * @param {Function} options.onError - Called when an error occurs
 * @returns {Object} SpeechRecognition helper control object
 */
export function createSpeechRecognition({ onResult, onEnd, onError }) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    return {
      supported: false,
      start: () => onError("Web Speech API is not supported in this browser. Please use Chrome."),
      stop: () => {}
    };
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "kn-IN"; // Kannada language
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = (event) => {
    let finalTranscript = "";
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript + " ";
      }
    }
    if (finalTranscript.trim()) {
      onResult(finalTranscript.trim());
    }
  };

  recognition.onerror = (event) => {
    console.error("Speech Recognition Error:", event.error);
    onError(event.error);
  };

  recognition.onend = () => {
    onEnd();
  };

  return {
    supported: true,
    start: () => {
      try {
        recognition.start();
      } catch (err) {
        console.error("Failed to start speech recognition:", err);
      }
    },
    stop: () => {
      try {
        recognition.stop();
      } catch (err) {
        console.error("Failed to stop speech recognition:", err);
      }
    }
  };
}
