import ProfileQuestionnaireDrawer from '../profile/ProfileQuestionnaireDrawer'
import { YOUTH_PROFILE_LABELS } from '../../lib/profileLabels'
import YouthQuestionnaireForm from './YouthQuestionnaireForm'

export default function YouthProfileEditDrawer({ open, questionnaire, youthId, onClose, onSaved }) {
  return (
    <ProfileQuestionnaireDrawer
      open={open}
      onClose={onClose}
      sidebarInset
      sectionLabel={YOUTH_PROFILE_LABELS.pageTitle}
      title="Edit questionnaire"
      titleId="youth-profile-edit-title"
    >
      <YouthQuestionnaireForm
        key={questionnaire?.id || youthId}
        embedded
        questionnaire={questionnaire}
        youthId={youthId}
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
