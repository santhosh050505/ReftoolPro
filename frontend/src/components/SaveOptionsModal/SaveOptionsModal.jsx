import React from 'react';
import '../ProjectModal/ProjectModal.css';
import './SaveOptionsModal.css';

const SaveOptionsModal = ({ isOpen, onClose, onSave, onSaveAsNew, showUpdate = true, showSaveAsNew = true }) => {
  if (!isOpen) return null;

  const handleSave = () => {
    onSave();
    onClose();
  };

  const handleSaveAsNew = () => {
    onSaveAsNew();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content save-options-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Save Changes</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="save-options-content">
          <p className="save-options-message">
            {showUpdate && !showSaveAsNew
              ? "You are updating an existing entry. Please confirm."
              : !showUpdate && showSaveAsNew
                ? "You are adding a new cycle state to your project."
                : "You are editing a condition in your project. How would you like to proceed?"}
          </p>

          <div className="save-options-buttons">
            {showUpdate && (
              <button
                className="save-option-btn save-btn"
                onClick={handleSave}
              >
                <div className="save-option-icon">💾</div>
                <div className="save-option-text">
                  <strong>Update Row</strong>
                  <span>Update data in the current table row</span>
                </div>
              </button>
            )}

            {showSaveAsNew && (
              <button
                className="save-option-btn save-as-new-btn"
                onClick={handleSaveAsNew}
              >
                <div className="save-option-icon">📋</div>
                <div className="save-option-text">
                  <strong>Save as new</strong>
                  <span>Pick another row in this or another project</span>
                </div>
              </button>
            )}
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaveOptionsModal;
