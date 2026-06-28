
import { highlightSQL } from '../utils/sqlGenerator';

export default function SqlPreview({
  sqlQuery,
  handleCopySQL,
  handleDownloadSQL,
  copySuccess,
  isAdvancedMode,
  setIsAdvancedMode,
  hasAdvancedConfigs
}) {
  return (
    <div className="bg-brand-card border border-brand-border rounded-xl shadow-sm overflow-hidden flex flex-col">
      <div className="p-4 border-b border-brand-border bg-brand-primary/60 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-brand-accent animate-pulse"></span>
          <span className="font-semibold text-xs text-brand-text-dark font-mono">GENERATED_QUERY.SQL</span>
        </div>
        <div className="flex items-center space-x-1.5">
          {/* Copy Button */}
          <button
            onClick={handleCopySQL}
            className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-brand-primary border border-brand-border text-[10px] font-semibold text-brand-text-dark transition-all flex items-center space-x-1 cursor-pointer shadow-sm"
            title="Copy query text"
          >
            {copySuccess ? (
              <>
                <svg className="w-3 h-3 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-brand-accent">Copied!</span>
              </>
            ) : (
              <>
                <svg className="w-3 h-3 text-brand-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                <span>Copy</span>
              </>
            )}
          </button>

          {/* Download Button */}
          <button
            onClick={handleDownloadSQL}
            className="px-3 py-1.5 rounded-lg bg-brand-accent hover:bg-brand-accent-hover text-[10px] font-bold text-white transition-all flex items-center space-x-1 cursor-pointer shadow-sm shadow-brand-accent/15"
            title="Save as .sql"
          >
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Download</span>
          </button>
        </div>
      </div>

      {!isAdvancedMode && hasAdvancedConfigs && (
        <div className="p-3 bg-brand-accent-light/35 border-b border-brand-border flex items-center justify-between text-left animate-slide-down">
          <div className="flex items-center space-x-2 text-[10px] text-brand-text-dark">
            <svg className="w-4 h-4 text-brand-accent flex-shrink-0 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              Query contains advanced configurations (aggregations, aliases, or joins).
            </span>
          </div>
          <button
            onClick={() => setIsAdvancedMode(true)}
            className="flex-shrink-0 px-2.5 py-1 text-[9px] font-bold bg-brand-accent hover:bg-brand-accent-hover border-transparent rounded-lg text-white transition-all cursor-pointer shadow-sm shadow-brand-accent/10"
          >
            Switch to Advanced
          </button>
        </div>
      )}

      <div className="p-4 bg-brand-primary/30 min-h-[140px] max-h-[260px] overflow-y-auto font-mono text-[11px] leading-relaxed border-b border-brand-border whitespace-pre text-left selection:bg-brand-accent/25">
        {highlightSQL(sqlQuery)}
      </div>
    </div>
  );
}
