'use client'

import { FormEvent, useState } from 'react'
import useSWR from 'swr'
import { History, Shapes, UserCog } from 'lucide-react'

export type Category = { id: string; name: string; slug: string; active: boolean }
type Member = { user_id: string; role: string; email: string; created_at: string }
type AuditLog = { id: string; actor_email: string | null; actor_role: string | null; action: string; entity: string; entity_id: string | null; created_at: string }

const ROLE_LABELS: Record<string, string> = { owner: 'Owner', manager: 'Manager', fulfilment: 'Fulfilment', content: 'Content' }
const ROLE_HINTS: Record<string, string> = { owner: 'Full access, including staff', manager: 'Orders, catalogue, customers', fulfilment: 'Orders and tracking only', content: 'Products and categories only' }

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Could not load data.')
  return data
}

async function send(url: string, method: string, body?: unknown) {
  const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Something went wrong.')
}

export function AdminCategoriesPanel({ categories, onChanged, onNotice }: { categories: Category[]; onChanged: () => void; onNotice: (message: string) => void }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    try {
      await send('/api/admin/categories', 'POST', { name })
      setName('')
      onNotice('Category added.')
      onChanged()
    } catch (cause) {
      onNotice(cause instanceof Error ? cause.message : 'Could not add the category.')
    } finally {
      setBusy(false)
    }
  }

  async function archive(id: string) {
    try {
      await send(`/api/admin/categories?id=${encodeURIComponent(id)}`, 'DELETE')
      onNotice('Category archived.')
      onChanged()
    } catch (cause) {
      onNotice(cause instanceof Error ? cause.message : 'Could not archive the category.')
    }
  }

  return (
    <section className="admin-panel admin-team">
      <div className="admin-panel-heading"><div><h2>Categories</h2><p>Groups shown when adding products.</p></div><Shapes size={17} /></div>
      <form className="admin-inline-form" onSubmit={add}>
        <label className="sr-only" htmlFor="category-name">Category name</label>
        <input id="category-name" required minLength={2} maxLength={60} placeholder="New category name" value={name} onChange={(event) => setName(event.target.value)} />
        <button type="submit" className="button-primary" disabled={busy}>{busy ? 'Adding…' : 'Add'}</button>
      </form>
      <ul className="admin-chip-list">
        {categories.filter((category) => category.active).map((category) => <li key={category.id}><span>{category.name}</span><button type="button" onClick={() => archive(category.id)} aria-label={`Archive ${category.name}`}>Remove</button></li>)}
      </ul>
    </section>
  )
}

export function AdminStaffPanel({ currentEmail, onNotice }: { currentEmail: string; onNotice: (message: string) => void }) {
  const { data, error, mutate } = useSWR('/api/admin/staff', (url: string) => getJson<{ members: Member[] }>(url))
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('fulfilment')
  const [busy, setBusy] = useState(false)

  async function assign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    try {
      await send('/api/admin/staff', 'POST', { email, role })
      setEmail('')
      onNotice('Staff access saved.')
      await mutate()
    } catch (cause) {
      onNotice(cause instanceof Error ? cause.message : 'Could not save access.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(userId: string) {
    if (!window.confirm('Remove this person’s admin access?')) return
    try {
      await send(`/api/admin/staff?user_id=${encodeURIComponent(userId)}`, 'DELETE')
      onNotice('Access removed.')
      await mutate()
    } catch (cause) {
      onNotice(cause instanceof Error ? cause.message : 'Could not remove access.')
    }
  }

  return (
    <section className="admin-panel admin-team">
      <div className="admin-panel-heading"><div><h2>Team access</h2><p>Give staff only what they need.</p></div><UserCog size={17} /></div>
      <form className="admin-form" onSubmit={assign}>
        <label>Account email<input type="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="teammate@example.com" /></label>
        <label>Role<select value={role} onChange={(event) => setRole(event.target.value)}>{Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label} · {ROLE_HINTS[value]}</option>)}</select></label>
        <button type="submit" className="button-primary" disabled={busy}>{busy ? 'Saving…' : 'Save access'}</button>
      </form>
      {error && <p className="admin-empty">{error.message}</p>}
      <div className="customer-list">
        {data?.members.map((member) => <article key={member.user_id}><span className="customer-avatar">{member.email.slice(0, 1).toUpperCase()}</span><div><strong>{member.email}{member.email === currentEmail ? ' (you)' : ''}</strong><small>{ROLE_LABELS[member.role] || member.role}</small></div>{member.email !== currentEmail && <button type="button" className="admin-link-button" onClick={() => remove(member.user_id)}>Remove</button>}</article>)}
        {data && data.members.length === 0 && <p className="admin-empty">No role-based staff yet. Original admins keep owner access.</p>}
      </div>
    </section>
  )
}

export function AdminActivityPanel() {
  const { data, error } = useSWR('/api/admin/audit', (url: string) => getJson<{ logs: AuditLog[] }>(url), { refreshInterval: 30000 })
  return (
    <section className="admin-panel admin-activity">
      <div className="admin-panel-heading"><div><h2>Activity log</h2><p>Who changed what, most recent first.</p></div><History size={17} /></div>
      {error && <p className="admin-empty">{error.message}</p>}
      <ol className="admin-activity-list">
        {data?.logs.map((log) => <li key={log.id}><strong>{log.action}</strong><span>{log.entity}{log.entity_id ? ` · ${log.entity_id.slice(0, 18)}` : ''}</span><small>{log.actor_email || 'System'} ({log.actor_role || 'n/a'}) · {new Date(log.created_at).toLocaleString('en-GH')}</small></li>)}
      </ol>
      {data && data.logs.length === 0 && <p className="admin-empty">Changes will be recorded here.</p>}
    </section>
  )
}
