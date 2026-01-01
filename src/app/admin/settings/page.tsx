'use client'

import { useEffect, useMemo, useState } from 'react'

type SettingsData = {
  grading_rules: string
  promotion_criteria: string
}

export default function SettingsPage() {
  // Change these keys if your app uses different localStorage keys
  const auth = useMemo(() => {
    if (typeof window === 'undefined') return { id: null, role: null, name: null, email: null }
    const raw = localStorage.getItem('user')
    if (!raw) return { id: null, role: null, name: null, email: null }

    try {
        const u = JSON.parse(raw)
        return {
        id: typeof u?.id === 'number' ? u.id : Number(u?.id) || null,
        role: typeof u?.role === 'string' ? u.role : null,
        name: typeof u?.name === 'string' ? u.name : null,
        email: typeof u?.email === 'string' ? u.email : null,
        }
    } catch {
        return { id: null, role: null, name: null, email: null }
    }
}, [])

const userId = auth.id
const userRole = auth.role
const userName = auth.name
const userEmail = auth.email

const isAdmin = (userRole || '').toLowerCase() === 'admin'

  // Password form
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // System settings
  const [settings, setSettings] = useState<SettingsData>({
    grading_rules: '',
    promotion_criteria: '',
  })
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsMsg, setSettingsMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Load system settings (admin only)
  useEffect(() => {
    const load = async () => {
      if (!isAdmin) return
      setSettingsLoading(true)
      setSettingsMsg(null)
      try {
        const res = await fetch('/api/settings', { cache: 'no-store' })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Failed to load settings')
        setSettings(json.data)
      } catch (e) {
        setSettingsMsg({ type: 'err', text: (e as Error).message })
      } finally {
        setSettingsLoading(false)
      }
    }
    load()
  }, [isAdmin])

  const handlePasswordUpdate = async () => {
    setPwMsg(null)

    if (!userId) {
      setPwMsg({ type: 'err', text: 'No logged-in user found (missing userId).' })
      return
    }
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPwMsg({ type: 'err', text: 'Please fill all password fields.' })
      return
    }
    if (newPassword.length < 8) {
      setPwMsg({ type: 'err', text: 'New password must be at least 8 characters.' })
      return
    }
    if (newPassword !== confirmNewPassword) {
      setPwMsg({ type: 'err', text: 'New password and confirmation do not match.' })
      return
    }

    setPwLoading(true)
    try {
      const res = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, currentPassword, newPassword }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to update password')

      setPwMsg({ type: 'ok', text: 'Password updated successfully.' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
    } catch (e) {
      setPwMsg({ type: 'err', text: (e as Error).message })
    } finally {
      setPwLoading(false)
    }
  }

  const handleSaveSystemSettings = async () => {
    if (!isAdmin) return
    setSettingsMsg(null)
    setSettingsSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          updates: {
            grading_rules: settings.grading_rules,
            promotion_criteria: settings.promotion_criteria,
          },
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to save settings')

      setSettingsMsg({ type: 'ok', text: 'System settings saved.' })
    } catch (e) {
      setSettingsMsg({ type: 'err', text: (e as Error).message })
    } finally {
      setSettingsSaving(false)
    }
  }

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-600 mt-1">
            {userName ? `${userName}` : 'Account'} {userEmail ? `• ${userEmail}` : ''}
          </p>
        </div>
      </div>

      {/* Account Settings */}
      <section className="rounded-xl border bg-white p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Account</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="w-full h-11 px-3 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={pwLoading}
            />
          </div>

          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="w-full h-11 px-3 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={pwLoading}
            />
            <p className="text-xs text-gray-500 mt-1">Minimum 8 characters.</p>
          </div>

          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <input
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full h-11 px-3 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={pwLoading}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePasswordUpdate}
            disabled={pwLoading}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:bg-gray-400"
          >
            {pwLoading ? 'Updating...' : 'Update Password'}
          </button>

          {pwMsg && (
            <div
              className={`text-sm ${
                pwMsg.type === 'ok' ? 'text-green-700' : 'text-red-700'
              }`}
            >
              {pwMsg.text}
            </div>
          )}
        </div>

        <p className="text-xs text-gray-500">
          Passwords are stored only as secure hashes. Admins cannot view user passwords.
        </p>
      </section>

      {/* System Settings (Admin only) */}
      <section className="rounded-xl border bg-white p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">System Settings</h2>
          {!isAdmin && (
            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
              Admin only
            </span>
          )}
        </div>

        {!isAdmin ? (
          <p className="text-sm text-gray-600">
            System settings are only available to administrators.
          </p>
        ) : (
          <>
            {settingsLoading && <div className="text-sm text-gray-600">Loading system settings…</div>}

            {!settingsLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grading Rules</label>
                  <textarea
                    value={settings.grading_rules}
                    onChange={(e) => setSettings((p) => ({ ...p, grading_rules: e.target.value }))}
                    placeholder="Describe grading rules..."
                    className="w-full min-h-[120px] p-3 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={settingsSaving}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Promotion Criteria</label>
                  <textarea
                    value={settings.promotion_criteria}
                    onChange={(e) => setSettings((p) => ({ ...p, promotion_criteria: e.target.value }))}
                    placeholder="Describe promotion criteria..."
                    className="w-full min-h-[120px] p-3 rounded-lg bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={settingsSaving}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveSystemSettings}
                disabled={settingsSaving || settingsLoading}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:bg-gray-400"
              >
                {settingsSaving ? 'Saving…' : 'Save Settings'}
              </button>

              {settingsMsg && (
                <div
                  className={`text-sm ${
                    settingsMsg.type === 'ok' ? 'text-green-700' : 'text-red-700'
                  }`}
                >
                  {settingsMsg.text}
                </div>
              )}
            </div>

            <p className="text-xs text-gray-500">
              Changes are recorded in <code>app_settings_history</code> for audit.
            </p>
          </>
        )}
      </section>
    </div>
  )
}
