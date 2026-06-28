

export default function TableManager({
  files,
  activeFileId,
  setActiveFileId,
  handleRemoveFile,
  handleFileUpload,
  joinConfig,
  presets = [],
  handleSavePreset,
  handleLoadPreset,
  handleDeletePreset,
  isAdvancedMode
}) {
  return (
    <div className="bg-brand-card border border-brand-border rounded-xl p-4 space-y-3.5 shadow-sm text-left">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-brand-text-dark uppercase tracking-wider">Workspace Tables</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-brand-primary border border-brand-border text-brand-text-muted">
            {files.length} loaded
          </span>
        </div>
        {/* File Upload Trigger */}
        <label className="text-[10px] font-bold text-white px-3 py-1.5 rounded-lg bg-brand-accent hover:bg-brand-accent-hover transition-all cursor-pointer flex items-center space-x-1 shadow-sm shadow-brand-accent/15">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
          <span>Upload CSV</span>
          <input
            type="file"
            multiple
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {files.map((f) => {
          const isActiveTable = activeFileId === f.id;
          const isSecondaryTable = joinConfig.enabled && joinConfig.tableId === f.id;
          return (
            <div 
              key={f.id}
              onClick={() => setActiveFileId(f.id)}
              className={`p-3 rounded-lg border text-left cursor-pointer transition-all flex flex-col justify-between space-y-2 group relative ${
                isActiveTable
                  ? 'border-brand-accent/55 bg-brand-accent-light/50 shadow-sm ring-1 ring-brand-accent/15'
                  : isSecondaryTable
                    ? 'border-brand-text-muted/40 bg-brand-primary opacity-90 ring-1 ring-dashed ring-brand-text-muted/30'
                    : 'border-brand-border bg-white hover:border-brand-accent/35 hover:bg-brand-accent-light/15'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="truncate pr-5 flex-grow">
                  <span className="block font-semibold text-xs truncate text-brand-text-dark" title={f.name}>
                    {f.name}
                  </span>
                  <span className="text-[9px] text-brand-text-muted font-mono block mt-0.5">
                    {f.totalRows} rows &bull; {f.size}
                  </span>
                </div>
                {/* Delete table */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile(f.id);
                  }}
                  className="text-brand-text-muted hover:text-brand-accent p-0.5 rounded hover:bg-brand-accent-light transition-opacity opacity-0 group-hover:opacity-100 absolute top-2.5 right-2.5 cursor-pointer"
                  title="Remove table"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              <div className="flex items-center space-x-1.5">
                {isActiveTable ? (
                  <span className="text-[8px] bg-brand-accent text-white font-bold uppercase tracking-wider px-2 py-0.5 rounded font-sans shadow-sm">
                    Primary (FROM)
                  </span>
                ) : isSecondaryTable ? (
                  <span className="text-[8px] bg-brand-text-muted text-white font-bold uppercase tracking-wider px-2 py-0.5 rounded font-sans shadow-sm">
                    Joined
                  </span>
                ) : (
                  <span className="text-[8px] text-brand-text-muted hover:text-brand-text-dark font-medium uppercase tracking-wider py-0.5 block font-sans">
                    Click to select as FROM
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Saved Query Presets section */}
      {isAdvancedMode && files.length > 0 && (
        <div className="pt-3.5 border-t border-brand-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-brand-text-muted uppercase tracking-wider">Saved Query Presets</span>
            <span className="text-[9px] font-mono text-brand-text-muted">
              {presets.length} saved
            </span>
          </div>

          {/* Preset Save Action Input */}
          <div className="flex gap-2">
            <input
              type="text"
              id="new-preset-name"
              placeholder="Query name..."
              className="flex-grow bg-white border border-brand-border rounded px-2.5 py-1.5 text-[10px] text-brand-text-dark focus:outline-none focus:border-brand-accent/50 placeholder:text-brand-text-muted"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = e.target.value;
                  if (val && val.trim()) {
                    handleSavePreset(val);
                    e.target.value = '';
                  }
                }
              }}
            />
            <button
              onClick={() => {
                const el = document.getElementById('new-preset-name');
                if (el && el.value && el.value.trim()) {
                  handleSavePreset(el.value);
                  el.value = '';
                }
              }}
              className="px-2.5 py-1.5 rounded bg-brand-accent hover:bg-brand-accent-hover text-[10px] font-bold text-white transition-all cursor-pointer shadow-sm shadow-brand-accent/15"
            >
              Save Current
            </button>
          </div>

          {/* List of Saved Presets */}
          {presets.length > 0 && (
            <div className="max-h-28 overflow-y-auto space-y-1.5 scrollbar-thin">
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  className="p-2 rounded bg-brand-primary border border-brand-border hover:border-brand-accent/35 flex items-center justify-between transition-all"
                >
                  <button
                    onClick={() => handleLoadPreset(preset.id)}
                    className="flex-grow text-left text-[10px] font-medium text-brand-text-dark hover:text-brand-accent truncate cursor-pointer"
                    title={`Load query preset: ${preset.name}`}
                  >
                    {preset.name}
                  </button>
                  <button
                    onClick={() => handleDeletePreset(preset.id)}
                    className="text-brand-text-muted hover:text-brand-accent p-1.5 rounded hover:bg-brand-accent-light transition-colors cursor-pointer"
                    title="Delete preset"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
