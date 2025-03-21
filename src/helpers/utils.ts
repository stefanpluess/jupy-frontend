import axios from 'axios'
import type { Edge, Node, XYPosition } from 'reactflow';
import { Position, useReactFlow } from 'reactflow';
import { Notebook, NotebookCell, NotebookOutput, NotebookPUT, OutputNodeData, positionNode } from '../config/types';
import { GROUP_NODE, MARKDOWN_NODE, NORMAL_NODE, OUTPUT_NODE, GROUP_EDGE, ID_LENGTH, TOP_DOWN_ORDER, EXPORT_ACTION, RUNBRANCH_ACTION, MIN_WIDTH, MIN_HEIGHT, DEFAULT_WIDTH_GROUP, DEFAULT_HEIGHT_GROUP, DEFAULT_LOCK_STATUS, EXTENT_PARENT } from '../config/constants';
import { serverURL } from '../config/config';



/** Method to modify the initial notebook to contain 1 group cell and 1 code cell */
export const modifyInitialNotebook = async (path: string) => {
  const groupId = getId(GROUP_NODE);
  const notebookContent = {
    cells: [
      {
        id: groupId,
        cell_type: 'group',
        metadata: {},
        position: { x: 0, y: 0 },
        width: 600,
        height: 400,
      },
      {
        id: getId(NORMAL_NODE),
        cell_type: 'code',
        execution_count: null,
        source: [],
        metadata: {},
        position: { x: 210, y: 160 },
        width: MIN_WIDTH,
        height: MIN_HEIGHT,
        parentNode: groupId,
        outputs: [],
      }
    ],
    metadata: {},
    nbformat: 4,
    nbformat_minor: 5
  };
  await axios.put(`${serverURL}/api/contents/${path}`, { content: notebookContent, type: 'notebook' })
    .catch((err) => console.log(err));
}

/** Method to create the nodes given the JSON upon rendering a notebook for the first time */
export function createInitialElements(cells: NotebookCell[]): { initialNodes: Node[], initialEdges: Edge[] } {

  var initialNodes: Node[] = [];
  const outputNodes: Node[] = [];
  const initialEdges: Edge[] = [];

  // given the cells, create the initial nodes and edges
  cells.forEach((cell: NotebookCell) => {
    // if position is given, use it, otherwise create a new position (shift y position by 140px for each node)
    const position = cell.position ? { x: cell.position.x, y: cell.position.y } : { x: 0, y: 140 * initialNodes.length };
    const node: Node = {
      id: cell.id,
      type: cell.cell_type === 'code' ? NORMAL_NODE : cell.cell_type === 'group' ? GROUP_NODE : MARKDOWN_NODE,
      data: cell.cell_type  === 'code' ? {
        code: cell.source,
        executionCount: {
          execCount: cell.execution_count ? cell.execution_count : "",
          timestamp: new Date()
        }
      } : cell.cell_type === 'markdown' ? {
        code: cell.source
      } : {
        successors: cell.successors,
        predecessor: cell.predecessor
      },
      position: position,
      height: cell.height ?? MIN_HEIGHT,
      width: cell.width ?? MIN_WIDTH,
      style: { height: cell.height ?? MIN_HEIGHT, width: cell.width ?? MIN_WIDTH },
    };
    node.id = unifyId(cell, node.type!);
    if (cell.parentNode) {
      node.parentNode = cell.parentNode;
    };
    // for each code node, create an output node (if it has been executed before)
    if (cell.cell_type === 'code' && node.data.executionCount.execCount !== "") {
      const outputNode: Node = createOutputNode(node, cell.outputParent ?? "")
      // for each output (if multiple) set the output data
      const allOutputs = [] as OutputNodeData[];
      cell.outputs?.forEach((output_cell: NotebookOutput) => {
        const output = output_cell.output_type === 'execute_result' ? output_cell.data['text/plain'] :
                       output_cell.output_type === 'stream' ? output_cell.text :
                       output_cell.output_type === 'display_data' ? output_cell.data['image/png'] ?? output_cell.data['text/plain'] :
                       output_cell.output_type === 'error' ? output_cell.traceback?.join('\n') : '';
        const newOutputData: OutputNodeData = {
          output: output,
          isImage: output_cell.isImage ?? (output_cell.output_type === 'display_data' && output_cell.data['image/png']),
          outputType: output_cell.output_type,
        };
        if (output_cell.data && output_cell.data['text/html']) newOutputData.outputHTML = output_cell.data['text/html'];
        allOutputs.push(newOutputData);
      });
      outputNode.data.outputs = allOutputs;
      // if a position is given, use it, otherwise use the default position provided in the createOutputNode function
      outputNode.position = cell.outputPosition ? { x: cell.outputPosition.x, y: cell.outputPosition.y } : outputNode.position;
      outputNode.height = cell.outputHeight;
      outputNode.width = cell.outputWidth;
      outputNode.style = { height: cell.outputHeight!, width: cell.outputWidth! };
      outputNodes.push(outputNode);
      // create an edge from the node to the output node
      initialEdges.push({
        //id: `${node.id}-${outputNode.id}`,
        id: `${node.id}_edge`,
        source: node.id,
        target: outputNode.id,
      });
    }
    initialNodes.push(node);
  });
  // add the output nodes to the initial nodes
  initialNodes = [...initialNodes, ...outputNodes];

  // create edges between the group nodes
  cells.forEach((cell: NotebookCell) => {
    if (cell.successors) {
      cell.successors.forEach((successor: string) => {
        initialEdges.push({
          id: `${cell.id}-${successor}`,
          source: cell.id,
          target: successor,
          type: GROUP_EDGE,
        });
      });
    }
  });
  
  return { initialNodes, initialEdges };
    
}

