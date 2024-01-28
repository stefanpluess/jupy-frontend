import { MarkerType} from 'reactflow';
import { DragEvent } from 'react';
import { editor } from 'monaco-editor';

// COMMENT - Configuration elements for ReactFlow used in Home component
export const proOptions = {
    hideAttribution: true,
};
export const defaultEdgeOptions = {
    style: {
        strokeWidth: 1.5,
    },
    markerEnd: {
        type: MarkerType.ArrowClosed,
    },
};
export const onDragOver = (event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
};

// COMMENT - Configuration elements for GroupNode used in Home component
export const lineStyle = { borderColor: "white" };
export const handleStyle = { height: 8, width: 8 };
export const initialModalStates = {
  showConfirmModalRestart: false,
  showConfirmModalShutdown: false,
  showConfirmModalDelete: false,
  showConfirmModalReconnect: false,
  showConfirmModalRunAll: false,
  showConfirmModalRunBranch: false,
};

// COMMENT - URL of the Jupyter Server
const serverBase = "localhost:8888";
export const serverURL = "http://" + serverBase;
export const serverWSURL = "ws://" + serverBase;

// COMMENT MONACO editor options config
export const monacoOptions: editor.IStandaloneEditorConstructionOptions = {
    padding: { top: 3, bottom: 3 },
    theme: "vs-dark",
    selectOnLineNumbers: true,
    roundedSelection: true,
    automaticLayout: true,
    lineNumbersMinChars: 3,
    lineNumbers: 'on',
    folding: false,
    scrollBeyondLastLine: false,
    scrollBeyondLastColumn: 0,
    fontSize: 10,
    wordWrap: "on",
    minimap: { enabled: false },
    renderLineHighlightOnlyWhenFocus: true,
    scrollbar: {
      vertical: "auto",
      horizontal: "auto",
      verticalScrollbarSize: 8,
      horizontalScrollbarSize: 6,
    }
};