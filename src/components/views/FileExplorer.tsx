import axios from "axios"
import { useEffect, useState } from "react"
import { useNavigate, useLocation } from 'react-router-dom';
import { Content } from "../../helpers/types";
import '../../styles/views/FileExplorer.css';

export default function FileExplorer() {

  const navigate = useNavigate();
  const location = useLocation();
  const [contents, setContents] = useState<Content[]>([]);
  const [activePath, setActivePath] = useState<string>('');
  const token = '3c5ca3c44799d4d4b7619f0d9b0001fc5a6cef3e1f8fe566'

  const getContents = (path: string) => {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    axios.get(`http://localhost:8888/api/contents/${path}`).then((res) => {
      // create a list of file objects (containing name and path) from the response and set to contents
      const files = res.data.content.map((file: any) => {
        return { name: file.name, path: file.path }
      })
      setActivePath(res.data.path);
      navigate(res.data.path);
      setContents(files);})
    .catch((err) => {
      navigate('/notfound');
    })
  }

  const goBack = () => {
    getContents(activePath.split('/').slice(0, -1).join('/'));
  }

  /* useEffect to initially fetch the contents */
  useEffect(() => {
    // use the location hook to get the path from the url, removing /tree or /tree/ from the start (but ONLY from the start)
    const path = location.pathname.replace(/^\/tree\/?/, '');
    getContents(path);
  }, [])

  return (
    <div className="mt-5">
      {activePath !== '' && <button className="link-button" onClick={() => goBack()}>..</button>}
      {/* For each file in files, display the name and make it clickable */}
      {contents.map((file) => (
        <div>
          <button className="link-button" onClick={() => getContents(file.path)}>{file.name}</button>
        </div>
      ))}
    </div>
  )
}