/** Method used to unify id's when opening normal .ipynb notebooks */
const unifyId = (cell: NotebookCell, type: string): string => {
  var id;
  if (cell.id) {
    id = (cell.id.includes(NORMAL_NODE) || cell.id.includes(GROUP_NODE) || cell.id.includes(MARKDOWN_NODE)) ? 
                cell.id : 
                type+"_"+cell.id;
  // older notebooks have the id saved in the metadata
  } else if (cell.metadata.id) {
    id = (cell.metadata.id.includes(NORMAL_NODE) || cell.metadata.id.includes(GROUP_NODE) || cell.metadata.id.includes(MARKDOWN_NODE)) ? 
                cell.metadata.id : 
                type+"_"+cell.metadata.id;
  } else {
    id = getId(type);
  }
  return id;
}

/** Method to create the JSON given the nodes (upon saving) */
export function createJSON(nodes: Node[], edges: Edge[]): NotebookPUT {

  const cells: NotebookCell[] = [];
  nodes.forEach((node: Node) => {
    // create a cell object for each node (NO output node)
    if (node.type !== OUTPUT_NODE) {
      const cell: NotebookCell = {
        id: node.id,
        cell_type: node.type === NORMAL_NODE ? 'code' : node.type === GROUP_NODE ? 'group' : 'markdown',
        source: node.data.code,
        execution_count: node.data.executionCount?.execCount,
        outputs: [],
        position: node.position,
        parentNode: node?.parentNode,
        metadata: {},
        height: node.height,
        width: node.width,
        successors: node.data.successors,
        predecessor: node.data.predecessor
      };
      cells.push(cell);
    } else {
      // find the corresponding cell to add the outputs to it
      const cell = cells.find((cell: NotebookCell) => cell.id === node.id.replace('_output', ''));
      if (cell) {
        cell.outputWidth = node.width;
        cell.outputHeight = node.height;
        cell.outputParent = node.parentNode;
        cell.outputPosition = node.position;
        node.data.outputs.forEach((outputData: OutputNodeData) => {
          const output: NotebookOutput = {
            output_type: outputData.outputType,
            data: {},
            isImage: outputData.isImage,
          };
          if (output.output_type === 'execute_result') {
            output.data['text/plain'] = outputData.output;
            output.data['text/html'] = outputData.outputHTML;
          } else if (output.output_type === 'stream') {
            output.text = [outputData.output];
            // output.name = "stdout";
          } else if (output.output_type === 'display_data') {
            if (outputData.isImage) {
              output.data['image/png'] = outputData.output;
            } else {
              output.data['text/plain'] = outputData.output;
              output.data['text/html'] = outputData.outputHTML;
            }
          } else if (output.output_type === 'error') {
            output.traceback = outputData.output.split('\n');
          }
          cell.outputs?.push(output);
        });
      }
    }
  });
  const notebook: Notebook = createNotebookJSON(cells);
  const notebookPUT: NotebookPUT = {
    content: notebook,
    type: 'notebook'
  }
  return notebookPUT;
}

