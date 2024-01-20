import { createWithEqualityFn } from 'zustand/traditional';
import { DEFAULT_LOCK_STATUS, KERNEL_IDLE } from '../config/constants';
import { NodeIdToOutputs, NodeIdToExecCount, NodeIdToWebsocketSession, Session, OutputNodeData } from '../config/types';
import { NodeProps} from 'reactflow';

export type NodesStore = {

    // INFO :: execution count
    nodeIdToExecCount: NodeIdToExecCount;
    setNodeIdToExecCount: (id: string, count: number | string) => void;

    // INFO :: outputs
    nodeIdToOutputs: NodeIdToOutputs;
    getOutputsForNodeId: (nodeId: string) => OutputNodeData[];
    setNodeIdToOutputs: (newObj: NodeIdToOutputs) => void;

    // INFO :: websockets & sessions
    nodeIdToWebsocketSession: NodeIdToWebsocketSession;
    getNodeIdToWebsocketSession: (nodeId: string) => { ws: WebSocket, session: Session };
    getWsRunningForNode: (nodeId: string) => boolean;
    setNodeIdToWebsocketSession: (nodeId: string, ws: WebSocket, session: Session | undefined) => void;

    // INFO :: lock functionality
    locks: { [id: string]: boolean };
    toggleLock: (id: string) => void;
    getIsLockedForId: (id: string) => boolean;

    // INFO :: 0️⃣ empty output type functionality
    outputNodesOutputType: { [id: string]: boolean };
    setOutputTypeEmpty: (id: string, type: boolean) => void;
  
    // INFO :: queue functionality
    queues: { [groupId: string]: Array<[string, string]> };
    addToQueue: (groupId: string, nodeId: string, code: string) => void;
    getTopOfQueue: (groupId: string) => [string, string] | undefined;
    removeFromQueue: (groupId: string) => void;
    clearQueue: (groupId: string) => void;
    groupNodesExecutionStates: { [groupId: string]: {nodeId: string, state: string} };
    setExecutionStateForGroupNode: (groupId: string, newState: {nodeId: string, state: string}) => void;
    getExecutionStateForGroupNode: (groupId: string) => {nodeId: string, state: string};

    // INFO :: selected nodes functionality
    isCellBranchActive: { id: string; isActive: boolean, isConfirmed: boolean };
    setIsCellBranchActive: (id: string, isActive: boolean) => void;
    setConfirmCellBranch: (isConfirmed: boolean) => void;
    clickedNodes: Set<NodeProps['id']>;
    clickedNodeOrder: NodeProps['id'][];
    toggleNode: (nodeId: NodeProps['id']) => void;
    getClickedNodeOrder: () => NodeProps['id'][];
    resetClickedNodes: () => void;

    // INFO :: influence functionality
    groupNodesInfluenceStates: { [groupId: string]: boolean };
    setInfluenceStateForGroupNode: (groupId: string, new_state: boolean) => void;
    groupNodesPassStateDecisions: { [groupId: string]: boolean };
    setPassStateDecisionForGroupNode: (groupId: string, new_state: boolean) => void;
    groupNodesHadRecentError: { [groupId: string]: {hadError: boolean, timestamp: Date} };
    setHadRecentErrorForGroupNode: (groupId: string, new_state: {hadError: boolean, timestamp: Date}) => void;

    // INFO :: 😴 stale state functionality
    identifiersUsedInGroupNodes: { [groupId: string]: { [nodeId: string]: string[] } };
    getUsedIdentifiersForGroupNodes: (parentId: string) => { [key: string]: string[] };
    setUsedIdentifiersForGroupNodes: (parentId: string, nodeId: string, usedIdentifiers: string[]) => void;
    deleteNodeFromUsedIdentifiersForGroupNodes: (parentId: string, nodeId: string) => void;
    staleState: { [nodeId: string]: boolean };
    setStaleState: (nodeId: string, isStale: boolean) => void;

    // INFO :: showing order
    showOrder: { node: string, action: string }
    setShowOrder: (node_id: string, action: string) => void;

    // INFO :: run branch functionality
    groupNodesRunBranchActive: { [groupId: string]: boolean };
    setRunBranchActiveForGroupNodes: (groupIds: string[], new_state: boolean) => void;
  
    // INFO :: dragging nodes
    isDraggedFromSidebar: boolean;
    setIsDraggedFromSidebar: (isDraggedFromSidebar: boolean) => void;

    // INFO :: markdown nodes edit mode
    markdownNodesEditMode: { [nodeId: string]: boolean };
    setMarkdownNodeEditMode: (nodeId: string, editMode: boolean) => void;
};

