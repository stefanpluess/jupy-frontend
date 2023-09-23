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

function useExecuteOnSuccessors() {
    const { getNode } = useReactFlow();
    const allQueues = useNodesStore((state) => state.queues);
    const groupNodesInfluenceStates = useNodesStore((state) => state.groupNodesInfluenceStates);
    const token = useWebSocketStore((state) => state.token);
    const setExecutionStateForGroupNode = useNodesStore((state) => state.setExecutionStateForGroupNode);
    const setHadRecentErrorForGroupNode = useNodesStore((state) => state.setHadRecentErrorForGroupNode);

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

    // INFO :: version1 -> each child is run and awaited separately
    const executeOnSuccessors = useCallback(async (node_id: string) => {
      const influencedSuccs = influencedSuccessors(node_id);
      const queue = allQueues[node_id];
      if (!queue || queue.length === 0) return;
      const [simpleNodeId, code] = queue[0];
      const succsToSkip = [] as string[]; // skip succs of succs that had an error
      for (const succ of influencedSuccs) {
        if (succsToSkip.includes(succ)) continue;
        console.log("run code " + code + " on successor: " + succ);
        const succNode = getNode(succ);
        const requestBody = {
          "code": code,
          'kernel_id': succNode?.data.session?.kernel.id
        }
        setExecutionStateForGroupNode(succ, { nodeId: simpleNodeId, state: KERNEL_BUSY_FROM_PARENT });
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        await axios.post('http://localhost:8888/canvas_ext/execute', requestBody)
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
    //       axios.post('http://localhost:8888/canvas_ext/execute', requestBody)
    //         .then((res) => {
    //           setExecutionStateForGroupNode(succ, {nodeId: simpleNodeId, state: KERNEL_IDLE});
    //         })
    //         .catch((err) => {
    //           console.error(err);
    //           setExecutionStateForGroupNode(succ, {nodeId: simpleNodeId, state: KERNEL_IDLE});
    //           // TODO: show to the user that there was an error
    //         })
    //     );
    //   }
    //   await Promise.all(axiosRequests);
    // }, [influencedSuccessors, getNode, token, allQueues, setExecutionStateForGroupNode]);

    return executeOnSuccessors;
}

export default useExecuteOnSuccessors;