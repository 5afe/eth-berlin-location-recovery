import React, { Component } from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import logo from './logo.png'
import Container from "react-bootstrap/Container";
import { BrowserRouter as Router, Route, Link } from "react-router-dom";

function Home() {
    return (
        <Container fluid={true}>  
            <Row>
            <Col sm className="left">&nbsp;</Col>
            <Col sm className="right">&nbsp;</Col>
            </Row>
            <Row>
            <Col sm className="left">
                <h1><img src={logo} alt="Logo" width='80px'/>Mapcovery</h1>
            </Col>
            <Col sm className="right">
                &nbsp;
            </Col>
            </Row>       
            <Row>
            <Col sm className="left">&nbsp;</Col>
            <Col sm className="right">&nbsp;</Col>
            </Row>
            <Row className="justify-content-md-center">            
            <Col sm className="left">
                <h3>Set up</h3>
                Set up mapcovery for your Gnosis Safe.
            </Col>
            <Col sm className="right">
            <h3>Recover</h3>
                Restore your Gnosis Safe by entering your Gnosis Safe address.
                <Link to="/recover/0x94b112657957194b1279293af7a2ab7873014746">
                Go
                </Link>
            </Col>
            </Row>
        </Container>
    );
  }

export default Home;