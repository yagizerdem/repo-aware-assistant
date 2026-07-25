import { TypeReference } from "../../types/type-referance";

interface ParameterNode {
  name: string;
  type?: TypeReference;
  optional?: boolean;
  defaultValue?: string;
  variadic?: boolean;
}

export type { ParameterNode };