/** Method to export to a normal .ipynb (getting rid of all additional fields) */
export async function exportToJupyterNotebook(nodes: Node[], groupNodeId: string, fileName: string, order: string) {
  // if the order is top-down, sort the nodes by their y position
  if (order === TOP_DOWN_ORDER) nodes.sort((a, b) => a.position.y - b.position.y);
  const cells: NotebookCell[] = [];
  nodes.forEach((node: Node) => {
    if (node.parentNode !== groupNodeId) return;
    if (node.type === NORMAL_NODE || node.type === MARKDOWN_NODE) {
      const cell: NotebookCell = {
        id: node.id,
        cell_type: node.type === NORMAL_NODE ? 'code' : 'markdown',
        source: node.data.code,
        execution_count: node.data.executionCount?.execCount !== "" ? node.data.executionCount?.execCount : null,
        metadata: {}
      };
      cells.push(cell);
    } else if (node.type === OUTPUT_NODE) {
      const cell = cells.find((cell: NotebookCell) => cell.id === node.id.replace('_output', ''));
      if (cell) {
        if (!cell.outputs) cell.outputs = [];
        node.data.outputs.forEach((outputData: OutputNodeData) => {
          const output: NotebookOutput = {
            output_type: outputData.outputType
          };
          if (output.output_type === 'execute_result') {
            output.data = { 
              'text/plain': outputData.output,
              'text/html': outputData.outputHTML
            };
            output.execution_count = cell.execution_count
          } else if (output.output_type === 'stream') {
            output.text = [outputData.output];
            output.name = "stdout";
          } else if (output.output_type === 'display_data') {
            if (outputData.isImage) {
              output.data = { 'image/png': outputData.output };
            } else {
              output.data = {
                'text/plain': outputData.output,
                'text/html': outputData.outputHTML
              };
            }
          } else if (output.output_type === 'error') {
            output.traceback = outputData.output.split('\n');
            output.ename = "";
            output.evalue = "";
          }
          if (output.output_type !== 'stream' && output.output_type !== 'error') output.metadata = {};
          cell.outputs?.push(output);
        });
      }
    }
  });

  const notebook: Notebook = createNotebookJSON(cells);
  const jsonString = JSON.stringify(notebook, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  window.URL.revokeObjectURL(url);
}

/** Method to create the notebook JSONO given the cells are already in correct format */
function createNotebookJSON(cells: NotebookCell[]): Notebook {

  const notebook: Notebook = {
    cells: cells,
    metadata: {
      kernelspec: {
        display_name: "Python 3 (ipykernel)",
        language: "python",
        name: "python3"
      },
      language_info: {
        codemirror_mode: {
          name: "ipython",
          version: 3
        },
        file_extension: ".py",
        mimetype: "text/x-python",
        name: "python",
        nbconvert_exporter: "python",
        pygments_lexer: "ipython3",
        version: "3.11.3"
      }
    },
    nbformat: 4,
    nbformat_minor: 5
  }

  return notebook;
}

/** Method to create the JSON and save the notebook */
export async function saveNotebook(nodes: Node[], edges: Edge[], token: string, 
                                   path: string, setShowSuccessAlert: any, setShowErrorAlert: any) {
  const notebookData: NotebookPUT = createJSON(nodes, edges);
  try {
    await updateNotebook(token, notebookData, path);
    if (setShowSuccessAlert) setShowSuccessAlert(true);
  } catch (error) {
    setShowErrorAlert(true);
    console.error("Error saving notebook:", error);
  }
}

/** Method to update the notebook given the data */
export async function updateNotebook(token: string, notebookData: NotebookPUT, path: string) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
  axios.put(`${serverURL}/api/contents/${path}`, notebookData)
    .then((res) => console.log('notebook updated'))
    .catch((err) => console.log(err));
}

