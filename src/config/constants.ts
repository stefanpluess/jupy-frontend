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

export const PADDING = 15;

/**
 * The minimum width of a node, used as the default width for code and markdown nodes when dropping them from sidebar.
 */
export const MIN_WIDTH = 180;

/**
 * The minimum height of a node, used as the default height for code and markdown nodes when dropping them from sidebar.
 * There is a constant for it as well in _variables.scss
 */
export const MIN_HEIGHT = 85;

export const MIN_WIDTH_GROUP = 200 + PADDING * 2;
export const MIN_HEIGHT_GROUP = 100 + PADDING * 2;

/**
 * The default width for a group node when dropping it from the sidebar.
 */
export const DEFAULT_WIDTH_GROUP = 800;

/**
 * The default height for a group node when dropping it from the sidebar.
 */
export const DEFAULT_HEIGHT_GROUP = 500;

/**
 * The maximum width value used for code, markdown, and output.
 */
export const MAX_WIDTH = 600;

/**
 * The maximum height value used for code, markdown, and output.
 */
export const MAX_HEIGHT = 500;

export const MIN_OUTPUT_SIZE = 25; // there is a constant for it as well in _variables.scss

/**
 * The size of a sidebar node, important when dropping the node into the canvas.
 * There is a constant for it as well in _variables.scss
 */
export const SIDEBAR_NODE_SIZE = 40;

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