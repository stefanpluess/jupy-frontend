import axios from 'axios';
import useWebSocketStore, { selectorGeneral, WebSocketState } from './webSocketStore';
import { ExecutionCount, ExecutionOutput, NotebookCell, Session } from '../../config/types';
import { serverURL, serverWSURL } from '../../config/config';
import {v4} from "uuid";
import {useDocumentStore} from "../documentStore";
import { useState, useCallback, useRef, useEffect } from 'react';
import { Edge, useReactFlow, useStoreApi, XYPosition } from 'reactflow';
import { useUpdateWebSocketStore, CursorPosition, user} from './updateWebSocketStore';
import MonacoEditor, { RefEditorInstance } from '@uiw/react-monacoeditor';
import {Node} from 'reactflow';
import { EXTENT_PARENT, GROUP_NODE, MARKDOWN_NODE, NORMAL_NODE } from '../../config/constants';
import useNodesStore from '../nodesStore';
import { createSession } from './websocketUtils';
import { shallow } from 'zustand/shallow';
import useSettingsStore from '../settingsStore';
import { sortNodes } from '../utils';
import {remove} from 'lodash';
import {useHandleBubbleDropOnCodeCell} from '../hooks/useBubbleDropOnCodeCell';
import useExecutionStore from '../executionStore';
import { useRemoveGroupNode } from '../hooks';
// access the type from WebSocketState

//export const updatews = new WebSocket('http://localhost:8888/canvas_ext/update');
const client_uuid = v4();
let lastId = '';
let lastLine = '';
let lastColumn = '';
let lastOutput = '';
let users : user[] = []

