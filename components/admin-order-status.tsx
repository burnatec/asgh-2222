'use client'

import { useState } from 'react'

type Props = {
  id: string
  reference: string
  status: string
  carrier: string | null
  trackingNumber: string | null
  onSaved: (message: string) => void
}

export function AdminOrderStatus({ id, reference, status, carrier, trackingNumber, onSaved }: Props) {
  const [nextStatus, setNextStatus] = useState(status)
  const [carrierName, setCarrierName] = useState(carrier || '')
  const [tracking, setTracking] = useState(trackingNumber || '')
  const [note, setNote] = useState('')
  const [notify, setNotify] = useState(true)
  const [saving, setSaving] = useState(false)
  const dirty = nextStatus !== status || carrierName !== (carrier || '') || tracking !== (trackingNumber || '')

  async function save() {
    setSaving(true)
    try {
      const response = await fetch('/api/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'order', id, status: nextStatus, carrier: carrierName, tracking_number: tracking, note, notify }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not update order status.')
      setNote('')
      onSaved(result.warning || (result.notified ? `Order ${reference} updated and customer notified.` : `Order ${reference} updated.`))
    } catch (error) {
      onSaved(error instanceof Error ? error.message : 'Could not update order status.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="order-status-control">
      <select aria-label={`Delivery status for ${reference}`} value={nextStatus} onChange={(event) => setNextStatus(event.target.value)}>
        <option value="pending">Pending</option>
        <option value="processing">Processing</option>
        <option value="shipped">Shipped</option>
        <option value="delivered">Delivered</option>
        <option value="cancelled">Cancelled</option>
      </select>
      {nextStatus === 'shipped' && (
        <>
          <input aria-label={`Carrier for ${reference}`} placeholder="Carrier (e.g. DHL, Yango)" maxLength={80} value={carrierName} onChange={(event) => setCarrierName(event.target.value)} />
          <input aria-label={`Tracking number for ${reference}`} placeholder="Tracking number" maxLength={120} value={tracking} onChange={(event) => setTracking(event.target.value)} />
        </>
      )}
      {dirty && (
        <>
          <input aria-label={`Note to customer for ${reference}`} placeholder="Note to customer (optional)" maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} />
          <label className="order-notify"><input type="checkbox" checked={notify} onChange={(event) => setNotify(event.target.checked)} /> Email customer</label>
          <button type="button" className="order-save" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save update'}</button>
        </>
      )}
    </div>
  )
}
