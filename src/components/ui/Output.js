import React, { useState, useEffect } from 'react'
import interact from 'interactjs'
import '../../styles/ui/Output.css'
import { Row, Button, Col, Container } from 'react-bootstrap';

const Output = props => {
    
    const id = props.id;
    const execOutputByCellId = props.execOutputByCellId;


    interact('.draggableOutput')
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
    

    let content = <div></div>
    // check if execOutputByCellId has an output for this cell
    execOutputByCellId.map((item, index) => {
        if (item.id === id) {
            content = (
                <div className="draggableOutput">
                    <Container>
                        <Row>
                            <div className="col-md-12">
                                <div key={index}>{item.output}</div>
                            </div>
                        </Row>
                    </Container>
                </div>
            )
        }
    })

    return (content)

}

export default Output;
