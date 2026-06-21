import StaffProfilePanel from '../../components/staff/StaffProfilePanel'
import { useStaffSession } from '../../context/StaffSessionContext'

export default function StaffProfilePage() {
  const { context } = useStaffSession()

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-96 w-96 rounded-full bg-sky-50 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-teal-50 blur-3xl" />
      </div>
      <main className="relative z-10 flex-1 overflow-y-auto p-6 sm:p-8">
        <StaffProfilePanel staffProfileId={context.staffProfile.id} />
      </main>
    </div>
  )
}
