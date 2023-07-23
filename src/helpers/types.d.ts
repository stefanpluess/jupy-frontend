import { XYPosition } from "reactflow";

export type ExecutionCount = {
    msg_id: string;
    execution_count: number;
};
export type ExecutionOutput = {
    msg_id: string;
    output: string;
    outputType: string;
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
}

export type NotebookPUT = {
    type: string;
    content: Notebook;
    name?: string;
    path?: string;
    format?: string;
}

export type NotebookCell = {
    cell_type: string;
    execution_count: number;
    id: string;
    metadata?: {};
    outputs: NotebookOutput[];
    source: string[];
    position: XYPosition;
    height?: number | null;
    width?: number | null;
    parentNode?: string;
}

export type NotebookOutput = {
    output_type: string;
    data?: any;
    metadata?: {};
    execution_count?: number;
    name?: string;
    text?: string[];
    traceback?: string[];
    position: XYPosition;
}