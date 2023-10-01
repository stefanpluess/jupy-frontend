import { useCallback } from 'react';
import { useReactFlow } from 'reactflow';
import useNodesStore from '../nodesStore';
import { useWebSocketStore } from "../websocket";
import axios from "axios";
import { 
  KERNEL_IDLE,
  KERNEL_BUSY_FROM_PARENT 
} from '../../config/constants';
import { toast } from 'react-toastify';
import { serverURL } from '../../config/config';

/**
 * Custom React hook that returns a function that takes a node ID 
 * as argument and executes the code on all its successors.
 */

function useExecuteOnSuccessors() {
    const { getNode } = useReactFlow();
    const allQueues = useNodesStore((state) => state.queues);
    const groupNodesInfluenceStates = useNodesStore((state) => state.groupNodesInfluenceStates);
    const token = useWebSocketStore((state) => state.token);
    const setExecutionStateForGroupNode = useNodesStore((state) => state.setExecutionStateForGroupNode);
    const setHadRecentErrorForGroupNode = useNodesStore((state) => state.setHadRecentErrorForGroupNode);

    /**
     * Returns an array of all successors of a given node that are influenced by a group node.
     * @param {string} node_id - The ID of the node to get the successors of.
     */
    const influencedSuccessors = useCallback((node_id: string): string[] => {
      const influencedSuccs = [] as string[];
      const node = getNode(node_id);
      if (!node) return influencedSuccs;
      (node.data.successors ?? []).forEach((successor: string) => {
        if (groupNodesInfluenceStates[successor] ?? false) {
          influencedSuccs.push(successor);
          // Recursively visit successors of successors
          const successorsOfSuccessor = influencedSuccessors(successor);
          influencedSuccs.push(...successorsOfSuccessor);
        }
      });
      return influencedSuccs;
    }, [groupNodesInfluenceStates, getNode]);

    /**
     * Executes a code on all successors of a given node.
     * @param {string} node_id - The ID of the node to execute the code on its successors.
     */
    // INFO :: version1 -> each child is run and awaited separately
    const executeOnSuccessors = useCallback(async (node_id: string) => {
      const influencedSuccs = influencedSuccessors(node_id);
      const queue = allQueues[node_id];
      if (!queue || queue.length === 0) return;
      const [simpleNodeId, code] = queue[0];
      const succsToSkip = [] as string[]; // skip succs of succs that had an error
      for (const succ of influencedSuccs) {
        if (succsToSkip.includes(succ)) continue;
        // console.log("run code " + code + " on successor: " + succ);
        const succNode = getNode(succ);
        const requestBody = {
          "code": code,
          'kernel_id': succNode?.data.session?.kernel.id
        }
        setExecutionStateForGroupNode(succ, { nodeId: simpleNodeId, state: KERNEL_BUSY_FROM_PARENT });
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        await axios.post(`${serverURL}/canvas_ext/execute`, requestBody)
        .then((res) => {
          setExecutionStateForGroupNode(succ, {nodeId: simpleNodeId, state: KERNEL_IDLE})
          if (res.data.status === "error") {
            toast.error("An error occured when executing the code on a child:\n"+ res.data.ename+": "+res.data.evalue);
            setHadRecentErrorForGroupNode(succ, {hadError: true, timestamp: new Date()});
            succsToSkip.push(...influencedSuccessors(succ)); // skip all successors of this successor in case of error
          }
        }).catch((err) => {
          setExecutionStateForGroupNode(succ, {nodeId: simpleNodeId, state: KERNEL_IDLE})
        });
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }, [influencedSuccessors, getNode, token, allQueues, setExecutionStateForGroupNode]);

    
    // INFO :: version2 -> children are awaited all together
    // const executeOnSuccessors = useCallback(async (node_id: string) => {
    //   const influencedSuccs = influencedSuccessors(node_id);
    //   const queue = allQueues[node_id];
    //   if (!queue || queue.length === 0) return;
    //   const [simpleNodeId, code] = queue[0];
    //   const axiosRequests = [] as Promise<any>[];
    //   for (const succ of influencedSuccs) {
    //     console.log("run code " + code + " on successor: " + succ);
    //     const succNode = getNode(succ);
    //     const requestBody = {
    //       "code": code,
    //       'kernel_id': succNode?.data.session?.kernel.id
    //     }
    //     setExecutionStateForGroupNode(succ, { nodeId: simpleNodeId, state: KERNEL_BUSY_FROM_PARENT });
    //     axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    //     axiosRequests.push(
    //       axios.post(`${serverURL}/canvas_ext/execute`, requestBody)
    //         .then((res) => {
    //           setExecutionStateForGroupNode(succ, {nodeId: simpleNodeId, state: KERNEL_IDLE});
    //         })
    //         .catch((err) => {
    //           console.error(err);
    //           setExecutionStateForGroupNode(succ, {nodeId: simpleNodeId, state: KERNEL_IDLE});
    //           // show to the user that there was an error
    //         })
    //     );
    //   }
    //   await Promise.all(axiosRequests);
    // }, [influencedSuccessors, getNode, token, allQueues, setExecutionStateForGroupNode]);

    return executeOnSuccessors;
}

export default useExecuteOnSuccessors;