import React, { useEffect, useRef, useState } from 'react'

export default function CardModal({ open, onClose, onCreate, teams = [], defaultTeam = '' }) {
  const [title, setTitle] = useState('')
  const [teamSelection, setTeamSelection] = useState('')
  const [newTeam, setNewTeam] = useState('')
  const [newTeamColor, setNewTeamColor] = useState('#6366f1')
  const [tags, setTags] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [reminder, setReminder] = useState('')
  const ref = useRef()

  useEffect(() => {
    if (open) {
      setTitle('')
      setTeamSelection(defaultTeam || teams[0]?.name || '')
      setNewTeam('')
      setNewTeamColor('#6366f1')
      setTags('')
      setDate('')
      setTime('')
      setReminder('')
      setTimeout(() => ref.current && ref.current.focus(), 0)
    }
  }, [open, teams])

  if (!open) return null

  const submit = () => {
    if (!title.trim()) return alert('Title is required')
    const tagList = tags.split(',').map(s => s.trim()).filter(Boolean)
    const chosenTeam = newTeam.trim() ? newTeam.trim() : (teamSelection || null)
    const teamColor = newTeam.trim() ? newTeamColor : null
    const datetime = date ? (time ? `${date}T${time}` : `${date}T00:00`) : null
    onCreate({ title: title.trim(), team: chosenTeam, teamColor, tags: tagList, date: datetime || null, reminderMsBefore: reminder ? Number(reminder) : null })
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h4>Create Card</h4>
        <label>Title</label>
        <input ref={ref} value={title} onChange={e => setTitle(e.target.value)} placeholder="Card title" />

        <label>Team</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={teamSelection} onChange={e => setTeamSelection(e.target.value)} style={{ flex: 1 }}>
            <option value="">(none)</option>
            {teams.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
          </select>
          <input value={newTeam} onChange={e => setNewTeam(e.target.value)} placeholder="New team" style={{ flex: 1 }} />
        </div>
        <label>New team color</label>
        <input type="color" value={newTeamColor} onChange={e => setNewTeamColor(e.target.value)} />

        <label>Tags (comma-separated)</label>
        <input value={tags} onChange={e => setTags(e.target.value)} placeholder="tag1, tag2" />

        <label>Schedule date (optional)</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        <label>Time (optional)</label>
        <input type="time" value={time} onChange={e => setTime(e.target.value)} />
        <label>Reminder</label>
        <select value={reminder} onChange={e => setReminder(e.target.value)}>
          <option value="">No reminder</option>
          <option value="600000">10 minutes before</option>
          <option value="3600000">1 hour before</option>
          <option value="86400000">1 day before</option>
        </select>

        <div className="form-actions" style={{ marginTop: 8 }}>
          <button className="icon-btn" onClick={submit}>Create</button>
          <button className="icon-btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
