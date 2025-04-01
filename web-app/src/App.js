// src/App.js
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './Header';
import HomePage from './HomePage';
import ApplicationCreatePage from './ApplicationCreatePage';
import GenerateCertificatePage from './GenerateCertificatePage';
import CreateCatalogPage from './CreateCatalogPage';
import PrivateRoute from './PrivateRoute';

const App = () => {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route 
          path="/application-create" 
          element={
            <PrivateRoute>
              <ApplicationCreatePage />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/generate-certificate" 
          element={
            <PrivateRoute>
              <GenerateCertificatePage />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/create-catalog" 
          element={
            <PrivateRoute>
              <CreateCatalogPage />
            </PrivateRoute>
          } 
        />
      </Routes>
    </>
  );
};

export default App;
