import React, { useEffect, useState } from 'react'
import { loadData, saveData, scheduleReminders } from './storage'
import Workspace from './components/Workspace'

export default function App() {
  const [data, setData] = useState(() => loadData())

  useEffect(() => {
    saveData(data)
    try {
      scheduleReminders(data)
    } catch (e) {
      // ignore scheduling errors
    }
  }, [data])

  useEffect(() => {
    if (window.Notification && Notification.permission !== 'granted') {
      Notification.requestPermission().catch(() => {})
    }
  }, [])

  return (
    <div className="app-root">
      <Workspace data={data} setData={setData} />
    </div>
  )
}
