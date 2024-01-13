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
  import {
    KERNEL_BUSY_FROM_PARENT,
  } from "../../config/constants";
  //COMMENT :: Internal modules UI
  //COMMENT :: Internal modules BUTTONS
  
 
  function ExecutionGraphNode({ id, data }: NodeProps) {
    // 1. NormalExecution - hover(highlight) + click(show code) + magnifier(transport) + tooltip what happened in text upon hover
    // 2. PropagateExecution - hover(highlight) + click(show code) + magnifier(transport) + tooltip what happened in text upon hover
    // 3. LoadParent - hover(highlight parent/edge + tooltip what happened in text upon hover)
    // 4. Export - hover(tooltip what happened in text upon hover)
    // 5. LoadLibraries- hover(tooltip what happened in text upon hover)
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
                {/* 'NormalExecution' - faCode/faPlay, 
                'PropagateExecution' - faCode/faPlay + faArrowTurnDown, 
                'LoadParent' - faCloudArrowDown/faDownload
                'Export' - faCloudArrowUp/faUpload
                'LoadLibraries' - faBook/faCubesStacked*/}
                {data.type === 'NormalExecution' && (
                  <FontAwesomeIcon icon={faCode} />
                )}
                {data.type === 'PropagateExecution' && (
                  <>
                    <FontAwesomeIcon icon={faCode} />
                    <FontAwesomeIcon className="exegraph-node-body-icon-small" icon={faArrowTurnDown} />
                  </>
                )}
                {data.type === 'LoadParent' && (
                  <FontAwesomeIcon icon={faCloudArrowDown} />
                )}
                {data.type === 'Export' && (
                  <FontAwesomeIcon icon={faCloudArrowUp} />
                )}
                {data.type === 'LoadLibraries' && (
                  <FontAwesomeIcon icon={faBook} />
                )}

              </div>
          </div>

          {/* COMMENT: node top icon action */}
          {/* Display icon only in case we have data.type == NormalExecution or PropagateExecution */}
          {(data.type === 'NormalExecution' || data.type === 'PropagateExecution') && (
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