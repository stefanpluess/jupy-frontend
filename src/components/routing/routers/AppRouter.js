import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import React, { Fragment } from 'react'
import Flow from '../../views/Home'
import FileExplorer from '../../views/FileExplorer'

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/tree" />} />
        <Route path="/tree/*" element={<FileExplorer/>} />
        <Route exact path="/flow" element={<Flow/>} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter