var KeccakRecoveryModule = artifacts.require("./KeccakRecoveryModule.sol");
var SimpleRecoveryModule = artifacts.require("./SimpleRecoveryModule.sol");

module.exports = function(deployer) {
    deployer.deploy(KeccakRecoveryModule)
    deployer.deploy(SimpleRecoveryModule)
};
