import axios from 'axios';
import useWebSocketStore, { WebSocketState } from './webSocketStore';
import { Session } from '../../config/types';
import { serverURL, serverWSURL } from '../../config/config'; 
// access the type from WebSocketState
type setLEOType = WebSocketState['setLatestExecutionOutput'];
type setLECType = WebSocketState['setLatestExecutionCount'];

export async function createSession(node_id: string,
                                    path: string,
                                    token: string,
                                    setLatestExecutionOutput: setLEOType,
                                    setLatestExecutionCount: setLECType, collabOutputUtils : any, sendNewOutputNode : any): Promise<{ws: WebSocket, session: Session}> {
    const adjustedPath = path + '_' + node_id;
    const session = await startSession(token, adjustedPath);
    const ws = await startWebsocket(session.id!,
                                    session.kernel.id!,
                                    token,
                                    setLatestExecutionOutput,
                                    setLatestExecutionCount, collabOutputUtils, sendNewOutputNode);
    return {ws: ws, session: session};
}

export async function startSession(token: string, path: string): Promise<Session> {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    let requestBody: Session = {
        "name": "",
        "path": path,
        "type": "notebook",
        "kernel": {
            "name": "python3"
        },
    }
    const res = await axios.post(`${serverURL}/api/sessions`, requestBody)
    const session: Session = res.data
    return session
}

export async function startWebsocket(session_id: string, kernel_id: string, token: string, 
                                     setLatestExecutionOutput: setLEOType,
                                     setLatestExecutionCount: setLECType, collabOutputUtils : any, sendNewOutputNode : any): Promise<WebSocket> {
    const websocketUrl = `${serverWSURL}/api/kernels/${kernel_id}/channels?
        session_id=${session_id}&token=${token}`;
    const ws = new WebSocket(websocketUrl);
    // WebSocket event handlers
    ws.onopen = () => {
        console.log('WebSocket connection established');
    };
    const store = useWebSocketStore;
    const {msgIdToExecInfo, setMsgIdToExecInfo} = store.getState();
    // Handle incoming messages from the kernel
    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        const msg_type = message.header.msg_type;
        // console.log('Received message from kernel:', message);

        // Handle different message types as needed
        if (msg_type === 'status' && message.content.execution_state === 'busy') {
            if (!(message.parent_header.msg_id in msgIdToExecInfo) && 'nodeId' in message.parent_header && 'parentNodeId' in message.parent_header) {
                setMsgIdToExecInfo({[message.parent_header.msg_id]: {nodeId: message.parent_header.nodeId, executedParent: message.parent_header.parentNodeId, code: "" }})
                collabOutputUtils(message.parent_header.nodeId);
            }
        } else if (msg_type === 'execute_reply') {
            // if (message.content.status === 'error' || message.content.status === 'abort') return;
            const newObj = {
                msg_id: message.parent_header.msg_id,
                execution_count: message.content.execution_count,
            }
            //sendExecResult(msg_type, message.parent_header.msg_id, newObj, message.msg_id);
/*             if (!(message.parent_header.msg_id in msgIdToExecInfo) && 'nodeId' in message.parent_header && 'parentNodeId' in message.parent_header) {
                setMsgIdToExecInfo({[message.parent_header.msg_id]: { nodeId: message.parent_header.nodeId, executedParent: message.parent_header.parentNodeId, code: "" }})
                collabOutputUtils(message.parent_header.nodeId)
                console.log("my guy was executed");
            } */
            setLatestExecutionCount(newObj);

        } else if (msg_type === 'execute_result') {
            const outputObj = {
                msg_id: message.parent_header.msg_id,
                output: message.content.data['text/plain'],
                outputHTML: message.content.data['text/html'],
                isImage: false,
                outputType: 'execute_result',
            }
/*             if (!(message.parent_header.msg_id in msgIdToExecInfo) && 'nodeId' in message.parent_header && 'parentNodeId' in message.parent_header) {
                setMsgIdToExecInfo({[message.parent_header.msg_id]: { nodeId: message.parent_header.nodeId, executedParent: message.parent_header.parentNodeId, code: "" }})
                collabOutputUtils(message.parent_header.nodeId)
                console.log("my guy was executed");
            } */
            //sendExecResult(msg_type, message.parent_header.msg_id, outputObj, message.msg_id);
            setLatestExecutionOutput(outputObj);

        } else if (msg_type === 'stream') {
            const outputObj = {
                msg_id: message.parent_header.msg_id,
                output: message.content.text,
                isImage: false,
                outputType: 'stream',
            }
/*             if (!(message.parent_header.msg_id in msgIdToExecInfo) && 'nodeId' in message.parent_header && 'parentNodeId' in message.parent_header) {
                setMsgIdToExecInfo({[message.parent_header.msg_id]: { nodeId: message.parent_header.nodeId, executedParent: message.parent_header.parentNodeId, code: "" }})
                collabOutputUtils(message.parent_header.nodeId)
                console.log("my guy was executed");
            } */
            //sendExecResult(msg_type, message.parent_header.msg_id, outputObj, message.msg_id);
            setLatestExecutionOutput(outputObj);

        } else if (msg_type === 'display_data') {
            const outputImage = message.content.data['image/png'];
            var outputObj;
            if (outputImage !== undefined) {
                outputObj = {
                    msg_id: message.parent_header.msg_id,
                    output: outputImage,
                    isImage: true,
                    outputType: 'display_data',
                }
            } else {
                outputObj = {
                    msg_id: message.parent_header.msg_id,
                    output: message.content.data['text/plain'],
                    outputHTML: message.content.data['text/html'],
                    isImage: false,
                    outputType: 'display_data',
                }
                
            }
/*             if (!(message.parent_header.msg_id in msgIdToExecInfo) && 'nodeId' in message.parent_header && 'parentNodeId' in message.parent_header) {
                setMsgIdToExecInfo({[message.parent_header.msg_id]: { nodeId: message.parent_header.nodeId, executedParent: message.parent_header.parentNodeId, code: "" }})
                collabOutputUtils(message.parent_header.nodeId)
                console.log("my guy was executed");
            } */
            //sendExecResult(msg_type, message.parent_header.msg_id, outputObj, message.msg_id);
            setLatestExecutionOutput(outputObj);

        } else if (msg_type === 'error') {
            const traceback = message.content.traceback;
            const outputObj = {
                msg_id: message.parent_header.msg_id,
                output: traceback.join('\n'),
                isImage: false,
                outputType: 'error',
            }
/*             if (!(message.parent_header.msg_id in msgIdToExecInfo) && 'nodeId' in message.parent_header && 'parentNodeId' in message.parent_header) {
                setMsgIdToExecInfo({[message.parent_header.msg_id]: { nodeId: message.parent_header.nodeId, executedParent: message.parent_header.parentNodeId, code: "" }})
                collabOutputUtils(message.parent_header.nodeId)
                console.log("my guy was executed");
            } */
            //sendExecResult(msg_type, message.parent_header.msg_id, outputObj, message.msg_id);
            setLatestExecutionOutput(outputObj);
        } else if (msg_type === 'status' && message.content.execution_state === 'idle' && 'nodeId' in message.parent_header) {
            sendNewOutputNode(message.parent_header.nodeId);
        }
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
        console.log('WebSocket connection closed');
    };

    return ws;
}

/* INTERRUPT */
export const onInterrupt = async (token: string, kernelId: string) => {
    console.log("Interrupting kernel...");
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    await axios.post(`${serverURL}/api/kernels/${kernelId}/interrupt`)
};