export function useUpdateWebSocket() {
const { token, setLatestExecutionCount, setLatestExecutionOutput } = useWebSocketStore(selectorGeneral, shallow);
const {setWebSocket, sendMessage, updateCursorPosition, client_name, isWebSocketSet, getClientName, updateUserPositions, removeUser} = useUpdateWebSocketStore();
const {receiveServerDiff, generateNodePatch, updateShadowText, addShadowOutputNode, setDocument, addShadowNode, moveNode, deleteNode, resizeNode, addShadowEdge, addPredecessor, changeParentNode, changeEdgeTarget} = useDocumentStore();
const {getNode, getNodes, setNodes, deleteElements, getEdges, setEdges, getEdge} = useReactFlow();
const setNodeIdToOutputs = useNodesStore((state) => state.setNodeIdToOutputs);
const setNodeIdToExecCount = useNodesStore((state) => state.setNodeIdToExecCount);
const setNodeIdToWebsocketSession = useNodesStore((state) => state.setNodeIdToWebsocketSession);
const expandParentSetting = useSettingsStore((state) => state.expandParent);
const store = useStoreApi();
const handleBubbleDropOnCodeCell = useHandleBubbleDropOnCodeCell();
const addDeletedNodeIds = useExecutionStore((state) => state.addDeletedNodeIds);
const removeGroupNode = useRemoveGroupNode();




async function startWebsocket(path: string, token: string, username: string){
    var updatews = new WebSocket('http://localhost:8888/canvas_ext/update');
    //set Shadow nodes and edges
    setDocument(getNodes(), getEdges());

    updatews.onmessage = async (event) => {
        
        console.log(event.data)
        var message = JSON.parse(event.data)
        //text update
        if(message.msg_type == "update") {
            let text = receiveServerDiff(message.patch, message.node_id)
            getNode(message.node_id)!.data.code = text;
        }
        if(message.msg_type == "console") {
            console.log(message.message)
        }
        //cursor update
        if(message.msg_type == "cursor") {
            const cursorPosition: CursorPosition = {
                lineNumber: message.lineNumber,
                column: message.column,
                clientName: message.client_name,
                client_id: message.client,
                colorName: message.color[1]
            };
            console.log("updatewebsocket column =" + cursorPosition.column)
            updateCursorPosition(cursorPosition, message.node_id);
        }
        if(message.msg_type == "clickedNode") {
            const userPosition: user = {
                client_id : message.client,
                clientName : message.clientName,
                colorCode : message.color
            }
            updateUserPositions(userPosition, message.node_id);
        }
        //add new node
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
                const {ws, session} = await createSession(newNode.id, path, token, setLatestExecutionOutput, setLatestExecutionCount)
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
                    setEdges((edges) => edges.concat(message.edge));
                    getNode(message.node.data.predecessor)!.data.successor = message.node.id
                }
                setNodes(store.getState().getNodes().concat(newNode).sort(sortNodes))
            }

            addShadowNode(message.node)
        }
        //move node position
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
        //delete a node
        } else if(message.msg_type == "delete") {
            if (getNode(message.node_id)!.type === GROUP_NODE) {
                removeGroupNode(message.node_id, true);
                const childNodeIds = Array.from(store.getState().nodeInternals.values())
                    .filter((n) => n.parentNode === message.node_id)
                    .map((n) => n.id);
    // create and array with id and childNodeIds
                const deletedIds = [message.node_id, ...childNodeIds];
                addDeletedNodeIds(deletedIds);
                deletedIds.forEach(deleteNode);
            } else {
                deleteElements({ nodes: [{ id: message.node_id }, { id: message.node_id + "_output" }] });
                // get the deleted id for the execution graph
                addDeletedNodeIds([message.node_id]);
                deleteNode(message.node_id)
            }

        //resize a node
        } else if(message.msg_type == "resize") {
            const updatedNodes = store.getState().getNodes().map((node) => {
                if(node.id === message.node_id) {
                    node.style!.height = message.height;
                    node.style!.width = message.width;
                    return node;
                } else {
                    return node;
                }
            }).sort(sortNodes)
            setNodes(updatedNodes);
            resizeNode(message.node_id, message.height, message.width);
        //change parentNode of one or more nodes    
        } else if(message.msg_type == "changeParentNode") {
            const nodes = store.getState().getNodes()
            const updatedNodes = nodes.map((node) => {
                if(message.childIds.includes(node.id)) {
                    node.parentNode = message.node_id
                    return node;
                } else {
                    return node;
                }
            })
            
            setNodes(updatedNodes.sort(sortNodes));
            changeParentNode(message.node_id, message.childIds);
        //insert a group node (split kernel)
        } else if(message.msg_type == "predecessor") {
            const nodes = store.getState().getNodes().map((node) => {
                if(message.node.data.successors.includes(node.id)) {
                    node.data.predecessor = message.node.id;
                }
                if(message.node.data.predecessor && message.node.data.predecessor === node.id) {
                    node.data.successors.concat(message.node.id);
                    remove(node.data.successors, (id) => id === message.node.data.successors[0]);
                    
                }
                return node;
            })
            const {ws, session} = await createSession(message.node.id, path, token, setLatestExecutionOutput, setLatestExecutionCount)
            setNodeIdToWebsocketSession(message.node.id, ws, session);
            setNodes(nodes.concat(message.node).sort(sortNodes));
            if(message.node.data.predecessor) {
                const edge = getEdge(`${message.node.data.predecessor}-${message.node.data.successors[0]}`)!
                    edge.target = message.node.id;
                    edge.id = `${message.node.data.predecessor}-${message.node.id}`
                changeEdgeTarget(message.node.data.predecessor, message.node.data.successors[0], message.node.id)
            }
            setEdges((edges) => edges.concat(message.edge));
            
            addShadowEdge(message.edge);
            addPredecessor(message.node);
            
        } else if(message.msg_type == 'close') {
            removeUser(message.client);
        } else if(message.msg_type == 'output') {
            message.node.data.serverTriggered = true;
            setNodes(store.getState().getNodes().filter((node) => node.id !== message.node.id).concat(message.node))
            setNodeIdToOutputs({[message.node.id]: message.node.data.outputs});
            setEdges(getEdges().filter((edge) => edge.id !== message.edge.id).concat(message.edge));
            addShadowOutputNode(message.node);
            addShadowEdge(message.edge);
        } else if(message.msg_type == 'init') {
            let updatedNodes : Node[] = message.nodes;
            updatedNodes.map(async (node) => {
                if(node.type === GROUP_NODE && !getNodes().some(existingNodes => node.id === existingNodes.id)) {
                    const {ws, session} = await createSession(node.id, path, token, setLatestExecutionOutput, setLatestExecutionCount);
                    setNodeIdToWebsocketSession(node.id, ws, session);
                    return node;
                } else if (node.type === NORMAL_NODE) {
                    setNodeIdToExecCount(node.id, node.data.executionCount.execCount ? node.data.executionCount.execCount : "");
                    return node;
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
        }
}
    updatews.onopen = (event) => {
        updatews.send(JSON.stringify({msg_type : "init", token : token, path : path, client : client_uuid, client_name : username, nodes : getNodes(), edges : getEdges()}))
    };
    updatews.onclose = () => {setWebSocket(undefined, undefined)}
    setWebSocket(updatews, username);
}

const sendUpdate = useCallback((text: any, node_id: string) => {
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
    
}, []);

/* function sendCursorUpdate(node_id: string, column: string, lineNumber: string){
    if(isWebSocketSet() && !(lastId === node_id && lastColumn === column && lastLine === lineNumber)) {
        let msg = JSON.stringify({
            msg_type : "cursor",
            node_id : node_id,
            column : column,
            lineNumber: lineNumber,
            client : client_uuid,
            client_name : getClientName()
        })
        setTimeout(() => sendMessage(msg), 500)
        //sendMessage(msg);
        lastId = node_id;
        lastColumn = column;
        lastLine = lineNumber;
    }
}; */

function sendAddTransformation(node: Node, outputNode?: Node, edge?: Edge) {
    if(isWebSocketSet()) {
        let msg = "";
        if (outputNode) {
            msg = JSON.stringify({
                msg_type : "add",
                client : client_uuid,
                node: node,
                outputNode: outputNode,
                edge: edge
            });
        } else if(edge) {
            msg = JSON.stringify({
                msg_type: "add",
                client : client_uuid,
                node: node,
                edge: edge
            })
        } else {
            msg = JSON.stringify({
                msg_type : "add",
                client : client_uuid,
                node: node
            })
        }
        
        console.log(node)
        sendMessage(msg);
        addShadowNode(node);
    }
}

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
    }
}

