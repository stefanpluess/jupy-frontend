import { useEffect } from 'react';
import { useReactFlow, Node } from 'reactflow';
import {NORMAL_NODE} from './constants';

interface useUpdateNodesExecuteProps{
    webSocketMap: {
        [id: string]: WebSocket;
    };
  }
/**
 * A hook that updates the nodes in the React Flow graph based on webSocketMap.
 * @param webSocketMap The mapping of cell IDs to websockets.
 * @param nodes The nodes in the React Flow graph.
 * @param executeCode The function that executes the code in the cell.
 */
const useUpdateNodesExecute= (
        {webSocketMap} : useUpdateNodesExecuteProps, 
        nodes: Node<any, string | undefined>[], 
        executeCode: (parent_id: string, code:string, msg_id:string, cell_id:string) => void) => {
    const { setNodes } = useReactFlow();

    useEffect(() => {
        const newNodes = nodes.map((node) => {
            if (node.type === NORMAL_NODE) {
              return {
                ...node,
                data: {
                  ...node.data,
                  execute: executeCode
                },
              };
            } else return node;
          });
          setNodes(newNodes);
        }, [webSocketMap]);
}

export default useUpdateNodesExecute;