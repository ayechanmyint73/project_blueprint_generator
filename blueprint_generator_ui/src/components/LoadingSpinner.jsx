export default function LoadingSpinner({ label = 'Loading…', className = 'page-loading' }) {
  return (
    <div className={className} role="status" aria-live="polite">
      <div className="spinner-large" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  )
}
