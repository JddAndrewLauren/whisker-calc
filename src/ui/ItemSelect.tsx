import { useState } from 'react'
import type { Item } from '../data/types.ts'

interface Props {
  items: Item[]
  value: string
  onChange: (itemId: string) => void
}

/** Searchable item picker: a text input backed by a datalist of item names. */
export function ItemSelect({ items, value, onChange }: Props) {
  const selected = items.find((i) => i.id === value)
  const [text, setText] = useState(selected?.name ?? '')
  const commit = (name: string) => {
    setText(name)
    const match = items.find((i) => i.name.toLowerCase() === name.trim().toLowerCase())
    if (match) onChange(match.id)
  }
  return (
    <>
      <input
        list="item-names"
        value={text}
        onChange={(e) => commit(e.target.value)}
        onBlur={() => setText(selected?.name ?? text)}
        placeholder="Item to produce"
        aria-label="Item to produce"
      />
      <datalist id="item-names">
        {items.map((i) => (
          <option key={i.id} value={i.name} />
        ))}
      </datalist>
    </>
  )
}
