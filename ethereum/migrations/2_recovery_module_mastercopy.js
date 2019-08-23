var KeccakRecoveryModule = artifacts.require("./KeccakRecoveryModule.sol");

module.exports = function(deployer) {
    deployer.deploy(KeccakRecoveryModule)
};
