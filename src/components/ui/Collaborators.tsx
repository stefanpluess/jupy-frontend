import { ListGroup, Modal } from "react-bootstrap";
import { useUpdateWebSocket} from "../../helpers/websocket/updateWebSocket";
import { user } from "../../helpers/websocket/updateWebSocketStore";


interface CollaboratorsProps {
    show: boolean;
    handleClose: () => void;
    userPositions : Record<string, Record<string, user>>;
}

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