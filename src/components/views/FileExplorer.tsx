import axios from "axios"
import { useEffect, useState } from "react"
import { useNavigate, useParams } from 'react-router-dom';
import { Content } from "../../helpers/types";
import '../../styles/views/FileExplorer.css';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFolder, faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import Table from 'react-bootstrap/Table';
import Error from '../views/Error'

export default function FileExplorer() {

  const navigate = useNavigate();
  const [contents, setContents] = useState<Content[]>([]);
  const path = useParams()["*"];
  const [showError, setShowError] = useState(false);
  const token = '58b08166dad176e4959d8d070b8a75c794ca366914276bb9'

  const getContentsFromPath = async () => {
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
      setShowError(false);
      setContents(files);})
    .catch((err) => {
      setShowError(true);
    })
  }

  const goBack = () => {
    navigate(path.split('/').slice(0, -1).join('/'));
  }

  /* useEffect to initially fetch the contents */
  useEffect(() => {
    getContentsFromPath();
  }, [path])

  const displayAsBytes = (size: number) => {
    if (size < 1000) return size + ' B';
    else if (size < 1000000) return (size / 1000).toFixed(2) + ' KB';
    else if (size < 1000000000) return (size / 1000000).toFixed(2) + ' MB';
    else return (size / 1000000000).toFixed(2) + ' GB';
  }


  if (showError) {
    return <Error errorCode={404} errorMessage="Oops! The page you requested could not be found." />
  } else return (
    <div className="FileExplorer">
      {/* For each file in files, display then in a table containing name, last_modified and size */}
      <Table bordered hover>
        <thead>
          <tr>
            <th className="col-md-4" scope="col">Name</th>
            <th className="col-md-2" scope="col">Last Modified</th>
            <th className="col-md-1" scope="col">File Size</th>
          </tr>
        </thead>
        <tbody>
          {path !== '' && 
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
                  {file.type !== 'notebook' && <button className="link-button" onClick={() => navigate(file.path)}>
                    {file.type === 'directory' && <FontAwesomeIcon icon={faFolder} />}
                    {file.type === 'directory' && ' '}
                    {file.name}
                  </button>}
                  {file.type === 'notebook' && <button className="link-button" onClick={async () => navigate(`/notebooks/${file.path}`)}>
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
      </Table>
    </div>
  )
}