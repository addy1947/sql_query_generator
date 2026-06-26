

export default function JoinTablesStep({
  joinConfig,
  setJoinConfig,
  files,
  activeFileId,
  activeFile,
  secondaryFile,
  isAdvancedMode
}) {
  return (
    <div className="space-y-3 text-left">
      <p className="text-[11px] text-zinc-500">
        Optional: link your primary table (<code>{activeFile ? activeFile.nameWithoutExt : ''}</code>) to a secondary table on matching column keys.
      </p>

      <label className="flex items-center space-x-2.5 p-2 rounded border border-zinc-900 bg-zinc-900/50 text-xs cursor-pointer select-none transition-all">
        <input
          type="checkbox"
          checked={joinConfig.enabled}
          onChange={(e) => setJoinConfig(prev => ({ ...prev, enabled: e.target.checked }))}
          className="rounded border-zinc-800 bg-zinc-900 text-blue-500 focus:ring-blue-500/20 w-3.5 h-3.5 accent-blue-600"
        />
        <span className="font-semibold text-zinc-350">Enable Relational Table JOIN</span>
      </label>

      {joinConfig.enabled && (
        <div className="p-3.5 rounded-lg border border-zinc-900 bg-[#0a0a0c] space-y-3.5 animate-slide-down">
          {files.length < 2 ? (
            <p className="text-[10px] text-zinc-500 italic">
              Please upload at least one additional CSV file to configure joins.
            </p>
          ) : (
            <div className="space-y-3 text-xs">
              {/* Join Type & Secondary Table */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-zinc-400 block">Join Direction</label>
                  <select
                    value={joinConfig.type}
                    onChange={(e) => setJoinConfig(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
                  >
                    <option value="INNER JOIN">INNER JOIN (Match Only)</option>
                    <option value="LEFT JOIN">LEFT JOIN (Keep All Primary Rows)</option>
                    {isAdvancedMode && (
                      <>
                        <option value="RIGHT JOIN">RIGHT JOIN (Keep All Secondary Rows)</option>
                        <option value="FULL OUTER JOIN">FULL OUTER JOIN (Keep All Rows)</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-zinc-400 block">Join Table (Secondary)</label>
                  <select
                    value={joinConfig.tableId}
                    onChange={(e) => {
                      const targetFile = files.find(f => f.id === e.target.value);
                      setJoinConfig(prev => ({
                        ...prev,
                        tableId: e.target.value,
                        rightKey: targetFile ? targetFile.headers[0] || '' : ''
                      }));
                    }}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
                  >
                    <option value="">-- Choose Table --</option>
                    {files.filter(f => f.id !== activeFileId).map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Join Key Columns */}
              {joinConfig.tableId && secondaryFile && activeFile && (
                <div className="p-3 bg-zinc-900/50 rounded border border-zinc-900 space-y-3">
                  <div className="text-[10px] font-semibold text-zinc-400 font-mono">
                    ON MATCHING KEYS:
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Primary Join Column */}
                    <div className="flex-1 space-y-1">
                      <span className="text-[9px] text-zinc-400 font-mono block truncate">
                        {activeFile.nameWithoutExt}
                      </span>
                      <select
                        value={joinConfig.leftKey}
                        onChange={(e) => setJoinConfig(prev => ({ ...prev, leftKey: e.target.value }))}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[10px] text-white focus:outline-none"
                      >
                        <option value="">-- Select Key --</option>
                        {activeFile.headers.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

                    <span className="text-zinc-500 text-xs font-semibold mt-4">=</span>

                    {/* Secondary Join Column */}
                    <div className="flex-1 space-y-1">
                      <span className="text-[9px] text-zinc-400 font-mono block truncate">
                        {secondaryFile.nameWithoutExt}
                      </span>
                      <select
                        value={joinConfig.rightKey}
                        onChange={(e) => setJoinConfig(prev => ({ ...prev, rightKey: e.target.value }))}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[10px] text-white focus:outline-none"
                      >
                        <option value="">-- Select Key --</option>
                        {secondaryFile.headers.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
