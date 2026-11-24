'use client'

import { FormEvent, useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { ArrowLeft, MapPin, ShieldAlert, Truck } from 'lucide-react'

type Zone = { id: string; name: string; is_fallback: boolean; active: boolean; free_shipping_threshold_ghs: number | null; min_order_ghs: number; cities: string[]; regions: string[] }
type Method = { id: string; code: string; name: string; description: string; min_days: number; max_days: number; unit: 'hours' | 'business_days'; requires_pickup_location: boolean; active: boolean }
type Rate = { id: string; zone_id: string; method_id: string; fee_ghs: number; active: boolean }
type Pickup = { id: string; name: string; address: string; city: string; region: string; phone: string | null; active: boolean }
type Settings = { zones: Zone[]; methods: Method[]; rates: Rate[]; pickups: Pickup[] }

const fetcher = async (url: string): Promise<Settings> => {
  const response = await fetch(url)
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Could not load shipping settings.')
  return data
}

async function send(method: 'PATCH' | 'POST', body: unknown) {
  const response = await fetch('/api/admin/shipping', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Could not save.')
}

type Report = (message: string) => void

function MethodRow({ method, onSaved, report }: { method: Method; onSaved: () => void; report: Report }) {
  const [draft, setDraft] = useState({ name: method.name, description: method.description, min_days: String(method.min_days), max_days: String(method.max_days), unit: method.unit, active: method.active })
  async function save() {
    try {
      await send('PATCH', { kind: 'method', id: method.id, ...draft, min_days: Number(draft.min_days), max_days: Number(draft.max_days) })
      report(`${draft.name} saved.`); onSaved()
    } catch (error) { report(error instanceof Error ? error.message : 'Could not save.') }
  }
  return (
    <tr>
      <td><input className="ship-input" aria-label={`Name for ${method.code}`} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /><small>{method.code}</small></td>
      <td><input className="ship-input ship-wide" aria-label={`Description for ${method.name}`} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></td>
      <td className="ship-eta"><input className="ship-input ship-num" type="number" min="0" aria-label={`Minimum ETA for ${method.name}`} value={draft.min_days} onChange={(e) => setDraft({ ...draft, min_days: e.target.value })} />–<input className="ship-input ship-num" type="number" min="0" aria-label={`Maximum ETA for ${method.name}`} value={draft.max_days} onChange={(e) => setDraft({ ...draft, max_days: e.target.value })} />
        <select className="ship-input" aria-label={`ETA unit for ${method.name}`} value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value as Method['unit'] })}><option value="hours">hours</option><option value="business_days">business days</option></select></td>
      <td><label className="ship-toggle"><input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> Active</label></td>
      <td><button className="ship-save" onClick={save}>Save</button></td>
    </tr>
  )
}

function ZoneRow({ zone, onSaved, report }: { zone: Zone; onSaved: () => void; report: Report }) {
  const [draft, setDraft] = useState({ name: zone.name, min_order_ghs: String(zone.min_order_ghs), free: zone.free_shipping_threshold_ghs === null ? '' : String(zone.free_shipping_threshold_ghs), active: zone.active })
  async function save() {
    try {
      await send('PATCH', { kind: 'zone', id: zone.id, name: draft.name, min_order_ghs: Number(draft.min_order_ghs), free_shipping_threshold_ghs: draft.free === '' ? null : Number(draft.free), active: draft.active })
      report(`${draft.name} saved.`); onSaved()
    } catch (error) { report(error instanceof Error ? error.message : 'Could not save.') }
  }
  const coverage = zone.is_fallback ? 'All other locations' : [...zone.cities.slice(0, 3), ...zone.regions].join(', ') || '—'
  return (
    <tr>
      <td><input className="ship-input" aria-label={`Name for zone ${zone.name}`} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /><small>{coverage}</small></td>
      <td><input className="ship-input ship-num" type="number" min="0" step="0.01" aria-label={`Minimum order for ${zone.name}`} value={draft.min_order_ghs} onChange={(e) => setDraft({ ...draft, min_order_ghs: e.target.value })} /></td>
      <td><input className="ship-input ship-num" type="number" min="0" step="0.01" placeholder="Off" aria-label={`Free shipping threshold for ${zone.name}`} value={draft.free} onChange={(e) => setDraft({ ...draft, free: e.target.value })} /></td>
      <td><label className="ship-toggle"><input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> Active</label></td>
      <td><button className="ship-save" onClick={save}>Save</button></td>
    </tr>
  )
}

