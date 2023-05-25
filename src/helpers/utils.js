import axios from 'axios'

// collection of helper methods
export async function getContent(url, token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    const res = await axios.get(url + 'api/contents')
    return res.data
}

export async function getNotebook(url, token, name) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    var res = await axios.get(url + 'api/contents/'+name)
    console.log("Notebook content:")
    console.log(res.data.content)
    return res.data.content
}

export async function createNotebook(url, token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    var requestBody = {
        "type": "notebook"
    }
    const res = await axios.post(url + 'api/contents', requestBody)
    return res.data
}

export async function renameNotebook(url, token, newName, oldName) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    var requestBody = {
        "path": newName+".ipynb"
    }
    const res = await axios.patch(url + 'api/contents/'+oldName, requestBody)
    return res.data
}

export async function updateNotebook(url, token, name, notebook, cell) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    notebook['cells'].push(cell)
    var requestBody = {
        "content": notebook,
        "type": "notebook"
    }
    const res = await axios.put(url + 'api/contents/'+name, requestBody)
    return res.data
}

export async function getKernelspecs(url, token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    const res = await axios.get(url + 'api/kernelspecs')
    console.log("Kernelspecs:")
    console.log(res.data)
    return res.data
}

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

export async function startSession(url, token, notebookName) {
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