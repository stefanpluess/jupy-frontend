import axios from "axios"
import { useEffect, useState } from "react"
import { useNavigate } from 'react-router-dom';
import { Content, Session } from "../../config/types";
import '../../styles/views/FileExplorer.scss';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFolder, faArrowLeft, faBook, faFileCirclePlus, faSortUp, faSortDown, faSort } from "@fortawesome/free-solid-svg-icons";
import Table from 'react-bootstrap/Table';
import Error from '../views/Error'
import { Button } from "react-bootstrap";
import { getSessions } from "../../helpers/utils";
import { useWebSocketStore } from "../../helpers/websocket";
import { usePath } from "../../helpers/hooks";
import { ID_LENGTH } from "../../config/constants";

export default function FileExplorer() {

  const navigate = useNavigate();
  const [contents, setContents] = useState<Content[]>([]);
  const path = usePath();
  const [showError, setShowError] = useState(false);
  const [sortColumn, setSortColumn] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<string>('desc');
  const [shuttingFiles, setShuttingFiles] = useState<string[]>([]);
  const token = useWebSocketStore((state) => state.token);


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

  /* useEffect to initially fetch the contents / sessions and setup polling */
  useEffect(() => {
    getContentsFromPath();
    const interval = setInterval(() => { getContentsFromPath() }, 10000);
    return () => clearInterval(interval);
  }, [path])

  const hasRunningSession = (file_path: string, session_path: string): boolean => {
    // Regular expression to match "_X" at the end of the string, where X is 'group_' followed by any 8 digit id (using numbers and lowercase letters)
    const suffixPattern = new RegExp(`_group_[a-z0-9]{${ID_LENGTH}}$`);
    // Remove the suffix "_X" from the strings using regex and then compare
    const filePathWithoutSuffix = file_path.replace(suffixPattern, '');
    const sessionPathWithoutSuffix = session_path.replace(suffixPattern, '');
    return filePathWithoutSuffix === sessionPathWithoutSuffix;
  };

  /* Show time as "seconds ago", "1 minute ago", "3 minutes ago", "1 hour ago" etc. */
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
    if (size < 1000000) return (size / 1000).toFixed(2) + ' KB';
    if (size < 1000000000) return (size / 1000000).toFixed(2) + ' MB';
    return (size / 1000000000).toFixed(2) + ' GB';
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
    setShuttingFiles([...shuttingFiles, file.path]);
    file.sessions?.forEach(async (session_id: string) => {
      await axios.delete(`http://localhost:8888/api/sessions/${session_id}`);
    })
    // wait for the sessions to be shut down before refreshing the page
    setTimeout(() => {
      getContentsFromPath();
      setShuttingFiles(shuttingFiles.filter((path: string) => path !== file.path));
    }, 1000);
    console.log('Sessions shut down');
  }

  // Sort function based on the current sort column and direction
  const sortFunction = (a: Content, b: Content) => {
    const columnA = a[sortColumn];
    const columnB = b[sortColumn];
    if (sortDirection === 'desc') {
      if (columnA === null) return 1;
      if (columnB === null) return -1;
      if (typeof columnA === 'string' && typeof columnB === 'string') return columnA.localeCompare(columnB);
      else return columnB < columnA ? -1 : 1;
    } else {
      if (columnA === null) return -1;
      if (columnB === null) return 1;
      if (typeof columnA === 'string' && typeof columnB === 'string') return columnB.localeCompare(columnA);
      else return columnA < columnB ? -1 : 1;
    }
  };

  // Function to handle header click and trigger sorting
  const handleSort = (column: string) => {
    if (column === sortColumn) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Icon to indicate sorting direction
  const sortIcon = (column: string) => {
    if (column === sortColumn) return sortDirection === "asc" ? (<FontAwesomeIcon icon={faSortUp} />) : (<FontAwesomeIcon icon={faSortDown} />);
    return <FontAwesomeIcon icon={faSort} />;
  };

  // Sort the contents based on the current sort column and direction
  const sortedContents = contents.sort(sortFunction);

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
      <Table bordered hover striped>
        <thead>
          <tr>
            <th className="col-md-7" scope="col">
              <button className="table-header clickable" onClick={() => handleSort("name")}>
                Name
                <span className="sort-icon">{sortIcon("name")}</span>
              </button>
            </th>
            <th className="col-md-2" scope="col">
              <button className="table-header clickable" onClick={() => handleSort("last_modified")}>
                Last Modified
                <span className="sort-icon">{sortIcon("last_modified")}</span>
              </button>
            </th>
            <th className="col-md-1" scope="col">
              <button className="table-header clickable" onClick={() => handleSort("size")}>
                Size
                <span className="sort-icon">{sortIcon("size")}</span>
              </button>
            </th>
            <th className="col-md-2" scope="col">
              <button className="table-header non-clickable">
                Status
              </button>
            </th>
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
          {sortedContents.map((file) => {
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
                <td>{file.last_modified && timeSince(new Date(file.last_modified))}</td>
                <td>{file.size && displayAsBytes(file.size)}</td>
                <td>
                  <div className="running">
                    {file.sessions && 'Running - '}
                    {file.sessions && <Button className="no-y-padding" variant="outline-danger" size="sm" disabled={shuttingFiles.includes(file.path)} onClick={async () => shutdownSessions(file)}>
                      {shuttingFiles.includes(file.path) ? 'Shutting...' : 'Shutdown'}
                    </Button>}
                  </div>
                </td>
              </tr>
            )
          }
          )}
        </tbody>
      </Table>
    </div>
  )
}