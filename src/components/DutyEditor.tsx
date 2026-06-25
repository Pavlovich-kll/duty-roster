'use client'

import { useState, useEffect } from 'react'
import { Pencil, Check, X, Plus, Trash2 } from 'lucide-react'
import { updateDutyItem, updateDutySectionTitle, createDutyItem, deleteDutyItem } from '@/app/actions'
import { createClient } from '@/lib/supabase-client'

type Item = { id: number; section_id: number; text: string; level: number; sort_order: number }
type Section = { id: number; emoji: string; title: string; sort_order: number; items: Item[] }

let sectionsCache: Section[] | null = null

export default function DutyEditor() {
  const [sections, setSections] = useState<Section[]>(sectionsCache ?? [])
  const [editing, setEditing] = useState(false)
  const [editingTitle, setEditingTitle] = useState<number | null>(null)
  const [editingItem, setEditingItem] = useState<number | null>(null)
  const [addingItem, setAddingItem] = useState<number | null>(null)
  const [titleDraft, setTitleDraft] = useState('')
  const [itemDraft, setItemDraft] = useState('')
  const [newItemText, setNewItemText] = useState('')
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [supabase])

  useEffect(() => {
    if (sectionsCache) return
    fetch('/api/duty-sections').then(r => r.json()).then(data => {
      sectionsCache = data
      setSections(data)
    })
  }, [])

  const refresh = async () => {
    const res = await fetch('/api/duty-sections')
    const data = await res.json()
    sectionsCache = data
    setSections(data)
  }

  const saveTitle = async (id: number) => {
    const fd = new FormData()
    fd.set('id', String(id))
    fd.set('title', titleDraft)
    const res = await updateDutySectionTitle(fd)
    if (!res.error) { setEditingTitle(null); refresh() }
  }

  const saveItem = async (id: number) => {
    const fd = new FormData()
    fd.set('id', String(id))
    fd.set('text', itemDraft)
    const res = await updateDutyItem(fd)
    if (!res.error) { setEditingItem(null); refresh() }
  }

  const addItem = async (sectionId: number) => {
    if (!newItemText.trim()) return
    const fd = new FormData()
    fd.set('section_id', String(sectionId))
    fd.set('text', newItemText.trim())
    fd.set('level', '0')
    const res = await createDutyItem(fd)
    if (!res.error) { setNewItemText(''); setAddingItem(null); refresh() }
  }

  const removeItem = async (id: number) => {
    const fd = new FormData()
    fd.set('id', String(id))
    await deleteDutyItem(fd)
    refresh()
  }

  if (sections.length === 0) return null

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Обязанности дежурного разработчика B2C</h2>
        {user && (
          <button onClick={() => setEditing(e => !e)}
            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition ${editing ? 'bg-green-600 text-white hover:bg-green-700' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
            {editing ? <><Check className="h-4 w-4" /> Готово</> : <><Pencil className="h-4 w-4" /> Редактировать</>}
          </button>
        )}
      </div>

      <div className="space-y-5">
        {sections.map(s => (
          <section key={s.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <span className="text-xl">{s.emoji}</span>
              {editing && editingTitle === s.id ? (
                <form onSubmit={e => { e.preventDefault(); saveTitle(s.id) }} className="flex items-center gap-1 flex-1">
                  <input value={titleDraft} onChange={e => setTitleDraft(e.target.value)}
                    className="flex-1 rounded border px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
                  <button type="submit" className="rounded p-1 text-green-600 hover:bg-green-50"><Check className="h-4 w-4" /></button>
                  <button type="button" onClick={() => setEditingTitle(null)} className="rounded p-1 text-red-500 hover:bg-red-50"><X className="h-4 w-4" /></button>
                </form>
              ) : (
                <span>{s.title}</span>
              )}
              {editing && editingTitle !== s.id && (
                <button onClick={() => { setTitleDraft(s.title); setEditingTitle(s.id) }}
                  className="rounded p-1 text-gray-400 hover:text-blue-600"><Pencil className="h-3.5 w-3.5" /></button>
              )}
            </h3>
            <ul className="space-y-1.5 pl-8">
              {s.items.map(item => (
                <li key={item.id} className={`flex items-center gap-2 text-sm ${item.level > 0 ? 'text-gray-500' : 'text-gray-700'}`} style={{ marginLeft: item.level > 0 ? 24 : 0 }}>
                  <span className="shrink-0 text-gray-700 mr-1.5">•</span>
                  {editing && editingItem === item.id ? (
                    <form onSubmit={e => { e.preventDefault(); saveItem(item.id) }} className="flex items-center gap-1 flex-1">
                      <input value={itemDraft} onChange={e => setItemDraft(e.target.value)}
                        className="flex-1 rounded border px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
                      <button type="submit" className="rounded p-1 text-green-600 hover:bg-green-50"><Check className="h-4 w-4" /></button>
                      <button type="button" onClick={() => setEditingItem(null)} className="rounded p-1 text-red-500 hover:bg-red-50"><X className="h-4 w-4" /></button>
                    </form>
                  ) : (
                    <span className="flex-1">{item.text}</span>
                  )}
                  {editing && editingItem !== item.id && (
                    <>
                      <button onClick={() => { setItemDraft(item.text); setEditingItem(item.id) }}
                        className="rounded p-1 text-gray-400 hover:text-blue-600 shrink-0"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => removeItem(item.id)}
                        className="rounded p-1 text-gray-400 hover:text-red-600 shrink-0"><Trash2 className="h-3.5 w-3.5" /></button>
                    </>
                  )}
                </li>
              ))}
              {editing && (
                <li>
                  {addingItem === s.id ? (
                    <form onSubmit={e => { e.preventDefault(); addItem(s.id) }} className="flex items-center gap-1 pl-5">
                      <input value={newItemText} onChange={e => setNewItemText(e.target.value)}
                        placeholder="Текст пункта..."
                        className="flex-1 rounded border px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
                      <button type="submit" className="rounded p-1 text-green-600 hover:bg-green-50"><Check className="h-4 w-4" /></button>
                      <button type="button" onClick={() => { setAddingItem(null); setNewItemText('') }} className="rounded p-1 text-red-500 hover:bg-red-50"><X className="h-4 w-4" /></button>
                    </form>
                  ) : (
                    <button onClick={() => setAddingItem(s.id)}
                      className="ml-5 mt-1 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800">
                      <Plus className="h-3.5 w-3.5" /> Добавить пункт
                    </button>
                  )}
                </li>
              )}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
