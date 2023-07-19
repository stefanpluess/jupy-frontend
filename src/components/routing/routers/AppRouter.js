import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import React, { Fragment } from 'react'
import Flow from '../../views/Home'
import FileExplorer from '../../views/FileExplorer'
import Error from '../../views/Error'

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route exact path="/notfound" element={<Error errorCode={404} errorMessage="Oops! The page you requested could not be found." />} />
        <Route path="/" element={<Navigate to="/tree" />} />
        <Route path="/tree/*" element={<FileExplorer/>} />
        <Route exact path="/flow" element={<Flow/>} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter