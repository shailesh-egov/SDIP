// src/Header.js
import React from 'react';
import { Link } from 'react-router-dom';
import { useKeycloak } from '@react-keycloak/web';

const Header = () => {
  const { keycloak } = useKeycloak();

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-light">
      <Link className="navbar-brand" to="/">My App</Link>
      <div className="collapse navbar-collapse">
        <ul className="navbar-nav mr-auto">
          <li className="nav-item">
            <Link className="nav-link" to="/application-create">Application Create</Link>
          </li>
          <li className="nav-item">
            <Link className="nav-link" to="/generate-certificate">Generate Certificate</Link>
          </li>
          <li className="nav-item">
            <Link className="nav-link" to="/create-catalog">Create Catalog</Link>
          </li>
        </ul>
        <ul className="navbar-nav ml-auto">
          { !keycloak.authenticated ? (
            <li className="nav-item">
              <button 
                className="btn btn-outline-primary" 
                onClick={() => keycloak.login()}
              >
                Login
              </button>
            </li>
          ) : (
            <li className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle"
                href="#!"
                id="userDropdown"
                role="button"
                data-toggle="dropdown"
                aria-haspopup="true"
                aria-expanded="false"
              >
                {keycloak.tokenParsed?.preferred_username || "User"}
              </a>
              <div className="dropdown-menu dropdown-menu-right" aria-labelledby="userDropdown">
                <button 
                  className="dropdown-item" 
                  onClick={() => keycloak.logout()}
                >
                  Logout
                </button>
              </div>
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Header;
