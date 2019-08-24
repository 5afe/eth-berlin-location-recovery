import React from 'react';
// import logo from './logo.svg';
import './App.css';
import Container from "react-bootstrap/Container";
import { BrowserRouter as Router, Route, Link } from "react-router-dom";
import SetupHome from './setup/Home'
import RecoverHome from './recover/Home'
import Home from './Home'

function App() {
  return (
    <Router>        
      <Route exact path="/" component={Home} /> 
      <Route path="/setup" component={SetupHome}/>     
      <Route path="/recover/:address" component={RecoverHome}/>      
    </Router>
  );
}

export default App;
