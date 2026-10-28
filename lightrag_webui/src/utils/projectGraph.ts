import { MultiDirectedGraph } from 'graphology'
import type { RawGraph } from '@/stores/graph'
import * as Constants from '@/lib/constants'

export function createProjectSigmaGraph(rawGraph: RawGraph, minSize: number, maxSize: number) {
  const graph = new MultiDirectedGraph()
  for (const node of rawGraph.nodes) {
    graph.addNode(node.id, {
      label: node.properties?.display_name || node.id,
      color: node.color,
      x: node.x ?? Math.random(),
      y: node.y ?? Math.random(),
      size: node.size,
      borderColor: Constants.nodeBorderColor,
      borderSize: 0.2
    })
  }
  const weights = rawGraph.edges.map(edge => Number(edge.properties?.weight ?? 1))
  const minWeight = Math.min(...weights)
  const range = Math.max(...weights) - minWeight
  for (const [index, edge] of rawGraph.edges.entries()) {
    const weight = weights[index]
    edge.dynamicId = graph.addEdge(edge.source, edge.target, {
      label: edge.properties?.relation_type || edge.properties?.keywords || undefined,
      size: range > 0 ? minSize + (maxSize - minSize) * Math.sqrt((weight - minWeight) / range) : minSize,
      originalWeight: weight,
      type: edge.properties?.direction_known ? 'curvedArrow' : 'curvedNoArrow'
    })
  }
  return graph
}
