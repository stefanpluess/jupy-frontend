import { faSave } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { DragEvent } from "react";
import { Button } from "react-bootstrap";
import { Node, Edge } from "reactflow";
import { saveNotebook } from "../../helpers/utils";
import { usePath } from "../../helpers/hooks";
import { shallow } from "zustand/shallow";
import { selectorHome, useWebSocketStore } from "../../helpers/websocket";

const onDragStart = (event: DragEvent, nodeType: string) => {
  event.dataTransfer.setData("application/reactflow", nodeType);
  event.dataTransfer.effectAllowed = "move";
};

type SidebarProps = {
  nodes: Node[];
  edges: Edge[];
  setShowSuccessAlert: any;
  setShowErrorAlert: any;
};

const Sidebar = ( {nodes, edges, setShowSuccessAlert, setShowErrorAlert } : SidebarProps) => {
  const path = usePath();
  const { token } = useWebSocketStore(selectorHome, shallow);

  return (
    <aside>
      <div
        className="react-flow__node-group"
        onDragStart={(event: DragEvent) => onDragStart(event, "group")}
        draggable
      >
        <div className="label">Bubble</div>
      </div>
      <div
        className="react-flow__node-node"
        onDragStart={(event: DragEvent) => onDragStart(event, "node")}
        draggable
      >
        <div className="label">Code</div>
      </div>
      <div
        className="react-flow__node-mdNode"
        onDragStart={(event: DragEvent) => onDragStart(event, "mdNode")}
        draggable
      >
        <div className="label">Markdown</div>
      </div>

      <Button variant="success" style={{ position: 'relative', bottom: -400, }} onClick={() => { saveNotebook(nodes, edges, token, path, setShowSuccessAlert, setShowErrorAlert) }}>
        <FontAwesomeIcon icon={faSave} />
      </Button>
    </aside>
  );
};

export default Sidebar;