const useNodesStore = createWithEqualityFn<NodesStore>((set, get) => ({
  // INFO :: execution count
  nodeIdToExecCount: {} as NodeIdToExecCount,
  setNodeIdToExecCount: (id: string, count: number | string) => {
    // using the previous state, we can update the nodeIdToExecCount mapping
    set((state) => ({
      nodeIdToExecCount: {
          ...state.nodeIdToExecCount,
          [id]: {
            execCount: count,
            timestamp: new Date(),
          },
        },
    }))
  },
  // INFO :: outputs
  nodeIdToOutputs: {} as NodeIdToOutputs,
  getOutputsForNodeId: (nodeId: string) => get().nodeIdToOutputs[nodeId] || [],
  setNodeIdToOutputs: (newObj: NodeIdToOutputs) => {
    // using the previous state, we can update the nodeIdToOutputs mapping
    set((state) => ({
        nodeIdToOutputs: {
            ...state.nodeIdToOutputs,
            ...newObj,
        },
    }));
  },
  // INFO :: websockets & sessions
  nodeIdToWebsocketSession: {} as NodeIdToWebsocketSession,
  getNodeIdToWebsocketSession: (nodeId: string) => get().nodeIdToWebsocketSession[nodeId],
  getWsRunningForNode: (nodeId: string) => {
    // check if websocket is open
    const ws = get().nodeIdToWebsocketSession[nodeId]?.ws;
    return ws && ws.readyState === WebSocket.OPEN;
  },
  setNodeIdToWebsocketSession: (nodeId: string, ws: WebSocket, session: Session | undefined) => {
    // update the values given for the node given (if session is undefined, keep the old value)
    set((state) => ({
        nodeIdToWebsocketSession: {
            ...state.nodeIdToWebsocketSession,
            [nodeId]: {
                ws: ws,
                session: session ?? state.nodeIdToWebsocketSession[nodeId]?.session,
            },
        },
    }));
  },
  // INFO :: lock functionality
  locks: {},
  toggleLock: (id: string) => {
    set((state) => ({
        locks: {
          ...state.locks,
          [id]: !state.locks[id]
        }
    })) 
  },
  getIsLockedForId: (id: string): boolean => {
    const state = get().locks[id]
    // check if state is undefined - initial status when locks is empty
    if (state === undefined) {
        set((state) => ({
            locks: {
                ...state.locks,
                [id]: DEFAULT_LOCK_STATUS
            }
        }))
        return DEFAULT_LOCK_STATUS;
    }
    return get().locks[id];
  },

  // INFO :: 0️⃣ empty output type functionality
  outputNodesOutputType: {},
  setOutputTypeEmpty: (id: string, type: boolean) => {
    set((state) => ({
        outputNodesOutputType: {
          ...state.outputNodesOutputType,
          [id]: type
        }
    }))
  },

  // INFO :: queue functionality
  queues: {},
  addToQueue: (groupId, nodeId, code) =>
    set((state) => ({
      queues: {
        ...state.queues,
        [groupId]: [...(state.queues[groupId] || []), [nodeId, code]],
      },
    })),
  getTopOfQueue: (groupId) => get().queues[groupId]?.[0],
  removeFromQueue: (groupId) =>
    set((state) => {
      const [, ...rest] = state.queues[groupId] || [];
      return { queues: { ...state.queues, [groupId]: rest } };
    }),
  clearQueue: (groupId) => set((state) => ({ queues: { ...state.queues, [groupId]: [] } })),
  groupNodesExecutionStates: {},
  setExecutionStateForGroupNode: (groupId: string, newState: {nodeId: string, state: string}) => {
    set((state) => ({
        groupNodesExecutionStates: {
          ...state.groupNodesExecutionStates,
          [groupId]: newState
        }
    }))
  },
  getExecutionStateForGroupNode: (groupId: string): {nodeId: string, state: string} => {
    const state = get().groupNodesExecutionStates[groupId]
    // check if state is undefined
    if (state === undefined) {
        set((state) => ({
            groupNodesExecutionStates: {
              ...state.groupNodesExecutionStates,
              [groupId]: {nodeId: "", state: KERNEL_IDLE}
            }
        }))
        return {nodeId: "", state: KERNEL_IDLE};
    }
    return get().groupNodesExecutionStates[groupId];
  },

  // INFO :: cell branch functionality
  isCellBranchActive: { id: "", isActive: false, isConfirmed: false }, // initial values
  setIsCellBranchActive: (id, isActive) => {
    set((state) => ({
      isCellBranchActive: {
        id: id,
        isActive: isActive,
        isConfirmed: state.isCellBranchActive.isConfirmed,
      },
    }));
  },
  setConfirmCellBranch: (isConfirmed) => {
    set((state) => ({
      isCellBranchActive: {
        id: state.isCellBranchActive.id,
        isActive: state.isCellBranchActive.isActive,
        isConfirmed: isConfirmed,
      },
    }));
  },
  clickedNodes: new Set(),
  clickedNodeOrder: [],
  toggleNode: (nodeId: NodeProps['id']) =>
    set((state) => {
      const clickedNodes = new Set(state.clickedNodes);
      const clickedNodeOrder = state.clickedNodeOrder.slice();

      if (clickedNodes.has(nodeId)) {
        clickedNodes.delete(nodeId);
        clickedNodeOrder.splice(clickedNodeOrder.indexOf(nodeId), 1);
      } else {
        clickedNodes.add(nodeId);
        clickedNodeOrder.push(nodeId);
      }

      return { clickedNodes, clickedNodeOrder };
    }),
  getClickedNodeOrder: () => get().clickedNodeOrder,
  resetClickedNodes: () => set({ clickedNodes: new Set(), clickedNodeOrder: [] }),

  // INFO :: influence state functionality
  groupNodesInfluenceStates: {},
  setInfluenceStateForGroupNode: (groupId: string, new_state: boolean) => {
    set((state) => ({
        groupNodesInfluenceStates: {
          ...state.groupNodesInfluenceStates,
          [groupId]: new_state
        }
    })) 
  },
  groupNodesPassStateDecisions: {},
  setPassStateDecisionForGroupNode: (groupId: string, new_state: boolean) => {
    set((state) => ({
        groupNodesPassStateDecisions: {
          ...state.groupNodesPassStateDecisions,
          [groupId]: new_state
        }
    })) 
  },
  groupNodesHadRecentError: {},
  setHadRecentErrorForGroupNode: (groupId: string, new_state: {hadError: boolean, timestamp: Date}) => {
    set((state) => ({
        groupNodesHadRecentError: {
          ...state.groupNodesHadRecentError,
          [groupId]: new_state
        }
    })) 
  },

  // INFO :: 😴 stale state functionality
  identifiersUsedInGroupNodes: {}, // could contain variables, functions, etc.
  getUsedIdentifiersForGroupNodes: (parentId: string) => get().identifiersUsedInGroupNodes[parentId] || {},
  setUsedIdentifiersForGroupNodes: (parentId: string, nodeId: string, usedIdentifiers: string[]) => {
    set((state) => ({
        identifiersUsedInGroupNodes: {
            ...state.identifiersUsedInGroupNodes,
            [parentId]: {
                ...(state.identifiersUsedInGroupNodes[parentId] || {}),
                [nodeId]: usedIdentifiers,
            },
        },
    }));
  },
  deleteNodeFromUsedIdentifiersForGroupNodes: (parentId: string, nodeId: string) => {
    set((state) => {
        const { [nodeId]: _, ...rest } = state.identifiersUsedInGroupNodes[parentId] || {};
        return { identifiersUsedInGroupNodes: { ...state.identifiersUsedInGroupNodes, [parentId]: rest } };
    });
  },
  staleState: {},
  setStaleState: (nodeId: string, isStale: boolean) => {
    set((state) => ({
        staleState: {
          ...state.staleState,
          [nodeId]: isStale
        }
    }))
  },

  // INFO :: showing order
  showOrder: { node: "", action: "" },
  setShowOrder: (node_id: string, action: string) => {
    set((state) => ({
        showOrder: {
          node: node_id,
          action: action
        }
    }))
  },

  // INFO :: run branch functionality
  groupNodesRunBranchActive: {},
  setRunBranchActiveForGroupNodes: (groupIds: string[], new_state: boolean) => {
    for (const groupId of groupIds) {
      set((state) => ({
          groupNodesRunBranchActive: {
            ...state.groupNodesRunBranchActive,
            [groupId]: new_state
          }
      }))
    }
  },
    
  // INFO :: dragging nodes
  isDraggedFromSidebar: false,
  setIsDraggedFromSidebar: (isDraggedFromSidebar: boolean) => {
    set((state) => ({
      isDraggedFromSidebar: isDraggedFromSidebar
    }))
  },

  // INFO :: markdown nodes edit mode
  markdownNodesEditMode: {},
  setMarkdownNodeEditMode: (nodeId: string, editMode: boolean) => {
    set((state) => ({
        markdownNodesEditMode: {
          ...state.markdownNodesEditMode,
          [nodeId]: editMode
        }
    }))
  },
}));

export default useNodesStore;