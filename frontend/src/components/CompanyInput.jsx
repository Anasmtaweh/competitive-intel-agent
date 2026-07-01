import React from 'react';

export default function CompanyInput({ company, onCompanyChange, onSubmit, isStreaming }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (company.trim() && !isStreaming) {
      onSubmit();
    }
  };

  return (
    <form className="company-input-form" onSubmit={handleSubmit}>
      <input
        type="text"
        value={company}
        onChange={(e) => onCompanyChange(e.target.value)}
        placeholder="Enter company name (e.g., Anthropic)"
        disabled={isStreaming}
        className="company-input"
      />
      <button 
        type="submit" 
        disabled={!company.trim() || isStreaming}
        className="company-submit-btn"
        style={{ transition: 'opacity 0.2s' }}
      >
        {isStreaming ? 'Analyzing...' : 'Run Analysis'}
      </button>
    </form>
  );
}