function sendDeleteTransformation(node_id: string) {
    if(isWebSocketSet()) {
        let msg = JSON.stringify({
            msg_type : "delete",
            node_id : node_id,
            client : client_uuid
        })
        sendMessage(msg);
    }
}

function sendResize(node_id: string, height: number, width: number) {
    if(isWebSocketSet()) {
        let msg = JSON.stringify({
            msg_type : "resize",
            node_id : node_id,
            client : client_uuid,
            height : height,
            width : width
        })
        sendMessage(msg)
    }
}

function sendPredecessorGroup(node: Node, edge: Edge) {
    if(isWebSocketSet()) {
        let msg = JSON.stringify({
            msg_type : 'predecessor',
            node : node,
            edge : edge,
            client : client_uuid
        })
        sendMessage(msg)
    }
}

function sendChildIds(node_id: string, newGroupNodesChildrenIds: string[]){
    if(isWebSocketSet()) {
        let msg = JSON.stringify({
            msg_type : 'changeParentNode',
            node_id : node_id,
            client : client_uuid,
            childIds : newGroupNodesChildrenIds
        })
        sendMessage(msg)
    }
}

function sendClickedNode(node_id: string) {
    console.log("clicked node executed")
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

function sendWebSocketMessage(message: any) {
    let msg = JSON.stringify({
        msg_type : 'websocket',
        message : message,
        client : client_uuid
    })
}

function sendOutput(node_id : string) {
    if(isWebSocketSet()){
        let msg = {
            msg_type : 'output',
            node : getNode(node_id),
            edge : getEdges().find((edge) => edge.target === node_id),
            client : client_uuid,
        }
        sendMessage(JSON.stringify(msg));
    }
}

return {startWebsocket, sendUpdate, sendAddTransformation, sendMoveTransformation, sendDeleteTransformation, sendResize, sendChildIds, sendPredecessorGroup, sendClickedNode, sendWebSocketMessage, sendOutput}
}