function RateCell({ zone, method, rate, onSaved, report }: { zone: Zone; method: Method; rate?: Rate; onSaved: () => void; report: Report }) {
  const [fee, setFee] = useState(rate ? String(rate.fee_ghs) : '')
  const [active, setActive] = useState(rate?.active ?? true)
  async function save() {
    if (fee === '') { report('Enter a fee to create this rate.'); return }
    try { await send('PATCH', { kind: 'rate', zone_id: zone.id, method_id: method.id, fee_ghs: Number(fee), active }); report(`${zone.name} · ${method.name} saved.`); onSaved() }
    catch (error) { report(error instanceof Error ? error.message : 'Could not save.') }
  }
  return (
    <td className="ship-rate">
      <input className="ship-input ship-num" type="number" min="0" step="0.01" placeholder="N/A" aria-label={`Fee for ${method.name} in ${zone.name}`} value={fee} onChange={(e) => setFee(e.target.value)} />
      <input type="checkbox" aria-label={`Enable ${method.name} in ${zone.name}`} checked={active} onChange={(e) => setActive(e.target.checked)} />
      <button className="ship-save" onClick={save}>Save</button>
    </td>
  )
}

function PickupRow({ pickup, onSaved, report }: { pickup: Pickup; onSaved: () => void; report: Report }) {
  const [draft, setDraft] = useState({ name: pickup.name, address: pickup.address, city: pickup.city, region: pickup.region, phone: pickup.phone ?? '', active: pickup.active })
  async function save() {
    try { await send('PATCH', { kind: 'pickup', id: pickup.id, ...draft }); report(`${draft.name} saved.`); onSaved() }
    catch (error) { report(error instanceof Error ? error.message : 'Could not save.') }
  }
  return (
    <tr>
      <td><input className="ship-input" aria-label="Pickup name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></td>
      <td><input className="ship-input ship-wide" aria-label="Pickup address" value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} /></td>
      <td><input className="ship-input" aria-label="Pickup city" value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} /></td>
      <td><input className="ship-input" aria-label="Pickup region" value={draft.region} onChange={(e) => setDraft({ ...draft, region: e.target.value })} /></td>
      <td><input className="ship-input" aria-label="Pickup phone" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></td>
      <td><label className="ship-toggle"><input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> Active</label></td>
      <td><button className="ship-save" onClick={save}>Save</button></td>
    </tr>
  )
}

