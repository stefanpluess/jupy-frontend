//COMMENT :: External modules/libraries
import { 
  useState, 
  useCallback, 
  memo, 
  useRef,
  useEffect
} from "react";
import {
  NodeToolbar,
  NodeProps,
  useStore,
  useReactFlow,
  Handle,
  Position,
  NodeResizeControl,
  Panel,
  ResizeDragEvent,
  ResizeParams,
} from "reactflow";
import {
  faCheck,
  faObjectUngroup,
  faPlayCircle,
  faTrashAlt,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import MonacoEditor, { RefEditorInstance } from "@uiw/react-monacoeditor";
import ReactMarkdown from "react-markdown";
//COMMENT :: Internal modules
import { useDetachNodes, useResizeBoundaries } from "../../helpers/hooks";
import { CONTROL_STLYE, EXPORT_ACTION, MARKDOWN_NODE, MIN_HEIGHT, MIN_WIDTH, RUNALL_ACTION, RUNBRANCH_ACTION } from "../../config/constants";
import ResizeIcon from "./ResizeIcon";
import useNodesStore from "../../helpers/nodesStore";
import useSettingsStore from "../../helpers/settingsStore";
import { getNodeOrder } from "../../helpers/utils";
import CopyButton from "../buttons/CopyContentButton";
import { monacoOptions } from "../../config/config";
import { useUpdateWebSocket } from "../../helpers/websocket/updateWebSocket";
import { useDocumentStore } from "../../helpers/documentStore";
import { useUpdateWebSocketStore } from "../../helpers/websocket/updateWebSocketStore";

/**
 * A React component that represents a Markdown node used in the Home component.
 * @param id The unique identifier of the node.
 * @param data The data associated with the node - code and editMode.
 */

function MarkdownNode({ id, data }: NodeProps) {
  const hasParent = useStore(
    (store) => !!store.nodeInternals.get(id)?.parentNode
  );
  const parentNode = useStore(
    (store) => store.nodeInternals.get(id)?.parentNode
  );
  const { deleteElements, getNodes } = useReactFlow();
  const detachNodes = useDetachNodes();
  const editMode = useNodesStore((state) => state.markdownNodesEditMode[id]);
  const setEditMode = useNodesStore((state) => state.setMarkdownNodeEditMode);
  useEffect(() => {
    if (editMode === undefined) {
      setEditMode(id, data?.editMode || false);
    }
  }, [id, data?.editMode, setEditMode, editMode]);

  // INFO :: 🧫 CELL BRANCH
  const parentNodeId = useStore(
    (store) => store.nodeInternals.get(id)?.parentNode
  );
  const isCellBranchActive = useNodesStore((state) => state.isCellBranchActive);
  const clickedNodeOrder = useNodesStore((state) => state.clickedNodeOrder);
  const [isPicked, setIsPicked] = useState(false);

  const {sendDeleteTransformation, sendUpdate, sendResize} = useUpdateWebSocket();
  const {generateNodePatch} = useDocumentStore();

  const {userPositions} = useUpdateWebSocketStore();

  const onDelete = () => {
    deleteElements({ nodes: [{ id }] })
    sendDeleteTransformation(id);
  };
  const onDetach = () => detachNodes([id]);

  const handleEditorChange = useCallback(
    (value: string, event: any) => {
      data.code = value;
      sendUpdate(value, id)
    },
    [data, data.code]
  );

  // INFO :: show order
  const showOrder = useNodesStore((state) => state.showOrder);
  const runAllOrderSetting = useSettingsStore((state) => state.runAllOrder);
  const exportOrderSetting = useSettingsStore((state) => state.exportOrder);
  const fetchNodeOrder = useCallback(() => {
    const order = showOrder.action === EXPORT_ACTION ? exportOrderSetting : runAllOrderSetting;
    const number = getNodeOrder(id, showOrder.node, getNodes(), order, showOrder.action);
    return number;
  }, [showOrder, runAllOrderSetting, exportOrderSetting, id, parentNode, getNodes, getNodeOrder]);

  /* right after insertion, allow the user to immediately type */
  const editorRef = useRef<RefEditorInstance | null>(null);
  useEffect(() => {
    if (!data.typeable) return;
    setTimeout(() => {
      if (editorRef.current) editorRef.current.editor?.focus();
    }, 10);
  }, []);

  // INFO :: resizing logic
  const getResizeBoundaries = useResizeBoundaries();
  const { maxWidth, maxHeight } = useStore((store) => {
    // isEqual needed for rerendering purposes
    return getResizeBoundaries(id);
  }, isEqual);

  const createMarkdown = () => setEditMode(id, false);

  const toolbar = (
    <NodeToolbar className="nodrag">
      <button onClick={onDelete} title="Delete Cell">
        <FontAwesomeIcon className="icon" icon={faTrashAlt} />
      </button>
      {hasParent && (
        <button
          title="Ungroup Markdown Cell from the Kernel"
          onClick={onDetach}
        >
          <FontAwesomeIcon className="icon" icon={faObjectUngroup} />
        </button>
      )}
    </NodeToolbar>
  );

  const topButtonsBar = (
    <div className="codeCellButtons">
      <CopyButton 
        nodeId={id}               
        title="Copy Text from Cell"
        className="cellButton"
        nodeType={MARKDOWN_NODE} 
      />
      {userPositions[id] && Object.values(userPositions[id]).map((pos => (
      <div 
        key={pos.client_id}
        title={pos.clientName}
        style={{
          position: 'relative',
          width: '15px',
          height: '15px',
          borderRadius: '50%',
          backgroundColor : pos.colorCode,
          display : 'flex',
          alignSelf : 'center',
          justifyContent : 'center',
          alignItems : 'center',
          fontSize : 'x-small',
          marginLeft: '2px',
          border: '0.5px solid white',
          fontWeight: '900',
          color: 'white'
        }}
      >{Array.from(pos.clientName)[0]}</div>
    )))}
    </div>
  );

  const onResizeEnd = useCallback((event: ResizeDragEvent, params: ResizeParams) => {
    sendResize(id, params.height, params.width)
  }, [])

  const nodeResizer = (
    <NodeResizeControl
      style={CONTROL_STLYE}
      minWidth={MIN_WIDTH}
      minHeight={MIN_HEIGHT}
      maxWidth={maxWidth}
      maxHeight={maxHeight}
      onResizeEnd={onResizeEnd}
    >
      <ResizeIcon />
    </NodeResizeControl>
  );
  
  // INFO :: 🧫 CELL BRANCH
  useEffect( () => {
    // find the position of the id inside clickedNodeOrder
    const position = clickedNodeOrder.indexOf(id);
    // set the node number
    if (position === -1) {
      setIsPicked(false);
    }
    else{
      setIsPicked(true);
    }
  }, [clickedNodeOrder]);

  const selectorCellBranch = (
    isCellBranchActive.isActive && isCellBranchActive.id === parentNodeId && (
    <Panel position="top-left" style={{ position: "absolute", top: "-1.5em", left: "-1.5em"}}>
      {isPicked === false ? (
        <span className="dotNumberEmpty">{'\u00A0'}</span>
        ) : (
          <span className="dotNumberSelected"><FontAwesomeIcon icon={faCheck}/></span>
        )
      }
    </Panel>)
  );

  if (!editMode)
    return (
      <>
        {nodeResizer}
        {toolbar}
        {selectorCellBranch}
        <div className="simpleNodewrapper">
          <div className="inner" style={{ opacity: showOrder.node === parentNode && showOrder.action === EXPORT_ACTION ? 0.5 : 1 }}>
            {topButtonsBar}
            <div
              className="textareaNode"
              onDoubleClick={() => setEditMode(id, true)}
            >
              <ReactMarkdown className="markdown">{data.code}</ReactMarkdown>
            </div>
          </div>
          {(showOrder.node === parentNode && showOrder.action === EXPORT_ACTION) && (
          <div className="innerOrder">
            {fetchNodeOrder()}
          </div>)}
        </div>
        
      </>
    );
  else
    return (
      <>
        {nodeResizer}
        {toolbar}
        {selectorCellBranch}
        <div className="simpleNodewrapper">
          <div className="inner" style={{ opacity: showOrder.node === parentNode && showOrder.action === EXPORT_ACTION ? 0.5 : 1 }}>
            {topButtonsBar}
            <MonacoEditor
              ref={editorRef}
              key={data}
              className="textareaNode nodrag"
              language="markdown"
              value={data.code}
              onChange={handleEditorChange}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.shiftKey) && e.code === "Enter") {
                  e.preventDefault();
                  createMarkdown();
                }
              }}
              style={{ textAlign: "left" }}
              options={monacoOptions}
            />
          </div>
          {(showOrder.node === parentNode && showOrder.action === EXPORT_ACTION) && (
          <div className="innerOrder">
            {fetchNodeOrder()}
          </div>)}
        </div>
        <Handle type="source" position={Position.Right}>
          <button
            title="Run Markdown"
            className="rinputCentered playButton rcentral"
            onClick={createMarkdown}
          >
            <FontAwesomeIcon className="icon" icon={faPlayCircle} />
          </button>
        </Handle>
      </>
    );
}

type IsEqualCompareObj = {
  maxWidth: number;
  maxHeight: number;
};

function isEqual(prev: IsEqualCompareObj, next: IsEqualCompareObj): boolean {
  return (
    prev.maxWidth === next.maxWidth &&
    prev.maxHeight === next.maxHeight
  );
}

export default memo(MarkdownNode);
