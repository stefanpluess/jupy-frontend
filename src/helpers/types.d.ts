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