import type { DatasetIndex } from '../data/index.ts'

type Kind = 'items' | 'buildings'

/** Icons live in public/icons, fetched by `npm run icons`; the base path differs between dev and GitHub Pages. */
const iconUrl = (kind: Kind, id: string) => `${import.meta.env.BASE_URL}icons/${kind}/${id}.png`

function Icon({ kind, id, size }: { kind: Kind; id: string; size: number }) {
  // Newer content can lack a PNG until the wiki hosts its art; show nothing rather than a broken image.
  return <img className="icon" src={iconUrl(kind, id)} alt="" width={size} height={size} loading="lazy" onError={(e) => (e.currentTarget.hidden = true)} />
}

export const ItemIcon = ({ id, size = 20 }: { id: string; size?: number }) => <Icon kind="items" id={id} size={size} />
export const BuildingIcon = ({ id, size = 32 }: { id: string; size?: number }) => <Icon kind="buildings" id={id} size={size} />

/** Icon followed by the item's display name, with an optional quantity in front. */
export function ItemLabel({ index, id, qty }: { index: DatasetIndex; id: string; qty?: number }) {
  return (
    <span className="label">
      {qty !== undefined && `${qty} `}
      <ItemIcon id={id} />
      {index.itemsById.get(id)?.name ?? id}
    </span>
  )
}

/** Icon followed by the building's name, linked to its wiki page when `link` is set. */
export function BuildingLabel({ index, id, link = false }: { index: DatasetIndex; id: string; link?: boolean }) {
  const building = index.buildingsById.get(id)
  const name = building?.name ?? id
  return (
    <span className="label">
      <BuildingIcon id={id} />
      {link && building ? (
        <a href={building.wikiUrl} target="_blank" rel="noreferrer">
          {name}
        </a>
      ) : (
        name
      )}
    </span>
  )
}
