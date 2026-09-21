export function Field({ label, required, error, hint, children, htmlFor }) {
  return (
    <label className={`field${error ? ' field--error' : ''}`} htmlFor={htmlFor}>
      <span className="field__label">
        {label}
        {required ? <em>*</em> : null}
      </span>
      {children}
      {error ? <span className="field__error">{error}</span> : null}
      {!error && hint ? <span className="field__hint">{hint}</span> : null}
    </label>
  );
}

export function TextInput({ value, onChange, ...rest }) {
  return (
    <input
      className="input"
      value={value ?? ''}
      onChange={(event) => onChange?.(event.target.value, event)}
      {...rest}
    />
  );
}

export function TextArea({ value, onChange, rows = 4, ...rest }) {
  return (
    <textarea
      className="input input--area"
      rows={rows}
      value={value ?? ''}
      onChange={(event) => onChange?.(event.target.value, event)}
      {...rest}
    />
  );
}

export function Select({ value, onChange, options = [], placeholder, ...rest }) {
  return (
    <select
      className="input"
      value={value ?? ''}
      onChange={(event) => onChange?.(event.target.value, event)}
      {...rest}
    >
      {placeholder ? <option value="">{placeholder}</option> : null}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
