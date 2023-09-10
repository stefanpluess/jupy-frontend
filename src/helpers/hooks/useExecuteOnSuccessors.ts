import { useCallback } from 'react';
import { useReactFlow } from 'reactflow';
import useNodesStore from '../nodesStore';
import { useWebSocketStore } from "../websocket";
import axios from "axios";

function useExecuteOnSuccessors() {
    const { getNode } = useReactFlow();
    const allQueues = useNodesStore((state) => state.queues);
    const groupNodesInfluenceStates = useNodesStore((state) => state.groupNodesInfluenceStates);
    const token = useWebSocketStore((state) => state.token);

    const influencedSuccessors = useCallback((node_id: string): string[] => {
      const influencedSuccs = [] as string[];
      const node = getNode(node_id);
      if (!node) return influencedSuccs;
      (node.data.successors ?? []).forEach((successor: string) => {
        if (groupNodesInfluenceStates[successor] ?? false) {
          influencedSuccs.push(successor);
        }
      });
      return influencedSuccs;
    }, [groupNodesInfluenceStates, getNode]);

    const executeOnSuccessors = useCallback(async (node_id: string) => {
      const influencedSuccs = influencedSuccessors(node_id);
      const queue = allQueues[node_id];
      if (!queue || queue.length === 0) return;
      const code = queue[0][1];
      influencedSuccs.forEach(async (succ) => {
        console.log("run code "+code+" on successor: "+ succ);
        const succNode = getNode(succ);
        const requestBody = {
          "code": code,
          'kernel_id': succNode?.data.session?.kernel.id
        }
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
        axios.post('http://localhost:8888/canvas_ext/execute', requestBody)
        .then((res) => {
          console.log(res);
        }).catch((err) => {
          console.error(err);
        });
      });
    }, [influencedSuccessors, getNode, token, allQueues]);

    return executeOnSuccessors;
}

export default useExecuteOnSuccessors;