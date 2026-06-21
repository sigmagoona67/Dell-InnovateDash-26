import ProfileQuestionnaireDrawer from '../profile/ProfileQuestionnaireDrawer'
import { STAFF_PROFILE_LABELS } from '../../lib/profileLabels'
import StaffQuestionnaireForm from './StaffQuestionnaireForm'

export default function StaffProfileEditDrawer({ open, questionnaire, staffProfileId, onClose, onSaved }) {
  return (
    <ProfileQuestionnaireDrawer
      open={open}
      onClose={onClose}
      sectionLabel={STAFF_PROFILE_LABELS.pageTitle}
      title="Edit questionnaire"
      titleId="staff-profile-edit-title"
    >
      <StaffQuestionnaireForm
        key={questionnaire?.id || staffProfileId}
        embedded
        questionnaire={questionnaire}
        staffProfileId={staffProfileId}
        badge="CareBridge AI · Update your profile"
        submitLabel="Save changes"
        onSaved={async (data) => {
          await onSaved?.(data)
          onClose()
        }}
      />
    </ProfileQuestionnaireDrawer>
  )
}
