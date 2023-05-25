
import React, {useState} from 'react'
import { Row, Button, Col, Container } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlay, faTrash } from '@fortawesome/free-solid-svg-icons';
import Draggable from 'react-draggable';

const Draggable1 = props => {

    const [text, setText] = useState(props.text);

    const runCode = () => {
        console.log(text);
    }

    return (
        <Draggable className="draggable1">
            <Container>
                <Row>
                    <div className="col-md-12">
                        <textarea className="textarea" value={text} onChange={(e) => setText(e.target.value)} />
                    </div>
                    <div className="col-md-12">
                        <Button variant="primary" size="sm" className="mb-2 mx-1" onClick={() => setText('')}>
                            <FontAwesomeIcon icon={faTrash} />
                        </Button>
                        <Button variant="primary" size="sm" className="mb-2 mx-1" onClick={runCode}>
                            <FontAwesomeIcon icon={faPlay} />
                        </Button>
                    </div>
                </Row>
            </Container>
        </Draggable>
    )

}

export default Draggable1