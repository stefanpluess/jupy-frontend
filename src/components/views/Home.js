import React, { useEffect, useState, useRef } from 'react'
import '../../styles/views/Home.css'
import Cell from '../ui/Cell';
import Output from '../ui/Output';
import { Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { getNotebook, startSession } from '../../helpers/utils';
import { v4 as uuidv4 } from 'uuid';


const Home = () => {

	const [session_id, setSession_id] = useState('')
	const [kernel_id, setKernel_id] = useState('')

	const [cells, setCells] = useState([]);
	const [outputs, setOutputs] = useState([]);

	const [websocket, setWebsocket] = useState(null);

	const [latestExecutionCount, setLatestExecutionCount] = useState({});
	const [latestExecutionOutput, setLatestExecutionOutput] = useState({});

	const [execCountByCellId, setExecCountByCellId] = useState([]);
	const [execOutputByCellId, setExecOutputByCellId] = useState([]);

	const [cellIdToMsgId, setCellIdToMsgId] = useState({});

	const [token, setToken] = useState('');

	const url = 'http://localhost:8888/';



	useEffect(() => {
		// do not trigger on first render
		if (Object.keys(latestExecutionCount).length === 0) return;
		const msg_id = latestExecutionCount.msg_id;
		const executionCount = latestExecutionCount.execution_count;
		const cell_id = cellIdToMsgId[msg_id];

		// TODO: executionCount can also be an object with more information
		const newCount = { 
			id: cell_id, 
			executionCount: executionCount 
		};

		// if the id already exists, replace it, else add it
		if (execCountByCellId.find(item => item.id === newCount.id)) {
			setExecCountByCellId(execCountByCellId.map(item => item.id === newCount.id ? newCount : item));
		} else {
			setExecCountByCellId([...execCountByCellId, newCount]);
		}

	}, [latestExecutionCount]);


	useEffect(() => {
		// do not trigger on first render
		if (Object.keys(latestExecutionOutput).length === 0) return;
		const msg_id = latestExecutionOutput.msg_id;
		const output = latestExecutionOutput.output;
		// TODO: in case of error, change font color

		const cell_id = cellIdToMsgId[msg_id];
		const newOutput = {
			id: cell_id,
			output: output
		};

		// if the id already exists, replace it, else add it
		if (execOutputByCellId.find(item => item.id === newOutput.id)) {
			setExecOutputByCellId(execOutputByCellId.map(item => item.id === newOutput.id ? newOutput : item));
		} else {
			setExecOutputByCellId([...execOutputByCellId, newOutput]);
		}

	}, [latestExecutionOutput]);

	// add cell and a new output (using the same id)
	function addCell() {
		const key = uuidv4();
		setCells([...cells, { key: key, id: key, text: "New Box" }])
		setOutputs([...outputs, { key: key, id: key, text: null }]);
	}

	function removeCell(element) {
		setCells(cells.filter(item => item !== element))
	}

	async function onKeyPress(e) {
		if (e.key === "Enter") {
			setToken(e.target.value);
			const session = await startSession(url, e.target.value, "Demo.ipynb");
			setSession_id(session.session_id);
			setKernel_id(session.kernel_id);
			startWebsocketConnection(session.session_id, session.kernel_id, e.target.value);
			e.target.disabled = true;
		}
	}

	function startWebsocketConnection(session_id, kernel_id, token) {
		const websocketUrl = `ws://localhost:8888/api/kernels/${kernel_id}/channels?session_id=${session_id}&token=${token}`;
		const ws = new WebSocket(websocketUrl);

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
				if (message.content.status === 'error') return;
				const newObj = {
					msg_id: message.parent_header.msg_id,
					execution_count: message.content.execution_count,
				}
				setLatestExecutionCount(newObj);

			} else if (msg_type === 'execute_result') {
				const outputObj = {
					msg_id: message.parent_header.msg_id,
					output: message.content.data['text/plain']
				}
				setLatestExecutionOutput(outputObj);

			} else if (msg_type === 'stream') {
				const outputObj = {
					msg_id: message.parent_header.msg_id,
					output: message.content.text
				}
				setLatestExecutionOutput(outputObj);

			} else if (msg_type === 'error') {
				const outputObj = {
					msg_id: message.parent_header.msg_id,
					output: message.content.traceback.join('\n')
				}
				setLatestExecutionOutput(outputObj);
			}
		};

		ws.onerror = (error) => {
			console.error('WebSocket error:', error);
		};

		ws.onclose = () => {
			console.log('WebSocket connection closed');
		};

		setWebsocket(ws);
	}

	function executeCode(code, msg_id, cell_id) {
		setCellIdToMsgId({[msg_id]: cell_id});
		// Send code to the kernel for execution
		const message = {
			header: {
				msg_type: 'execute_request',
				msg_id: msg_id,
				username: 'username',
			},
			metadata: {},
			content: {
				code: code,
				silent: false,
				store_history: true,
				user_expressions: {},
				allow_stdin: false,
				stop_on_error: false
			},
			buffers: [],
			parent_header: {},
			channel: 'shell'
		};
		if (websocket.readyState === WebSocket.OPEN) {
			websocket.send(JSON.stringify(message));
		} else {
			console.log("websocket is not connected");
		}
	}


  return (
    <div className="mt-3" style={{height: '600px'}}>
			<div className="col col-mb-12 mb-2">
				<input
				  className='col col-md-6'
					type="text"
					placeholder='token'
					onKeyPress={onKeyPress}>
				</input>
			</div>
			<Button variant="primary" onClick={addCell}>
				<FontAwesomeIcon icon={faPlus} />
			</Button>
			{/* {cells} */}
			{cells.map((item) => (
				<Cell 
					key={item.key} 
					id={item.key} 
					text={item.text} 
					execute={executeCode} 
					execCountByCellId={execCountByCellId}
				/>
			))}
			{outputs.map((item) => {
				// if (execOutputByCellId[item.id] != null) {
					return <Output
					key={item.key}
					id={item.id}
					text={item.text}
					execOutputByCellId={execOutputByCellId}/>
				// }
			})}
    </div>
  )
}

export default Home
