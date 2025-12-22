import React, { useEffect, useRef, useState } from 'react'

export default function AcknowledgeModal({ open, onClose, users = [], defaultUser = '', onConfirm, actionLabel = 'Acknowledge' }) {
  const [selected, setSelected] = useState(defaultUser || '')
  const [newUser, setNewUser] = useState('')
  const [note, setNote] = useState('')
  const ref = useRef()

  useEffect(() => {
    if (open) {
      setSelected(defaultUser || (users[0] || ''))
      setNewUser('')
      setNote('')
      setTimeout(() => ref.current && ref.current.focus(), 0)
    }
  }, [open, users, defaultUser])

  if (!open) return null

  const submit = () => {
    const user = newUser.trim() || selected || ''
    if (!user) return alert('Please provide your name')
    if (typeof onConfirm === 'function') onConfirm(user, note)
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h4>{actionLabel}</h4>
        <label>Who is performing this action?</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={selected} onChange={e => setSelected(e.target.value)} style={{ flex: 1 }}>
            <option value="">(none)</option>
            {users.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <input ref={ref} value={newUser} onChange={e => setNewUser(e.target.value)} placeholder="Or enter new name" style={{ flex: 1 }} />
        </div>
        <label>Note (optional)</label>
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="Optional note" />
        <div className="form-actions" style={{ marginTop: 8 }}>
          <button className="icon-btn" onClick={submit}>{actionLabel}</button>
          <button className="icon-btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
