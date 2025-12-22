const STORAGE_KEY = 'notion_clone_v1'

const DEFAULT_DATA = {
  version: 1,
  workspaces: [
    {
      id: 'default',
      name: 'Personal',
      pages: [],
      boards: [
        {
          id: 'board-1',
          name: 'Project Board',
          columns: [
            { id: 'col-1', name: 'Todo', cards: [ { id: 'card-1', title: 'Setup project', content: 'Initialize scaffold and storage', team: 'Engineering' } ] },
            { id: 'col-2', name: 'In Progress', cards: [] },
            { id: 'col-3', name: 'Done', cards: [] }
          ]
        }
      ],
      teams: [{ name: 'Engineering', color: '#6366f1' }, { name: 'Design', color: '#ef4444' }, { name: 'Marketing', color: '#f59e0b' }],
      users: ['You'],
      currentUser: 'You',
      events: [
        {
          id: 'ev-1',
          title: 'Welcome event',
          start: new Date().toISOString(),
          end: null,
          allDay: true,
          reminderMsBefore: 24 * 60 * 60 * 1000,
          metadata: {},
          team: 'Engineering'
        }
      ]
    }
  ]
}

function migrate(data) {
  // Add migration steps when changing schema across versions
  if (!data) return DEFAULT_DATA
  if (!data.version) {
    // Example: if older data lacks version, wrap with version 1
    return { version: 1, ...data }
  }
  // ensure events/teams/users/currentUser arrays exist on each workspace
  const palette = ['#6366f1','#ef4444','#f59e0b','#10b981','#06b6d4','#8b5cf6','#ec4899']
  const pickColor = name => {
    if (!name) return palette[0]
    let h = 0
    for (let i = 0; i < name.length; i++) h = (h << 5) - h + name.charCodeAt(i)
    return palette[Math.abs(h) % palette.length]
  }

  data.workspaces = (data.workspaces || []).map(w => {
    const teams = (w.teams || []).map(t => {
      if (typeof t === 'string') return { name: t, color: pickColor(t) }
      if (t && t.name) return t
      return null
    }).filter(Boolean)
    return { ...w, events: w.events || [], teams, users: w.users || [], currentUser: w.currentUser || (w.users && w.users[0]) || null }
  })
  return data
}

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? migrate(JSON.parse(raw)) : DEFAULT_DATA
  } catch (e) {
    console.error('Failed to load data', e)
    return DEFAULT_DATA
  }
}

export function saveData(data) {
  try {
    // ensure version exists
    const toSave = { ...data, version: data.version || 1 }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
  } catch (e) {
    console.error('Failed to save data', e)
  }
}

export function clearData() {
  localStorage.removeItem(STORAGE_KEY)
}

export function exportData() {
  try {
    return JSON.stringify(loadData(), null, 2)
  } catch (e) {
    console.error('Failed to export data', e)
    return null
  }
}

export function importData(json) {
  try {
    const parsed = typeof json === 'string' ? JSON.parse(json) : json
    const migrated = migrate(parsed)
    saveData(migrated)
    return migrated
  } catch (e) {
    console.error('Failed to import data', e)
    throw e
  }
}

// Simple reminder scheduling: schedules notifications for upcoming events (in-memory only)
let _scheduledTimers = []

export function clearScheduledReminders() {
  _scheduledTimers.forEach(t => clearTimeout(t))
  _scheduledTimers = []
}

export function scheduleReminders(data, onNotify = null) {
  clearScheduledReminders()
  try {
    const now = Date.now()
    const allEvents = (data.workspaces || []).flatMap(w => (w.events || []).map(ev => ({ ...ev, workspaceId: w.id })))
    allEvents.forEach(ev => {
      if (!ev.reminderMsBefore || !ev.start) return
      const start = new Date(ev.start).getTime()
      const notifyAt = start - ev.reminderMsBefore
      if (notifyAt <= now) return // missed or immediate; skip scheduling
      const timeout = setTimeout(() => {
        try {
          if (window.Notification && Notification.permission === 'granted') {
            new Notification(ev.title || 'Reminder', { body: ev.title })
          } else {
            // fallback in-app alert
            // eslint-disable-next-line no-alert
            alert(`Reminder: ${ev.title}`)
          }
          if (typeof onNotify === 'function') onNotify(ev)
        } catch (e) {
          console.error('Failed to show notification', e)
        }
      }, notifyAt - now)
      _scheduledTimers.push(timeout)
    })
  } catch (e) {
    console.error('Failed to schedule reminders', e)
  }
}

// helpers to manipulate events at data level
export function addEventToWorkspace(data, workspaceId, event) {
  const next = { ...data }
  next.workspaces = next.workspaces.map(w => (w.id === workspaceId ? { ...w, events: [...(w.events || []), event] } : w))
  saveData(next)
  return next
}

export function updateEventInWorkspace(data, workspaceId, eventId, patch) {
  const next = { ...data }
  next.workspaces = next.workspaces.map(w => {
    if (w.id !== workspaceId) return w
    return { ...w, events: (w.events || []).map(ev => (ev.id === eventId ? { ...ev, ...patch } : ev)) }
  })
  saveData(next)
  return next
}

export function deleteEventInWorkspace(data, workspaceId, eventId) {
  const next = { ...data }
  next.workspaces = next.workspaces.map(w => {
    if (w.id !== workspaceId) return w
    return { ...w, events: (w.events || []).filter(ev => ev.id !== eventId) }
  })
  saveData(next)
  return next
}
