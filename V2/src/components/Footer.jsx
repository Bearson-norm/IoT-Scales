import React from 'react'
import useBranding from '../hooks/useBranding'

const Footer = ({ currentTime }) => {
  const { companyName } = useBranding()

  return (
    <div className="footer">
      <div className="version">v1.7.0</div>
      <div className="time">{currentTime}</div>
      <div className="company">{companyName}</div>
    </div>
  )
}

export default Footer

