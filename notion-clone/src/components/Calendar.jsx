import React, { useMemo, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'

function startOfMonth(d) {
  const dt = new Date(d)
  dt.setDate(1)
  dt.setHours(0, 0, 0, 0)
  return dt
}

function addDays(d, n) {
  const dt = new Date(d)
  dt.setDate(dt.getDate() + n)
  return dt
}

function formatDateKey(d) {
  return new Date(d).toISOString().slice(0, 10)
}

export default function Calendar({ workspace, data, setData }) {
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()))
  const [modal, setModal] = useState({ open: false, date: null, event: null })

  const days = useMemo(() => {
    const first = startOfMonth(viewMonth)
    const startDay = first.getDay() // 0 Sun..6
    const gridStart = addDays(first, -startDay)
    const cells = []
    for (let i = 0; i < 42; i++) {
      const d = addDays(gridStart, i)
      cells.push(d)
    }
    return cells
  }, [viewMonth])

  const eventsByDate = useMemo(() => {
    const map = {}
    ;(workspace.events || []).forEach(ev => {
      const key = formatDateKey(ev.start)
      if (!map[key]) map[key] = []
      map[key].push(ev)
    })
    return map
  }, [workspace.events])

  const openCreate = date => setModal({ open: true, date, event: null })
  const openEdit = (date, event) => setModal({ open: true, date, event })
  const close = () => setModal({ open: false, date: null, event: null })

  const createEvent = ({ title, startDate, reminderMsBefore }) => {
    const ev = { id: 'ev-' + Date.now() + '-' + uuidv4().slice(0, 4), title, start: new Date(startDate).toISOString(), end: null, allDay: true, reminderMsBefore: reminderMsBefore || null }
    const next = { ...data }
    next.workspaces = next.workspaces.map(w => (w.id === workspace.id ? { ...w, events: [...(w.events || []), ev] } : w))
    setData(next)
    close()
  }

  const updateEvent = (eventId, patch) => {
    const next = { ...data }
    next.workspaces = next.workspaces.map(w => (w.id === workspace.id ? { ...w, events: (w.events || []).map(ev => (ev.id === eventId ? { ...ev, ...patch } : ev)) } : w))
    setData(next)
    close()
  }

  const deleteEvent = (eventId) => {
    if (!confirm('Delete event?')) return
    const next = { ...data }
    next.workspaces = next.workspaces.map(w => (w.id === workspace.id ? { ...w, events: (w.events || []).filter(ev => ev.id !== eventId) } : w))
    setData(next)
    close()
  }

  return (
    <div className="calendar-root">
      <div className="calendar-header">
        <button onClick={() => setViewMonth(addDays(viewMonth, -30))}>‹</button>
        <h3>{viewMonth.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</h3>
        <button onClick={() => setViewMonth(addDays(viewMonth, 30))}>›</button>
      </div>
      <div className="calendar-grid">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="calendar-cell header">{d}</div>)}
        {days.map((d, i) => {
          const key = formatDateKey(d)
          const isThisMonth = d.getMonth() === viewMonth.getMonth()
          return (
            <div key={i} className={`calendar-cell day ${isThisMonth ? '' : 'muted'}`} onDoubleClick={() => openCreate(d)} onClick={() => { /* future: select day */ }}>
              <div className="date-label">{d.getDate()}</div>
              <div className="events-list">
                {(eventsByDate[key] || []).map(ev => {
                  const teamObj = (workspace.teams || []).find(t => t.name === ev.team)
                  const bg = teamObj ? teamObj.color : '#eef2ff'
                  const r = parseInt(bg.slice(1,3),16), g = parseInt(bg.slice(3,5),16), b = parseInt(bg.slice(5,7),16)
                  const l = (0.299*r + 0.587*g + 0.114*b)
                  const color = l > 160 ? '#000' : '#fff'
                  return (
                    <div key={ev.id} className="cal-event" style={{ background: bg, color }} onClick={e => { e.stopPropagation(); openEdit(d, ev) }}>
                      {ev.title}
                    </div>
                  )
                })}
              </div>
              <div className="day-actions">
                <button onClick={e => { e.stopPropagation(); openCreate(d) }}>+</button>
              </div>
            </div>
          )
        })}
      </div>

      {modal.open && (
        <div className="modal-backdrop" onClick={close}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h4>{modal.event ? 'Edit Event' : 'Create Event'}</h4>
            <EventForm defaultDate={modal.date} event={modal.event} onCancel={close} onCreate={createEvent} onUpdate={updateEvent} onDelete={deleteEvent} />
          </div>
        </div>
      )}
    </div>
  )
}

function EventForm({ defaultDate, event, onCancel, onCreate, onUpdate, onDelete }) {
  const [title, setTitle] = useState(event?.title || '')
  const [dateTime, setDateTime] = useState(event ? event.start.slice(0,16) : defaultDate.toISOString().slice(0,16))
  const [reminder, setReminder] = useState(event?.reminderMsBefore ? String(event.reminderMsBefore) : '')

  const submit = () => {
    if (!title) return alert('Title required')
    if (event) onUpdate(event.id, { title, start: new Date(dateTime).toISOString(), reminderMsBefore: reminder ? Number(reminder) : null })
    else onCreate({ title, startDate: dateTime, reminderMsBefore: reminder ? Number(reminder) : null })
  }

  return (
    <div className="event-form">
      <label>Title</label>
      <input value={title} onChange={e => setTitle(e.target.value)} />
      <label>Date & time</label>
      <input type="datetime-local" value={dateTime} onChange={e => setDateTime(e.target.value)} />
      <label>Reminder (ms before)</label>
      <select value={reminder} onChange={e => setReminder(e.target.value)}>
        <option value="">None</option>
        <option value="600000">10 minutes</option>
        <option value="3600000">1 hour</option>
        <option value="86400000">1 day</option>
      </select>
      <div className="form-actions">
        <button onClick={submit}>{event ? 'Update' : 'Create'}</button>
        <button onClick={onCancel}>Cancel</button>
        {event && <button onClick={() => onDelete(event.id)}>Delete</button>}
      </div>
    </div>
  )
}
