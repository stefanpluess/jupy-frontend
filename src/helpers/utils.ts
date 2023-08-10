import axios from 'axios'
import type { Edge, Node } from 'reactflow';
import { Notebook, NotebookCell, NotebookOutput, NotebookPUT } from '../config/types';
import { EXTENT_PARENT, GROUP_NODE, MARKDOWN_NODE, NORMAL_NODE, OUTPUT_NODE, ID_LENGTH } from '../config/constants';


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
        executionCount: cell.execution_count
      } : cell.cell_type === 'markdown' ? {
        code: cell.source
      } : {},
      position: position,
    };
    if (cell.parentNode) {
      node.parentNode = cell.parentNode;
      node.extent = 'parent';
    };
    if (cell.cell_type === 'group') {
      node.height = cell.height;
      node.width = cell.width;
      node.style = { height: cell.height, width: cell.width }; // BUG - Type 'number | null | undefined' is not assignable to type 'Height<string | number> | undefined'. Type 'null' is not assignable to type 'Height<string | number> | undefined'.
    }
    // if output is not empty, create an output node
    if (cell.outputs.length > 0) {
      const outputNode: Node = createOutputNode(node)
      // depending on the output type, set the output data
      outputNode.data.outputType = cell.outputs[0].output_type;
      if (cell.outputs[0].output_type === 'execute_result') {
        outputNode.data.output = cell.outputs[0].data['text/plain'];
      } else if (cell.outputs[0].output_type === 'stream') {
        outputNode.data.output = cell.outputs[0].text;
      } else if (cell.outputs[0].output_type === 'display_data') {
        outputNode.data.output = cell.outputs[0].data['image/png'];
        outputNode.data.isImage = true;
      } else if (cell.outputs[0].output_type === 'error') {
        outputNode.data.output = cell.outputs[0].traceback?.map(removeEscapeCodes).join('\n');
      }
      // if a position is given, use it, otherwise use the default position provided in the createOutputNode function
      outputNode.position = cell.outputs[0].position ? { x: cell.outputs[0].position.x, y: cell.outputs[0].position.y } : outputNode.position;
      outputNodes.push(outputNode);
      // create an edge from the node to the output node
      initialEdges.push({
        id: `${node.id}-${outputNode.id}`,
        source: node.id,
        target: outputNode.id
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
          target: successor
        });
      });
    }
  });
  
  return { initialNodes, initialEdges };
    
}

export function createJSON(nodes: Node[], edges: Edge[]): NotebookPUT {

  const cells: NotebookCell[] = [];
  nodes.forEach((node: Node) => {
    // create a cell object for each node (NO output node)
    if (node.type !== OUTPUT_NODE) {
      const cell: NotebookCell = {
        id: node.id,
        cell_type: node.type === NORMAL_NODE ? 'code' : node.type === GROUP_NODE ? 'group' : 'markdown',
        source: node.data.code,
        execution_count: node.data.executionCount,
        outputs: [],
        position: node.position,
        parentNode: node?.parentNode,
        metadata: {},
      };
      if (node.type === GROUP_NODE) {
        cell.height = node.height;
        cell.width = node.width;
      }
      cells.push(cell);
    } else {
      const output: NotebookOutput = {
        output_type: node.data.outputType,
        execution_count: node.data.executionCount,
        data: {},
        position: node.position,
      };
      // depending on the output type, set the output data
      if (node.data.outputType === 'execute_result') {
        output.data['text/plain'] = node.data.output;
      } else if (node.data.outputType === 'stream') {
        output.text = node.data.output;
        output.name = node.data.name;
      } else if (node.data.outputType === 'display_data') {
        output.data['image/png'] = node.data.output;
      } else if (node.data.outputType === 'error') {
        output.traceback = node.data.output.split('\n');
      }
      // find the corresponding cell and add the output to it (id is the same, without the _output)
      const cell = cells.find((cell: NotebookCell) => cell.id === node.id.replace('_output', ''));
      cell?.outputs.push(output);
    }
  });

  // loop through all edges. For all edges from group node to group node, add them as predecessor/successor to the related cell
  edges.forEach((edge: Edge) => {
    const sourceNode = nodes.find((node: Node) => node.id === edge.source);
    const targetNode = nodes.find((node: Node) => node.id === edge.target);
    if (sourceNode?.type === GROUP_NODE && targetNode?.type === GROUP_NODE) {
      const sourceCell = cells.find((cell: NotebookCell) => cell.id === sourceNode.id);
      if (sourceCell?.successors) sourceCell.successors.push(targetNode.id);
      else if (sourceCell) sourceCell.successors = [targetNode.id];
      const targetCell = cells.find((cell: NotebookCell) => cell.id === targetNode.id);
      if (targetCell) targetCell.predecessor = sourceNode.id;
    }
  });

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

  const notebookPut: NotebookPUT = {
    content: notebook,
    type: 'notebook'
  }

  return notebookPut;
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



export function createOutputNode(node: Node) {
  const newOutputNode: Node = {
    id: node.id+"_output",
    type: OUTPUT_NODE,
    // position it on the right of the given position
    // TODO: use the position provided in the JSON
    position: {
      x: node.position.x + 200,
      y: node.position.y +11,
    },
    data: { output: "", isImage: false, outputType: 'stream' },
  };

  // in case the node has a parent, we want to make sure that the output node has the same parent
  if (node.parentNode) {
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