export type ExecutionCount = {
    msg_id: string;
    execution_count: number;
};
export type ExecutionOutput = {
    msg_id: string;
    output: string;
    isImage: boolean;
};
export type CellIdToMsgId = {
    [msgId: string]: string;
};
export type Cell = {
    id: string;
    execution_count: number;
    output: string;
}
export type Content = {
    name: string;
    path: string;
    last_modified: string;
    created: string;
    writable: boolean;
    size: number;
    type: string;
}

export type NotebookCell = {
    cell_type: string;
    execution_count: number;
    id: string;
    metadata?: {};
    outputs: NotebookOutput[];
    source: string[];
    position: { x: number, y: number };
    parentNode?: string;
    height?: number;
    width?: number;
    parent?: string;
}

export type NotebookOutput = {
    output_type: string;
    data?: any;
    metadata?: {};
    execution_count?: number;
    name?: string;
    text?: string[];
    traceback?: string[];
    position: { x: number, y: number };
}