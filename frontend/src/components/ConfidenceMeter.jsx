import React from 'react';

export default function ConfidenceMeter({ confidence, color }) {
  // SVG properties
  const size = 100;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  
  // Calculate fill percentage based on confidence (1-10)
  const safeConfidence = Math.max(1, Math.min(10, confidence || 5));
  const offset = circumference - (safeConfidence / 10) * circumference;

  return (
    <div className="confidence-meter">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="confidence-svg"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        {/* Foreground circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          fontSize="24"
          fontWeight="bold"
          fill="var(--text-main)"
        >
          {safeConfidence}/10
        </text>
      </svg>
      <div className="confidence-label">Confidence</div>
    </div>
  );
}
