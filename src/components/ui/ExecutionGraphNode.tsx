//COMMENT :: External modules/libraries
import {
    useState,
    useCallback,
    memo,
  } from "react";
import {
  Handle,
  Position,
  NodeProps,
} from "reactflow";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowTurnDown,
  faBook,
  faCloudArrowDown,
  faCloudArrowUp,
  faCode,
  faMagnifyingGlass
} from "@fortawesome/free-solid-svg-icons";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
//COMMENT :: Internal modules HELPERS
import useExecutionStore from "../../helpers/executionStore";
//COMMENT :: Internal modules CONFIG
import { ExecInfoT } from "../../config/constants";
//COMMENT :: Internal modules UI
//COMMENT :: Internal modules BUTTONS


const infoNormalExecution = "This code cell was executed ▶️ in this kernel";
const infoPropagateExecution = "This code cell was executed ▶️ in the parent kernel";
const infoLoadParent = "Parent kernel state was loaded ⬇️ into this kernel";
const infoExport = "State of this kernel was exported ↗️";
const infoLoadLibraries = "List of libraries 📚 available in this kernel was loaded";

function ExecutionGraphNode({ id, data }: NodeProps) {
  const setFitViewNodeId = useExecutionStore((state) => state.setFitViewNodeId);
  const setHoveredNodeId = useExecutionStore((state) => state.setHoveredNodeId);
  const setClickedNodeCode = useExecutionStore((state) => state.setClickedNodeCode);
  const deletedNodeIds = useExecutionStore((state) => state.deletedNodeIds);
  const isNodeDeleted = deletedNodeIds.includes(data.node_id);
  const [canUnhighlight, setCanUnhighlight] = useState(true);

  // INFO :: CLICK logic
  const MySwal = withReactContent(Swal);
  const showInfo = (infoText: string, title: string) => {
    MySwal.fire({
      title: title,
      html: <i>{infoText}</i>,
      icon: "info",
    });
  };

  const handleClick = useCallback((dataType: ExecInfoT) => {
    switch (dataType) {
      case ExecInfoT.LoadParent: {
        const parentStatus = isNodeDeleted ? ' - parent no longer exists' : '';
        showInfo(infoLoadParent, `Parent Loaded${parentStatus}`);
        break;
      }
  
      case ExecInfoT.Export: {
        showInfo(infoExport, 'Kernel State Exported');
        break;
      }
  
      case ExecInfoT.LoadLibraries: {
        showInfo(infoLoadLibraries, 'Libraries Loaded');
        break;
      }
  
      case ExecInfoT.NormalExecution:
      case ExecInfoT.PropagateExecution: {
        if (isNodeDeleted) {
          const infoType = dataType === ExecInfoT.NormalExecution ? infoNormalExecution : infoPropagateExecution;
          showInfo(`${infoType}, see its code in the top left corner...`, 'Code cell no longer exists');
          setClickedNodeCode(data.code);
        } else {
          // Show the code at that point in time and deactivate onMouseLeave to keep the node highlighted
          setClickedNodeCode(data.code);
          setCanUnhighlight(false);
        }
        break;
      }
    }
  }, [isNodeDeleted, setClickedNodeCode, setCanUnhighlight]);

  // INFO :: HIGHLIGHT logic
  const handleMouseEnter = useCallback((dataType: ExecInfoT) => {
    if (dataType === ExecInfoT.NormalExecution 
      || dataType === ExecInfoT.PropagateExecution 
      || dataType === ExecInfoT.LoadParent) {
      if (isNodeDeleted) {
        return;
      }
      // highlight the node
      setHoveredNodeId(data.node_id);
    }
  }, [isNodeDeleted, setHoveredNodeId, data.node_id]);

  const handleMouseLeave = useCallback((dataType: ExecInfoT) => {
    if (dataType === ExecInfoT.NormalExecution 
      || dataType === ExecInfoT.PropagateExecution 
      || dataType === ExecInfoT.LoadParent) {
      if (isNodeDeleted) {
        return;
      }
      // unhighlight the node if it was not clicked
      if (canUnhighlight) {
        setHoveredNodeId(undefined);
      }
    }
  }, [isNodeDeleted, canUnhighlight, setHoveredNodeId]);

  // INFO :: TRANSPORT logic
  const transportToCodeCell = useCallback(() => {
    if (isNodeDeleted) {
      showInfo('Cannot transport to the selected cell...', 'Code cell no longer exists');
      return;
    }
    setFitViewNodeId(data.node_id)
  }, [isNodeDeleted]);

  return (
      // possible class names: exegraph-node-wrapper, exegraph-node-wrapper deleted 
      <div className = {`exegraph-node-wrapper ${isNodeDeleted ? 'deleted' : ''}`} >
        <Handle 
          type="source" 
          position={Position.Bottom}
          isConnectableEnd={false}
        />

        {/*  COMMENT: execution count */}
        <div className="exegraph-node-count">
          {data.execution_count}
        </div>

        {/* COMMENT: node type icon */}
        <div className="exegraph-node-body">
            <button 
              className="exegraph-node-body-button"
              title={getBodyButtonTitle(data.type)}
              onClick={() => handleClick(data.type)}
              onMouseEnter={() => handleMouseEnter(data.type)}
              onMouseLeave={() => handleMouseLeave(data.type)}
            >
              {getBodyButtonIcon(data.type)}
            </button>
        </div>

        {/* COMMENT: node top icon action */}
        {/* Display icon only in case we have data.type == ExecInfoT.NormalExecution or ExecInfoT.PropagateExecution */}
        {(data.type === ExecInfoT.NormalExecution || data.type === ExecInfoT.PropagateExecution) && (
          <button
            className="exegraph-node-top-button"
            title="Show code"
            onClick={transportToCodeCell}
          >
              <FontAwesomeIcon className='exegraph-node-top-button-icon' icon={faMagnifyingGlass} />
          </button>
        )}

        <Handle
          type="target"
          position={Position.Top}
          isConnectableStart={false}
        />
      </div>
  );
}

const getBodyButtonTitle = (dataType: ExecInfoT) => {
  switch (dataType) {
    case ExecInfoT.NormalExecution:
      return infoNormalExecution;
    case ExecInfoT.PropagateExecution:
      return infoPropagateExecution;
    case ExecInfoT.LoadParent:
      return infoLoadParent;
    case ExecInfoT.Export:
      return infoExport;
    case ExecInfoT.LoadLibraries:
      return infoLoadLibraries;
    default:
      return undefined;
  }
};

const getBodyButtonIcon = (dataType: ExecInfoT) => {
  const bodyButtonIconName = 'exegraph-node-body-button-icon';

  switch (dataType) {
    case ExecInfoT.NormalExecution:
      return <FontAwesomeIcon className={bodyButtonIconName} icon={faCode} />;
    case ExecInfoT.PropagateExecution:
      return (
        <>
          <FontAwesomeIcon className={bodyButtonIconName} icon={faCode} />
          <FontAwesomeIcon className={bodyButtonIconName + "-small"} icon={faArrowTurnDown} />
        </>
      );
    case ExecInfoT.LoadParent:
      return <FontAwesomeIcon className={bodyButtonIconName} icon={faCloudArrowDown} />;
    case ExecInfoT.Export:
      return <FontAwesomeIcon className={bodyButtonIconName} icon={faCloudArrowUp} />;
    case ExecInfoT.LoadLibraries:
      return <FontAwesomeIcon className={bodyButtonIconName} icon={faBook} />;
    default:
      return null;
  }
};

export default memo(ExecutionGraphNode);