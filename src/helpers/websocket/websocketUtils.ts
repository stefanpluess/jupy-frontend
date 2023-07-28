import axios from 'axios';
import { removeEscapeCodes } from '../utils';
import { WebSocketState } from './webSocketStore';
import { Session } from '../types';
// access the type from WebSocketState
type setLEOType = WebSocketState['setLatestExecutionOutput'];
type setLECType = WebSocketState['setLatestExecutionCount'];

export async function createSession(websocketNumber: number,
                                    path: string,
                                    token: string,
                                    setLatestExecutionOutput: setLEOType,
                                    setLatestExecutionCount: setLECType) {
    const adjustedPath = path + '_' + websocketNumber.toString();
    const session = await startSession(token, adjustedPath);
    const ws = await startWebsocket(session.session_id,
                                    session.kernel_id,
                                    token,
                                    setLatestExecutionOutput,
                                    setLatestExecutionCount);
    return ws;
}

export async function startSession(token: string, path: string) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    let requestBody: Session = {
        "name": "",
        "path": path,
        "type": "notebook",
        "kernel": {
            "name": "python3"
        },
    }
    const res = await axios.post('http://localhost:8888/api/sessions', requestBody)
    const kernel_id = res.data['kernel']['id']
    const session_id = res.data['id']
    return {
        kernel_id: kernel_id,
        session_id: session_id
    }
}

export async function startWebsocket(session_id: string, kernel_id: string, token: string, 
                                     setLatestExecutionOutput: setLEOType,
                                     setLatestExecutionCount: setLECType) {
    const websocketUrl = `ws://localhost:8888/api/kernels/${kernel_id}/channels?
        session_id=${session_id}&token=${token}`;
    const ws = new WebSocket(websocketUrl);
    /* 
    ANOTHER APPROACH INSTEAD OF PASSING FUNCTIONS WOULD BE TO USE useWebsocketStore 
    This approach is using the Zustand state selector function. Here, the components which 
    use setLatestExecutionOutput and setLatestExecutionCount will only re-render when either
    of these two specific pieces of state change. The selector function allows us to access 
    specific pieces of state, and the component will only be sensitive to changes to these parts. 
    If other parts of the state object change, the component won't re-render. 
    const setLatestExecutionOutput = useWebsocketStore((state) => state.setLatestExecutionOutput);
    const setLatestExecutionCount = useWebsocketStore((state) => state.setLatestExecutionCount);
    */
    // WebSocket event handlers
    ws.onopen = () => {
        console.log('WebSocket connection established');
    };

    // Handle incoming messages from the kernel
    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        const msg_type = message.header.msg_type;
        // console.log('Received message from kernel:', message);

        // Handle different message types as needed
        if (msg_type === 'execute_reply') {
            // TODO - have it in separate function
            // if (message.content.status === 'error' || message.content.status === 'abort') return;
            const newObj = {
                msg_id: message.parent_header.msg_id,
                execution_count: message.content.execution_count,
            }
            setLatestExecutionCount(newObj);

        } else if (msg_type === 'execute_result') {
            // TODO - have it in separate function
            const outputObj = {
                msg_id: message.parent_header.msg_id,
                output: message.content.data['text/plain'],
                isImage: false,
                outputType: 'execute_result',
            }
            setLatestExecutionOutput(outputObj);

        } else if (msg_type === 'stream') {
            // TODO - have it in separate function
            const outputObj = {
                msg_id: message.parent_header.msg_id,
                output: message.content.text,
                isImage: false,
                outputType: 'stream',
            }
            setLatestExecutionOutput(outputObj);

        } else if (msg_type === 'display_data') {
            // TODO - have it in separate function
            const outputText = message.content.data['text/plain'];
            const outputImage = message.content.data['image/png'];
            console.log(outputImage)
            const outputObj = {
                msg_id: message.parent_header.msg_id,
                output: outputImage,
                isImage: true,
                outputType: 'display_data',
            }
            setLatestExecutionOutput(outputObj);

        } else if (msg_type === 'error') {
            // TODO - have it in separate function
            const traceback = message.content.traceback.map(removeEscapeCodes);
            const outputObj = {
                msg_id: message.parent_header.msg_id,
                output: traceback.join('\n'),
                isImage: false,
                outputType: 'error',
            }
            setLatestExecutionOutput(outputObj);
        }
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };

    ws.onclose = async () => {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
        await axios.delete('http://localhost:8888/api/sessions/'+session_id)
        console.log('WebSocket connection closed');
    };

    return ws;
}

