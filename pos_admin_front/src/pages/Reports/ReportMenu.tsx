import { Collapse } from "antd";
import type { ReportNode } from "./reporteTree";

interface Props {
  nodes: ReportNode[];
  onSelect: (node: ReportNode) => void;
}

export const ReportMenu: React.FC<Props> = ({ nodes, onSelect }) => {
  return (
    <Collapse accordion>
      {nodes.map((node) => {
        const isLeaf = !node.children || node.children.length === 0;

        if (isLeaf) {
          // Las hojas NO usan Collapse → se ven como opción clickeable
          return (
            <div
              key={node.id}
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                fontWeight: 500,
                borderBottom: "1px solid #eee",
              }}
              onClick={() => onSelect(node)}
            >
              {node.name}
            </div>
          );
        }

        // Si tiene hijos → categoría desplegable
        return (
          <Collapse.Panel header={node.name} key={node.id}>
            <ReportMenu nodes={node.children!} onSelect={onSelect} />
          </Collapse.Panel>
        );
      })}
    </Collapse>
  );
};
