import { columnLetter } from './columnLetter'

type ColumnListProps = {
  columns: string[]
}

export default function ColumnList({ columns }: ColumnListProps) {
  return (
    <ol className="column-list">
      {columns.map((column, index) => (
        <li key={`${column}-${index}`}>
          <span>{columnLetter(index)}</span>
          {column}
        </li>
      ))}
    </ol>
  )
}
