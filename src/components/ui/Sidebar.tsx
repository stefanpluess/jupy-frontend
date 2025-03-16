//COMMENT :: External modules/libraries
import { 
  DragEvent, 
  useEffect,
  useState,
} from "react";
import { 
  Node, 
  Edge, 
  useReactFlow
} from "reactflow";
import {
  faSave,
  faGear,
  faGripVertical,
  faUsers,
  faHandshake,
  faDoorOpen
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Button } from "react-bootstrap";
//COMMENT :: Internal modules HELPERS
import { saveNotebook } from "../../helpers/utils";
import { usePath } from "../../helpers/hooks";
import { useWebSocketStore } from "../../helpers/websocket";
import useSettingsStore from "../../helpers/settingsStore";
import useNodesStore from "../../helpers/nodesStore";
import { GROUP_NODE } from "../../config/constants";
import ToggleSwitch from "../buttons/ToggleSwitch";
import { useUpdateWebSocket } from "../../helpers/hooks/useUpdateWebSocket";
import {useDocumentStore} from "../../helpers/documentStore";
import CollaborationSessionPopup from "../ui/CollaborationSessionPopup";
import { useUpdateWebSocketStore } from "../../helpers/websocket/updateWebSocketStore";

const onDragStart = (event: DragEvent, nodeType: string) => {
  event.dataTransfer.setData("application/reactflow", nodeType);
  event.dataTransfer.effectAllowed = "move";
};

type SidebarProps = {
  nodes: Node[];
  edges: Edge[];
  setShowSuccessAlert: any;
  setShowErrorAlert: any;
  setShowCollaborationSessionPopup: any;
  setShowCollaborators: any;
};

/**
 * Sidebar component that displays a list of draggable nodes and provides functionality 
 * for autosaving and manual saving of the current state of the nodes and edges.
 * @param nodes - An array of Node objects representing the nodes present on the canvas.
 * @param edges - An array of Edge objects representing the edges present on the canvas.
 * @param setShowSuccessAlert - A function to set the state of the success alert.
 * @param setShowErrorAlert - A function to set the state of the error alert.
 */

