'use client'

import { useState } from 'react'
import { mutate } from 'swr'

type Notice = { kind: 'ok' | 'error'; text: string } | null

async function submit(payload: Record<string, string>) {
  const response = await fetch('/api/account/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || 'Something went wrong.')
  return result
}

function Message({ notice }: { notice: Notice }) {
  if (!notice) return null
  return <p role={notice.kind === 'error' ? 'alert' : 'status'} className={`settings-notice ${notice.kind}`}>{notice.text}</p>
}

export function AccountSettings({ email, initialName }: { email: string; initialName: string }) {
  const [name, setName] = useState(initialName)
  const [profileBusy, setProfileBusy] = useState(false)
  const [profileNotice, setProfileNotice] = useState<Notice>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [passwordNotice, setPasswordNotice] = useState<Notice>(null)

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault()
    setProfileBusy(true)
    setProfileNotice(null)
    try {
      await submit({ action: 'profile', fullName: name })
      void mutate('/api/account/me')
      setProfileNotice({ kind: 'ok', text: 'Your name has been updated.' })
    } catch (error) {
      setProfileNotice({ kind: 'error', text: (error as Error).message })
    } finally {
      setProfileBusy(false)
    }
  }

  async function savePassword(event: React.FormEvent) {
    event.preventDefault()
    setPasswordBusy(true)
    setPasswordNotice(null)
    try {
      await submit({ action: 'password', currentPassword, newPassword })
      setCurrentPassword('')
      setNewPassword('')
      setPasswordNotice({ kind: 'ok', text: 'Your password has been changed.' })
    } catch (error) {
      setPasswordNotice({ kind: 'error', text: (error as Error).message })
    } finally {
      setPasswordBusy(false)
    }
  }

  return (
    <div className="settings-stack">
      <form className="settings-card" onSubmit={saveProfile}>
        <h2>Profile</h2>
        <p>The name we use on your orders and emails.</p>
        <label htmlFor="settings-email">Email</label>
        <input id="settings-email" type="email" value={email} readOnly disabled />
        <small>Your email is your sign-in and cannot be changed here.</small>
        <label htmlFor="settings-name">Full name</label>
        <input id="settings-name" type="text" autoComplete="name" maxLength={100} required value={name} onChange={(event) => setName(event.target.value)} />
        <Message notice={profileNotice} />
        <button type="submit" className="button-primary" disabled={profileBusy || !name.trim() || name.trim() === initialName}>{profileBusy ? 'Saving…' : 'Save changes'}</button>
      </form>

      <form className="settings-card" onSubmit={savePassword}>
        <h2>Password</h2>
        <p>Use at least 8 characters.</p>
        <label htmlFor="settings-current">Current password</label>
        <input id="settings-current" type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
        <label htmlFor="settings-new">New password</label>
        <input id="settings-new" type="password" autoComplete="new-password" minLength={8} maxLength={72} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
        <Message notice={passwordNotice} />
        <button type="submit" className="button-primary" disabled={passwordBusy || !currentPassword || newPassword.length < 8}>{passwordBusy ? 'Updating…' : 'Change password'}</button>
      </form>
    </div>
  )
}
