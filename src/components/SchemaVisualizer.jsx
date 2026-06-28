import { useState } from 'react';

export default function SchemaVisualizer({
  files,
  activeFile,
  secondaryFile,
  joinConfig
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (files.length === 0 || !activeFile) {
    return null;
  }

  const pTable = activeFile.nameWithoutExt;
  const pHeaders = activeFile.headers;
  const pTypes = activeFile.columnTypes;

  const hasJoin = joinConfig.enabled && secondaryFile && joinConfig.leftKey && joinConfig.rightKey;
  const sTable = secondaryFile ? secondaryFile.nameWithoutExt : '';
  const sHeaders = secondaryFile ? secondaryFile.headers : [];
  const sTypes = secondaryFile ? secondaryFile.columnTypes : {};

  // Find column indices for drawing coordinates
  const leftKeyIndex = pHeaders.indexOf(joinConfig.leftKey);
  const rightKeyIndex = sHeaders.indexOf(joinConfig.rightKey);

  // SVG Coordinates calculations
  const cardW = 150;
  const cardH1 = 30 + pHeaders.length * 20 + 10;
  const cardH2 = secondaryFile ? (30 + sHeaders.length * 20 + 10) : 0;
  const svgH = Math.max(cardH1, cardH2, 180) + 40;

  const pCardX = 35;
  const sCardX = 315;
  const cardY = 20;

  const leftPortX = pCardX + cardW;
  const rightPortX = sCardX;

  const leftPortY = leftKeyIndex !== -1 ? (cardY + 30 + leftKeyIndex * 20 + 10) : (cardY + 30 + 10);
  const rightPortY = rightKeyIndex !== -1 ? (cardY + 30 + rightKeyIndex * 20 + 10) : (cardY + 30 + 10);
  const midY = (leftPortY + rightPortY) / 2;

  return (
    <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden shadow-sm flex flex-col text-left">
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 bg-brand-primary/60 border-b border-brand-border flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center space-x-2">
          <svg className="w-4 h-4 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M7 12l3-3 3 3 4-4M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <span className="font-semibold text-xs text-brand-text-dark uppercase tracking-wider">Workspace Schema Map (ERD)</span>
        </div>
        <button className="text-brand-text-muted hover:text-brand-text-dark cursor-pointer">
          {isExpanded ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="p-4 bg-white flex justify-center items-center overflow-x-auto">
          <svg width="500" height={svgH} viewBox={`0 0 500 ${svgH}`} className="min-w-[500px]">
            <defs>
              <style>{`
                @keyframes dash {
                  to {
                    stroke-dashoffset: -20;
                  }
                }
                .flowing-path {
                  stroke-dasharray: 4, 4;
                  animation: dash 1.2s linear infinite;
                }
              `}</style>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* 1. PRIMARY TABLE CARD */}
            <g transform={`translate(${pCardX}, ${cardY})`}>
              {/* Card Container */}
              <rect width={cardW} height={cardH1} rx="8" fill="#ffffff" stroke="#E6E1DA" strokeWidth="1.5" />
              {/* Card Header */}
              <path d={`M 0 8 A 8 8 0 0 1 8 0 H ${cardW - 8} A 8 8 0 0 1 ${cardW} 8 V 30 H 0 Z`} fill="#FAF6F0" />
              <text x={cardW / 2} y="18" fill="#1C1917" fontSize="10" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                {pTable}
              </text>
              <line x1="0" y1="30" x2={cardW} y2="30" stroke="#E6E1DA" strokeWidth="1" />

              {/* Rows */}
              {pHeaders.map((h, i) => {
                const isNumeric = pTypes[h] === 'numeric';
                const isJoinKey = hasJoin && joinConfig.leftKey === h;
                const rowY = 30 + i * 20;
                return (
                  <g key={h} transform={`translate(0, ${rowY})`}>
                    <rect width={cardW} height="20" rx="4" fill={isJoinKey ? '#FBEBE3' : 'transparent'} />
                    {/* Circle Icon */}
                    <circle cx="15" cy="11" r="3.5" fill={isNumeric ? '#D27B55' : '#78716C'} />
                    {/* Column Name */}
                    <text x="26" y="14" fill={isJoinKey ? '#D27B55' : '#57534E'} fontSize="9" fontFamily="monospace" fontWeight={isJoinKey ? 'bold' : 'normal'}>
                      {h}
                    </text>
                  </g>
                );
              })}
            </g>

            {/* 2. SECONDARY TABLE CARD */}
            {secondaryFile && (
              <g transform={`translate(${sCardX}, ${cardY})`}>
                {/* Card Container */}
                <rect width={cardW} height={cardH2} rx="8" fill="#ffffff" stroke="#E6E1DA" strokeWidth="1.5" />
                {/* Card Header */}
                <path d={`M 0 8 A 8 8 0 0 1 8 0 H ${cardW - 8} A 8 8 0 0 1 ${cardW} 8 V 30 H 0 Z`} fill="#FAF6F0" />
                <text x={cardW / 2} y="18" fill="#1C1917" fontSize="10" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                  {sTable}
                </text>
                <line x1="0" y1="30" x2={cardW} y2="30" stroke="#E6E1DA" strokeWidth="1" />

                {/* Rows */}
                {sHeaders.map((h, i) => {
                  const isNumeric = sTypes[h] === 'numeric';
                  const isJoinKey = hasJoin && joinConfig.rightKey === h;
                  const rowY = 30 + i * 20;
                  return (
                    <g key={h} transform={`translate(0, ${rowY})`}>
                      <rect width={cardW} height="20" rx="4" fill={isJoinKey ? '#FBEBE3' : 'transparent'} />
                      {/* Circle Icon */}
                      <circle cx="15" cy="11" r="3.5" fill={isNumeric ? '#D27B55' : '#78716C'} />
                      {/* Column Name */}
                      <text x="26" y="14" fill={isJoinKey ? '#D27B55' : '#57534E'} fontSize="9" fontFamily="monospace" fontWeight={isJoinKey ? 'bold' : 'normal'}>
                        {h}
                      </text>
                    </g>
                  );
                })}
              </g>
            )}

            {/* 3. RELATIONSHIP PATHS */}
            {hasJoin && (
              <g>
                {/* Back glow */}
                <path
                  d={`M ${leftPortX} ${leftPortY} C 250 ${leftPortY}, 250 ${rightPortY}, ${rightPortX} ${rightPortY}`}
                  fill="none"
                  stroke="#D27B55"
                  strokeWidth="5"
                  opacity="0.15"
                  filter="url(#glow)"
                />
                {/* Foreground path */}
                <path
                  d={`M ${leftPortX} ${leftPortY} C 250 ${leftPortY}, 250 ${rightPortY}, ${rightPortX} ${rightPortY}`}
                  fill="none"
                  stroke="#D27B55"
                  strokeWidth="1.75"
                  className="flowing-path"
                />

                {/* Connector Badge */}
                <g transform={`translate(250, ${midY})`}>
                  <rect
                    x="-40"
                    y="-9"
                    width="80"
                    height="18"
                    rx="4"
                    fill="#FAF6F0"
                    stroke="#D27B55"
                    strokeWidth="1"
                  />
                  <text
                    y="3"
                    fill="#D27B55"
                    fontSize="7.5"
                    fontWeight="bold"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {joinConfig.type}
                  </text>
                </g>
              </g>
            )}

            {!hasJoin && secondaryFile && (
              /* Unlinked state */
              <path
                d={`M ${leftPortX} ${leftPortY} L ${rightPortX} ${rightPortY}`}
                fill="none"
                stroke="#E6E1DA"
                strokeWidth="1.5"
                strokeDasharray="4,4"
              />
            )}
          </svg>
        </div>
      )}
    </div>
  );
}
