import axios from "axios"
import { useEffect, useState } from "react"
import { Content } from "../../helpers/types";

export default function FileExplorer() {

  const [contents, setContents] = useState<Content[]>([]);
  const [activePath, setActivePath] = useState<string>('');
  const token = '922f773d6b2365e2950b5e67d9d92f4c1f45f3537599f236'

  const getContents = (path: string) => {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    axios.get(`http://localhost:8888/api/contents/${path}`).then((res) => {
      // create a list of file objects (containing name and path) from the response and set to contents
      const files = res.data.content.map((file: any) => {
        return { name: file.name, path: file.path }
      })
      setActivePath(res.data.path);
      setContents(files);
    })
  }

  const goBack = () => {
    getContents(activePath.split('/').slice(0, -1).join('/'));
  }

  /* useEffect to initially fetch the contents */
  useEffect(() => {
    getContents('');
  }, [])

  return (
    <div className="mt-5">
      {activePath !== '' && <a href="#" onClick={() => goBack()}>..</a>}
      {/* For each file in files, display the name and make it clickable */}
      {contents.map((file) => (
        <div>
          <a href="#" onClick={() => getContents(file.path)}>{file.name}</a>
        </div>
      ))}
    </div>
  )
}