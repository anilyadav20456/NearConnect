import "./RadiusSelector.css";

export default function RadiusSelector({
  radius,
  setRadius,
}) {
  const options = [1, 2, 4];

  return (
    <div className="radius-selector">

      <div className="radius-options">

        {options.map((value) => (
          <button
            key={value}
            type="button"
            className={
              radius === value
                ? "radius-option active"
                : "radius-option"
            }
            onClick={() => setRadius(value)}
          >
            <span className="radius-number">
              {value}
            </span>

            <span className="radius-unit">
              km
            </span>
          </button>
        ))}

      </div>

      <div className="radius-scale">

        <span>Nearby</span>

        <div className="radius-line">

          <div
            className="radius-progress"
            style={{
              width: `${
                ((options.indexOf(radius) + 1) /
                  options.length) *
                100
              }%`,
            }}
          />

          {options.map((value) => (
            <span
              key={value}
              className={
                radius === value
                  ? "radius-dot active"
                  : "radius-dot"
              }
            />
          ))}

        </div>

        <span>Wider area</span>

      </div>

    </div>
  );
}