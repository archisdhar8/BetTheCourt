export function Loader({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-sm text-muted-foreground">
      <span className="h-3 w-3 rounded-full bg-primary animate-pulse" />
      <span className="h-3 w-3 rounded-full bg-primary/60 animate-pulse [animation-delay:120ms]" />
      <span className="h-3 w-3 rounded-full bg-primary/30 animate-pulse [animation-delay:240ms]" />
      {label && <span className="ml-2">{label}</span>}
    </div>
  );
}
