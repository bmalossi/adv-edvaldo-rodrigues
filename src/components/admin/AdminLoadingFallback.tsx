export function AdminLoadingFallback() {
  return (
    <div
      className="min-h-[50vh] w-full flex flex-col items-center justify-center p-8 text-center space-y-4"
      role="status"
      aria-live="polite"
    >
      <div className="relative size-12">
        <div className="absolute inset-0 rounded-full border-2 border-secondary/20 animate-ping motion-reduce:animate-none" />
        <div className="size-12 rounded-full border-2 border-secondary border-t-transparent animate-spin" />
      </div>
      <p className="text-xs uppercase tracking-[0.2em] font-medium text-slate-400">
        Carregando módulo administrativo...
      </p>
      <span className="sr-only">Carregando conteúdo</span>
    </div>
  );
}
