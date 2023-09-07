import { BaseEdge, EdgeLabelRenderer, EdgeProps, getBezierPath } from 'reactflow';
import "../../styles/ui/canvas.scss";
import useNodesStore from '../../helpers/nodesStore';
import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faScissors, faLink } from "@fortawesome/free-solid-svg-icons";

export default function GroupEdge({
  id,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  
  const [dashOffset, setDashOffset] = useState(0);
  const influenceState = useNodesStore((state) => state.groupNodesInfluenceStates[target]);
  const setInfluenceStateForGroupNode = useNodesStore((state) => state.setInfluenceStateForGroupNode);
  const wsRunning = useNodesStore((state) => state.groupNodesWsStates[target]);

  useEffect(() => {
    // set the influence state of the target to true initially
    setInfluenceStateForGroupNode(target, true);

    setDashOffset((prevDashOffset) => prevDashOffset - 30);
    const flowInterval = setInterval(() => {
      setDashOffset((prevDashOffset) => prevDashOffset - 30); // Adjust the increment as needed
    }, 1000);

    return () => clearInterval(flowInterval);
  }, []);

  /* If the websocket is shut down, we want the influence to be off by default! */
  useEffect(() => {
    if (!wsRunning) setInfluenceStateForGroupNode(target, false);
  }, [wsRunning]);

  /* on click, we switch the influence state to be opposite. */
  const onEdgeClick = (event: any, id: string) => {
    event.stopPropagation();
    setInfluenceStateForGroupNode(target, !influenceState);
  };

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={
        influenceState ?
        {strokeDasharray: '5, 5', strokeDashoffset: dashOffset, transition: 'stroke-dashoffset 1s linear'} :
        {strokeDasharray: '5, 5', strokeDashoffset: dashOffset}
        } />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 12,
            // everything inside EdgeLabelRenderer has no pointer events by default
            // if you have an interactive element, set pointer-events: all
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <button className="edgebutton" onClick={(event) => onEdgeClick(event, id)}>
            {influenceState ? 
              <FontAwesomeIcon icon={faScissors} rotation={180} style={{ marginLeft: -3, marginTop: 1 }}/> : 
              <FontAwesomeIcon icon={faLink} style={{ marginLeft: -4, marginTop: 1 }}/>
            }
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}