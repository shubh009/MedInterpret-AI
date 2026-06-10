import React, { useState } from 'react';

// Hardcoded demo credentials
const DEMO_EMAIL = "doctor@medinterpret.ai";
const DEMO_PASSWORD = "clinical_doctor";

export default function LoginScreen({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    // Basic Validation
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);

    // Simulated short delay for premium feel
    setTimeout(() => {
      // Hardcoded if-else check
      if (email.toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD) {
        setIsLoading(false);
        onLoginSuccess();
      } else {
        setIsLoading(false);
        setError("Invalid ID or Password. Please try again.");
      }
    }, 600);
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '80vh',
      padding: '20px'
    }}>
      
      {/* Login Card */}
      <div 
        className="glass-panel glow-border-cyan" 
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '40px 30px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          background: 'rgba(10, 13, 20, 0.75)',
          animation: 'fadeIn 0.4s ease-out'
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: '42px', display: 'block', marginBottom: '10px' }}>🩺</span>
          <h2 className="heading" style={{ fontSize: '24px', color: 'var(--text-main)', margin: 0 }}>MedInterpret AI</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '6px' }}>
            Please authenticate to access the clinic bridge.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* Email / ID Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
            <label htmlFor="email" style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: '500' }}>
              Doctor Email ID
            </label>
            <input
              type="text"
              id="email"
              placeholder="e.g. doctor@medinterpret.ai"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              style={{
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                padding: '10px 14px',
                color: '#f1f5f9',
                fontSize: '15px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
            />
          </div>

          {/* Password Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
            <label htmlFor="password" style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: '500' }}>
              Clinical Password
            </label>
            <input
              type="password"
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              style={{
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                padding: '10px 14px',
                color: '#f1f5f9',
                fontSize: '15px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
            />
          </div>

          {/* Error Alert */}
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#f87171',
              padding: '10px 12px',
              borderRadius: '6px',
              fontSize: '13px',
              textAlign: 'left',
              animation: 'shake 0.3s'
            }}>
              <strong>⚠️</strong> {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
              color: 'white',
              border: 'none',
              padding: '12px',
              borderRadius: '6px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontSize: '15px',
              boxShadow: '0 4px 12px rgba(6, 182, 212, 0.2)',
              transition: 'all 0.2s',
              marginTop: '10px'
            }}
          >
            {isLoading ? 'Verifying Credentials...' : '🔑 Access Interpreter'}
          </button>
        </form>

        {/* Demo Help Box */}
        <div 
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            padding: '12px 14px',
            borderRadius: '6px',
            fontSize: '12px',
            color: 'var(--text-muted)',
            textAlign: 'left'
          }}
        >
          <span style={{ color: 'var(--color-secondary)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Demo Credentials:</span>
          <div>ID: <code style={{ color: '#e2e8f0', background: 'rgba(255,255,255,0.05)', padding: '2px 4px', borderRadius: '3px' }}>{DEMO_EMAIL}</code></div>
          <div style={{ marginTop: '2px' }}>Pass: <code style={{ color: '#e2e8f0', background: 'rgba(255,255,255,0.05)', padding: '2px 4px', borderRadius: '3px' }}>{DEMO_PASSWORD}</code></div>
        </div>

      </div>
    </div>
  );
}