/** Method to get all running sessions */
export async function getSessions(token: string) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
  const res = await axios.get(`${serverURL}/api/sessions`)
  return res.data
}

/** Method to get the kernelspecs */
export async function getKernelspecs(token: string) {
  axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  const res = await axios.get(`${serverURL}/api/kernelspecs`)
  return res.data;
}

/** Method to pass the parent state to a child */
export async function passParentState(token: string, dill_path: string, parent_kernel_id: string, child_kernel_id: string) {
  var parent_exec_count, child_exec_count;
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
  await axios.post(`${serverURL}/api/canvas_ext/export`, { 'kernel_id': parent_kernel_id })
    .then((res) => parent_exec_count = res.data.execution_count)
    .catch((err) => console.log(err));
  // wait for 200ms to ensure the state was actually saved
  await new Promise(resolve => setTimeout(resolve, 200));
  await axios.post(`${serverURL}/api/canvas_ext/import`, { 'parent_kernel_id': parent_kernel_id, 'kernel_id': child_kernel_id })
    .then((res) => child_exec_count = res.data.execution_count)
    .catch((err) => console.log(err));
  // delete the dill file that was saved
  await axios.delete(`${serverURL}/api/contents/${dill_path !== '' ? dill_path + '/' : ''}${parent_kernel_id}.pkl`)
    .catch((err) => console.log(err));
  return {parent_exec_count, child_exec_count};
}

/** Method to analyze code (static analysis) after executing a code cell */
export async function analyzeCode(token: string, code: string) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
  return axios.post(`${serverURL}/api/canvas_ext/analyze`, { 'code': code, 'use_dict': false })
    .then(res => res.data)
    .catch(error => {
      console.error("Error analyzing code:", error);
      throw error;
    });
}


/**
 * Generates a message object to be sent to a Jupyter kernel.
 * USAGE EXAMPLE - passing all mandatory and one optional parameter:
 * ---> generateMessage(msg_id, code, {username: 'test'});
 */
export function generateMessage( msg_id: string, code: string, nodeId : string, parentNodeId : string, {
    msg_type = 'execute_request',
    username = 'username',
/*     metadata = {}, */
    silent = false,
    store_history = true,
    user_expressions = {},
    allow_stdin = false,
    stop_on_error = false,
    buffers = [],
    parent_header = {},
    channel = 'shell'
  } = {}) {
    return {
        header: {
            msg_type: msg_type,
            msg_id: msg_id,
            username: username,
            nodeId : nodeId,
            parentNodeId : parentNodeId
        },
        metadata: {},
        content: {
            code: code,
            silent: silent,
            store_history: store_history,
            user_expressions: user_expressions,
            allow_stdin: allow_stdin,
            stop_on_error: stop_on_error,
        },
        buffers: buffers,
        parent_header: parent_header,
        channel: channel
    };
}

