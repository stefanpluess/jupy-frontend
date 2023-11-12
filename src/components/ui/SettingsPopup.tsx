//COMMENT :: Styles
import { Button, Modal, Row, Col, Container } from "react-bootstrap";
import "../../styles/ui/canvas.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGear, faToggleOff, faToggleOn } from "@fortawesome/free-solid-svg-icons";
import useSettingsStore from "../../helpers/settingsStore";

type SettingsPopupProps = {
    show: boolean;
    onClose: () => void;
};

const SettingsPopup = ({ show, onClose }: SettingsPopupProps) => {

	// INFO :: Expand parent setting
	const expandParentSetting = useSettingsStore((state) => state.expandParent);
  const setExpandParentSetting = useSettingsStore((state) => state.setExpandParent);
	const changeExpandParent = () => setExpandParentSetting(!expandParentSetting);

	// INFO :: Floating edges setting
	const floatingEdgesSetting = useSettingsStore((state) => state.floatingEdges);
	const setFloatingEdgesSetting = useSettingsStore((state) => state.setFloatingEdges);
	const changeFloatingEdges = () => setFloatingEdgesSetting(!floatingEdgesSetting);

	return (
		<Modal
			show={show}
			onHide={onClose}
			//backdrop="static"
			centered
			size="lg"
		>
			<Modal.Header closeButton>
				<Modal.Title>
					<FontAwesomeIcon icon={faGear} /> Settings 
				</Modal.Title>
			</Modal.Header>
			<Modal.Body>
				<p>Changes in the settings are applied immediately.</p>
				{/* Add your settings content here */}
				<Container>
					<Row>
						<Col md={10}>
							<strong>Auto Expand</strong><br />
							<p style={{fontSize: 'smaller'}}>
								When dragging the code- or markdown-cells to the border of its 
								parent cell, it will automatically expand.
							</p>
						</Col>
						<Col md={2}>
							<button 
								className={expandParentSetting ? "settingSliderOn" : "settingSliderOff"}
								onClick={changeExpandParent}
							>
								<FontAwesomeIcon icon={expandParentSetting ? faToggleOn : faToggleOff} />
							</button>
						</Col>
					</Row>
					<Row>
						<Col md={10}>
							<strong>Floating Edges</strong><br />
							<p style={{fontSize: 'smaller'}}>
								The edges between the code cells and their output cells are 
								moving around the cells freely and are not fixed in place.
							</p>
						</Col>
						<Col md={2}>
							<button
								className={floatingEdgesSetting ? "settingSliderOn" : "settingSliderOff"}
								onClick={changeFloatingEdges}
							>
								<FontAwesomeIcon icon={floatingEdgesSetting ? faToggleOn : faToggleOff} />
							</button>
						</Col>
					</Row>
				</Container>
			</Modal.Body>
			<Modal.Footer>
				<Button variant="success" onClick={onClose}>
					Done
				</Button>
			</Modal.Footer>
		</Modal>
	);
};

export default SettingsPopup;