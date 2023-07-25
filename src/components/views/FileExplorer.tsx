import axios from "axios"
import { useEffect, useState } from "react"
import { useNavigate, useParams } from 'react-router-dom';
import { Content } from "../../helpers/types";
import '../../styles/views/FileExplorer.css';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFolder, faArrowLeft, faBook, faFileCirclePlus } from "@fortawesome/free-solid-svg-icons";
import Table from 'react-bootstrap/Table';
import Error from '../views/Error'

export default function FileExplorer() {

  const navigate = useNavigate();
  const [contents, setContents] = useState<Content[]>([]);
  const path = useParams()["*"] ?? '';
  const [showError, setShowError] = useState(false);
  const token = '85eb7054f52f19e040500bfc99f20d8039f6cc55fc3707f2'

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

  const createNotebook = async () => {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    await axios.post(`http://localhost:8888/api/contents/${path}`, { type: 'notebook' }).then((res) => {
      const newPath = res.data.path;
      navigate(`/notebooks/${newPath}`);
    })
    .catch((err) => {
      console.log(err);
    })
  }

  const openFile = (path: string) => {
    const completePath = 'http://localhost:3000/notebooks/' + path;
    window.open(completePath, '_blank');
  }

  if (showError) {
    return <Error errorCode={404} errorMessage="Oops! The page you requested could not be found." />
  } else return (
    <div className="FileExplorer">
      <div className="row mb-3">
        {/* If path is empty, display root directory */}
        {path === '' && <h3 className="col-sm-11 mb-0">Root Directory</h3>}
        {/* If path is not empty, display path */}
        {path !== '' && <h3 className="col-sm-11">{path}</h3>}
        {/* Add a button to create a new notebook in the current directory */}
        <button className="btn btn-sm btn-primary col-sm-1" onClick={() => createNotebook()}><FontAwesomeIcon icon={faFileCirclePlus} /> Notebook</button>
      </div>
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
                <button className="link-button-back" onClick={() => goBack()}>
                  <FontAwesomeIcon icon={faArrowLeft} />
                  <i> ... Go Back</i>
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
                  {file.type === 'directory' && <FontAwesomeIcon icon={faFolder} />}
                  {file.type === 'directory' && ' '}
                  {file.type !== 'notebook' && <button className="link-button" onClick={() => navigate(file.path)}>
                    {file.name}
                  </button>}
                  {file.type === 'notebook' && <FontAwesomeIcon icon={faBook} />}
                  {file.type === 'notebook' && ' '}
                  {file.type === 'notebook' && <button className="link-button" onClick={async () => openFile(file.path)}>
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