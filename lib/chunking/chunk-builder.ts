import type { AbstractNode } from "@ir/common/abstract-node";

function mapNodesById(
  nodes: readonly AbstractNode[],
): Map<string, AbstractNode> {
  return new Map(nodes.map((node) => [node.nodeId, node]));
}

function mapChildNodeIds(
  nodes: readonly AbstractNode[],
): Map<string, string[]> {
  const result = new Map<string, string[]>();

  for (const node of nodes) {
    if (!node.parentNodeId) {
      continue;
    }

    const children = result.get(node.parentNodeId) ?? [];
    children.push(node.nodeId);
    result.set(node.parentNodeId, children);
  }

  return result;
}
