import { ChangeEvent, useState, useEffect, memo, useCallback} from 'react'
import { Handle, Position, NodeToolbar, NodeProps, useStore, useReactFlow } from 'reactflow';
import useDetachNodes from '../../helpers/useDetachNodes';
import { faTrash, faPlay } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { v4 as uuidv4 } from 'uuid';
import CodeEditor from '@uiw/react-textarea-code-editor';
import { generateMessage } from '../../helpers';
import { useWebSocketStore } from '../../helpers/websocket';

function SimpleNode({ id, data }: NodeProps) {
  const { deleteElements, getNode } = useReactFlow();
  const hasParent = useStore((store) => !!store.nodeInternals.get(id)?.parentNode);
  const parentNode = useStore((store) => store.nodeInternals.get(id)?.parentNode);
  const parent = getNode(parentNode!);
  const setCellIdToMsgId = useWebSocketStore((state) => state.setCellIdToMsgId);
  const detachNodes = useDetachNodes();

  // textareaValue is data.code if it exists, otherwise it's an empty string
  const [textareaValue, setTextareaValue] = useState(data?.code || '');
  const [executionCount, setExecutionCount] = useState(data?.executionCount || 0);

  useEffect(() => {
    // console.log(id + " ----- Execution Count Changed ----- now: " + data?.executionCount)
    setExecutionCount(data?.executionCount);
  }, [data?.executionCount]);

  // when deleting the node, automatically delete the output node as well
  const onDelete = () => deleteElements({ nodes: [{ id }, {id: id+"_output"}] });
  const onDetach = () => detachNodes([id]);

  const handleTextareaChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    // including auto indent
    setTextareaValue(event.target.value.replace(/\t/g, '    '));
    data.code = event.target.value.replace(/\t/g, '    ');
  };

  const runCode = useCallback(() => {
    console.log('run code (' + textareaValue + ')!');
    var msg_id = uuidv4();
    setCellIdToMsgId({ [msg_id]: id });
    setExecutionCount("*");
    const ws = parent?.data.ws;
    const message = generateMessage(msg_id, textareaValue);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    } else {
      console.log("websocket is not connected");
    }
  }, [parent, textareaValue]);


  const deleteCode = () => {
    if (textareaValue === '') return;
    const confirmed = window.confirm("Are you sure you want clear the cell content?");
    if (confirmed) setTextareaValue('');
  }

  return (
    <>
      <NodeToolbar className="nodrag">
        <button onClick={onDelete}>Delete</button>
        {hasParent && <button onClick={onDetach}>Detach</button>}
      </NodeToolbar>
      <div className="executionCount">
        [{executionCount != null ? executionCount : ' '}]
      </div>
      <CodeEditor 
        className="textareaNode nodrag"
        value={textareaValue}
        language="python"
        placeholder="Please enter pyton code."
        onChange={handleTextareaChange}
        padding={2}
        style={{
          flexGrow: "1",
          fontFamily: 'ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace',
        }}
        onKeyDown={e => {
          if (e.ctrlKey && e.code === 'Enter') {
            e.preventDefault(); // TODO: doesn't work somehow
            runCode();
          }
        }}
      />
      <div className="inputCentered buttonArea nodrag">
          <button className="inputCentered cellButton bLeft" onClick={deleteCode}>
              <FontAwesomeIcon className="icon" icon={faTrash} />
          </button>
          <button className="inputCentered cellButton bRight" onClick={runCode} disabled={!hasParent}>
              <FontAwesomeIcon className="icon" icon={faPlay} />
          </button>
      </div>
      <Handle type="source" position={Position.Right} />
    </>
  );
}

export default memo(SimpleNode);
