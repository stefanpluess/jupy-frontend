import React, { useEffect, useState, useRef } from 'react'
import interact from 'interactjs'
import '../../styles/views/Home.css'
import Draggable from '../ui/Draggable';
import Draggable1 from '../ui/Draggable1';
import axios from 'axios'
import { Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { getNotebook, startSession } from '../../helpers/utils';
import { v4 as uuidv4 } from 'uuid';


const Home = () => {

	const [session_id, setSession_id] = useState('')
	const [kernel_id, setKernel_id] = useState('')
	const [cells, setCells] = useState([]);
	const [websocket, setWebsocket] = useState(null);
	const [latestExecutionCount, setLatestExecutionCount] = useState({});
	const [execCountByCellId, setExecCountByCellId] = useState([]);

	const [cellIdToMsgId, setCellIdToMsgId] = useState({});

	const [token, setToken] = useState('');

	const url = 'http://localhost:8888/';


	// add useEffect on latestExecutionCount
	useEffect(() => {
		// do not trigger on first render
		if (Object.keys(latestExecutionCount).length === 0) return;
		console.log("latestExecutionCount changed");
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

	// useEffect for the cells
	useEffect(() => {
		console.log("cells changed");
		console.log(cells);
	}
	, [cells]);


	function addCell() {
		const key = uuidv4();
		const newCell = {
			key: key,
			id: key,
			text: "New Box",
		}
		setCells([...cells, newCell])
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

		ws.onmessage = (event) => {
			// Handle incoming messages from the kernel
			const message = JSON.parse(event.data);
			// console.log('Received message from kernel:', message);

			// Handle different message types as needed
			if (message.header.msg_type === 'execute_reply') {
				// Code execution reply
				const executionResult = message.content;
				const executionCount = executionResult.execution_count;
				const msg_id = message.parent_header.msg_id;

				const newObj = {
					msg_id: msg_id,
					execution_count: executionCount,
				}
				setLatestExecutionCount(newObj);

				console.log('Execution result:', executionResult);
			} else if (message.header.msg_type === 'stream') {
				// Output stream message
				const outputData = message.content.text;
				console.log('Output:', outputData);
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
				<Draggable key={item.key} id={item.key} text={item.text} execute={executeCode} execCountByCellId={execCountByCellId}/>
			))}
    </div>
  )
}

export default Home
