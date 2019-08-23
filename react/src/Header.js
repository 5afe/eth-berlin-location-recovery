import React from 'react';
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";
import { BrowserRouter as Router, Route, Link } from "react-router-dom";

function Header() {
    return (
      <Navbar bg="light" expand="lg">
        <Navbar.Brand>
          <Link to="/">
            mapcovery
          </Link>
        </Navbar.Brand>
    
        <Nav className="mr-auto">
          <Nav.Link>
            <Link to="/enable">
              Enable <span role="img" aria-label="Sparkles">✨</span>
            </Link>
          </Nav.Link>
        </Nav>
        <Nav className="mr-auto">
          <Nav.Link>
            <Link to="/recover">
              Recover <span role="img" aria-label="Sparkles">🙏</span> 
            </Link>
          </Nav.Link>
        </Nav>
        
      </Navbar>
    );
  }

export default Header;