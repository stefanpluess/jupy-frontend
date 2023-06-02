import { BrowserRouter, Route, Routes } from 'react-router-dom'
import React, { Fragment } from 'react'
import Home from '../../views/Home'
import Flow from '../../views/HomeViewFlow'
import About from '../../views/About'

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route exact path="/" element={<Flow/>} />
        <Route exact path="/oldHome" element={<Home/>} />
        <Route path="/about" element={<About/>} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter