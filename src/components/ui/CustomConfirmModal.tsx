import React from "react";
import { Modal, Button } from "react-bootstrap";

type CustomConfirmModalProps = {
  title: string;
  message: string;
  show: boolean;
  onHide: () => void;
  onConfirm: () => void;
  confirmText: string;
};

function CustomConfirmModal({ title, message, show, onHide, onConfirm, confirmText }: CustomConfirmModalProps) {
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
        <Button variant="danger" onClick={onConfirm}>
          {confirmText}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default CustomConfirmModal;