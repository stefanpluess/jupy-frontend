import useWebSocketStore, { selectorGeneral} from '../websocket/webSocketStore';
import {v4} from "uuid";
import {useDocumentStore} from "../documentStore";
import { Edge, useReactFlow, useStoreApi, XYPosition } from 'reactflow';
import { useUpdateWebSocketStore, user} from '../websocket/updateWebSocketStore';
import {Node} from 'reactflow';
import { EXTENT_PARENT, FLOATING_EDGE, GROUP_NODE, MARKDOWN_NODE, NORMAL_EDGE, NORMAL_NODE, OUTPUT_NODE } from '../../config/constants';
import useNodesStore from '../nodesStore';
import { createSession } from '../websocket/websocketUtils';
import { shallow } from 'zustand/shallow';
import useSettingsStore from '../settingsStore';
import { sortNodes } from '../utils';
import {remove} from 'lodash';
import {useHandleBubbleDropOnCodeCell} from './useBubbleDropOnCodeCell';
import useExecutionStore from '../executionStore';
import { useCollabOutputUtils, useDeleteOutput, useRemoveGroupNode } from '.';


const client_uuid = v4();

export function useUpdateWebSocket() {
//methods related to execution
const {setLatestExecutionCount, setLatestExecutionOutput } = useWebSocketStore(selectorGeneral, shallow);
const setNodeIdToExecCount = useNodesStore((state) => state.setNodeIdToExecCount);
const setmsgIdToExecInfo = useWebSocketStore((state) => state.setMsgIdToExecInfo);

//update websocket
const {setWebSocket, sendMessage, isWebSocketSet, getClientName, updateUserPositions, removeUser, setUserPositions, getUserNameById} = useUpdateWebSocketStore();
const setShowJoinedUser = useUpdateWebSocketStore((state) => state.setShowJoinedUser);
const setShowLeftUser = useUpdateWebSocketStore((state) => state.setShowLeftUser);
const setJoinedUser = useUpdateWebSocketStore((state) => state.setJoinedUser);
const setLeftUser = useUpdateWebSocketStore((state) => state.setLeftUser);

//methods to update shadow
const {receiveServerDiff, generateNodePatch, updateShadowText, addShadowOutputNode, setDocument,
    addShadowNode, moveNode, deleteNode, resizeNode, addShadowEdge, addPredecessor, changeParentNode, 
    changeEdgeTarget} = useDocumentStore();

//methods to update actual nodes
const {getNode, getNodes, setNodes, deleteElements, getEdges, setEdges, getEdge} = useReactFlow();

const setNodeIdToWebsocketSession = useNodesStore((state) => state.setNodeIdToWebsocketSession);
const expandParentSetting = useSettingsStore((state) => state.expandParent);
const store = useStoreApi();
const handleBubbleDropOnCodeCell = useHandleBubbleDropOnCodeCell();
const addDeletedNodeIds = useExecutionStore((state) => state.addDeletedNodeIds);
const removeGroupNode = useRemoveGroupNode();

//methods concerning outputs
const deleteOutput = useDeleteOutput();
const setOutputTypeEmpty = useNodesStore((state) => state.setOutputTypeEmpty);
const setNodeIdToOutputs = useNodesStore((state) => state.setNodeIdToOutputs);
const {collabOutputUtils} = useCollabOutputUtils();
const floatingEdgesSetting = useSettingsStore((state) => state.floatingEdges);


//INFO : when joining a collaboration session, this method is called
async function startWebsocket(path: string, token: string, username: string){
    var updatews = new WebSocket('http://localhost:8888/api/canvas_ext/update');
    //set Shadow nodes and edges
    setDocument(getNodes(), getEdges());

    updatews.onmessage = async (event) => {
        
        console.log(event.data)
        var message = JSON.parse(event.data)
        //INFO : Text updates
        if(message.msg_type == "update") {
            let text = receiveServerDiff(message.patch, message.node_id)
            setNodes((nodes) =>
                nodes.map((node) => {
                  if (node.id === message.node_id) {
                    // Create a new data object with the updated code
                    return {
                      ...node,
                      data: {
                        ...node.data,
                        code: text, // Update the code
                      },
                    };
                  }
                  return node;
                })
              );
        }
        if(message.msg_type == "console") {
            console.log(message.message)
        }
        //INFO : User is on another node
        if(message.msg_type == "clickedNode") {
            const userPosition: user = {
                client_id : message.client,
                clientName : message.clientName,
                colorCode : message.color
            }
            updateUserPositions(userPosition, message.node_id);
        }
        //INFO : Node to add received
        //This code is basically the same as when creating initial nodes
        if(message.msg_type == "add"){
            const newNode: Node = {
                id: message.node.id,
                type: message.node.type,
                position: message.node.position,
                data: message.node.data,
                style: message.node.style
            }
            //start websocket session if new node is a group node
            if(newNode.type === GROUP_NODE) {
                const {ws, session} = await createSession(newNode.id, path, token, setLatestExecutionOutput, setLatestExecutionCount, collabOutputUtils, sendNewOutputNode)
                setNodeIdToWebsocketSession(newNode.id, ws, session);
            } else if (newNode.type === NORMAL_NODE) {
                    newNode.data.executionCount = {
                      execCount: '',
                      timestamp: new Date()
            };
            newNode.data.typeable = true;
            setNodeIdToExecCount(newNode.id, message.node.data.executionCount.execCount ? message.node.data.executionCount.execCount : "");

            } else if(newNode.type === MARKDOWN_NODE) {
                newNode.data.editMode = true;
                newNode.data.typeable = true;
            }
            if(message.node.parentNode) {
                newNode.parentNode = message.node.parentNode;
                expandParentSetting ? newNode.expandParent = true : newNode.extent = EXTENT_PARENT;
            }
            const sortedNodes = store.getState().getNodes().concat(newNode).sort(sortNodes);
            setNodes(sortedNodes);
            if(newNode.type === GROUP_NODE) {
                handleBubbleDropOnCodeCell(newNode);
            }
            //if the new node has an output and an edge, add them aswell
            if(message.outputNode && message.edge) {
                setNodeIdToOutputs({[message.outputNode.id]: message.outputNode.data.outputs});
                setNodes(store.getState().getNodes().concat(newNode).concat(message.outputNode).sort(sortNodes))
                setEdges((edges) => edges.filter((edge) => edge.id !== message.edge.id).concat(message.edge));
                addShadowNode(message.outputNode);
                addShadowEdge(message.edge);
            } else {
                if (message.edge) {
                    setEdges((edges) => edges.filter((edge) => edge.id !== message.edge.id).concat(message.edge));
                    getNode(message.node.data.predecessor)!.data.successor = message.node.id
                }
                setNodes(store.getState().getNodes().concat(newNode).sort(sortNodes))
            }

            addShadowNode(message.node)
        }
        //INFO : move node position
        if(message.msg_type == "move") {
            const nodes = store.getState().getNodes()
            const updatedNodes = nodes.map((node) => {
                if(node.id === message.node_id) {
                    node.parentNode = message.parentNode;
                    node.position = message.position;
                    node.positionAbsolute = message.positionAbsolute;
                    return node;
                }else {
                    return node;
                }}).sort(sortNodes);
            setNodes(updatedNodes);
            moveNode(message.node_id, message.position, message.parentNode)
        //INFO : delete a node
        } else if(message.msg_type == "delete") {
            if (getNode(message.node_id)!.type === GROUP_NODE) {
                removeGroupNode(message.node_id, true);
                const childNodeIds = Array.from(store.getState().nodeInternals.values())
                    .filter((n) => n.parentNode === message.node_id)
                    .map((n) => n.id);
        // create an array with id and childNodeIds
                const deletedIds = [message.node_id, ...childNodeIds];
                addDeletedNodeIds(deletedIds);
                deletedIds.forEach(deleteNode);
            } else {
                deleteElements({ nodes: [{ id: message.node_id }, { id: message.node_id + "_output" }] });
                // get the deleted id for the execution graph
                addDeletedNodeIds([message.node_id]);
                deleteNode(message.node_id)
            }
        //INFO : resize a node
        } else if(message.msg_type == "resize") {
            const updatedNodes = store.getState().getNodes().map((node => {
            if (node.id === message.node_id) {
                // Create a new object with the updated properties
                return {
                    ...node,
                    style: {
                        ...node.style,
                        height: message.height,
                        width: message.width,
                    },
                    height: message.height,
                    width: message.width,
                };
            } else {
                return node;
            }
        })).sort(sortNodes);
        
        setNodes(updatedNodes);
        //INFO : change parentNode of one or more nodes   
        } else if(message.msg_type == "changeParentNode") {
            const nodes = store.getState().getNodes()
            const updatedNodes = nodes.map((node) => {
                if(message.childIds.includes(node.id)) {
                    node.parentNode = message.node_id
                    return node;
                } else if(message.childIds.includes(node.id.replace('_output', ''))) {
                    node.parentNode = message.node_id
                    return node;
                } else {
                    return node;
                }
            })
            
            setNodes(updatedNodes.sort(sortNodes));
            changeParentNode(message.node_id, message.childIds);
        //INFO : insert a group node (split kernel)
        } else if(message.msg_type == "predecessor") {
            const nodes = store.getState().getNodes().map((node) => {
                if(message.node.data.successors.includes(node.id)) {
                    node.data.predecessor = message.node.id;
                }
                if(message.node.data.predecessor && message.node.data.predecessor === node.id) {
                    if(!node.data.successors) {
                        node.data.successors = [];
                    }
                    node.data.successors.concat(message.node.id);
                    remove(node.data.successors, (id) => id === message.node.data.successors[0]);
                    
                }
                return node;
            })
            const {ws, session} = await createSession(message.node.id, path, token, setLatestExecutionOutput, setLatestExecutionCount, collabOutputUtils, sendNewOutputNode)
            setNodeIdToWebsocketSession(message.node.id, ws, session);
            setNodes(nodes.concat(message.node).sort(sortNodes));
            if(message.node.data.predecessor) {
                const edge = getEdge(`${message.node.data.predecessor}-${message.node.data.successors[0]}`)!
                    edge.target = message.node.id;
                    edge.id = `${message.node.data.predecessor}-${message.node.id}`
                changeEdgeTarget(message.node.data.predecessor, message.node.data.successors[0], message.node.id)
            }
            setEdges((edges) => edges.filter((edge) => edge.id !== message.edge.id).concat(message.edge));
            
            addShadowEdge(message.edge);
            addPredecessor(message.node);
        //INFO : another user has left the session
        } else if(message.msg_type == 'close') {
            let leftUser = getUserNameById(message.client);
            if (leftUser) {
                setLeftUser(leftUser);
                setShowLeftUser(true);
            }
            removeUser(message.client);
        //INFO : Session already in progress, change notebook to match the one in the session
        } else if(message.msg_type == 'init') {
            let updatedNodes : Node[] = message.nodes;
            updatedNodes.map(async (node) => {
                if(node.type === GROUP_NODE && !getNodes().some(existingNodes => node.id === existingNodes.id)) {
                    const {ws, session} = await createSession(node.id, path, token, setLatestExecutionOutput, setLatestExecutionCount, collabOutputUtils, sendNewOutputNode);
                    setNodeIdToWebsocketSession(node.id, ws, session);
                    return node;
                } else if (node.type === NORMAL_NODE) {
                    setNodeIdToExecCount(node.id, node.data.executionCount.execCount ? node.data.executionCount.execCount : "");
                    return node;
                } else if (node.type === OUTPUT_NODE){
                    setNodeIdToOutputs({[node.id]: node.data.outputs});
                }
            })
            setNodes(updatedNodes.sort(sortNodes));
            setEdges(message.edges);
            setDocument(updatedNodes, message.edges);
            Object.keys(message.clients).map(client_id => {
                console.log(message.clients[client_id]);
                const userPosition: user = {
                    client_id : client_id,
                    clientName : message.clients[client_id]['clientName'],
                    colorCode : message.clients[client_id]['color']
                }
                updateUserPositions(userPosition, "");
            })
        //INFO : a new user has joined the session
        } else if(message.msg_type === 'newUser') {
            const userPosition: user = {
                client_id : message.client,
                clientName : message.client_name,
                colorCode : message.color
            }
            setJoinedUser(message.client_name);
            setShowJoinedUser(true);
            updateUserPositions(userPosition, "")
        //INFO : add new output
        } else if(message.msg_type === 'new_output') {
            setNodes(store.getState().getNodes().concat(message.outputNode).sort(sortNodes));
            setEdges(getEdges().filter((edge) => edge.id !== message.edge.id).concat(message.edge));
            addShadowNode(message.outputNode)
            addShadowEdge(message.edge)
        }
}
    //INFO : send current state of nodes and edges, for session initialization, client uuid and name for registration
    updatews.onopen = (event) => {
        updatews.send(JSON.stringify({msg_type : "init", token : token, path : path, client : client_uuid, client_name : username, nodes : getNodes(), edges : getEdges()}))
    };
    //INFO : when websocket closes, reset the websocket, shadow and userPositions
    updatews.onclose = () => {
        setWebSocket(undefined, undefined)
        setDocument([],[])
        setUserPositions({})
    }
    setWebSocket(updatews, username);
}

//INFO : send text update generated by
function sendUpdate(text: any, node_id: string) {
    if(isWebSocketSet()) {
        let patch = generateNodePatch(node_id, text)
        let msg = JSON.stringify({
            msg_type : "update",
            node_id : node_id,
            client_patch : patch,
            client : client_uuid
        });
        console.log(msg);
        if(patch !== "") {
            sendMessage(msg);

            updateShadowText(node_id, patch);
        }

    }
    
};

function sendAddTransformation(node: Node, outputNode?: Node, edge?: Edge) {
    if(isWebSocketSet()) {
        let msg = "";
        //node, outputNode and edge are added - copied node with output
        if (outputNode && edge) {
            msg = JSON.stringify({
                msg_type : "add",
                client : client_uuid,
                node: node,
                outputNode: outputNode,
                edge: edge
            });
            addShadowOutputNode(outputNode);
            addShadowEdge(edge);
        //node and edge
        } else if(edge) {
            msg = JSON.stringify({
                msg_type: "add",
                client : client_uuid,
                node: node,
                edge: edge
            })
            addShadowEdge(edge)
        //node only
        } else {
            msg = JSON.stringify({
                msg_type : "add",
                client : client_uuid,
                node: node
            })
        }
        
        sendMessage(msg);
        //add to shadow document
        addShadowNode(node);
    }
}

//INFO : send new position of the node that moved
function sendMoveTransformation(node_id: string, position:XYPosition, parentNode: string | undefined) {
    if(isWebSocketSet()) {
        let msg = JSON.stringify({
            msg_type : "move",
            node_id : node_id,
            position : position,
            parentNode: parentNode,
            client : client_uuid
        })
        sendMessage(msg);
        //move in shadow
        moveNode(node_id, position, parentNode);
    }
}

//INFO : send the node id of the node that has to be deleted
function sendDeleteTransformation(node_id: string) {
    if(isWebSocketSet()) {
        let msg = JSON.stringify({
            msg_type : "delete",
            node_id : node_id,
            client : client_uuid
        })
        sendMessage(msg);
        //delete from shadow
        deleteNode(node_id);
    }
}

//INFO : send new height and width of resized node
function sendResize(node_id: string, height: number, width: number) {
    if(isWebSocketSet()) {
        let msg = JSON.stringify({
            msg_type : "resize",
            node_id : node_id,
            client : client_uuid,
            height : height,
            width : width
        })
        sendMessage(msg);
        //resize in shadow
        resizeNode(node_id, height, width);
    }
}

//INFO : send new groupnode and edge connecting it
function sendPredecessorGroup(node: Node, edge: Edge) {
    if(isWebSocketSet()) {
        let msg = JSON.stringify({
            msg_type : 'predecessor',
            node : node,
            edge : edge,
            client : client_uuid
        })
        sendMessage(msg)
        //
        if (node.data.predecessor) {
            changeEdgeTarget(node.data.predecessor, node.data.successors[0], node.id)
        }
        addShadowEdge(edge);
        addPredecessor(node);
    }
}

//INFO : send the childIds that are moved when splitting the kernel
function sendChildIds(node_id: string, newGroupNodesChildrenIds: string[]){
    if(isWebSocketSet()) {
        let msg = JSON.stringify({
            msg_type : 'changeParentNode',
            node_id : node_id,
            client : client_uuid,
            childIds : newGroupNodesChildrenIds
        })
        sendMessage(msg)
        changeParentNode(node_id, newGroupNodesChildrenIds);
    }
}

//INFO : send new position of the user in a node
function sendClickedNode(node_id: string) {
    if(isWebSocketSet()) {
        let msg = JSON.stringify({
            msg_type : 'clickedNode',
            node_id : node_id,
            client : client_uuid,
            clientName : getClientName()
        })
        sendMessage(msg)
    }
}

//INFO : send new outputNode
function sendNewOutputNode(node_id : string) {
    if(isWebSocketSet()) {
        let newEdge = {id: node_id + "_edge",
                        source: node_id,
                        target: node_id + "_output",
                        type: floatingEdgesSetting ? FLOATING_EDGE : NORMAL_EDGE}
        let msg = JSON.stringify({
            msg_type : 'new_output',
            outputNode : getNode(node_id + '_output'),
            edge : newEdge,
            client : client_uuid
        });
        sendMessage(msg)
        addShadowOutputNode(getNode(node_id + '_output')!);
        addShadowEdge(newEdge);
    }
}

return {startWebsocket, sendNewOutputNode, sendUpdate, sendAddTransformation, sendMoveTransformation, 
    sendDeleteTransformation, sendResize, sendChildIds, sendPredecessorGroup, sendClickedNode}
}
