function EditIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 20h9" strokeLinecap="round" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function ProfileEditButton({ onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-white px-4 py-2 text-sm font-bold text-teal-700 shadow-sm transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <EditIcon />
      Edit
    </button>
  )
}
