

export default function WizardProgress({ wizardStep }) {
  return (
    <div className="bg-brand-card border border-brand-border rounded-xl p-4 flex items-center justify-between shadow-sm">
      <div className="flex items-center space-x-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-brand-text-muted">Wizard progress</span>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-brand-accent-light border border-brand-accent/20 text-brand-accent font-bold">
          Step {wizardStep} / 3
        </span>
      </div>
      <div className="flex-1 max-w-[150px] sm:max-w-xs ml-4 h-2.5 rounded-full bg-brand-primary overflow-hidden border border-brand-border">
        <div 
          className="h-full bg-brand-accent transition-all duration-300 rounded-full"
          style={{ width: `${(wizardStep / 3) * 100}%` }}
        ></div>
      </div>
    </div>
  );
}
