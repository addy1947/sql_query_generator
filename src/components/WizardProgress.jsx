

export default function WizardProgress({ wizardStep }) {
  return (
    <div className="bg-[#0b0b0d] border border-zinc-900 rounded-xl p-4 flex items-center justify-between shadow-sm">
      <div className="flex items-center space-x-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Wizard progress</span>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 font-semibold">
          Step {wizardStep} / 3
        </span>
      </div>
      <div className="flex-1 max-w-[150px] sm:max-w-xs ml-4 h-1.5 rounded-full bg-zinc-900 overflow-hidden border border-zinc-800">
        <div 
          className="h-full bg-indigo-600 transition-all duration-300"
          style={{ width: `${(wizardStep / 3) * 100}%` }}
        ></div>
      </div>
    </div>
  );
}
