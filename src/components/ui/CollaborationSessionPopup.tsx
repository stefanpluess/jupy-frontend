import {Button, Modal, Form} from "react-bootstrap";
import React, {useState} from 'react';
import { useUpdateWebSocket } from "../../helpers/websocket/updateWebSocket";
import usePath from "../../helpers/hooks/usePath";
import useWebSocketStore from "../../helpers/websocket/webSocketStore";
import "../../styles/ui/canvas.scss";
import { useUpdateWebSocketStore } from "../../helpers/websocket/updateWebSocketStore";

interface CollaborationSessionPopupProps {
    show: boolean;
    handleClose: () => void;
}

const CollaborationSessionPopup: React.FC<CollaborationSessionPopupProps> = ({show, handleClose}) => {
    const [inputValue, setInputValue] = useState('');
    const {startWebsocket} = useUpdateWebSocket();
    const {isWebSocketSet} = useUpdateWebSocketStore();
    const path = usePath();
    const token = useWebSocketStore((state) => state.token)
    const handleOpenModal = () => {

    }

    const handleSubmit = (inputValue: string) => {
        handleClose();
        startWebsocket(path, token, inputValue);
        setInputValue('');
    }
    return (
        <Modal show={show} onHide={handleClose}>
            <Modal.Header closeButton>
                <Modal.Title>Create Collaboration Session!</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form>
                    <Form.Group controlId="formBasicInput">
                        <Form.Label>Please enter your Username</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="Enter Username here!"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            autoFocus
                        />
                    </Form.Group>
                </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>Close</Button>
                <Button variant="success" onClick={() => handleSubmit(inputValue)} disabled={!inputValue}>Submit</Button>
            </Modal.Footer>
        </Modal>
    )    
}
export default CollaborationSessionPopup;