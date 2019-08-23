import React from 'react';
import WalletConnect from "@walletconnect/browser";
import WalletConnectQRCodeModal from "@walletconnect/qrcode-modal";
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import { BrowserRouter as Router, Route, Link } from "react-router-dom";


// Create a walletConnector
const walletConnector = new WalletConnect({
    bridge: "https://safe-walletconnect.gnosis.io" // Required
});

// Subscribe to connection events
walletConnector.on("connect", (error, payload) => {
    if (error) {
    throw error;
    }

    // Close QR Code Modal
    WalletConnectQRCodeModal.close();

    // Get provided accounts and chainId
    const { accounts, chainId } = payload.params[0];
});

walletConnector.on("session_update", (error, payload) => {
    if (error) {
    throw error;
    }

    // Get updated accounts and chainId
    const { accounts, chainId } = payload.params[0];
});

walletConnector.on("disconnect", (error, payload) => {
    if (error) {
    throw error;
    }

    // Delete walletConnector
});

function showModal() {
    // create new session
        walletConnector.createSession().then(() => {
        // get uri for QR Code modal
        const uri = walletConnector.uri;
        // display QR Code modal
        WalletConnectQRCodeModal.open(uri, () => {
            console.log("QR Code Modal closed");
        });
        });
}


function Enable() {
    

    return (
        <Card className="text-center">
            <Card.Header>Enable</Card.Header>
            <Card.Body>
                <Card.Title>Step 1: Connect Safe</Card.Title>
                <Card.Subtitle className="mb-2 text-muted">
                    <Link to="https://walletconnect.org">
                        walletconnect.org
                    </Link>
                </Card.Subtitle>
                <Card.Text>
                    <Button variant={walletConnector.connected? "outline-success" :"primary"} onClick={() => showModal()} >
                        {walletConnector.connected? "connected" :"connect"}
                    </Button>
                </Card.Text>
                <Card.Title>Step 2: Select 5 POIs from the map</Card.Title>
                <Card.Subtitle className="mb-2 text-muted">
                    <Link to="https://foam.space">
                        foam.space
                    </Link>
                </Card.Subtitle>
            </Card.Body>
        </Card>
    );
  }

export default Enable;