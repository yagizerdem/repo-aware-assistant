import { AbstractNode } from "@ir/common/abstract-node";

function mapChildNodeId(
  abstractNode: AbstractNode[],
): Record<string, string[]> {
  const childNodeIdMap: Record<string, string[]> = {};
  for (const node of abstractNode) {
    if (node.parentNodeId) {
      if (!childNodeIdMap[node.parentNodeId]) {
        childNodeIdMap[node.parentNodeId] = [];
      }
      childNodeIdMap[node.parentNodeId].push(node.nodeId);
    }
  }
  return childNodeIdMap;
}

export { mapChildNodeId };
