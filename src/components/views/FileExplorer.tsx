import axios from "axios"
import { useEffect, useState } from "react"
import { useNavigate, useLocation } from 'react-router-dom';
import { Content } from "../../helpers/types";
import '../../styles/views/FileExplorer.css';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFolder, faArrowLeft } from "@fortawesome/free-solid-svg-icons";

export default function FileExplorer() {

  const navigate = useNavigate();
  const location = useLocation();
  const [contents, setContents] = useState<Content[]>([]);
  const [activePath, setActivePath] = useState<string>('');
  const token = 'ae230a2558d4234f8c574f8492936bc32d97505ea2f3109a'

  const getContents = async (path: string) => {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    await axios.get(`http://localhost:8888/api/contents/${path}`).then((res) => {
      // create a list of file objects (containing name and path) from the response and set to contents
      const files = res.data.content.map((file: any) => {
        return { 
          name: file.name,
          path: file.path,
          last_modified: file.last_modified,
          created: file.created,
          writable: file.writable,
          size: file.size,
          type: file.type
        }
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

  const displayAsBytes = (size: number) => {
    if (size < 1000) return size + ' B';
    else if (size < 1000000) return (size / 1000).toFixed(2) + ' KB';
    else if (size < 1000000000) return (size / 1000000).toFixed(2) + ' MB';
    else return (size / 1000000000).toFixed(2) + ' GB';
  }

  const openNotebook = async (path: string) => {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    await axios.get(`http://localhost:8888/api/contents/${path}`).then((res) => {
      const notebook = res.data;
      console.log(notebook);
      navigate('/notebook', { state: notebook })
    })
  }

  return (
    <div className="mt-5">
      {/* For each file in files, display then in a table containing name, last_modified and size */}
      <table className="table table-hover">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Last Modified</th>
            <th scope="col">File Size</th>
          </tr>
        </thead>
        <tbody>
          {activePath !== '' && 
            <tr>
              <td>
                <button className="link-button" onClick={() => goBack()}>
                  <FontAwesomeIcon icon={faArrowLeft} />
                  ..
                </button>
              </td>
              <td></td>
              <td></td>
            </tr>
          }
          {contents.map((file) => {
            return (
              <tr key={file.name}>
                <td>
                  {file.type !== 'notebook' && <button className="link-button" onClick={() => getContents(file.path)}>
                    {file.type === 'directory' && <FontAwesomeIcon icon={faFolder} />}
                    {file.type === 'directory' && ' '}
                    {file.name}
                  </button>}
                  {file.type === 'notebook' && <button className="link-button" onClick={async () => openNotebook(file.path)}>
                    {file.name}
                  </button>}
                </td>
                {/* Display last_modified in a readable manner */}
                <td>{file.last_modified && new Date(file.last_modified).toLocaleString()}</td>
                <td>{file.size && displayAsBytes(file.size)}</td>
              </tr>
            )
          }
          )}
        </tbody>
      </table>
    </div>
  )
}