import React from 'react';
import './App.css';
import { BrowserRouter as Router, Route } from "react-router-dom";
import Recover from './routes/recover'
import Home from './routes/home'
import {
  HOME_URL,
  RECOVER_URL
} from './routes/routes'

function App() {
  return (
    <Router basename={process.env.PUBLIC_URL}>        
      <Route exact path={HOME_URL} component={Home} /> 
      <Route path={RECOVER_URL} component={Recover}/>
    </Router>
  );
}

export default App;
