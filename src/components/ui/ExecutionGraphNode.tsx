//COMMENT :: External modules/libraries
import {
    useState,
    useEffect,
    useCallback,
    memo,
  } from "react";
import {
  Handle,
  Position,
  NodeProps,
  useStore,
  useReactFlow
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

  const titleNormalExecution = "Code cell was executed ▶️";
  const titlePropagateExecution = "Code cell was executed in the parent kernel ▶️";
  const titleLoadParent = "Parent kernel state was loaded into this kernel ⬇️";
  const titleExport = "State of this kernel was exported ↗️";
  const titleLoadLibraries = "List of libraries available in this kernel was loaded 📚";
  
  function ExecutionGraphNode({ id, data }: NodeProps) {
    const setFitViewNodeId = useExecutionStore((state) => state.setFitViewNodeId);
    const setHoveredNodeId = useExecutionStore((state) => state.setHoveredNodeId);
    // TODO - add clicking functionality:
    // 1. ExecInfoT.NormalExecution - click(show code)
    // 2. ExecInfoT.PropagateExecution - click(show code)
    // TODO - handle the cases when node was deleted -> adjust function to show code, highlight, and transport
    // 6. Deleted Nodes: Don't highlight any node + Indicate deletion (make nodes greyed out)

    // TODO - maybe optimize the code for showing Sweet Alert
    // INFO :: CLICK logic
    const MySwal = withReactContent(Swal);
    const showInfo = (infoText: string, title: string) => {
      MySwal.fire({
        title: title,
        html: <i>{infoText}</i>,
        icon: "info",
      });
    };

    const handleClick = (dataType: ExecInfoT) => {
      if (dataType === ExecInfoT.LoadParent) {
        // TODO - check if the parent was deleted
        showInfo(titleLoadParent, 'Parent Loaded');
      } else if (dataType === ExecInfoT.Export) {
        showInfo(titleExport, 'Kernel State Exported');
      }
      else if (dataType === ExecInfoT.LoadLibraries) {
        showInfo(titleLoadLibraries, 'Libraries Loaded');
      }
      else if (dataType === ExecInfoT.NormalExecution || dataType === ExecInfoT.PropagateExecution) {
        // TODO - additional check if the node was deleted + which of the execution we have
        // showInfo(titleNormalExecution, 'Code cell no longer exists');
        // showInfo(titlePropagateExecution, 'Node no longer exists');
        // TODO - show code
        // ...
        // ...
      }
    };

    // INFO :: HIGHLIGHT logic
    const handleMouseEnter = (dataType: ExecInfoT) => {
      if (dataType === ExecInfoT.NormalExecution 
        || dataType === ExecInfoT.PropagateExecution 
        || dataType === ExecInfoT.LoadParent) {
        // TODO - additional check if the node was deleted (code cell or group cell)
        // highlight the node
        setHoveredNodeId(data.node_id);
      }
    };

    const handleMouseLeave = (dataType: ExecInfoT) => {
      if (dataType === ExecInfoT.NormalExecution 
        || dataType === ExecInfoT.PropagateExecution 
        || dataType === ExecInfoT.LoadParent) {
        // TODO - additional check if the node was deleted (code cell or group cell)
        // unhighlight the node
        setHoveredNodeId(undefined);
      }
    };

    return (
        <div className = "exegraph-node-wrapper">
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
              onClick={() => setFitViewNodeId(data.node_id)}
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
        return titleNormalExecution;
      case ExecInfoT.PropagateExecution:
        return titlePropagateExecution;
      case ExecInfoT.LoadParent:
        return titleLoadParent;
      case ExecInfoT.Export:
        return titleExport;
      case ExecInfoT.LoadLibraries:
        return titleLoadLibraries;
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