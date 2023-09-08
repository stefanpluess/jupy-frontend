import { BaseEdge, EdgeLabelRenderer, EdgeProps, getBezierPath } from 'reactflow';
import "../../styles/ui/canvas.scss";
import useNodesStore from '../../helpers/nodesStore';
import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faScissors, faLink } from "@fortawesome/free-solid-svg-icons";

export default function GroupEdge({
  id,
  source,
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
  const passStateDecision = useNodesStore((state) => state.groupNodePassStateDecisions[target] ?? true);
  const setPassStateDecisionForGroupNode = useNodesStore((state) => state.setPassStateDecisionForGroupNode);
  const influenceState = useNodesStore((state) => state.groupNodesInfluenceStates[target]);
  const setInfluenceStateForGroupNode = useNodesStore((state) => state.setInfluenceStateForGroupNode);
  const wsRunning = useNodesStore((state) => state.groupNodesWsStates[target]);
  const parentWsRunning = useNodesStore((state) => state.groupNodesWsStates[source]);

  useEffect(() => {
    // set the influence state of the target to true initially
    setInfluenceStateForGroupNode(target, true);

    setDashOffset((prevDashOffset) => prevDashOffset - 30);
    const flowInterval = setInterval(() => {
      setDashOffset((prevDashOffset) => prevDashOffset - 30); // Adjust the increment as needed
    }, 1000);

    return () => clearInterval(flowInterval);
  }, []);

  /* If the ws or parentWs is shut down, we want the edge to be off!
  Also, edge state should reflect pass parent state after restarting/reconnecting child kernel */
  useEffect(() => {
    if (wsRunning && parentWsRunning && passStateDecision) setInfluenceStateForGroupNode(target, true);
    else setInfluenceStateForGroupNode(target, false);
  }, [wsRunning, parentWsRunning, passStateDecision]);

  /* on click, we switch the influence state to be opposite. */
  const onEdgeClick = (event: any, id: string) => {
    event.stopPropagation();
    const newState = !influenceState;
    setInfluenceStateForGroupNode(target, newState);
    setPassStateDecisionForGroupNode(target, newState); // "remembers" state decision (not really needed, but nice to have fot shutting parent scenario)
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
          <button className="edgebutton" onClick={(event) => onEdgeClick(event, id)} disabled={!wsRunning || !parentWsRunning}>
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