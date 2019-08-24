import React, { Component } from 'react';
import Row from 'react-bootstrap/Row';
import Container from "react-bootstrap/Container";
import Col from 'react-bootstrap/Col';

function RecoverHome(props) {
    return (
        <Container fluid={true}>  
            <Row>
            <Col sm className="left">
                <h1>Confirm recovery locations</h1>
                Identify your five locations to recover your Gnosis Safe below.
                {props.match.params.address}
            </Col>
            <Col sm className="right">&nbsp;</Col>
            </Row>
        </Container>
    );
  }

export default RecoverHome;