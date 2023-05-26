import React, { useState, useEffect } from 'react'
import interact from 'interactjs'
import '../../styles/ui/Cell.css'
import { Row, Button, Col, Container } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlay, faTrash } from '@fortawesome/free-solid-svg-icons';
import { v4 as uuidv4 } from 'uuid';

const Cell = props => {

    const [text, setText] = useState(props.text);
    const id = props.id;
    const execCountByCellId = props.execCountByCellId;
    

    interact('.draggable')
    .draggable({
        // enable inertial throwing
        inertia: true,
        // keep the element within the area of it's parent
        modifiers: [
        interact.modifiers.restrictRect({
            restriction: 'parent',
            endOnly: true
        })
        ],
        // enable autoScroll
        autoScroll: true,

        listeners: {
            // call this function on every dragmove event
            move: dragMoveListener,

            // call this function on every dragend event
            end (event) {
                var textEl = event.target.querySelector('p')

                textEl && (textEl.textContent =
                'moved a distance of ' +
                (Math.sqrt(Math.pow(event.pageX - event.x0, 2) +
                            Math.pow(event.pageY - event.y0, 2) | 0))
                    .toFixed(2) + 'px')
            }
        }
    })
    // .resizable({
    //     // Enable resizing from all edges/corners
    //     edges: { left: true, right: true, bottom: true, top: true }
    // })
    // .on('resizemove', function (event) {
    //     var target = event.target;
    //     var x = parseFloat(target.getAttribute('data-x')) || 0;
    //     var y = parseFloat(target.getAttribute('data-y')) || 0;

    //     // Update the width and height based on the resizing event
    //     target.style.width = event.rect.width + 'px';
    //     target.style.height = event.rect.height + 'px';

    //     // Translate the element
    //     target.style.transform = 'translate(' + (x + event.deltaRect.left) + 'px, ' + (y + event.deltaRect.top) + 'px)';

    //     // Update the position attributes
    //     target.setAttribute('data-x', x + event.deltaRect.left);
    //     target.setAttribute('data-y', y + event.deltaRect.top);
    // });


    function dragMoveListener (event) {
        var target = event.target

        // Check if any descendant element is selected or focused
        var descendants = target.querySelectorAll('*');
        for (var i = 0; i < descendants.length; i++) {
            if (document.activeElement === descendants[i] || descendants[i].matches(':focus')) {
            return; // Exit the function if any descendant is selected or focused
            }
        }

        // keep the dragged position in the data-x/data-y attributes
        var x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx
        var y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy

        // translate the element
        target.style.transform = 'translate(' + x + 'px, ' + y + 'px)'

        // update the posiion attributes
        target.setAttribute('data-x', x)
        target.setAttribute('data-y', y)
    }

    // this function is used later in the resizing and gesture demos
    // window.dragMoveListener = dragMoveListener

    const runCode = () => {
        var msg_id = uuidv4();
        props.execute(text, msg_id, id);
    }

    return (
        <div className="draggable">
            <Container>
                <Row>
                    <div className="col-md-12">
                        <textarea className="textarea col-md-12 mt-3" value={text} onChange={(e) => setText(e.target.value)} />
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
            {execCountByCellId.map((item, index) => {
                if (item.id === id) {
                    return <div key={index}>{item.executionCount}</div>
                }
            })}
        </div>
    )

}

export default Cell;
