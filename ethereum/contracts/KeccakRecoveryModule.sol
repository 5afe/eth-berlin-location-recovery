pragma solidity ^0.5.0;

import "@gnosis.pm/safe-contracts/contracts/base/ModuleManager.sol";
import "@gnosis.pm/safe-contracts/contracts/base/OwnerManager.sol";
import "@gnosis.pm/safe-contracts/contracts/base/Module.sol";
import "@gnosis.pm/safe-contracts/contracts/common/Enum.sol";
import "./external/SafeMath.sol";

/// @title Recurring Transfer Module - Allows an owner to create transfers that can be executed by an owner or delegate on a recurring basis
/// @author Grant Wuerker - <gwuerker@gmail.com>
contract KeccakRecoveryModule is Module {

    using SafeMath for uint256;

    string public constant NAME = "Keccak Recovery Module";
    string public constant VERSION = "1.0.0";

    // Hash that needs to be generated to trigger recovery
    bytes32 public recoveryHash;
    // Recovery duration in seconds
    uint256 public recoveryDurationS;
    // Time when recovery was triggerd
    uint256 public recoveryStartTime;
    // Owners that should be added for recovery;
    address[] public recoveryOwners;

    /// @dev Setup function sets initial storage of contract.
    function setup(bytes32 _recoveryHash, uint256 _recoveryDurationS)
        public
    {
        setManager();
        require(_recoveryHash != 0, "Invalid recovery hash provided");
        recoveryHash = _recoveryHash;
        recoveryDurationS = _recoveryDurationS;
    }

    function triggerRecovery(bytes memory _recoveryData, address[] memory _recoveryOwners) public {
        require(recoveryHash != 0, "Module was already used!");
        require(recoveryStartTime == 0, "Recovery was already started!");
        require(_recoveryOwners.length > 0, "New owners are required!");
        require(keccak256(_recoveryData) == recoveryHash, "Wrong recovery data provided!");
        recoveryStartTime = now;
        recoveryOwners = _recoveryOwners;
    }

    /// @dev Setup function sets initial storage of contract.
    /// @param prevModule Previous module to disable this module after successfull recovery
    function executeRecovery(address prevModule) public {
        require(recoveryHash != 0, "Module was already used!");
        require(recoveryStartTime > 0, "Recovery was not triggered yet!");
        require(now >= recoveryStartTime.add(recoveryDurationS), "Recovery cannot be executed yet!");
        recoveryHash = 0;
        for (uint256 i = 0; i < recoveryOwners.length; i++) {
            bytes memory addOwnerData = abi.encodeWithSignature("addOwnerWithThreshold(address,uint256)", recoveryOwners[i], recoveryOwners.length);
            require(manager.execTransactionFromModule(address(manager), 0, addOwnerData, Enum.Operation.Call), "Could not execute recovery!");
        }
        // This recovery module can only be used and should be disabled when the recovery was successfull
        bytes memory disableModuleData = abi.encodeWithSignature("disableModule(address,address)", prevModule, address(this));
        require(manager.execTransactionFromModule(address(manager), 0, disableModuleData, Enum.Operation.Call), "Could not disable module!");
    }

    function cancelRecovery() public authorized {
        require(recoveryHash != 0, "Module was already used!");
        require(recoveryStartTime > 0, "Recovery was not triggered yet!");
        recoveryStartTime = 0;
        delete recoveryOwners;
    }
}
