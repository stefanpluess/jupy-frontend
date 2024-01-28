type ToggleSwitchProps = {
    checked: boolean;
    onChange: () => void;
};

const ToggleSwitch = ({ checked, onChange }: ToggleSwitchProps) => {
    return (
        <label className="switch">
            <input
                type="checkbox"
                checked={checked}
                onChange={onChange}
            />
            <span className="slider"></span>
        </label>
    );
};

export default ToggleSwitch;