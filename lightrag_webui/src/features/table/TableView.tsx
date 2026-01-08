import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  ColumnFiltersState,
  VisibilityState
} from '@tanstack/react-table'
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Filter } from 'lucide-react'
import { useGraphStore, RawNodeType } from '@/stores/graph'
import { useSettingsStore } from '@/stores/settings'

/**
 * TableView - Table view for knowledge graph nodes
 *
 * Features:
 * - Display nodes in a table format
 * - Filter by entity type
 * - Search functionality
 * - Sorting by column
 * - Image thumbnails for nodes with images
 * - Responsive design
 */

type TableRow = RawNodeType & {
  image_url?: string
}

interface TableViewProps {
  viewMode?: 'entities' | 'relations'
}

const TableView = ({ viewMode: propViewMode }: TableViewProps = {}) => {
  const { t } = useTranslation()
  const rawGraph = useGraphStore.use.rawGraph()
  const graphDataVersion = useGraphStore.use.graphDataVersion()
  const theme = useSettingsStore.use.theme()

  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all')

  // Get unique entity types for filter
  const entityTypes = useMemo(() => {
    if (!rawGraph?.nodes) return []
    const types = new Set<string>()
    rawGraph.nodes.forEach(node => {
      const entityType = node.properties?.entity_type
      if (entityType) {
        types.add(entityType)
      }
    })
    return Array.from(types).sort()
  }, [rawGraph, graphDataVersion])

  // Prepare table data
  const tableData = useMemo<TableRow[]>(() => {
    if (!rawGraph?.nodes) return []

    let nodes = [...rawGraph.nodes]

    // Filter by entity type
    if (entityTypeFilter !== 'all') {
      nodes = nodes.filter(node => node.properties?.entity_type === entityTypeFilter)
    }

    return nodes
  }, [rawGraph, graphDataVersion, entityTypeFilter])

  // Define columns
  const columnHelper = createColumnHelper<TableRow>()

  const columns = useMemo(() => [
    columnHelper.accessor('id', {
      id: 'id',
      header: t('graphPanel.table.id', 'ID'),
      cell: info => info.getValue(),
      size: 100
    }),
    columnHelper.accessor('labels', {
      id: 'labels',
      header: t('graphPanel.table.labels', 'Labels'),
      cell: info => info.getValue().join(', '),
      size: 200
    }),
    columnHelper.accessor(row => row.properties?.entity_type, {
      id: 'entity_type',
      header: t('graphPanel.table.entityType', 'Type'),
      cell: info => info.getValue() || '-',
      size: 150
    }),
    columnHelper.accessor('degree', {
      id: 'degree',
      header: t('graphPanel.table.degree', 'Degree'),
      cell: info => info.getValue(),
      size: 80
    }),
    columnHelper.accessor(row => row.properties?.description, {
      id: 'description',
      header: t('graphPanel.table.description', 'Description'),
      cell: info => {
        const value = info.getValue()
        if (!value) return '-'
        const truncated = String(value).length > 100
          ? String(value).substring(0, 100) + '...'
          : value
        return truncated
      },
      size: 300
    }),
    columnHelper.accessor(row => row.properties?.image_url || row.properties?.avatar || row.properties?.img, {
      id: 'image',
      header: t('graphPanel.table.image', 'Image'),
      cell: info => {
        const url = info.getValue()
        if (!url) return '-'
        return (
          <div className="flex justify-center">
            <img
              src={url}
              alt="Node thumbnail"
              className="w-12 h-12 rounded-full object-cover border border-gray-300 dark:border-gray-600"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          </div>
        )
      },
      size: 80,
      enableSorting: false
    })
  ], [t])

  // Create table instance
  const table = useReactTable({
    data: tableData,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableSorting: true,
    enableFilters: true
  })

  // Handle row click - select node in graph
  const handleRowClick = (nodeId: string) => {
    useGraphStore.getState().setSelectedNode(nodeId, true)
  }

  const isDarkTheme = theme === 'dark' ||
    (theme === 'system' && window.document.documentElement.classList.contains('dark'))

  if (!rawGraph || !rawGraph.nodes || rawGraph.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <p className="text-gray-500 dark:text-gray-400">
          {t('graphPanel.table.noData', 'No data available')}
        </p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
        {/* Title and Stats */}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">
            {t('graphPanel.table.title', 'Node Table')}
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {t('graphPanel.table.nodeCount', '{{count}} nodes', { count: tableData.length })}
          </span>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-3">
          {/* Global Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={globalFilter ?? ''}
              onChange={e => setGlobalFilter(e.target.value)}
              placeholder={t('graphPanel.table.searchPlaceholder', 'Search nodes...')}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
            />
          </div>

          {/* Entity Type Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={entityTypeFilter}
              onChange={e => setEntityTypeFilter(e.target.value)}
              className="pl-10 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background appearance-none cursor-pointer"
            >
              <option value="all">{t('graphPanel.table.allTypes', 'All Types')}</option>
              {entityTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 z-10">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none"
                    onClick={header.column.getToggleSortingHandler()}
                    style={{ width: header.getSize() }}
                  >
                    <div className="flex items-center gap-2">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {header.column.getCanSort() && (
                        <span className="flex items-center">
                          {header.column.getIsSorted() === 'asc' && <ArrowUp className="h-3 w-3" />}
                          {header.column.getIsSorted() === 'desc' && <ArrowDown className="h-3 w-3" />}
                          {header.column.getIsSorted() === false && <ArrowUpDown className="h-3 w-3 text-gray-400" />}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  {t('graphPanel.table.noResults', 'No results found')}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map(row => (
                <tr
                  key={row.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                  onClick={() => handleRowClick(row.original.id)}
                >
                  {row.getVisibleCells().map(cell => (
                    <td
                      key={cell.id}
                      className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700"
                      style={{ width: cell.column.getSize() }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer with Pagination Info */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
          <span>
            {t('graphPanel.table.showing', 'Showing {{count}} of {{total}} nodes', {
              count: table.getRowModel().rows.length,
              total: tableData.length
            })}
          </span>
          <span>
            {t('graphPanel.table.clickToSelect', 'Click a row to select in graph')}
          </span>
        </div>
      </div>
    </div>
  )
}

export default TableView
