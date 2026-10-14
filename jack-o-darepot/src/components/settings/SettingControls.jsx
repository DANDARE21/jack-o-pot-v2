import React from "react";

export function SettingSection({ title, icon, description, children }) {
  return (
    <div className="setting-section">
      <div className="setting-section-header">
        <div className="setting-section-title-wrap">
          {icon && <span className="setting-section-icon">{icon}</span>}
          <h3 className="setting-section-title">{title}</h3>
        </div>
        {description && <p className="setting-section-desc">{description}</p>}
      </div>
      <div className="setting-section-body">{children}</div>
    </div>
  );
}

export function SettingRow({ title, description, badge, children }) {
  return (
    <div className="setting-row">
      <div className="setting-row-info">
        <div className="setting-row-title-wrap">
          <span className="setting-row-title">{title}</span>
          {badge && <span className="setting-badge">{badge}</span>}
        </div>
        {description && <span className="setting-row-desc">{description}</span>}
      </div>
      <div className="setting-row-control">{children}</div>
    </div>
  );
}

export function SettingToggle({ checked, onChange, disabled }) {
  return (
    <label className={`setting-switch ${disabled ? "disabled" : ""}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
        disabled={disabled}
      />
      <span className="setting-switch-slider" />
    </label>
  );
}

export function SettingSlider({
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = "%",
  onChange,
  disabled,
}) {
  return (
    <div className="setting-slider-wrap">
      <input
        type="range"
        className="setting-range-slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange?.(Number(e.target.value))}
        disabled={disabled}
      />
      <span className="setting-slider-val">
        {value}
        {unit}
      </span>
    </div>
  );
}

export function SettingSelect({ value, options = [], onChange, disabled }) {
  return (
    <div className="setting-select-wrap">
      <select
        className="setting-select"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function SettingButton({
  label,
  icon,
  onClick,
  variant = "secondary",
  disabled,
}) {
  return (
    <button
      className={`setting-btn setting-btn-${variant}`}
      onClick={onClick}
      disabled={disabled}
    >
      {icon && <span className="setting-btn-icon">{icon}</span>}
      <span>{label}</span>
    </button>
  );
}
