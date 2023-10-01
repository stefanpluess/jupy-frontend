import Modal from 'react-bootstrap/Modal';
import Spinner from 'react-bootstrap/Spinner';

type CustomInformationModalProps = {
    show: boolean;
    text: string;
};

/**
 * A Custom Information Modal that tells the user that some action is being
 * performed. Used in the GroupNode component (branching out)
 * @param show a boolean that determines whether the modal is shown or not
 * @param text the text to be displayed in the modal
 * @constructor
 * @return {JSX.Element}
 */
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