// src/PrivateRoute.js
import React, { useEffect } from 'react';
import { useKeycloak } from '@react-keycloak/web';
import { useLocation } from 'react-router-dom';

const PrivateRoute = ({ children }) => {
  const { keycloak } = useKeycloak();
  const location = useLocation();

  useEffect(() => {
    if (!keycloak.authenticated) {
      keycloak.login();
    }
  }, [keycloak]);

  if (!keycloak.authenticated) {
    return <div>Loading authentication...</div>;
  }

  return children;
};

export default PrivateRoute;
