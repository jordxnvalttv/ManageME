import React, { useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'

function Block({ block, index, onChange, onDelete, onKeyDown, draggableProps }) {
  const ref = useRef()
  return (
    <div className="block" {...draggableProps} ref={ref}>
      {block.type === 'h1' ? (
        <input value={block.content} onChange={e => onChange({ ...block, content: e.target.value })} className="h1" onKeyDown={e => onKeyDown(e, index)} />
      ) : block.type === 'todo' ? (
        <div className="todo-row">
          <input type="checkbox" checked={!!block.checked} onChange={e => onChange({ ...block, checked: e.target.checked })} />
          <input value={block.content} onChange={e => onChange({ ...block, content: e.target.value })} onKeyDown={e => onKeyDown(e, index)} />
        </div>
      ) : (
        <textarea value={block.content} onChange={e => onChange({ ...block, content: e.target.value })} onKeyDown={e => onKeyDown(e, index)} />
      )}
      <button onClick={() => onDelete(block.id)}>Delete</button>
    </div>
  )
}

export default function PageEditor({ page, onChange }) {
  if (!page) return null

  const dragIndex = useRef(null)

  const addBlock = (type, atIndex = null) => {
    const block = { id: uuidv4(), type, content: type === 'h1' ? 'Heading' : type === 'todo' ? 'Todo item' : 'New block' }
    const blocks = [...page.blocks]
    if (atIndex == null) blocks.push(block)
    else blocks.splice(atIndex, 0, block)
    onChange({ ...page, blocks })
  }

  const updateBlock = b => {
    onChange({ ...page, blocks: page.blocks.map(x => (x.id === b.id ? b : x)) })
  }

  const deleteBlock = id => {
    onChange({ ...page, blocks: page.blocks.filter(b => b.id !== id) })
  }

  const reorder = (from, to) => {
    if (from === to) return
    const blocks = [...page.blocks]
    const [moved] = blocks.splice(from, 1)
    blocks.splice(to, 0, moved)
    onChange({ ...page, blocks })
  }

  const onDragStart = (e, idx) => {
    dragIndex.current = idx
    e.dataTransfer.effectAllowed = 'move'
  }

  const onDragOver = (e, idx) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const onDrop = (e, idx) => {
    const from = dragIndex.current
    const to = idx
    reorder(from, to)
    dragIndex.current = null
  }

  const onKeyDown = (e, index) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addBlock('p', index + 1)
    }
  }

  return (
    <div className="page-editor">
      <h2>{page.title}</h2>
      <div className="blocks">
        {page.blocks.map((b, idx) => (
          <div key={b.id} draggable onDragStart={e => onDragStart(e, idx)} onDragOver={e => onDragOver(e, idx)} onDrop={e => onDrop(e, idx)}>
            <Block index={idx} block={b} onChange={updateBlock} onDelete={deleteBlock} onKeyDown={onKeyDown} draggableProps={{}} />
          </div>
        ))}
      </div>
      <div className="block-actions">
        <button onClick={() => addBlock('h1')}>Add Heading</button>
        <button onClick={() => addBlock('p')}>Add Text</button>
        <button onClick={() => addBlock('todo')}>Add To-do</button>
      </div>
    </div>
  )
}
