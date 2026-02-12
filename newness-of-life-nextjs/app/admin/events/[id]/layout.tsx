export default function EventEditLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // This layout removes the admin sidebar for the full-screen preview editor
  return <>{children}</>
}
