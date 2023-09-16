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
  onConfirm3?: () => void;
  confirmText3?: string;
  variants?: string[];
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
  onConfirm3,
  confirmText3,
  variants = ["danger", "danger", "danger"],
}: CustomConfirmModalProps) {
  const [confirmDisabled, setConfirmDisabled] = useState(false);
  const [confirm2Disabled, setConfirm2Disabled] = useState(false);
  const [confirm3Disabled, setConfirm3Disabled] = useState(false);

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

  const handleConfirm3Click = async () => {
    setConfirm3Disabled(true);
    await onConfirm3!();
    // wait for 300ms to prevent double click
    await new Promise((r) => setTimeout(r, 300));
    setConfirm3Disabled(false);
  }

  return (
    <Modal title={title} message={message} show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{message}</Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={confirmDisabled || confirm2Disabled || confirm3Disabled}>
          {denyText}
        </Button>
        {!confirmDisabled ? (
          <Button variant={variants[0]} onClick={handleConfirmClick} disabled={confirm2Disabled || confirm3Disabled}>
            {confirmText}
          </Button>
        ) : (
          <Button variant={variants[0]} disabled>
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
          <Button variant={variants[1]} onClick={handleConfirm2Click} disabled={confirmDisabled || confirm3Disabled}>
            {confirmText2}
          </Button>
        ) : confirmText2 && (
          <Button variant={variants[1]} disabled>
            <Spinner
              as="span"
              animation="border"
              size="sm"
              role="status"
              aria-hidden="true"
            />
          </Button>
        )}
        {confirmText3 && !confirm3Disabled ? (
          <Button variant={variants[2]} onClick={handleConfirm3Click} disabled={confirmDisabled || confirm2Disabled}>
            {confirmText3}
          </Button>
        ) : confirmText3 && (
          <Button variant={variants[2]} disabled>
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
