import React from 'react';

const CommunityGuidelinesModal = ({ isOpen, onClose, onAccept }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Community Guidelines</h2>
          <button onClick={onClose} className="modal-close-btn">
            &times;
          </button>
        </div>
        
        <div className="modal-body">
          <p>By adding your signature to this campaign, you agree to our community guidelines:</p>
          
          <ol className="guidelines-list">
            <li>Be respectful of others. Harassment, hate speech, or discriminatory content will not be tolerated.</li>
            <li>Do not post inappropriate, explicit, or offensive content.</li>
            <li>Respect copyright and intellectual property rights.</li>
            <li>Do not impersonate others or provide false information.</li>
            <li>Your signature should be your own creation.</li>
          </ol>
          
          <p className="guidelines-note">
            Violations may result in removal of your signature and potential banning from future campaigns.
          </p>
        </div>
        
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button onClick={onAccept} className="btn-primary">
            I Accept
          </button>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }
        
        .modal-content {
          background: white;
          border-radius: 1rem;
          max-width: 600px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
        
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .modal-header h2 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 600;
          color: #111827;
        }
        
        .modal-close-btn {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #6b7280;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
        }
        
        .modal-close-btn:hover {
          background-color: #f3f4f6;
          color: #374151;
        }
        
        .modal-body {
          padding: 1.5rem;
        }
        
        .guidelines-list {
          margin: 1rem 0;
          padding-left: 1.5rem;
        }
        
        .guidelines-list li {
          margin-bottom: 0.75rem;
          line-height: 1.5;
        }
        
        .guidelines-note {
          font-style: italic;
          color: #6b7280;
          margin-top: 1.5rem;
        }
        
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding: 1.5rem;
          border-top: 1px solid #e5e7eb;
        }
        
        .btn-primary, .btn-secondary {
          padding: 0.75rem 1.5rem;
          border-radius: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .btn-primary {
          background-color: #4f46e5;
          color: white;
          border: none;
        }
        
        .btn-primary:hover {
          background-color: #4338ca;
        }
        
        .btn-secondary {
          background-color: #f3f4f6;
          color: #374151;
          border: 1px solid #e5e7eb;
        }
        
        .btn-secondary:hover {
          background-color: #e5e7eb;
        }
      `}</style>
    </div>
  );
};

export default CommunityGuidelinesModal;