/** Method to create an output node for a normal node */
export function createOutputNode(node: Node, outputParent?: string) {
  const newOutputNode: Node = {
    id: node.id+"_output",
    type: OUTPUT_NODE,
    // position it on the right of the given position
    position: {
      x: node.position.x + node.width! + 50,
      y: (node.position.y + node.height! / 2) - 17.5,
    },
    data: {
      outputs: [] as OutputNodeData[],
    },
  };

  if (typeof(outputParent) === 'string') {
    // COMMENT - same part of code used in useDuplicateCell.ts
    newOutputNode.parentNode = outputParent;
  } else if (node.parentNode) {
    newOutputNode.parentNode = node.parentNode;
  }
  return newOutputNode;
}

/* Functions to properly display color coding */
export function ansiToHtml(text: string): string {
  let html = '';
  let inEscapeCode = false;
  let currentCode = '';
  let tagOpen = false;

  for (const char of text) {
    if (char === '\u001b') {
      inEscapeCode = true;
      currentCode = char;
    } else if (inEscapeCode) {
      currentCode += char;
      if (char.match(/[a-zA-Z]/)) {
        inEscapeCode = false;
        if (currentCode.endsWith('m')) {
          // Convert ANSI code to HTML, only add if not empty
          const htmlFragment = convertAnsiToHtml(currentCode);
          if (htmlFragment) {
            // Close the previous tag before opening a new one
            if (tagOpen) html += '</span>';
            html += htmlFragment;
            tagOpen = true;
          }
        } else {
          html += currentCode;
        }
        currentCode = '';
      }
    } else {
      html += char;
    }
  }
  // Close any open tag at the end of the text
  if (tagOpen) html += '</span>';
  return '<span>'+html+'</span>';
}

function convertAnsiToHtml(escapeCode: string): string {
  if (escapeCode.match(/0;31|1;31/)) {
    return '<span style="color: #ff0000;">';
  } else if (escapeCode.match(/0;32|1;32/)) {
    return '<span style="color: #00FF00;">';
  } else if (escapeCode.match(/0;33|1;33/)) {
    return '<span style="color: #FFD700;">';
  } else if (escapeCode.match(/0;34|1;34/)) {
    return '<span style="color: #0000FF;">';
  } else if (escapeCode.match(/0;36|1;36/)) {
    return '<span style="color: #00FFFF;">';
  } else if (escapeCode.match(/0;37|1;37/) || escapeCode === '\u001b[0m') {
    return '<span style="color: #FFFFFF;">';
  } else {
    return '';
  }
}

/** Method to make sure that parent nodes are rendered before their children */
export const sortNodes = (a: Node, b: Node): number => {
    if (a.type === b.type) {
      return 0;
    }
    return a.type === GROUP_NODE && b.type !== GROUP_NODE ? -1 : 1;
};

/** Method to generate an ID with a prefix (which is the node type) */
export const getId = (prefix = NORMAL_NODE) => {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const idLength = ID_LENGTH;
  let id = '';
  for (let i = 0; i < idLength; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    id += characters[randomIndex];
  }
  return `${prefix}_${id}`;
;}

/** Method when dropping a node inside a group */
export const getNodePositionInsideParent = (node: Partial<Node> | positionNode, groupNode: Node | positionNode) => {
    const position = node.position ?? { x: 0, y: 0 };
    const nodeWidth = node.width ?? 0;
    const nodeHeight = node.height ?? 0;
    const groupWidth = groupNode.width ?? 0;
    const groupHeight = groupNode.height ?? 0;
  
    if (position.x < groupNode.position.x) {
      position.x = 0;
    } else if (position.x + nodeWidth > groupNode.position.x + groupWidth) {
      position.x = groupWidth - nodeWidth;
    } else {
      position.x = position.x - groupNode.position.x;
    }
  
    if (position.y < groupNode.position.y) {
      position.y = 0;
    } else if (position.y + nodeHeight > groupNode.position.y + groupHeight) {
      position.y = groupHeight - nodeHeight;
    } else {
      position.y = position.y - groupNode.position.y;
    }
  
    return position;
};

