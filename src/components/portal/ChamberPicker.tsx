'use client'

import { FieldDescription, FieldError, FieldLabel, useField } from '@payloadcms/ui'
import type { SelectFieldClientComponent } from 'payload'

import { CHAMBERS, type Chamber } from '@/lib/themes'

// Choosing a legislator site's template: Senate (red) or House of Representatives (green),
// shown as two cards with a small preview of each theme.
export const ChamberPicker: SelectFieldClientComponent = ({ field, path: pathProp, readOnly }) => {
  const path = pathProp ?? field.name
  const { value, setValue, showError, errorMessage } = useField<string>({ path })
  const disabled = readOnly || field.admin?.readOnly

  return (
    <div className={`field-type cq-chamber${showError ? ' error' : ''}`}>
      <FieldLabel label={field.label} required={field.required} path={path} />
      <FieldError path={path} showError={showError} message={errorMessage} />
      <div className="cq-chamber__options" role="radiogroup" aria-label="Template">
        {(Object.keys(CHAMBERS) as Chamber[]).map((key) => {
          const t = CHAMBERS[key]
          const selected = value === key
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              className={`cq-chamber__card${selected ? ' is-selected' : ''}`}
              onClick={() => setValue(key)}
            >
              <span className="cq-chamber__preview" aria-hidden="true" style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${t.brand} 62%, #000), ${t.brand})` }}>
                <span className="cq-chamber__bar" style={{ background: t.accent }} />
                <span className="cq-chamber__line" />
                <span className="cq-chamber__line cq-chamber__line--short" />
                <span className="cq-chamber__btn" style={{ background: t.accent }} />
              </span>
              <span className="cq-chamber__text">
                <b>{t.label}</b>
                <span>{key === 'senate' ? 'Red theme' : 'Green theme'}</span>
              </span>
              {selected && <span className="cq-chamber__tick" aria-hidden="true">✓</span>}
            </button>
          )
        })}
      </div>
      <FieldDescription path={path} description={field.admin?.description} />
    </div>
  )
}
