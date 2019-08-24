pragma solidity ^0.5.0;

import "@gnosis.pm/safe-contracts/contracts/base/Module.sol";
import "@gnosis.pm/safe-contracts/contracts/common/Enum.sol";
import "./external/SafeMath.sol";

contract SimpleRecoveryModule is Module {

    using SafeMath for uint256;

    string public constant NAME = "Simple Recovery Module";
    string public constant VERSION = "1.0.0";

    // Address that can trigger the recovery
    address public recoverer;
    // Recovery duration in seconds
    uint256 public recoveryDurationS;
    // Time when recovery was triggerd
    uint256 public recoveryStartTime;
    // Owners that should be added for recovery;
    address[] public recoveryOwners;

    uint256 public nonce;

    /// @dev Setup function sets initial storage of contract.
    function setup(address _recoverer, uint256 _recoveryDurationS)
        public
    {
        setManager();
        require(_recoverer != address(0), "Invalid recoverer provided");
        recoverer = _recoverer;
        recoveryDurationS = _recoveryDurationS;
    }

    function triggerRecovery(bytes32 r, bytes32 s, uint8 v, address[] memory _recoveryOwners) public {
        require(recoverer != address(0), "Module was already used!");
        require(recoveryStartTime == 0, "Recovery was already started!");
        require(_recoveryOwners.length > 0, "New owners are required!");
        require(recoverer == ecrecover(keccak256(abi.encodePacked(byte(0x19), byte(0x00), _recoveryOwners, nonce)), v, r, s), "Invalid signature provided!");
        nonce = nonce + 1;
        recoveryStartTime = now;
        recoveryOwners = _recoveryOwners;
    }

    /// @dev Setup function sets initial storage of contract.
    function executeRecovery() public {
        require(recoverer != address(0), "Module was already used!");
        require(recoveryStartTime > 0, "Recovery was not triggered yet!");
        require(now >= recoveryStartTime.add(recoveryDurationS), "Recovery cannot be executed yet!");
        recoverer = address(0);
        for (uint256 i = 0; i < recoveryOwners.length; i++) {
            bytes memory addOwnerData = abi.encodeWithSignature("addOwnerWithThreshold(address,uint256)", recoveryOwners[i], recoveryOwners.length);
            require(manager.execTransactionFromModule(address(manager), 0, addOwnerData, Enum.Operation.Call), "Could not execute recovery!");
        }
    }

    function triggerAndExecuteRecoveryWithoutDelay(bytes32 r, bytes32 s, uint8 v, address[] memory _recoveryOwners) public {
        require(recoveryDurationS == 0, "This method can only be used if not delay was defined!");
        triggerRecovery(r, s, v, _recoveryOwners);
        executeRecovery();
    }

    function cancelRecovery() public authorized {
        require(recoverer != address(0), "Module was already used!");
        require(recoveryStartTime > 0, "Recovery was not triggered yet!");
        recoveryStartTime = 0;
        delete recoveryOwners;
    }
}
