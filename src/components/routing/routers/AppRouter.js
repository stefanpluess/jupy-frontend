import { BrowserRouter, Route, Routes } from 'react-router-dom'
import React, { Fragment } from 'react'
import Flow from '../../views/Home'

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route exact path="/" element={<Flow/>} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter