import { useState } from "react";
import { Modal, Button } from "react-bootstrap";
import Spinner from 'react-bootstrap/Spinner';

type CustomConfirmModalProps = {
  title: string;
  message: string;
  show: boolean;
  denyText?: string;
  onHide: () => void;
  onConfirm: () => void;
  confirmText: string;
  onConfirm2?: () => void;
  confirmText2?: string;
};

function CustomConfirmModal({
  title,
  message,
  show,
  denyText = "Continue Running",
  onHide,
  onConfirm,
  confirmText,
  onConfirm2,
  confirmText2,
}: CustomConfirmModalProps) {
  const [confirmDisabled, setConfirmDisabled] = useState(false);
  const [confirm2Disabled, setConfirm2Disabled] = useState(false);

  const handleConfirmClick = async () => {
    setConfirmDisabled(true);
    await onConfirm();
    // wait for 300ms to prevent double click
    await new Promise((r) => setTimeout(r, 300));
    setConfirmDisabled(false);
  };

  const handleConfirm2Click = async () => {
    setConfirm2Disabled(true);
    await onConfirm2!();
    // wait for 300ms to prevent double click
    await new Promise((r) => setTimeout(r, 300));
    setConfirm2Disabled(false);
  };

  return (
    <Modal title={title} message={message} show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{message}</Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={confirmDisabled || confirm2Disabled}>
          {denyText}
        </Button>
        {!confirmDisabled ? (
          <Button variant="danger" onClick={handleConfirmClick} disabled={confirm2Disabled}>
            {confirmText}
          </Button>
        ) : (
          <Button variant="danger" disabled>
            <Spinner
              as="span"
              animation="border"
              size="sm"
              role="status"
              aria-hidden="true"
            />
          </Button>
        )}
        {confirmText2 && !confirm2Disabled ? (
          <Button variant="danger" onClick={handleConfirm2Click} disabled={confirmDisabled}>
            {confirmText2}
          </Button>
        ) : confirmText2 && (
          <Button variant="danger" disabled>
            <Spinner
              as="span"
              animation="border"
              size="sm"
              role="status"
              aria-hidden="true"
            />
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
}

export default CustomConfirmModal;
