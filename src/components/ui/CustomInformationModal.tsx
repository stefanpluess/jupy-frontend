import Modal from 'react-bootstrap/Modal';
import Spinner from 'react-bootstrap/Spinner';

type CustomInformationModalProps = {
    show: boolean;
    text: string;
};

const CustomInformationModal = ({ show, text }: CustomInformationModalProps) => {
  return (
    <Modal show={show} backdrop="static" keyboard={false} centered>
      <Modal.Body>
        <div className="text-center">
          <Spinner animation="border" role="status" variant="secondary" />
          <p style={{fontSize: "larger"}}>{text}</p>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default CustomInformationModal;