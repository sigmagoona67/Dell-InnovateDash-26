import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import {
  YouthAuthGate,
  YouthEntryRedirect,
  YouthSessionProvider,
} from '../../context/YouthSessionContext'
import YouthOnboarding from './YouthOnboarding'
import YouthPortal from './YouthPortal'

export default function YouthLayout() {
  return (
    <YouthSessionProvider>
      <YouthAuthGate>
        <Routes>
          <Route index element={<YouthEntryRedirect />} />
          <Route path="onboarding" element={<YouthOnboarding />} />
          <Route path="portal" element={<YouthPortal />} />
          <Route path="*" element={<Navigate to="/youth-chat" replace />} />
        </Routes>
      </YouthAuthGate>
    </YouthSessionProvider>
  )
}
