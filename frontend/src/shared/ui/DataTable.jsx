import clsx from 'clsx';

export default function DataTable({ columns, rows, getRowKey, empty, className }) {
  if (!rows?.length) {
    return empty ?? null;
  }

  return (
    <div className={clsx('ui-table-wrap', className)}>
      <table className="ui-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={getRowKey ? getRowKey(row, index) : row.id ?? index}>
              {columns.map((column) => (
                <td key={column.key}>{column.render ? column.render(row, index) : row[column.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
