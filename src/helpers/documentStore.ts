
import diff_match_patch from './diff_match_patch_uncompressed';
import {Edge, Node, XYPosition} from "reactflow"
import {createWithEqualityFn} from 'zustand/traditional';
import {cloneDeep, remove} from 'lodash';
import { MARKDOWN_NODE, NORMAL_NODE } from '../config/constants';

export type documentStore = {
    setDocument: (nodes: Node[], edges: Edge[]) => void;
    updateShadowText: (node_id : string, text: string) => void;
    generateNodePatch: (node_id : string, content : string) => string;
    receiveServerDiff: (patchString : string, node_id : string) => string;
    edgesShadow: Edge[] | undefined;
    nodeShadow: Node[] | undefined;
    dmp: diff_match_patch;
    addShadowNode: (node : Node) => void; 
    addShadowOutputNode: (node : Node) => void;
    addShadowEdge: (edge : Edge) => void;
    updateReactFlow: (reactFlowInstance: any, node_id: string) => Node;
    moveNode: (node_id : string, position: XYPosition, parentNode?: string) => void;
    deleteNode: (node_id : string) => void;
    resizeNode: (node_id : string, height : number, width : number) => void;
    addPredecessor: (node : Node) => void;
    changeParentNode: (node_id : string, childIds : string[]) => void;
    changeEdgeTarget: (source : string, target : string, newTarget : string) => void;
    changeShadowOutput: (output_node_id : string, newOutput : any) => void;
}

export const useDocumentStore = createWithEqualityFn<documentStore>((set, get) => ({
    edgesShadow: undefined,
    nodeShadow: undefined,
    setDocument: (nodes: Node[], edges: Edge[]) => {
        set({nodeShadow: cloneDeep(nodes.map(node => {
            if((node.type === NORMAL_NODE || node.type === MARKDOWN_NODE) && !node.data.code){
                node.data.code = ''
            }
            return node;
        }
        )), edgesShadow: cloneDeep(edges)})
    },
    updateShadowText: (node_id: string, patchString: string) => {
        let shadowOld = get().nodeShadow!.find((node) => node.id === node_id);
        let patch = get().dmp.patch_fromText(patchString);
        let [shadowNew] = get().dmp.patch_apply(patch, shadowOld?.data.code) as [string, boolean[]];
        get().nodeShadow!.find((node) => node.id === node_id)!.data.code = shadowNew;
    },
     addShadowNode: (node: Node) => {
        let nodeClone = cloneDeep(node);
        if(!nodeClone.data.code) {
            nodeClone.data.code = "";
        }
        get().nodeShadow = get().nodeShadow!.concat(nodeClone);
    },
    addShadowOutputNode: (node: Node) => {
        let nodeClone = cloneDeep(node);
        set({nodeShadow : get().nodeShadow?.filter((shadowNode) => node.id !== shadowNode.id).concat(nodeClone)});
    },
    addShadowEdge: (edge: Edge) => {
        get().edgesShadow = get().edgesShadow!.filter((shadowEdge) => shadowEdge.id !==  edge.id).concat(cloneDeep(edge));
    }, 
    generateNodePatch: (node_id : string, content : string) => {
        console.log("content is: " + content)
        console.log("actual is: " + get().nodeShadow?.find((node) => node.id === node_id)?.data.code);
        let shadowNode = get().nodeShadow!.find((node) => node.id === node_id);
        let patch = get().dmp.patch_make(shadowNode!.data.code, content);
        return get().dmp.patch_toText(patch);
    },
    receiveServerDiff: (patchString : string, node_id: string) => {
        let patch = get().dmp.patch_fromText(patchString);
        const [newText] = get().dmp.patch_apply(patch, get().nodeShadow!.find((node) => node.id === node_id)!.data.code) as [string, boolean[]];
        get().nodeShadow!.find((node) => node.id === node_id)!.data.code = newText;
        return newText;
    },
    dmp: new diff_match_patch(),
    updateReactFlow: (reactFlowInstance, node_id) => {
        return reactFlowInstance.getNode(node_id)
    },
    moveNode: (node_id : string, position: XYPosition, parentNode?: string) => {
        const node = get().nodeShadow!.find((node) => node.id === node_id)
        //node!.parentNode = parentNode;
        if(parentNode) {
            node!.parentNode = parentNode;
        }
        node!.position = position;
        console.log(JSON.stringify(get().nodeShadow))
    },
    deleteNode: (node_id : string) => {
        set({nodeShadow : get().nodeShadow!.map(node => {
            return node.id !== node_id && node.id !== node_id + '_output' && node.parentNode !== node_id ? node : null;
        }).filter(node => node !== null)});
        set({edgesShadow : get().edgesShadow!.filter(edge => edge.id !== node_id + '_edge')});
        console.log(JSON.stringify(get().nodeShadow))
    },
    resizeNode : (node_id : string, height: number, width : number) => {
        const node = get().nodeShadow!.find((node) => node.id === node_id)
        node!.height = height;
        node!.width = width;
    },
    addPredecessor: (node : Node) => {
        set( {nodeShadow : get().nodeShadow?.concat(cloneDeep(node)).map((nds) => {
            if(node.data.successors.includes(nds.id)) {
                nds.data.predecessor = node.id; 
            }
            if(node.data.predecessor && node.data.predecessor === nds.id) {
                if (!nds.data.successors) {
                    nds.data.successors = []
                }
                nds.data.successors.concat(node.id);
                remove(nds.data.successors, (id) => id === node.data.successors[0]);
            }
            return nds;
        })})
    },
    changeParentNode: (node_id : string, childIds : string[]) => {
        get().nodeShadow?.map((node) => {
            if(childIds.includes(node.id) || childIds.includes(node.id.replace('_output', ''))) {
                node.parentNode = node_id
            }
            return node;
        })
    },
    changeEdgeTarget: (source : string, target : string, newTarget : string) => {
        get().edgesShadow?.map((edge) => {
            if(edge.source === source && edge.target === target) {
                edge.target = newTarget;
                edge.id = `${source}-${newTarget}`
            }
            return edge;
        })
    },
    changeShadowOutput: (output_node_id : string, newOutput : any) => {
        get().nodeShadow?.map((node) => {
            if(node.id === output_node_id) {
                node.data.outputs = newOutput;
            }
        })
    }
}))



