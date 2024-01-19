/**
 * This file contains constants that are used throughout the application.
 */
export const GROUP_NODE = 'group';
export const EXTENT_PARENT =  'parent';
export const NORMAL_NODE = 'node';
export const OUTPUT_NODE = 'outputNode';
export const MARKDOWN_NODE = 'mdNode'
export const COMMENT_NODE = 'comment';

export const NORMAL_EDGE = 'default';
export const GROUP_EDGE = 'groupEdge';
export const FLOATING_EDGE = 'floatingEdge';

export const ID_LENGTH = 8;
export const DEFAULT_LOCK_STATUS = false;

export const KERNEL_IDLE = 'IDLE';
export const KERNEL_BUSY = 'BUSY';
export const KERNEL_INTERRUPTED = 'INTERRUPTED'; // SOLELY FOR VISUALIZATION PURPOSES
export const KERNEL_BUSY_FROM_PARENT = 'BUSY_FROM_PARENT';

export const EXEC_CELL_NOT_YET_RUN = '';
export const EXEC_CELL_RUNNING = '*';

export const MIN_WIDTH = 180;
export const MIN_HEIGHT = 85;
export const MIN_WIDTH_GROUP = 50;
export const MIN_HEIGHT_GROUP = 50;
export const MAX_WIDTH = 600;
export const MAX_HEIGHT = 500;
export const PADDING = 15;
export const MIN_OUTPUT_SIZE = 25; // there is a constant for it as well in _variables.scss

// INFO :: order functionality
export const EXPORT_ACTION = 'export';
export const RUNALL_ACTION = 'runall';
export const RUNBRANCH_ACTION = 'runbranch';
export const INSERTION_ORDER = 'insertion';
export const TOP_DOWN_ORDER = 'top-down';
// export const LEFT_RIGHT_ORDER = 'left-right';

export enum ExecInfoT {
    NormalExecution = 'Execution',
    PropagateExecution = 'Propagate',
    LoadParent = 'Import',
    Export = 'Export',
    LoadLibraries = 'Libraries',
}

export const CONTROL_STLYE = {
    background: 'transparent',
    border: 'none',
    zIndex: 1,
}

export const EXECUTION_GRAPH_PANEL = 'exePanel';