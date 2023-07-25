import axios from "axios"
import { useEffect, useState } from "react"
import { useNavigate, useParams } from 'react-router-dom';
import { Content, Session } from "../../helpers/types";
import '../../styles/views/FileExplorer.css';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFolder, faArrowLeft, faBook, faFileCirclePlus } from "@fortawesome/free-solid-svg-icons";
import Table from 'react-bootstrap/Table';
import Error from '../views/Error'
import { getSessions } from "../../helpers/utils";
import { Button } from "react-bootstrap";

export default function FileExplorer() {

  const navigate = useNavigate();
  const [contents, setContents] = useState<Content[]>([]);
  const path = useParams()["*"] ?? '';
  const [showError, setShowError] = useState(false);
  const token = '2d4db1233734a79f9c275e8119779e0fb3f639894c96575d'


  const getContentsFromPath = async () => {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    await axios.get(`http://localhost:8888/api/contents/${path}`)
      .then(async (res) => {
        const files: Content[] = res.data.content.map((file: Content) => ({
          name: file.name,
          path: file.path,
          last_modified: file.last_modified,
          created: file.created,
          writable: file.writable,
          size: file.size,
          type: file.type,
        }));
        setShowError(false);
        const sessions = await getSessions(token);
        // if file.path is a substring of session.path (only the ending of _anyNumber is not there), add the session_id to the file (list of sessions)
        files.forEach((file: Content) => {
          sessions.forEach((session: Session) => {
            if (hasRunningSession(file.path, session.path)) {
              if (!file.sessions) file.sessions = [];
              file.sessions.push(session.id ?? '');
            }
          })
        })
        setContents(files);
      }).catch((err) => { 
        setShowError(true);
      });
  };

  const goBack = () => {
    navigate(path.split('/').slice(0, -1).join('/'));
  }

  /* useEffect to initially fetch the contents and setup polling to /api/contents/{path} and api/sessions */
  useEffect(() => {
    getContentsFromPath();
    const interval = setInterval(() => { getContentsFromPath() }, 10000);
    return () => clearInterval(interval);
  }, [path])

  const hasRunningSession = (file_path: string, string_path: string): boolean => {
    // Regular expression to match "_X" at the end of the string, where X is any positive integer
    const suffixPattern = /_\d+$/;
    // Remove the suffix "_X" from the strings using regex and then compare
    const str1WithoutSuffix = file_path.replace(suffixPattern, '');
    const str2WithoutSuffix = string_path.replace(suffixPattern, '');
    return str1WithoutSuffix === str2WithoutSuffix;
  };

  /* Show time as "seconds ago", "1 minute ago", "3 minutes ago" "1 hour ago" etc. */
  const timeSince = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return interval + " year" + (interval > 1 ? "s" : "") + " ago";
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return interval + " month" + (interval > 1 ? "s" : "") + " ago";
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return interval + " day" + (interval > 1 ? "s" : "") + " ago";
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return interval + " hour" + (interval > 1 ? "s" : "") + " ago";
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return interval + " minute" + (interval > 1 ? "s" : "") + " ago";
    return "seconds ago";
  }

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
      openFile(newPath);
    }).catch((err) => {
      console.log(err);
    })
  }

  const openFile = (path: string) => {
    const completePath = 'http://localhost:3000/notebooks/' + path;
    window.open(completePath, '_blank');
    // wait for the session to be created before refreshing the page
    setTimeout(() => { getContentsFromPath() }, 1000);
  }

  const shutdownSessions = async (file: Content) => {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    file.sessions?.forEach(async (session_id: string) => {
      await axios.delete(`http://localhost:8888/api/sessions/${session_id}`);
    })
    // wait for the sessions to be shut down before refreshing the page
    setTimeout(() => { getContentsFromPath() }, 1000);
    console.log('Sessions shut down');
  }

  if (showError) return <Error errorCode={404} errorMessage="Oops! The page you requested could not be found." />
  else return (
    <div className="FileExplorer">
      <div className="row mb-3 mx-0">
        {/* If path is empty, display root directory */}
        {path === '' && <h3 className="col-sm-11 mb-0 px-0">Root Directory</h3>}
        {/* If path is not empty, display path */}
        {path !== '' && <h3 className="col-sm-11 mb-0 px-0">{path}</h3>}
        {/* Add a button to create a new notebook in the current directory */}
        <button className="btn btn-sm btn-outline-primary col-sm-1" onClick={() => createNotebook()}><FontAwesomeIcon icon={faFileCirclePlus} /> Notebook</button>
      </div>
      {/* For each file in files, display then in a table containing name, last_modified and size */}
      <Table bordered hover>
        <thead>
          <tr>
            <th className="col-md-7" scope="col">Name</th>
            <th className="col-md-2" scope="col">Status</th>
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
                {/* If file contains sessions, display an X */}
                <td>
                  <div className="running">
                    {file.sessions && 'Running - '}
                    {/* TODO: While shutting down, disable the button */}
                    {file.sessions && <Button className="no-y-padding" variant="outline-danger" size="sm" onClick={async () => shutdownSessions(file)}>Shutdown</Button>}
                  </div>
                </td>
                <td>{file.last_modified && timeSince(new Date(file.last_modified))}</td>
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