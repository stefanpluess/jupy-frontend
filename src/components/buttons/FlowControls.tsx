import React, { useState } from 'react';
import { 
    useReactFlow,
    ControlButton,
    Controls
} from 'reactflow';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faExpand,
    faLock,
    faLockOpen,
    faMagnifyingGlassMinus,
    faMagnifyingGlassPlus,
  } from "@fortawesome/free-solid-svg-icons";
  import useSettingsStore from "../../helpers/settingsStore";

const FlowControls = () => {
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const isInteractive = useSettingsStore((state) => state.isInteractive);
  const setIsInteractive = useSettingsStore((state) => state.setIsInteractive);

  return (
    <Controls
        showFitView={false}
        showZoom={false}
        showInteractive={false}
        position="bottom-right"
    >
        <ControlButton
            onClick={() => zoomIn({duration: 200})}
            title="Zoom In"
            className="controls-button"
        >
            <FontAwesomeIcon icon={faMagnifyingGlassPlus} />
        </ControlButton>

        <ControlButton
            onClick={() => zoomOut({duration: 200})}
            title="Zoom Out"
            className="controls-button"
        >
            <FontAwesomeIcon icon={faMagnifyingGlassMinus} />
        </ControlButton>

        <ControlButton
            onClick={() => fitView({ padding: 0.1, duration: 400 })}
            title="Fit View"
            className="controls-button"
        >
            <FontAwesomeIcon icon={faExpand} />
        </ControlButton>

        <ControlButton
            onClick={() => setIsInteractive()}
            title="Set Interactive"
            className="controls-button"
        >
            <FontAwesomeIcon icon={isInteractive ? faLockOpen : faLock} />
        </ControlButton>
    </Controls>
  );
};

export default FlowControls;