/* ================== helpers for onNodeDrag... ================== */
export function canRunOnNodeDrag(node: Node): boolean {
  if ((node.type === GROUP_NODE) && !node.parentNode) {
    return false;
  } else {
    return true;
  }
}

/* given the group node and newPostion of the node, keep the newPostion.x between 0 and 
groupNode.width - node.width, and newPostion.y between 0 and groupNode.height - node.height */
export const keepPositionInsideParent = (node: Partial<Node>, groupNode: Node, newPosition: {x: number, y: number}) => {
  const position = { ...newPosition };
  const nodeWidth = node.width ?? 0;
  const nodeHeight = node.height ?? 0;
  const groupWidth = groupNode.width ?? 0;
  const groupHeight = groupNode.height ?? 0;

  if (position.x < 0) {
    position.x = 0;
  } else if (position.x + nodeWidth > groupWidth) {
    position.x = groupWidth - nodeWidth;
  } else {
    position.x = position.x;
  }

  if (position.y < 0) {
    position.y = 0;
  } else if (position.y + nodeHeight > groupHeight) {
    position.y = groupHeight - nodeHeight;
  } else {
    position.y = position.y;
  }

  return position;
}

/** Get the connected node id (either OUTPUT_NODE or NORMAL_NODE) */
export const getConnectedNodeId = (id: string) : string => {
  if (id.includes(NORMAL_NODE)) {
    if (id.includes('output')) {
      // for OutputNode return id of the Simple Node
      return id.replace(/_output.*$/, '');
    }
    // for SimpleNode return id of the OutputNode
    return id.concat("_output");
  }
  console.error('getConnectedNodeId: id is not a node id');
  return '';
}

/** Given a node id return it without "_output" */
export const getSimpleNodeId = (id: string) : string => {
  if (id.includes(NORMAL_NODE)) {
    if (id.includes('output')) {
      return id.replace(/_output.*$/, '');
    }
    return id;
  }
  console.error('getSimpleNodeId: id is not a node id');
  return '';
}

/** Takes node_id and returns true if node is a NORMAL_NODE or OUTPUT_NODE */
export const checkNodeAllowed = (id: string) : boolean => {
  if (id.includes(NORMAL_NODE) || id.includes(OUTPUT_NODE)) {
    return true;
  }
  return false;
}


/* ================== helpers for floating edges ================== */
function getNodeIntersection(intersectionNode: Node, targetNode: Node) {
  // https://math.stackexchange.com/questions/1724792/an-algorithm-for-finding-the-intersection-point-between-a-center-of-vision-and-a
  const {
    width: intersectionNodeWidth,
    height: intersectionNodeHeight,
    positionAbsolute: intersectionNodePosition,
  } = intersectionNode;
  const targetPosition = targetNode.positionAbsolute;

  const w = intersectionNodeWidth! / 2;
  const h = intersectionNodeHeight! / 2;

  const x2 = intersectionNodePosition!.x + w;
  const y2 = intersectionNodePosition!.y + h;
  const x1 = targetPosition!.x + targetNode.width! / 2;
  const y1 = targetPosition!.y + targetNode.height! / 2;

  const xx1 = (x1 - x2) / (2 * w) - (y1 - y2) / (2 * h);
  const yy1 = (x1 - x2) / (2 * w) + (y1 - y2) / (2 * h);
  const a = 1 / (Math.abs(xx1) + Math.abs(yy1));
  const xx3 = a * xx1;
  const yy3 = a * yy1;
  const x = w * (xx3 + yy3) + x2;
  const y = h * (-xx3 + yy3) + y2;

  return { x, y };
}

