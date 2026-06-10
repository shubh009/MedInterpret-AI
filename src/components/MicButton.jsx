import React from 'react';

/**
 * MicButton component renders the premium voice recording circle button with lighting wave animation.
 * @param {Object} props
 * @param {boolean} props.isRecording - Active recording state
 * @param {function} props.onToggle - Toggles start/stop speech recognition
 * @param {boolean} props.disabled - Interaction block flag
 */
export default function MicButton({ isRecording, onToggle, disabled }) {
  return (
    <div className="mic-glow-container">
      {/* Wave visualizers when recording is active */}
      {isRecording && (
        <>
          <div className="mic-wave active-1"></div>
          <div className="mic-wave active-2"></div>
          <div className="mic-wave active-3"></div>
        </>
      )}

      {/* Actual button */}
      <button
        onClick={onToggle}
        disabled={disabled}
        className={`mic-button ${isRecording ? 'recording' : ''}`}
        aria-label={isRecording ? 'Stop Recording' : 'Start Recording'}
        style={{ cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 }}
      >
        {isRecording ? (
          /* Pulse / Stop icon */
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <rect x="4" y="4" width="16" height="16" rx="2" />
          </svg>
        ) : (
          /* Mic Icon */
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" x2="12" y1="19" y2="22"/>
          </svg>
        )}
      </button>
    </div>
  );
}
