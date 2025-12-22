import React, { useRef, useState, useEffect } from 'react'
import Calendar from './Calendar'
import CardModal from './CardModal'
import AcknowledgeModal from './AcknowledgeModal'
import { exportData, importData, clearData, loadData, addEventToWorkspace } from '../storage'  

export default function Workspace({ data, setData }) {
  const workspace = data.workspaces[0]
  const [selected, setSelected] = useState({ type: 'calendar', id: null })
  const fileInputRef = useRef()
  const [isCreatingBoard, setIsCreatingBoard] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')
  const boardInputRef = useRef()

  useEffect(() => {
    if (isCreatingBoard && boardInputRef.current) boardInputRef.current.focus()
  }, [isCreatingBoard])

  const updatePage = (pageId, newPage) => {
    const next = { ...data }
    next.workspaces = next.workspaces.map(w => {
      if (w.id !== workspace.id) return w
      return { ...w, pages: w.pages.map(p => (p.id === pageId ? newPage : p)) }
    })
    setData(next)
  }

  const updateBoard = (boardId, newBoard) => {
    const next = { ...data }
    next.workspaces = next.workspaces.map(w => {
      if (w.id !== workspace.id) return w
      return { ...w, boards: w.boards.map(b => (b.id === boardId ? newBoard : b)) }
    })
    setData(next)
  }

  const createBoard = (name) => {
    const id = 'board-' + Date.now()
    const boardName = name || newBoardName || 'Untitled Board'
    const board = { id, name: boardName, columns: [ { id: id + '-col-1', name: 'Todo', cards: [] }, { id: id + '-col-2', name: 'In Progress', cards: [] }, { id: id + '-col-3', name: 'Done', cards: [] } ] }
    const next = { ...data }
    next.workspaces = next.workspaces.map(w => (w.id === workspace.id ? { ...w, boards: [...(w.boards || []), board] } : w))
    setData(next)
    setIsCreatingBoard(false)
    setSelected({ type: 'board', id })
    setNewBoardName('')
  }

  // Ensure a team board exists (live view per team)
  const ensureTeamBoard = (teamName) => {
    if (!teamName) return null
    const next = { ...data }
    let createdId = null
    next.workspaces = next.workspaces.map(w => {
      if (w.id !== workspace.id) return w
      w.boards = w.boards || []
      let tb = w.boards.find(b => b.team === teamName)
      if (!tb) {
        const id = 'team-' + teamName + '-' + Date.now()
        tb = { id, name: `${teamName} — Projects`, team: teamName, columns: [ { id: id + '-col-1', name: 'Todo', cards: [] }, { id: id + '-col-2', name: 'In Progress', cards: [] }, { id: id + '-col-3', name: 'Done', cards: [] } ] }
        w.boards.push(tb)
        createdId = id
      }
      return w
    })
    if (createdId) {
      setData(next)
      return createdId
    }
    return (workspace.boards || []).find(b => b.team === teamName)?.id || null
  }

  const findCardLocation = (cardId) => {
    for (const b of workspace.boards || []) {
      for (const c of b.columns || []) {
        const idx = c.cards.findIndex(x => x.id === cardId)
        if (idx !== -1) return { boardId: b.id, colId: c.id, index: idx }
      }
    }
    return null
  }

  const moveCardToColumnName = (cardId, targetColumnName) => {
    const next = { ...data }
    const w = next.workspaces[0]
    const loc = (() => {
      for (const b of w.boards || []) {
        for (const c of b.columns || []) {
          const idx = c.cards.findIndex(x => x.id === cardId)
          if (idx !== -1) return { board: b, col: c, idx }
        }
      }
      return null
    })()
    if (!loc) return
    const [card] = loc.col.cards.splice(loc.idx, 1)
    // find or create target column in same board
    let targetCol = loc.board.columns.find(cc => cc.name.toLowerCase() === targetColumnName.toLowerCase())
    if (!targetCol) {
      targetCol = { id: loc.board.id + '-col-' + targetColumnName.replace(/\s+/g, '-').toLowerCase(), name: targetColumnName, cards: [] }
      loc.board.columns.push(targetCol)
    }
    targetCol.cards.push(card)
    setData(next)
  }

  // Card modal state and handler
  const [isCardModalOpen, setIsCardModalOpen] = useState({ open: false, colId: null, defaultTeam: '' })
  // Acknowledge / Complete modal state
  const [ackModal, setAckModal] = useState({ open: false, colId: null, cardId: null, type: null }) // type: 'ack' | 'complete' 
  const [mainGroupBy, setMainGroupBy] = useState('column')


  const pickColor = (name) => {
    const palette = ['#6366f1','#ef4444','#f59e0b','#10b981','#06b6d4','#8b5cf6','#ec4899']
    if (!name) return palette[0]
    let h = 0
    for (let i = 0; i < name.length; i++) h = (h << 5) - h + name.charCodeAt(i)
    return palette[Math.abs(h) % palette.length]
  }

  const textForBg = (hex) => {
    if (!hex) return '#000'
    const r = parseInt(hex.slice(1,3),16)
    const g = parseInt(hex.slice(3,5),16)
    const b = parseInt(hex.slice(5,7),16)
    const l = (0.299*r + 0.587*g + 0.114*b)
    return l > 160 ? '#000' : '#fff'
  }

  const handleCreateCard = ({ title, team, teamColor, tags, date, reminderMsBefore }, colId) => {
    const card = { id: 'c-' + Date.now(), title, content: '', tags: tags || [], team: team || null }
    const next = { ...data }
    const w = next.workspaces[0]
    // add team to workspace if new (teams are objects {name,color})
    if (team) {
      w.teams = w.teams || []
      const found = w.teams.find(t => (typeof t === 'string' ? t === team : (t && t.name === team)))
      if (!found) {
        w.teams.push({ name: team, color: teamColor || pickColor(team) })
      }
    }
    const board = w.boards.find(B => B.id === selected.id)
    // if the selected view is a team view, and we created a team board, prefer adding into that team board's column
    if (selected.type === 'team' && team) {
      const teamBoardId = ensureTeamBoard(team)
      const tb = w.boards.find(b => b.id === teamBoardId)
      if (tb) {
        const todo = tb.columns.find(c => c.name.toLowerCase() === 'todo')
        if (todo) todo.cards.push(card)
        setData(next)
        // schedule event later if needed
        if (date) {
          const ev = { id: 'ev-' + Date.now(), title: card.title, start: new Date(date).toISOString(), end: null, allDay: true, reminderMsBefore: reminderMsBefore || null, metadata: { cardId: card.id }, team: card.team }
          const withEvent = addEventToWorkspace(next, w.id, ev)
          setData(withEvent)
        }
        return
      }
    }
    const targetCol = board.columns.find(c => c.id === colId)
    targetCol.cards.push(card)
    setData(next)

    if (team) ensureTeamBoard(team)
    if (date) {
      const ev = { id: 'ev-' + Date.now(), title: card.title, start: new Date(date).toISOString(), end: null, allDay: true, reminderMsBefore: reminderMsBefore || null, metadata: { cardId: card.id }, team: card.team }
      const withEvent = addEventToWorkspace(next, w.id, ev)
      setData(withEvent)
    }
  }

  // acknowledge a card: moves from Todo -> In Progress and records who acknowledged
  const acknowledgeCard = (fromColId, cardId, byName) => {
    const name = byName || (workspace.currentUser || '')
    if (!name) return alert('No user provided')
    const next = { ...data }
    const w = next.workspaces[0]
    const board = w.boards.find(B => B.id === selected.id)
    const fromCol = board.columns.find(c => c.id === fromColId)
    const card = fromCol.cards.find(c => c.id === cardId)
    if (!card) return
    card.acknowledgedBy = name
    card.acknowledgedAt = new Date().toISOString()
    fromCol.cards = fromCol.cards.filter(c => c.id !== cardId)
    let toCol = board.columns.find(c => c.name.toLowerCase() === 'in progress')
    if (!toCol) {
      toCol = { id: board.id + '-col-inprogress', name: 'In Progress', cards: [] }
      board.columns.push(toCol)
    }
    toCol.cards.push(card)
    // track users and currentUser
    w.users = w.users || []
    if (!w.users.includes(name)) w.users.push(name)
    w.currentUser = name
    setData(next)
  }

  // complete a card: moves from In Progress -> Done and records who completed
  const completeCard = (fromColId, cardId, byName) => {
    const name = byName || (workspace.currentUser || '')
    if (!name) return alert('No user provided')
    const next = { ...data }
    const w = next.workspaces[0]
    const board = w.boards.find(B => B.id === selected.id)
    const fromCol = board.columns.find(c => c.id === fromColId)
    const card = fromCol.cards.find(c => c.id === cardId)
    if (!card) return
    card.completedBy = name
    card.completedAt = new Date().toISOString()
    fromCol.cards = fromCol.cards.filter(c => c.id !== cardId)
    let toCol = board.columns.find(c => c.name.toLowerCase() === 'done')
    if (!toCol) {
      toCol = { id: board.id + '-col-done', name: 'Done', cards: [] }
      board.columns.push(toCol)
    }
    toCol.cards.push(card)
    w.users = w.users || []
    if (!w.users.includes(name)) w.users.push(name)
    w.currentUser = name
    setData(next)
  }

  const handleExport = () => {
    const json = exportData()
    if (!json) return
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'notion-clone-backup.json'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const handleImportFile = e => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const imported = importData(ev.target.result)
        setData(imported)
        alert('Import successful')
      } catch (err) {
        alert('Failed to import: ' + err.message)
      }
    }
    reader.readAsText(file)
  }

  const handleImportClick = () => fileInputRef.current.click()

  const handleReset = () => {
    if (!confirm('Reset all data to defaults?')) return
    clearData()
    const fresh = loadData()
    setData(fresh)
  }

  return (
    <div className="workspace">
      <aside className="sidebar">
        <h3>{workspace.name}</h3>
        <div style={{ marginBottom: 8 }}>
          <button className={selected.type === 'calendar' ? 'active' : ''} onClick={() => setSelected({ type: 'calendar', id: null })}>Calendar</button>
        </div>
 

        <div className="nav-section">
          <div className="section-header">
            <strong>Boards</strong>
            <button className="icon-btn" title="Add a Board" onClick={() => { setIsCreatingBoard(true); setNewBoardName('') }}>＋ Add a Board</button>
          </div>

          <ul>
            <li>
              <button className={selected.type === 'main' ? 'active' : ''} onClick={() => setSelected({ type: 'main', id: 'main' })}>Main Board</button>
            </li>
            {workspace.boards && workspace.boards.length ? workspace.boards.map(b => (
              <li key={b.id}>
                <button className={selected.type === 'board' && selected.id === b.id ? 'active' : ''} onClick={() => setSelected({ type: 'board', id: b.id })}>
                  {b.name}
                </button>
              </li>
            )) : <li><em>No boards yet</em></li>}
          </ul>
        </div>

        <div className="nav-section">
          <strong>Teams</strong>
          <ul>
            {(workspace.teams || []).map(t => (
              <li key={t.name}>
                <button style={{ display:'flex', alignItems:'center', gap:8 }} className={selected.type === 'team' && selected.id === t.name ? 'active' : ''} onClick={() => setSelected({ type: 'team', id: t.name })}>
                  <span style={{ width:12, height:12, background: t.color, borderRadius:6, display:'inline-block' }} />
                  {t.name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="sidebar-controls">
          <button onClick={handleExport}>Export JSON</button>
          <button onClick={handleImportClick}>Import JSON</button>
          <input ref={fileInputRef} onChange={handleImportFile} type="file" accept="application/json" style={{ display: 'none' }} />
          <button onClick={handleReset}>Reset</button>
        </div>
      </aside>
      <main className="main">
        {selected.type === 'board' ? (
          <div>
            <h2>Board: {workspace.boards?.find(b => b.id === selected.id)?.name}</h2>
            {/* lazy load board component to keep things simple for now */}
            {workspace.boards?.find(b => b.id === selected.id) ? (
              <div className="board-container">
                {/* Render board columns and cards inline for simplicity */}
                {workspace.boards.find(b => b.id === selected.id).columns.map((col, colIdx) => (
                  <div key={col.id} className="board-column" onDragOver={e => e.preventDefault()} onDrop={e => {
                    const cardId = e.dataTransfer.getData('text/card')
                    const fromInfo = JSON.parse(e.dataTransfer.getData('text/from'))
                    const next = { ...data }
                    const w = next.workspaces[0]
                    const board = w.boards.find(B => B.id === selected.id)
                    // remove from source
                    const srcCol = board.columns.find(c => c.id === fromInfo.colId)
                    const card = srcCol.cards.find(c => c.id === cardId)
                    srcCol.cards = srcCol.cards.filter(c => c.id !== cardId)
                    // add to target column
                    const targetCol = board.columns.find(c => c.id === col.id)
                    targetCol.cards.push(card)
                    setData(next)
                  }}>
                    <h3>{col.name}</h3>
                    <div>
                      {col.cards.map(card => (
                        <div key={card.id} className="card" draggable onDragStart={e => { e.dataTransfer.setData('text/card', card.id); e.dataTransfer.setData('text/from', JSON.stringify({ colId: col.id })); }}>
                          <strong>{card.title}</strong>
                          <div>{card.content}</div>
                          <div className="tags-row">{(card.tags || []).map(t => <span key={t} className="tag">#{t}</span>)}</div>
                          {card.team && (() => {
                            const teamObj = (workspace.teams || []).find(t => t.name === card.team)
                            const bg = teamObj ? teamObj.color : '#eef2ff'
                            const color = textForBg(bg)
                            return <div className="team-label" style={{ background: bg, color }}>{'#' + card.team}</div>
                          })()}

                          <div className="card-actions">
                            {col.name.toLowerCase() === 'todo' && !card.acknowledgedBy && <button className="small-btn" onClick={() => setAckModal({ open: true, colId: col.id, cardId: card.id, type: 'ack' })}>Acknowledge</button>}
                            {card.acknowledgedBy && <div className="meta">Acknowledged by {card.acknowledgedBy}</div>}

                            {col.name.toLowerCase() === 'in progress' && !card.completedBy && <button className="small-btn" onClick={() => setAckModal({ open: true, colId: col.id, cardId: card.id, type: 'complete' })}>Complete</button>}
                            {card.completedBy && <div className="meta">Completed by {card.completedBy}</div>}
                          </div>

                        </div>
                      ))}
                    </div>
                    <div>
                      {col.name.toLowerCase() === 'todo' ? (
                        <button onClick={() => setIsCardModalOpen({ open: true, colId: col.id, defaultTeam: '' })}>Add Card</button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div>Select a board</div>
            )}
          </div>
        ) : selected.type === 'main' ? (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h2>Main Board (snapshot)</h2>
              <div>
                <label style={{ marginRight:8 }}>Group by</label>
                <select value={mainGroupBy} onChange={e => setMainGroupBy(e.target.value)}>
                  <option value="column">Column</option>
                  <option value="team">Team</option>
                </select>
              </div>
            </div>
            <div className="board-container">
              { mainGroupBy === 'column' ? (
                ['Todo','In Progress','Done'].map(colName => (
                  <div key={colName} className="board-column">
                    <h3>{colName}</h3>
                    <div>
                      {workspace.boards.flatMap(b => b.columns.map(c => ({ board: b, col: c }))).filter(x => x.col.name === colName).flatMap(x => x.col.cards.map(card => ({ card, board: x.board, colName })) ).map(({ card, board }) => (
                        <div key={card.id} className="card">
                          <strong>{card.title}</strong>
                          <div className="tags-row">{(card.tags || []).map(t => <span key={t} className="tag">#{t}</span>)}</div>
                          {card.team && (() => {
                            const teamObj = (workspace.teams || []).find(t => t.name === card.team)
                            const bg = teamObj ? teamObj.color : '#eef2ff'
                            const color = textForBg(bg)
                            return <div className="team-label" style={{ background: bg, color }}>{'#' + card.team}</div>
                          })()}
                          <div style={{ marginTop:6 }}><button className="small-btn" onClick={() => setSelected({ type: 'board', id: board.id })}>Open source board</button></div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                (workspace.teams || []).map(t => (
                  <div key={t.name} className="board-column">
                    <h3>{t.name}</h3>
                    <div>
                      {workspace.boards.flatMap(b => b.columns.map(c => c.cards.map(card => ({ card, board: b, colName: c.name })))).flat().filter(x => x.card.team === t.name).map(({ card, board, colName }) => (
                        <div key={card.id} className="card">
                          <strong>{card.title}</strong>
                          <div className="tags-row">{(card.tags || []).map(t2 => <span key={t2} className="tag">#{t2}</span>)}</div>
                          <div style={{ marginTop:6 }}><button className="small-btn" onClick={() => setSelected({ type: 'board', id: board.id })}>Open source board</button></div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) }
            </div>
          </div>
        ) : selected.type === 'team' ? (
          <div>
            <h2>Team Board: {selected.id}</h2>
            <div className="board-container">
              {['Todo','In Progress','Done'].map(colName => (
                <div key={colName} className="board-column" onDragOver={e => e.preventDefault()} onDrop={e => {
                  const cardId = e.dataTransfer.getData('text/card')
                  moveCardToColumnName(cardId, colName)
                }}>
                  <h3>{colName}</h3>
                  <div>
                    {workspace.boards.flatMap(b => b.columns.map(c => c.cards.map(card => ({ card, board: b, colName: c.name })))).flat().filter(x => x.card.team === selected.id && x.colName === colName).map(({ card, board }) => (
                      <div key={card.id} className="card" draggable onDragStart={e => { e.dataTransfer.setData('text/card', card.id); e.dataTransfer.setData('text/from', JSON.stringify({ boardId: board.id }))}}>
                        <strong>{card.title}</strong>
                        <div className="tags-row">{(card.tags || []).map(t => <span key={t} className="tag">#{t}</span>)}</div>
                        {card.team && (() => {
                          const teamObj = (workspace.teams || []).find(t => t.name === card.team)
                          const bg = teamObj ? teamObj.color : '#eef2ff'
                          const color = textForBg(bg)
                          return <div className="team-label" style={{ background: bg, color }}>{'#' + card.team}</div>
                        })()}

                        <div className="card-actions">
                          {colName.toLowerCase() === 'todo' && !card.acknowledgedBy && <button className="small-btn" onClick={() => setAckModal({ open: true, colId: null, cardId: card.id, type: 'ack' })}>Acknowledge</button>}
                          {card.acknowledgedBy && <div className="meta">Acknowledged by {card.acknowledgedBy}</div>}

                          {colName.toLowerCase() === 'in progress' && !card.completedBy && <button className="small-btn" onClick={() => setAckModal({ open: true, colId: null, cardId: card.id, type: 'complete' })}>Complete</button>}
                          {card.completedBy && <div className="meta">Completed by {card.completedBy}</div>}
                        </div>

                      </div>
                    ))}
                  </div>
                  <div>
                    {colName.toLowerCase() === 'todo' ? (
                      <button onClick={() => {
                        const tbId = ensureTeamBoard(selected.id)
                        const tb = workspace.boards.find(b => b.id === tbId)
                        const todo = tb && tb.columns.find(c => c.name.toLowerCase() === 'todo')
                        if (todo) setIsCardModalOpen({ open: true, colId: todo.id, defaultTeam: selected.id })
                      }}>Add Card</button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : selected.type === 'calendar' ? (
          <Calendar workspace={workspace} data={data} setData={setData} />
        ) : null}
      </main>

      {isCreatingBoard && (
        <div className="modal-backdrop" onClick={() => setIsCreatingBoard(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h4>Add a Board</h4>
            <input ref={boardInputRef} className="create-board-input" placeholder="Board name" value={newBoardName} onChange={e => setNewBoardName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') createBoard(); if (e.key === 'Escape') setIsCreatingBoard(false); }} />
            <div className="form-actions" style={{ marginTop: 8 }}>
              <button className="icon-btn" onClick={() => createBoard()}>Create</button>
              <button className="icon-btn" onClick={() => setIsCreatingBoard(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Card creation modal */}
      <CardModal open={isCardModalOpen.open} defaultTeam={isCardModalOpen.defaultTeam} onClose={() => setIsCardModalOpen({ open: false, colId: null, defaultTeam: '' })} teams={workspace.teams || []} onCreate={(payload) => handleCreateCard(payload, isCardModalOpen.colId)} />

      {/* Acknowledge / Complete modal */}
      <AcknowledgeModal open={ackModal.open} onClose={() => setAckModal({ open: false, colId: null, cardId: null, type: null })} users={(workspace.users || [])} defaultUser={workspace.currentUser || ''} actionLabel={ackModal.type === 'complete' ? 'Complete' : 'Acknowledge'} onConfirm={(name, note) => {
        if (ackModal.type === 'complete') completeCard(ackModal.colId, ackModal.cardId, name)
        else acknowledgeCard(ackModal.colId, ackModal.cardId, name)
      }} />

    </div>
  )
}
