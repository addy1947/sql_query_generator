

export default function WizardCard({
  stepIndex,
  wizardStep,
  setWizardStep,
  title,
  summary,
  children
}) {
  const isActive = wizardStep === stepIndex;
  const isCompleted = wizardStep > stepIndex;
  const isLocked = wizardStep < stepIndex;

  return (
    <div 
      className={`border rounded-xl transition-all duration-200 ${
        isActive 
          ? 'border-indigo-500/40 bg-[#0e0e12] shadow-sm ring-1 ring-indigo-500/10' 
          : isCompleted 
            ? 'border-emerald-600/30 bg-[#090b0a] hover:border-emerald-500/50 hover:bg-[#0b0f0d] cursor-pointer' 
            : 'border-zinc-900 bg-[#060608]/40 opacity-40 select-none'
      }`}
      onClick={() => {
        if (isCompleted) {
          setWizardStep(stepIndex);
        }
      }}
    >
      {/* Card Header */}
      <div className="p-4 flex items-center justify-between border-b border-zinc-900">
        <div className="flex items-center space-x-3">
          <span className={`w-6 h-6 rounded flex items-center justify-center font-bold text-[10px] border transition-colors duration-300 ${
            isActive
              ? 'border-indigo-500 bg-indigo-600 text-white'
              : isCompleted
                ? 'border-emerald-500 bg-emerald-600 text-white'
                : 'border-zinc-800 text-zinc-500 bg-zinc-900/10'
          }`}>
            {isCompleted ? (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            ) : stepIndex}
          </span>
          <div>
            <span className="font-semibold text-zinc-200 text-xs block sm:text-sm">
              {title}
            </span>
            {!isActive && (
              <span className="text-[10px] text-zinc-400 block truncate max-w-xs sm:max-w-md font-mono mt-0.5">
                {isLocked ? 'Step locked' : summary}
              </span>
            )}
          </div>
        </div>

        {/* Collapsed edit trigger */}
        {isCompleted && (
          <span className="text-[10px] text-emerald-400 font-semibold flex items-center space-x-1 group hover:text-emerald-300 transition-colors">
            <span>Edit</span>
            <svg className="w-3.5 h-3.5 transform group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </span>
        )}
      </div>

      {/* Card Content (Visible only when Active) */}
      {isActive && (
        <div className="p-5 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
}
