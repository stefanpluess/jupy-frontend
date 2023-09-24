import axios from 'axios'
import type { Edge, Node } from 'reactflow';
import { Notebook, NotebookCell, NotebookOutput, NotebookPUT, OutputNodeData } from '../config/types';
import { EXTENT_PARENT, GROUP_NODE, MARKDOWN_NODE, NORMAL_NODE, OUTPUT_NODE, GROUP_EDGE, ID_LENGTH } from '../config/constants';


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
      height: cell.height,
      width: cell.width,
      style: { height: cell.height!, width: cell.width! },
    };
    node.id = unifyId(cell, node.type!);
    if (cell.parentNode) {
      node.parentNode = cell.parentNode;
      node.extent = EXTENT_PARENT;
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
                       output_cell.output_type === 'error' ? output_cell.traceback?.map(removeEscapeCodes).join('\n') : '';
        const newOutputData: OutputNodeData = {
          output: output,
          isImage: output_cell.isImage!,
          outputType: output_cell.output_type,
        };
        if (output_cell.data && output_cell.data['text/html']) newOutputData.outputHTML = output_cell.data['text/html'];
        allOutputs.push(newOutputData);
      });
      outputNode.data.outputs = allOutputs;
      // if a position is given, use it, otherwise use the default position provided in the createOutputNode function
      outputNode.position = cell.outputs![0]?.position ? { x: cell.outputs![0].position.x, y: cell.outputs![0].position.y } : outputNode.position;
      outputNode.height = cell.outputHeight;
      outputNode.width = cell.outputWidth;
      outputNode.style = { height: cell.outputHeight!, width: cell.outputWidth! };
      outputNodes.push(outputNode);
      // create an edge from the node to the output node
      initialEdges.push({
        id: `${node.id}-${outputNode.id}`,
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

/* Method used to unify id's when opening normal .ipynb notebooks */
const unifyId = (cell: NotebookCell, type: string): string => {
  const id = (cell.id.includes(NORMAL_NODE) || cell.id.includes(GROUP_NODE) || cell.id.includes(MARKDOWN_NODE)) ? 
              cell.id : 
              type+"_"+cell.id;
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
        node.data.outputs.forEach((outputData: OutputNodeData) => {
          const output: NotebookOutput = {
            output_type: outputData.outputType,
            data: {},
            position: node.position,
            isImage: outputData.isImage,
          };
          if (output.output_type === 'execute_result') {
            output.data['text/plain'] = outputData.output;
            output.data['text/html'] = outputData.outputHTML;
          } else if (output.output_type === 'stream') {
            output.text = [outputData.output];
            // output.name = "stdout"; //TODO: needed?
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

export async function exportToJupyterNotebook(nodes: Node[], groupNodeId: string, fileName: string) {

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

export async function saveNotebook(nodes: Node[], edges: Edge[], token: string, 
                                   path: string, setShowSuccessAlert: any, setShowErrorAlert: any) {
  const notebookData: NotebookPUT = createJSON(nodes, edges);
  try {
    await updateNotebook(token, notebookData, path);
    setShowSuccessAlert(true);
  } catch (error) {
    setShowErrorAlert(true);
    console.error("Error saving notebook:", error);
  }
}

export async function updateNotebook(token: string, notebookData: NotebookPUT, path: string) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
  axios.put(`http://localhost:8888/api/contents/${path}`, notebookData)
    .then((res) => console.log('notebook updated'))
    .catch((err) => console.log(err));
}

export async function getSessions(token: string) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
  const res = await axios.get('http://localhost:8888/api/sessions')
  return res.data
}

export async function passParentState(token: string, dill_path: string, parent_kernel_id: string, child_kernel_id: string) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
  await axios.post('http://localhost:8888/canvas_ext/export', { 'kernel_id': parent_kernel_id })
    .catch((err) => console.log(err));
  // wait for 200ms to ensure the state was actually saved
  await new Promise(resolve => setTimeout(resolve, 200));
  await axios.post('http://localhost:8888/canvas_ext/import', { 'parent_kernel_id': parent_kernel_id, 'kernel_id': child_kernel_id })
    .catch((err) => console.log(err));
  // delete the dill file that was saved
  await axios.delete(`http://localhost:8888/api/contents/${dill_path}/${parent_kernel_id}.pkl`)
    .then((res) => console.log('dill file deleted'))
    .catch((err) => console.log(err));
}

export async function analyzeCode(token: string, code: string) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
  return axios.post('http://localhost:8888/canvas_ext/analyze', { 'code': code, 'use_dict': 'false' })
    .then(res => res.data)
    .catch(error => {
      console.error("Error analyzing code:", error);
      throw error;
    });
}
// ------------------------- START -------------------------
// collection of helper methods
// export async function getContent(url: String, token: String) {
//     axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
//     const res = await axios.get(url + 'api/contents')
//     return res.data
// }

// export async function getNotebook(url: String, token: String, name: String) {
//     axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
//     var res = await axios.get(url + 'api/contents/'+name)
//     console.log("Notebook content:")
//     console.log(res.data.content)
//     return res.data.content
// }

// export async function createNotebook(url: String, token: String) {
//     axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
//     var requestBody = {
//         "type": "notebook"
//     }
//     const res = await axios.post(url + 'api/contents', requestBody)
//     return res.data
// }

// export async function renameNotebook(url: String, token: String, newName: String, oldName: String) {
//     axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
//     var requestBody = {
//         "path": newName+".ipynb"
//     }
//     const res = await axios.patch(url + 'api/contents/'+oldName, requestBody)
//     return res.data
// }

// export async function getKernelspecs(url, token) {
//     axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
//     const res = await axios.get(url + 'api/kernelspecs')
//     console.log("Kernelspecs:")
//     console.log(res.data)
//     return res.data
// }


/**
 * Generates a message object to be sent to a Jupyter kernel.
 * USAGE EXAMPLE - passing all mandatory and one optional parameter:
 * ---> generateMessage(msg_id, code, {username: 'test'});
 */
export function generateMessage( msg_id: string, code: string, {
    msg_type = 'execute_request',
    username = 'username',
    metadata = {},
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
        },
        metadata: metadata,
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



export function createOutputNode(node: Node, outputParent?: string) {
  const newOutputNode: Node = {
    id: node.id+"_output",
    type: OUTPUT_NODE,
    // position it on the right of the given position
    position: {
      x: node.position.x + 255,
      y: node.position.y +22,
    },
    data: {
      outputs: [] as OutputNodeData[],
    },
  };

  if (typeof(outputParent) === 'string') {
    // COMMENT - same part of code used in useDuplicateCell.ts
    newOutputNode.parentNode = outputParent;
    newOutputNode.extent = EXTENT_PARENT;
  } else if (node.parentNode) {
    newOutputNode.parentNode = node.parentNode;
    newOutputNode.extent = EXTENT_PARENT;
  }
  return newOutputNode;
}

export function removeEscapeCodes(str: string) {
  return str.replace(/\u001b\[[0-9;]*m/g, '');
}

// ------------------------- END -------------------------
// some helper methods for reactflow
// we have to make sure that parent nodes are rendered before their children
export const sortNodes = (a: Node, b: Node): number => {
    if (a.type === b.type) {
      return 0;
    }
    return a.type === GROUP_NODE && b.type !== GROUP_NODE ? -1 : 1;
};
  
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

  
export const getNodePositionInsideParent = (node: Partial<Node>, groupNode: Node) => {
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

/* given the group node and newPostion of the node, keep the 
newPostion.x between 0 and groupNode.width - node.width, and 
newPostion.y between 0 and groupNode.height - node.height */
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

// given a node id return id without "_output"
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
// implement a function that takes id and returns true if node is a NORMAL_NODE or OUTPUT_NODE
export const checkNodeAllowed = (id: string) : boolean => {
  if (id.includes(NORMAL_NODE) || id.includes(OUTPUT_NODE)) {
    return true;
  }
  return false;
}