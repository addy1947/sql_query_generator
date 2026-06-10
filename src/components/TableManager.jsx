

export default function TableManager({
  files,
  activeFileId,
  setActiveFileId,
  handleRemoveFile,
  handleFileUpload,
  joinConfig
}) {
  return (
    <div className="bg-[#0a0a0c] border border-zinc-900 rounded-xl p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Workspace Tables</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-300">
            {files.length} loaded
          </span>
        </div>
        {/* File Upload Trigger */}
        <label className="text-[10px] font-semibold text-zinc-100 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 border border-zinc-700 transition-all cursor-pointer flex items-center space-x-1 shadow-sm">
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
                  ? 'border-indigo-500/40 bg-indigo-950/20 shadow-sm shadow-indigo-950/20'
                  : isSecondaryTable
                    ? 'border-amber-500/40 bg-amber-950/20 opacity-90 ring-1 ring-dashed ring-amber-500/25'
                    : 'border-zinc-800 bg-zinc-900/20 hover:border-zinc-700 hover:bg-zinc-900/45'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="truncate pr-5 flex-grow">
                  <span className="block font-semibold text-xs truncate text-zinc-200" title={f.name}>
                    {f.name}
                  </span>
                  <span className="text-[9px] text-zinc-400 font-mono block mt-0.5">
                    {f.totalRows} rows &bull; {f.size}
                  </span>
                </div>
                {/* Delete table */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile(f.id);
                  }}
                  className="text-zinc-500 hover:text-zinc-200 p-0.5 rounded hover:bg-zinc-900 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2.5 right-2.5 cursor-pointer"
                  title="Remove table"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              <div className="flex items-center space-x-1.5">
                {isActiveTable ? (
                  <span className="text-[8px] bg-indigo-600 text-white font-bold uppercase tracking-wider px-2 py-0.5 rounded font-sans shadow-sm">
                    Primary (FROM)
                  </span>
                ) : isSecondaryTable ? (
                  <span className="text-[8px] bg-amber-600 text-white font-bold uppercase tracking-wider px-2 py-0.5 rounded font-sans shadow-sm">
                    Joined
                  </span>
                ) : (
                  <span className="text-[8px] text-zinc-500 hover:text-zinc-350 font-medium uppercase tracking-wider py-0.5 block font-sans">
                    Click to select as FROM
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
