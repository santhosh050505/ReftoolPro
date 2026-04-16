import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import './ConfirmModal.css';

/**
 * Reusable confirmation modal for destructive actions
 * Enhanced for production database safety
 */
const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  itemName,
  itemId,  // NEW: Show ID for database records
  details,  // NEW: Additional details to show
  confirmLabel = 'Confirm',
  confirmVariant = 'danger', // 'danger' | 'warning' | 'primary'
  warningText = 'This action cannot be undone.',
  impactWarning  // NEW: Specific impact warning
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && !confirmVariant === 'danger') {
      // Prevent Enter key for dangerous actions
      handleConfirm();
    }
  };

  return (
    <div className="confirm-modal-overlay" onClick={onClose} onKeyDown={handleKeyDown}>
      <div className="confirm-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <button
          className="confirm-modal-close"
          onClick={onClose}
          aria-label="Close confirmation dialog"
        >
          <X size={20} />
        </button>

        <div className={`confirm-modal-icon ${confirmVariant}`}>
          <AlertTriangle size={48} />
        </div>

        <h3 id="confirm-title" className="confirm-modal-title">{title}</h3>

        <p className="confirm-modal-message">{message}</p>

        {/* Show item details prominently */}
        {itemName && (
          <div className="confirm-item-details">
            <div className="confirm-item-name">{itemName}</div>
            {itemId && <div className="confirm-item-id">ID: {itemId}</div>}
            {details && <div className="confirm-item-extra">{details}</div>}
          </div>
        )}

        {/* Impact warning box */}
        {impactWarning && (
          <div className="confirm-impact-warning">
            <AlertTriangle size={16} />
            <span>{impactWarning}</span>
          </div>
        )}

        {/* Standard warning */}
        {warningText && (
          <p className="confirm-modal-warning">{warningText}</p>
        )}

        <div className="confirm-modal-actions">
          <button
            className="confirm-btn confirm-btn-cancel"
            onClick={onClose}
            autoFocus
          >
            Cancel
          </button>
          <button
            className={`confirm-btn confirm-btn-${confirmVariant}`}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
