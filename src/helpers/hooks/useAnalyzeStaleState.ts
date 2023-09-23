import { useReactFlow, useStore } from 'reactflow';
import useNodesStore from '../nodesStore';
import { analyzeCode } from "../../helpers/utils";
import { useWebSocketStore } from '../websocket';

export function useAnalyzeStaleState(id: string) {
    const { getNode } = useReactFlow();
    const token = useWebSocketStore((state) => state.token);
    const getUsedIdentifiersForGroupNodes = useNodesStore((state) => state.getUsedIdentifiersForGroupNodes);
    const setUsedIdentifiersForGroupNodes = useNodesStore((state) => state.setUsedIdentifiersForGroupNodes);
    const setStaleState = useNodesStore((state) => state.setStaleState);
    const getTopOfQueue = useNodesStore((state) => state.getTopOfQueue);
    const parentNode = useStore(
        (store) => store.nodeInternals.get(id)?.parentNode
      );
    const parent = getNode(parentNode!);

    const processStaleState = async () => {
        if (parent){
          const parentId = parent.id;
          const queueTop = getTopOfQueue(parentId);
          if (queueTop) {
            // if current node has a stale state mark it as not stale as we just executed it
            setStaleState(id, false);
            const [nodeId, code] = queueTop;
            const responseData = await analyzeCode(token, code); 
            const assignedVariables: string[] = Object.keys(responseData.assigned);
            const uniqueCombinedList = Array.from(new Set([...responseData.used, ...assignedVariables]));
            // responseData.assigned is {}, responseData.used is []
            /* alternative DICT approach:
                comapre values of current code cell to its previous state from the store
                procced if different*/
            const dictUsedIdentifiersPerCell = getUsedIdentifiersForGroupNodes(parentId);
            if (Object.keys(dictUsedIdentifiersPerCell).length === 0){
              // there are no variables used across group node -> no need to check for stale nodes
              // console.log("No variables used in any other node.");
              // update variablesUsedInGroupNodes
              setUsedIdentifiersForGroupNodes(parentId, id, responseData.used);
            }
            else{
              // filter out the current node from the dictUsedIdentifiersPerCell
              delete dictUsedIdentifiersPerCell[nodeId];
              // check if any variable that was assigned in the current node is used in any other node
              const staleNodeIds: string[] = [];
              for (const nodeId in dictUsedIdentifiersPerCell) {
                const variablesUsedInNode = dictUsedIdentifiersPerCell[nodeId];
                const hasCommonElement = assignedVariables.some(variable => variablesUsedInNode.includes(variable));
                if (hasCommonElement) staleNodeIds.push(nodeId);
              }
              // update variablesUsedInGroupNodes
              setUsedIdentifiersForGroupNodes(parentId, id, responseData.used);
              // mark stale nodes
              // console.log("Marking nodes as stale: ", staleNodeIds);
              staleNodeIds.forEach(nodeId => setStaleState(nodeId, true));
            }
          }
        }
      };
   
  return processStaleState;
}

export default useAnalyzeStaleState;