const Sidebar = ({
  nodes,
  edges,
  setShowSuccessAlert,
  setShowErrorAlert,
  setShowCollaborationSessionPopup,
  setShowCollaborators
}: SidebarProps) => {
  const path = usePath();
  const token = useWebSocketStore((state) => state.token)
  // INFO :: dragging nodes from sidebar
  const setIsDraggedFromSidebar = useNodesStore((state) => state.setIsDraggedFromSidebar)
  const { setNodes} = useReactFlow();
  // INFO :: autosave
  const setShowSettings = useSettingsStore((state) => state.setShowSettings);
  const autoSaveSetting = useSettingsStore((state) => state.autoSave);
  const setAutoSaveSetting = useSettingsStore((state) => state.setAutoSave);
  const changeAutoSave = () => setAutoSaveSetting(!autoSaveSetting);
  const [isSpinning, setIsSpinning] = useState(false);
  const {startWebsocket} = useUpdateWebSocket();
  const {isWebSocketSet, closeWebSocket} = useUpdateWebSocketStore();
  const handleSettingsClick = () => {
    setShowSettings(true);
    setIsSpinning(true);

    setTimeout(() => {
      setIsSpinning(false);
    }, 300);
  };

  // INFO :: autosave
  const performAutosave = () => {
    saveNotebook(
      nodes,
      edges,
      token,
      path,
      null, // prevent success alert from showing
      setShowErrorAlert
    );
  };

  const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    if (autoSaveSetting) performAutosave();
  };

  useEffect(() => {
    let autosaveInterval: NodeJS.Timeout | undefined;

    if (autoSaveSetting) {
      autosaveInterval = setInterval(performAutosave, 20000); // 20 seconds=20000 milliseconds
    } else {
      clearInterval(autosaveInterval);
    }

    window.addEventListener("beforeunload", handleBeforeUnload);

    // Clean up the interval when component unmounts or when isAutosave changes
    return () => {
      clearInterval(autosaveInterval);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [
    autoSaveSetting,
    nodes,
    edges,
    token,
    path,
    setShowSuccessAlert,
    setShowErrorAlert,
  ]);

  // INFO :: indicator for draggable nodes and dragging from the side bar
  const gripIndicator = <FontAwesomeIcon className="gripIndicator" icon={faGripVertical} size="xl"/>;
  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    setNodes((nds) => {
      return nds.map((n) => {
        if (n.type === GROUP_NODE) {
          return { ...n, className: "nodeDraggedFromSideBar"};
        } 
        return { ...n };
      });
    });
    setIsDraggedFromSidebar(true);
  };
  const handleDraggingEnd = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    setNodes((nds) => {
      return nds.map((n) => {
        if (n.type === GROUP_NODE) {
          return { ...n, className: "" };
        } 
        return { ...n };
      });
    });
    setIsDraggedFromSidebar(false);
  };

  return (
    <aside>
      <div className = "nodeContainer">
        {/* DRAGGABLE GROUP NODE */}
        <div
          className="react-flow__node-group"
          title={"Drag me ➡️ to create a new kernel"}
          onDragStart={(event: DragEvent) => onDragStart(event, "group")}
          onMouseDown={handleMouseDown}
          onMouseUp={handleDraggingEnd}
          onDragEnd={handleDraggingEnd}
          draggable
        >
          {gripIndicator}
        </div>
        <div className="label">kernel</div>

        {/* DRAGGABLE NODE */}
        <div
          className="react-flow__node-node"
          title={"Drag me ➡️ to create a new code cell"}
          onDragStart={(event: DragEvent) => onDragStart(event, "node")}
          onMouseDown={handleMouseDown}
          onMouseUp={handleDraggingEnd}
          onDragEnd={handleDraggingEnd}
          draggable
        >
          {gripIndicator}
        </div>
        <div className="label">code</div>

        {/* DRAGGABLE MARKDOWN NODE */}
        <div
          className="react-flow__node-mdNode"
          title={"Drag me ➡️ to create a new markdown cell"}
          onDragStart={(event: DragEvent) => onDragStart(event, "mdNode")}
          onMouseDown={handleMouseDown}
          onMouseUp={handleDraggingEnd}
          onDragEnd={handleDraggingEnd}
          draggable
        >
          {gripIndicator}
        </div>
        <div className="label">markdown</div>
      </div>


      <div className = "settingsContainer">
        {isWebSocketSet() && (
          <div className = "collaboratorContainer">
          <Button
            className="collaboratorButton"
            title="Show Collaborators"
            variant="success"
            onClick={() => setShowCollaborators(true)}>
              <FontAwesomeIcon icon={faUsers}/>
            </Button>
        </div>
        )}
        <div className="autoSaveContainer">
          <div className="autoSave">AutoSave</div>
          <ToggleSwitch
            checked={autoSaveSetting}
            onChange={changeAutoSave}
          />
        </div>

        {/* Settings Button */}
        <Button 
          className="settingsButton"
          title="Settings"
          variant="secondary"
          onClick={handleSettingsClick}
        >
          <FontAwesomeIcon icon={faGear} spin={isSpinning} />
        </Button>

        <Button
          variant="success"
          className="saveButton"
          title="Save Notebook"
          onClick={() => {
            saveNotebook(
              nodes,
              edges,
              token,
              path,
              setShowSuccessAlert, // enable success alert
              setShowErrorAlert
            );
          }}
        >
          <FontAwesomeIcon icon={faSave} />
        </Button>
        {!isWebSocketSet() && (
          <Button
            variant="success"
            className="createcollabSessionButton"
            title="Create collaborative Session"
            onClick={() => {
            setShowCollaborationSessionPopup(true)
          }}
          ><FontAwesomeIcon icon={faHandshake}/></Button>
        )}
        {isWebSocketSet() && (
          <Button
            variant ="danger"
            className="endCollaborationSessionButton"
            title="End collaboration session"
            onClick={() => {
              closeWebSocket();
            }}>
              <FontAwesomeIcon icon={faDoorOpen}/>
            </Button>
        )}
        
          
      </div>
    </aside>
  );
};

export default Sidebar;
