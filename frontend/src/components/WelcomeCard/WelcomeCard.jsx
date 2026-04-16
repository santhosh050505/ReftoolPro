import React from 'react';
import { X, Zap, Calculator, Info } from 'lucide-react';
import './WelcomeCard.css';

/**
 * First-time user welcome card
 * Shows on initial visit, stores in localStorage when dismissed
 */
const WelcomeCard = ({ onClose, onStartTour }) => {
  const handleGetStarted = () => {
    localStorage.setItem('hasVisitedRefToolsPro', 'true');
    onClose();
  };

  return (
    <div className="welcome-overlay" onClick={handleGetStarted}>
      <div className="welcome-card" onClick={(e) => e.stopPropagation()}>
        <button className="welcome-close" onClick={handleGetStarted} aria-label="Close welcome">
          <X size={20} />
        </button>

        <div className="welcome-header">
          <div className="welcome-icon">🎉</div>
          <h2>Welcome to RefTools Pro!</h2>
          <p className="welcome-subtitle">Your professional refrigerant calculation tool</p>
        </div>

        <div className="welcome-content">
          <div className="welcome-section">
            <div className="section-icon">
              <Calculator size={24} />
            </div>
            <div className="section-text">
              <h3>What does this tool do?</h3>
              <p>Calculate saturation temperature from pressure, or pressure from temperature for refrigerants.</p>
            </div>
          </div>

          <div className="quick-start">
            <h3><Zap size={20} /> Quick Start Guide:</h3>
            <ol>
              <li><strong>Select a refrigerant</strong> (default: R407C is pre-selected)</li>
              <li><strong>Enter EITHER pressure OR temperature</strong> in the input field</li>
              <li><strong>We'll calculate the other value</strong> instantly for you</li>
            </ol>
          </div>

          <div className="welcome-example">
            <div className="example-icon">📝</div>
            <div className="example-content">
              <strong>Example:</strong> Enter <code>10 bar</code> → Get <code>~46°C</code>
            </div>
          </div>

          <div className="welcome-tips">
            <div className="tip-icon">
              <Info size={18} />
            </div>
            <div className="tip-content">
              <strong>Pro tip:</strong> Click the refrigerant button to browse 100+ refrigerants. Star your favorites for quick access!
            </div>
          </div>
        </div>

        <div className="welcome-footer">
          <button onClick={handleGetStarted} className="btn-get-started">
            Got it! Start calculating →
          </button>
          {onStartTour && (
            <button onClick={() => { handleGetStarted(); onStartTour(); }} className="btn-tour">
              Show me a tour
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WelcomeCard;
