import axios from 'axios'
import type { Edge, Node } from 'reactflow';
import { NotebookCell } from './types';

/* ================== helpers for onNodeDrag... ================== */
export function updateClassNameOrPosition(n: Node, node: Node, intersections: Node<any>[]): Node {
  const groupClassName = intersections.length && node.parentNode !== intersections[0]?.id ? 'active' : '';
  if (n.type === 'group') { // TODO - export and use a type as a constant
    return {
      ...n,
      className: groupClassName,
    };
  } else if (n.id === node.id) {
    return {
      ...n,
      position: node.position,
    };
  }
  return { ...n };
}

export function updateClassNameOrPositionInsideParent(n: Node, node: Node, groupNode: Node<any>): Node {
  if (n.id === groupNode.id) {
    return {
      ...n,
      className: '',
    };
  } else if (n.id === node.id) {
    const position = getNodePositionInsideParent(n, groupNode) ?? { x: 0, y: 0 };
    return {
      ...n,
      position,
      parentNode: groupNode.id,
      extent: 'parent' as 'parent',
    };
  }
  return n;
}

export function canRunOnNodeDrag(node: Node): boolean {
  if ((node.type !== 'node' && node.type !== 'outputNode') && !node.parentNode) {
    return false;
  }
  else{
    return true;
  }
}


export function createInitialElements(cells: NotebookCell[]): { initialNodes: Node[], initialEdges: Edge[] } {

  var initialNodes: Node[] = [];
  const outputNodes: Node[] = [];
  const initialEdges: Edge[] = [];

  // given the cells, create the initial nodes and edges
  cells.forEach((cell: NotebookCell) => {
    const node: Node = {
      id: cell.id,
      type: cell.cell_type === 'code' ? 'node' : 'mdnode',
      data: {
        code: cell.source,
        executionCount: cell.execution_count
      },
      // shift y position by 140px for each (not output) node
      position: { x: 0, y: 140 * initialNodes.length },
    };
    // if output is not empty, create an output node
    if (cell.outputs.length > 0) {
      const outputNode: Node = createOutputNode(node)
      // depending on the output type, set the output data
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

  return { initialNodes, initialEdges };
    
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

// export async function updateNotebook(url, token, name, notebook, cell) {
//     axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
//     notebook['cells'].push(cell)
//     var requestBody = {
//         "content": notebook,
//         "type": "notebook"
//     }
//     const res = await axios.put(url + 'api/contents/'+name, requestBody)
//     return res.data
// }

// export async function getKernelspecs(url, token) {
//     axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
//     const res = await axios.get(url + 'api/kernelspecs')
//     console.log("Kernelspecs:")
//     console.log(res.data)
//     return res.data
// }

// export async function getSessions(url, token) {
//     const res = await axios.get(url + 'api/sessions')
//     console.log("Sessions:")
//     console.log(res.data)

//     const kernel_id = res.data[0]['kernel']['id']
//     const session_id = res.data[0]['id']
//     console.log("Kernel id:")
//     console.log(kernel_id)
//     console.log("Session id:")
//     console.log(session_id)
//     return kernel_id, session_id
// }
// messageGenerator.js



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
    type: 'outputNode',
    // position it on the right of the given position
    position: {
      x: node.position.x + 180,
      y: node.position.y + 36,
    },
    data: { output: "", isImage: false },
  };

  // in case the node has a parent, we want to make sure that the output node has the same parent
  if (node.parentNode) {
    newOutputNode.parentNode = node.parentNode;
    newOutputNode.extent = 'parent';
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
    return a.type === 'group' && b.type !== 'group' ? -1 : 1;
};
  
export const getId = (prefix = 'node') => `${prefix}_${Math.random() * 10000}`;
  
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