import { XYPosition } from "reactflow";

export type ExecutionCount = {
    msg_id: string;
    execution_count: number;
};

export type ExecutionOutput = {
    msg_id: string;
    output: string;
    outputHTML?: string;
    outputType: string;
    isImage: boolean;
};

export type CellIdToOutputs = {
    [cellId: string]: OutputNodeData[];
};

export type NodeIdToExecCount = {
    [nodeId: string]: {
        execCount: number | string;
        timestamp: Date;
    };
};

export type OutputNodeData = {
    output: string;
    outputHTML?: string;
    isImage: boolean;
    outputType: string;
    timestamp?: Date;
    // containsBackslashB?: boolean; 
};

export type CellIdToMsgId = {
    [msgId: string]: string;
};

export type Cell = {
    id: string;
    execution_count: number;
    output: string;
};

export type Content = {
    name: string;
    path: string;
    last_modified: string;
    created: string;
    writable: boolean;
    size: number;
    type: string;
    sessions?: string[];
    [key: string]: any;
};

export type Kernelspecs = {
    [key: string]: {
        name: string;
        spec: {
            display_name: string;
            language: string;
            argv: string[];
            env: any;
            interrupt_mode: string;
            codemirror_mode?: string;
            metadata: {};
        };
        resources: any;
    };
}

export type Notebook = {
    cells: NotebookCell[];
    metadata: {
        kernelspec: {
            display_name: string;
            language: string;
            name: string;
        };
        language_info: {
            codemirror_mode: {
                name: string;
                version: number;
            };
            file_extension: string;
            mimetype: string;
            name: string;
            nbconvert_exporter: string;
            pygments_lexer: string;
            version: string;
        };
    };
    nbformat: number;
    nbformat_minor: number;
};

export type NotebookPUT = {
    type: string;
    content: Notebook;
    name?: string;
    path?: string;
    format?: string;
};

export type NotebookCell = {
    cell_type: string;
    execution_count: number;
    id: string;
    metadata?: {};
    outputs?: NotebookOutput[];
    source: string[];
    position?: XYPosition;
    height?: number | null;
    width?: number | null;
    parentNode?: string;
    predecessor?: string;
    successors?: string[];
    outputWidth?: number | null;
    outputHeight?: number | null;
    outputPosition?: XYPosition;
    outputParent?: string;
};

export type NotebookOutput = {
    output_type: string;
    data?: any;
    metadata?: {};
    execution_count?: number;
    name?: string;
    text?: string[];
    traceback?: string[];
    ename?: string;
    evalue?: string;
    isImage?: boolean;
};

export type Kernel = {
    name: string;
    id?: string;
    last_activity?: string;
    execution_state?: string;
    connections?: number;
};

export type Session = {
    id?: string;
    path: string;
    name: string;
    type: string;
    kernel: Kernel;
    notebook?: {
        path: string;
        name: string;
    };
};