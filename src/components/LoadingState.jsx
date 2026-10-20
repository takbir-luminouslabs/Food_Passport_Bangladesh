/** Loading placeholder: a text label (for screen readers and everyone else) plus a spinner that stops when motion is reduced. */
export default function LoadingState({ label }) {
  return (
    <div role="status" aria-busy="true" className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-primary">
      <span
        data-spinner
        aria-hidden="true"
        className="size-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary motion-reduce:animate-none"
      />
      <span className="font-semibold">{label}</span>
    </div>
  )
}
