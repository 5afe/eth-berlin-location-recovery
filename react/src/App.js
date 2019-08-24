import React from 'react';
import './App.css';
import { BrowserRouter as Router, Route } from "react-router-dom";
import Setup from './routes/setup'
import Recover from './routes/recover'
import Home from './routes/home'
import {
  HOME_URL,
  SETUP_URL,
  RECOVER_URL
} from './routes/routes'

function App() {
  return (
    <Router>        
      <Route exact path={HOME_URL} component={Home} /> 
      <Route path={SETUP_URL} component={Setup}/>     
      <Route path={RECOVER_URL} component={Recover}/> {/* "/recover/:address" */}
    </Router>
  );
}

export default App;
