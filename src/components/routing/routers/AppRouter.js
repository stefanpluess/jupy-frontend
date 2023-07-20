import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import React, { Fragment } from 'react'
import Flow from '../../views/Home'
import FileExplorer from '../../views/FileExplorer'
import Error from '../../views/Error'

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/tree/*" element={<FileExplorer/>} />
        <Route path="/notebooks/*" element={<Flow/>} />
        <Route exact path="/notfound" element={<Error errorCode={404} errorMessage="Oops! The page you requested could not be found." />} />
        <Route path="/" element={<Navigate to="/tree" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter