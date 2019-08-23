import React from 'react';
// import logo from './logo.svg';
import './App.css';
import Container from "react-bootstrap/Container";
import { BrowserRouter as Router, Route, Link } from "react-router-dom";
import Row from 'react-bootstrap/Row';
import Header from './Header'
import Home from './Home'
import Recover from './Recover'
import Enable from './Enable'

function App() {
  return (
    <Router>        
      <Container fluid={true}>         
        <Row>            
          <Header/>         
        </Row>         
        <Row>           
          <Route exact path="/" component={Home}/>   
          <Route path="/enable" component={Enable}/>     
          <Route path="/recover" component={Recover}/>     
        </Row>       
      </Container>      
    </Router>
  );
}

export default App;
