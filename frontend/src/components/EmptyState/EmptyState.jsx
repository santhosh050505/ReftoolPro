import React from 'react';
import './EmptyState.css';

/**
 * Reusable empty state component for better first-time UX
 * Shows helpful messages, actions, and tips when content is empty
 */
const EmptyState = ({
  icon = "📭",
  title,
  description,
  actions = [],
  tips = null,
  variant = "default" // 'default' | 'search' | 'welcome' | 'error'
}) => {
  return (
    <div className={`empty-state-container ${variant}`}>
      <div className="empty-icon">{icon}</div>

      <h3 className="empty-title">{title}</h3>

      {description && (
        <p className="empty-description">{description}</p>
      )}

      {actions.length > 0 && (
        <div className="empty-actions">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className={`empty-action-btn ${action.variant || 'primary'}`}
              disabled={action.disabled}
            >
              {action.icon && <span className="btn-icon">{action.icon}</span>}
              {action.label}
            </button>
          ))}
        </div>
      )}

      {tips && (
        <div className="empty-tips">
          <h4 className="tips-title">{tips.title || "💡 Tips"}:</h4>
          <ul className="tips-list">
            {tips.items.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default EmptyState;
