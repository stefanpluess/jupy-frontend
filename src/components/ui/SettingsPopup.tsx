//COMMENT :: Styles
import { Button, Modal, Row, Col, Container, Dropdown } from "react-bootstrap";
import "../../styles/ui/canvas.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGear, faToggleOff, faToggleOn } from "@fortawesome/free-solid-svg-icons";
import useSettingsStore from "../../helpers/settingsStore";
import { INSERTION_ORDER, TOP_DOWN_ORDER } from "../../config/constants";

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

	// INFO :: Order settings
	const runAllOrderSetting = useSettingsStore((state) => state.runAllOrder);
	const setRunAllOrderSetting = useSettingsStore((state) => state.setRunAllOrder);
	const exportOrderSetting = useSettingsStore((state) => state.exportOrder);
	const setExportOrderSetting = useSettingsStore((state) => state.setExportOrder);
	const handleRunAllSelect = (eventKey: string | null) => {
		if (eventKey) setRunAllOrderSetting(eventKey);
	}
	const handleExportSelect = (eventKey: string | null) => {
		if (eventKey) setExportOrderSetting(eventKey);
	}
	// INFO :: grid settings
	const snapGridSetting = useSettingsStore((state) => state.snapGrid);
	const setSnapGrid = useSettingsStore((state) => state.setSnapGrid);
	const changeSnapGrid = () => setSnapGrid(!snapGridSetting);

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
					{/* Create a button to enable the snap to grid */}
					{/* INFO :: Snap to grid setting */}
					<Row>
						<Col md={10}>
							<strong>Snap to Grid</strong><br />
							<p style={{fontSize: 'smaller'}}>
								When dragging a cell, it will snap to the grid.
							</p>
						</Col>
						<Col md={2}>
							<label className="switch">
								<input
								type="checkbox"
								checked={snapGridSetting}
								onChange={changeSnapGrid}
								/>
								<span className="slider"></span>
							</label>
						</Col>
					</Row>
					<Row>
						<Col md={10}>
							<strong>Auto Expand</strong><br />
							<p style={{fontSize: 'smaller'}}>
								When dragging the code- or markdown-cells to the border of its 
								parent cell, it will automatically expand.
							</p>
						</Col>
						<Col md={2}>
							<label className="switch">
								<input
								type="checkbox"
								checked={expandParentSetting}
								onChange={changeExpandParent}
								/>
								<span className="slider"></span>
							</label>
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
							<label className="switch">
								<input
								type="checkbox"
								checked={floatingEdgesSetting}
								onChange={changeFloatingEdges}
								/>
								<span className="slider"></span>
							</label>
						</Col>
					</Row>
					<Row>
						<Col md={10}>
							<strong>Run All-Order</strong><br />
							<p style={{fontSize: 'smaller'}}>
								Decide on the order of cell execution when running all cells.
							</p>
						</Col>
						<Col md={2}>
							<Dropdown onSelect={handleRunAllSelect}>
								<Dropdown.Toggle variant="success" id="dropdown-basic" size="sm">
									{runAllOrderSetting}
								</Dropdown.Toggle>
								<Dropdown.Menu>
									<Dropdown.Item eventKey={INSERTION_ORDER}>{INSERTION_ORDER}</Dropdown.Item>
									<Dropdown.Item eventKey={TOP_DOWN_ORDER}>{TOP_DOWN_ORDER}</Dropdown.Item>
								</Dropdown.Menu>
							</Dropdown>
						</Col>
					</Row>
					<Row>
						<Col md={10}>
							<strong>Export-Order</strong><br />
							<p style={{fontSize: 'smaller'}}>
								Decide on the order in which the cells are exported to a traditional notebook.
							</p>
						</Col>
						<Col md={2}>
							<Dropdown onSelect={handleExportSelect}>
								<Dropdown.Toggle variant="success" id="dropdown-basic" size="sm">
									{exportOrderSetting}
								</Dropdown.Toggle>
								<Dropdown.Menu>
									<Dropdown.Item eventKey={INSERTION_ORDER}>{INSERTION_ORDER}</Dropdown.Item>
									<Dropdown.Item eventKey={TOP_DOWN_ORDER}>{TOP_DOWN_ORDER}</Dropdown.Item>
								</Dropdown.Menu>
							</Dropdown>
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