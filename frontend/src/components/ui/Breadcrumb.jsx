import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function Breadcrumb({ items }) {
  const navigate = useNavigate()

  return (
    <nav className="breadcrumb-nav" aria-label="Breadcrumb">
      {items.map((item, index) => (
        <React.Fragment key={`${item.label}-${index}`}>
          {index > 0 && <span aria-hidden="true">/</span>}
          {item.active ? (
            <span className="breadcrumb-active">{item.label}</span>
          ) : (
            <span className="breadcrumb-item" onClick={() => navigate(item.href)}>
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}
