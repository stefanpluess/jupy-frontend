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
    useReactFlow,
    Panel
  } from "reactflow";
  import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
  import {
    faArrowTurnDown,
    faBook,
    faCirclePlay,
    faCloudArrowDown,
    faCloudArrowUp,
    faCode,
    faMagnifyingGlass,
    faPlay
  } from "@fortawesome/free-solid-svg-icons";
  import Swal from "sweetalert2";
  import withReactContent from "sweetalert2-react-content";
  //COMMENT :: Internal modules HELPERS
  //COMMENT :: Internal modules CONFIG
  import { ExecInfoT } from "../../config/constants";
  //COMMENT :: Internal modules UI
  //COMMENT :: Internal modules BUTTONS
  
 
  function ExecutionGraphNode({ id, data }: NodeProps) {
    // TODO - add hovering and clicking functionality
    // 1. ExecInfoT.NormalExecution - hover(highlight) + click(show code) + magnifier(transport) + tooltip what happened in text upon hover
    // 2. ExecInfoT.PropagateExecution - hover(highlight) + click(show code) + magnifier(transport) + tooltip what happened in text upon hover
    // 3. ExecInfoT.LoadParent - hover(highlight parent/edge + tooltip what happened in text upon hover)
    // 4. ExecInfoT.Export - hover(tooltip what happened in text upon hover)
    // 5. ExecInfoT.LoadLibraries- hover(tooltip what happened in text upon hover)
    // 6. Deleted Nodes: Don't highlight any node. Indicate deletion (make nodes greyed out)

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
              <div className="exegraph-node-body-icon">
                {/* ExecInfoT.NormalExecution - faCode/faPlay, 
                ExecInfoT.PropagateExecution - faCode/faPlay + faArrowTurnDown, 
                ExecInfoT.LoadParent - faCloudArrowDown/faDownload
                ExecInfoT.Export - faCloudArrowUp/faUpload
                ExecInfoT.LoadLibraries - faBook/faCubesStacked*/}
                {data.type === ExecInfoT.NormalExecution && (
                  <FontAwesomeIcon icon={faCode} />
                )}
                {data.type === ExecInfoT.PropagateExecution && (
                  <>
                    <FontAwesomeIcon icon={faCode} />
                    <FontAwesomeIcon className="exegraph-node-body-icon-small" icon={faArrowTurnDown} />
                  </>
                )}
                {data.type === ExecInfoT.LoadParent && (
                  <FontAwesomeIcon icon={faCloudArrowDown} />
                )}
                {data.type === ExecInfoT.Export && (
                  <FontAwesomeIcon icon={faCloudArrowUp} />
                )}
                {data.type === ExecInfoT.LoadLibraries && (
                  <FontAwesomeIcon icon={faBook} />
                )}

              </div>
          </div>

          {/* COMMENT: node top icon action */}
          {/* Display icon only in case we have data.type == ExecInfoT.NormalExecution or ExecInfoT.PropagateExecution */}
          {(data.type === ExecInfoT.NormalExecution || data.type === ExecInfoT.PropagateExecution) && (
            <div className="exegraph-node-top">
                <FontAwesomeIcon className='exegraph-node-top-icon' icon={faMagnifyingGlass} />
            </div>
          )}

          <Handle
            type="target"
            position={Position.Top}
            isConnectableStart={false}
          />
        </div>
    );
  }
  
  export default memo(ExecutionGraphNode);