// returns the position (top,right,bottom or right) passed node compared to the intersection point
function getEdgePosition(node: Node, intersectionPoint: XYPosition) {
  const n = { ...node.positionAbsolute, ...node };
  const nx = Math.round(n.x!);
  const ny = Math.round(n.y!);
  const px = Math.round(intersectionPoint.x);
  const py = Math.round(intersectionPoint.y);

  if (px <= nx + 1) {
    return Position.Left;
  }
  if (px >= nx + n.width! - 1) {
    return Position.Right;
  }
  if (py <= ny + 1) {
    return Position.Top;
  }
  if (py >= ny + n.height! - 1) {
    return Position.Bottom;
  }

  return Position.Top;
}

// returns the parameters (sx, sy, tx, ty, sourcePos, targetPos) you need to create an edge
export function getEdgeParams(source: Node, target: Node) {
  const sourceIntersectionPoint = getNodeIntersection(source, target);
  const targetIntersectionPoint = getNodeIntersection(target, source);

  const sourcePos = getEdgePosition(source, sourceIntersectionPoint);
  const targetPos = getEdgePosition(target, targetIntersectionPoint);

  return {
    sx: sourceIntersectionPoint.x,
    sy: sourceIntersectionPoint.y,
    tx: targetIntersectionPoint.x,
    ty: targetIntersectionPoint.y,
    sourcePos,
    targetPos,
  };
}

/* ================== helpers for ordering of nodes ================== */
export function getNodeOrder(node_id: string, hovered_parent: string, allNodes: Node[], order: string, action: string) {
  // if action is not EXPORT_ACTION, remove all MARKDOWN_NODES
  var nodes = (action !== EXPORT_ACTION) ? allNodes.filter((node: Node) => node.type !== MARKDOWN_NODE) : allNodes;

  if (action !== RUNBRANCH_ACTION) {
    // fetch all NORMAL_NODES and MARKDOWN_NODES (from specified parent) in the order they are in the graph.
    nodes = nodes.filter((node: Node) => (node.type === NORMAL_NODE || node.type === MARKDOWN_NODE) && node.parentNode === hovered_parent);
  } else {
    // Keep the nodes IF: 1. parent is the hovered_parent OR hovered_parent is a successor of parent (recursively)
    nodes = nodes.filter((node: Node) => {
      if (node.type === NORMAL_NODE || node.type === MARKDOWN_NODE) {
        if (node.parentNode === hovered_parent) return true;
        else return isSuccessor(allNodes, node.parentNode!, hovered_parent);
      } else return false;
    });
  }

  // from the hovered_parent, go up the chain of predecessors until you reach the top one (and keep them in a list)
  const groupNodes = [hovered_parent] as string[];
  var predecessor = allNodes.find((node: Node) => node.id === hovered_parent)?.data.predecessor;
  while (predecessor !== undefined) {
    groupNodes.push(predecessor);
    predecessor = allNodes.find((node: Node) => node.id === predecessor)?.data.predecessor;
  }

  // First sort by parent (based on the index of node.parentNode in groupNodes -> the higher, the earlier)
  nodes.sort((a, b) => {
    const a_index = groupNodes.indexOf(a.parentNode!);
    const b_index = groupNodes.indexOf(b.parentNode!);
    if (a_index > b_index) return -1;
    else if (a_index < b_index) return 1;
    // if order is top-down, sort by y-value additionally
    if (order === TOP_DOWN_ORDER) {
      return a.position.y - b.position.y;
    } else {
      return 0;
    }
  });
  
  const index = nodes.findIndex((node: Node) => node.id === node_id);
  return index + 1;
}

export const isSuccessor = (allNodes: Node[], nodeId: string, potentialSuccessor: string): boolean => {
  // recursively check whether the potentialSuccessor is a successor of the node
  const node = allNodes.find((node: Node) => node.id === nodeId);
  if (!node?.data.successors) {
    return false;
  } else if (node?.data.successors.includes(potentialSuccessor)) {
    return true;
  } else {
    for (const successor of node?.data.successors) {
      if (isSuccessor(allNodes, successor, potentialSuccessor)) return true;
    }
    return false;
  }
};