export function AdminShippingSettings() {
  const { data, error, isLoading, mutate } = useSWR('/api/admin/shipping', fetcher)
  const [notice, setNotice] = useState('')
  const [adding, setAdding] = useState(false)
  const [newPickup, setNewPickup] = useState({ name: '', address: '', city: '', region: 'Greater Accra', phone: '' })
  const refresh = () => { void mutate() }

  async function addPickup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setAdding(true); setNotice('')
    try {
      await send('POST', newPickup)
      setNewPickup({ name: '', address: '', city: '', region: 'Greater Accra', phone: '' })
      setNotice('Pickup location added.'); await mutate()
    } catch (addError) { setNotice(addError instanceof Error ? addError.message : 'Could not add the location.') }
    finally { setAdding(false) }
  }

  return (
    <main className="admin-shell">
      <header className="admin-header"><Link href="/admin" className="admin-back"><ArrowLeft size={16} /> Dashboard</Link><span className="admin-badge">SHIPPING SETTINGS</span></header>
      {isLoading ? <div className="admin-empty">Loading shipping settings…</div> : error ? <section className="admin-denied"><ShieldAlert size={24} /><h1>Admin access required</h1><p>{error.message}</p><Link href="/" className="button-primary">Return to the store</Link></section> : data && (
        <div className="ship-page">
          <section className="admin-heading ship-heading"><div><span className="eyebrow">AFRO SUPERSTORE GHANA</span><h1>Shipping &amp; delivery</h1><p>Methods, zones, fees and pickup points used at checkout.</p></div></section>
          {notice && <p className="admin-notice" role="status">{notice}</p>}

          <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Delivery methods</h2><p>Names, estimated delivery times and availability.</p></div><Truck size={17} /></div>
            <div className="admin-table-wrap"><table><thead><tr><th>Method</th><th>Description</th><th>Estimate</th><th>Status</th><th><span className="sr-only">Save</span></th></tr></thead><tbody>{data.methods.map((m) => <MethodRow key={m.id} method={m} onSaved={refresh} report={setNotice} />)}</tbody></table></div></section>

          <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Delivery zones</h2><p>Minimum order and the subtotal at which shipping becomes free. Leave blank to disable free shipping.</p></div></div>
            <div className="admin-table-wrap"><table><thead><tr><th>Zone</th><th>Min order (GH₵)</th><th>Free shipping from (GH₵)</th><th>Status</th><th><span className="sr-only">Save</span></th></tr></thead><tbody>{data.zones.map((z) => <ZoneRow key={z.id} zone={z} onSaved={refresh} report={setNotice} />)}</tbody></table></div></section>

          <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Rates by zone</h2><p>Fee in GH₵ for each method. Leave empty where a method is not offered.</p></div></div>
            <div className="admin-table-wrap"><table><thead><tr><th>Zone</th>{data.methods.map((m) => <th key={m.id}>{m.name}</th>)}</tr></thead><tbody>{data.zones.map((z) => <tr key={z.id}><td><strong>{z.name}</strong></td>{data.methods.map((m) => <RateCell key={`${z.id}-${m.id}-${data.rates.find((r) => r.zone_id === z.id && r.method_id === m.id)?.fee_ghs ?? 'x'}`} zone={z} method={m} rate={data.rates.find((r) => r.zone_id === z.id && r.method_id === m.id)} onSaved={refresh} report={setNotice} />)}</tr>)}</tbody></table></div></section>

          <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Pickup locations</h2><p>Pickup is offered to customers whose region has an active location.</p></div><MapPin size={17} /></div>
            <div className="admin-table-wrap">{data.pickups.length > 0 && <table><thead><tr><th>Name</th><th>Address</th><th>City</th><th>Region</th><th>Phone</th><th>Status</th><th><span className="sr-only">Save</span></th></tr></thead><tbody>{data.pickups.map((p) => <PickupRow key={p.id} pickup={p} onSaved={refresh} report={setNotice} />)}</tbody></table>}{data.pickups.length === 0 && <p className="admin-empty">No pickup locations yet. Pickup stays hidden at checkout until you add one.</p>}</div>
            <form className="ship-add" onSubmit={addPickup}><h3>Add a pickup location</h3>
              <input className="ship-input" required placeholder="Name" aria-label="New pickup name" maxLength={100} value={newPickup.name} onChange={(e) => setNewPickup({ ...newPickup, name: e.target.value })} />
              <input className="ship-input ship-wide" required placeholder="Street address" aria-label="New pickup address" maxLength={200} value={newPickup.address} onChange={(e) => setNewPickup({ ...newPickup, address: e.target.value })} />
              <input className="ship-input" required placeholder="City" aria-label="New pickup city" maxLength={80} value={newPickup.city} onChange={(e) => setNewPickup({ ...newPickup, city: e.target.value })} />
              <select className="ship-input" aria-label="New pickup region" value={newPickup.region} onChange={(e) => setNewPickup({ ...newPickup, region: e.target.value })}>{['Greater Accra', 'Ashanti', 'Western', 'Central', 'Eastern', 'Northern', 'Bono', 'Volta', 'Upper East', 'Upper West', 'Oti', 'Savannah', 'North East', 'Ahafo', 'Bono East', 'Western North'].map((r) => <option key={r}>{r}</option>)}</select>
              <input className="ship-input" placeholder="Phone (optional)" aria-label="New pickup phone" maxLength={30} value={newPickup.phone} onChange={(e) => setNewPickup({ ...newPickup, phone: e.target.value })} />
              <button className="ship-save ship-primary" disabled={adding}>{adding ? 'Adding…' : 'Add location'}</button></form></section>
        </div>
      )}
    </main>
  )
}
