import axios from 'axios'
import type { Node } from 'reactflow';

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

// ----- KEEP UNCOMMENTED -----
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
// ----- KEEP UNCOMMENTED -----

export async function startSession(url: string, token: string, notebookName: string) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    var requestBody = {
        "kernel": {
            "name": "python3"
        },
        "name": notebookName,
        "path": notebookName,
        "type": "notebook"
    }
    const res = await axios.post(url + 'api/sessions', requestBody)
    console.log("Start session:")
    console.log(res.data)

    const kernel_id = res.data['kernel']['id']
    const session_id = res.data['id']
    console.log("Kernel id: "+kernel_id)
    console.log("Session id: "+session_id)
    return {
        kernel_id: kernel_id,
        session_id: session_id
    }
}


export function createOutputNode(node: Node) {
  const newOutputNode: Node = {
    id: node.id+"_output",
    type: 'outputNode',
    // position it on the right of the given position
    position: {
      x: node.position.x + 140,
      y: node.position.y + 30,
    },
    data: { output: "Demo Output" },
  };

  // in case the node has a parent, we want to make sure that the output node has the same parent
  if (node.parentNode) {
    newOutputNode.parentNode = node.parentNode;
    newOutputNode.extent = 'parent';
  }
  return newOutputNode;
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