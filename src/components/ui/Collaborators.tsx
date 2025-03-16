import { ListGroup, Modal } from "react-bootstrap";
import { useUpdateWebSocket} from "../../helpers/hooks/useUpdateWebSocket";
import { user } from "../../helpers/websocket/updateWebSocketStore";


interface CollaboratorsProps {
    show: boolean;
    handleClose: () => void;
    userPositions : Record<string, Record<string, user>>;
}
//INFO : This component shows a list of the users that are currently in the collaboration session
const Collaborators: React.FC<CollaboratorsProps> = ({show, handleClose, userPositions}) => {
    const allClients: user[] = []
    for (const nodeId in userPositions) {
        const clients = userPositions[nodeId];
        for (const clientId in clients) {
            allClients.push(clients[clientId]);
        }
    }
    return (
        <Modal show={show} onHide={handleClose}>
            <Modal.Header closeButton>
                <Modal.Title>Users in Collaboration Session</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <ul className='collaborator-list'>
                    <li key='You' style = {{display: "flex", alignItems: "center", marginBottom: "10px"}}>
                        <div style = {{width:"20px", height: "20px", borderRadius: "50%", backgroundColor:'white', marginRight: "10px"}}></div><span>You</span>
                    </li>
                    { allClients.map((user) => (
                        <li key={user.client_id} style ={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
                            <div style ={{
                                width: "20px",
                                height: "20px",
                                borderRadius: "50%",
                                backgroundColor: user.colorCode,
                                marginRight: "10px",
                            }}
                            />
                            <span>{user.clientName}</span>
                        </li>
                    ))}
                </ul>
            </Modal.Body>
        </Modal>
    )
};
export default Collaborators;