import { TypeReference } from "@lib/types/type-referance";
import type { AbstractNode } from "@ir/common/abstract-node";

interface ParameterNode extends AbstractNode {
  name: string;
  type?: TypeReference;
  optional?: boolean;
  defaultValue?: string;
  variadic?: boolean;
}

export type { ParameterNode };
