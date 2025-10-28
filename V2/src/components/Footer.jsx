import React from 'react'

const Footer = ({ currentTime }) => {
  return (
    <div className="footer">
      <div className="version">v1.7.0</div>
      <div className="time">{currentTime}</div>
      <div className="company">PRESISITECH</div>
    </div>
  )
}

export default Footer

