'use client'

// Submit button that asks before submitting its parent form — for
// destructive staff actions (delete a notice). Keep the surrounding
// <form action={...}> a plain server-action form.
export function ConfirmSubmitButton({
  message,
  className,
  children,
}: {
  message: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault()
      }}
    >
      {children}
    </button>
  )
}
