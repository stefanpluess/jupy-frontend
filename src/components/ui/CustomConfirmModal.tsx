import { useState } from "react";
import { Modal, Button } from "react-bootstrap";
import Spinner from 'react-bootstrap/Spinner';

type CustomConfirmModalProps = {
  title: string;
  message: string;
  show: boolean;
  onHide: () => void;
  onConfirm: () => void;
  confirmText: string;
};

function CustomConfirmModal({ title, message, show, onHide, onConfirm, confirmText }: CustomConfirmModalProps) {

  const [confirmDisabled, setConfirmDisabled] = useState(false);

  const handleConfirmClick = async () => {
    setConfirmDisabled(true);
    await onConfirm();
    // wait for 100ms to prevent double click
    await new Promise(r => setTimeout(r, 100));
    setConfirmDisabled(false);
  };

  return (
    <Modal title={title} message={message} show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{message}</Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Continue Running
        </Button>
        {!confirmDisabled ? 
        <Button variant="danger" onClick={handleConfirmClick} disabled={confirmDisabled}>
          {confirmText}
        </Button> :
        <Button variant="danger" disabled>
          <Spinner
            as="span"
            animation="border"
            size="sm"
            role="status"
            aria-hidden="true"
          />
        </Button>
        }
      </Modal.Footer>
    </Modal>
  );
}

export default CustomConfirmModal;