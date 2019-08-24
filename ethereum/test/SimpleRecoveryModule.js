const utils = require('@gnosis.pm/safe-contracts/test/utils')
const ethUtil = require('ethereumjs-util')
const ethAbi = require('ethereumjs-abi')

const CreateAndAddModules = artifacts.require("./CreateAndAddModules.sol")
const GnosisSafe = artifacts.require("./GnosisSafe.sol")
const ProxyFactory = artifacts.require("./ProxyFactory.sol")
const SimpleRecoveryModule = artifacts.require("./SimpleRecoveryModule.sol")

contract('SimpleRecoveryModule', function(accounts) {

    let gnosisSafe
    let proxyFactory
    let createAndAddModules
    let moduleMasterCopy
    let lw

    const CALL = 0
    const DELEGATE = 1

    beforeEach(async function () {
        // Create lightwallet
        lw = await utils.createLightwallet()

        // Create Master Copies
        proxyFactory = await ProxyFactory.new()
        createAndAddModules = await CreateAndAddModules.new()
        let gnosisSafeMasterCopy = await GnosisSafe.new()
        moduleMasterCopy = await SimpleRecoveryModule.new()
        // Initialize safe master copy with accounts[0] and accounts[1] as owners and 2 required confirmations
        gnosisSafeMasterCopy.setup([accounts[0], accounts[1]], 2, 0, "0x")

        // Initialize safe proxy with lightwallet accounts as owners and also accounts[1], note that only lightwallet accounts can sign messages without prefix
        let gnosisSafeData = await gnosisSafeMasterCopy.contract.setup.getData([lw.accounts[0], lw.accounts[1], accounts[1]], 2, 0, "0x")
        gnosisSafe = utils.getParamFromTxEvent(
            await proxyFactory.createProxy(gnosisSafeMasterCopy.address, gnosisSafeData),
            'ProxyCreation', 'proxy', proxyFactory.address, GnosisSafe, 'create Gnosis Safe',
        )
    })

    let deployRecoveryModule = async function(recoveryData, delay) {
        let privateKey = ethUtil.sha3(recoveryData)
        let recoverer = ethUtil.privateToAddress(privateKey)
        let moduleData = await moduleMasterCopy.contract.setup.getData("0x" + recoverer.toString("hex"), delay)
        let proxyFactoryData = await proxyFactory.contract.createProxy.getData(moduleMasterCopy.address, moduleData)
        let modulesCreationData = utils.createAndAddModulesData([proxyFactoryData])
        let createAndAddModulesData = createAndAddModules.contract.createAndAddModules.getData(proxyFactory.address, modulesCreationData)

        let nonce = await gnosisSafe.nonce()
        let transactionHash = await gnosisSafe.getTransactionHash(createAndAddModules.address, 0, createAndAddModulesData, DELEGATE, 0, 0, 0, 0, 0, nonce)
        let sigs = utils.signTransaction(lw, [lw.accounts[0], lw.accounts[1]], transactionHash)
        utils.logGasUsage(
            'execTransaction enable module',
            await gnosisSafe.execTransaction(
                createAndAddModules.address, 0, createAndAddModulesData, DELEGATE, 0, 0, 0, 0, 0, sigs
            )
        )
        return privateKey
    }

    it('execute recovery without delay', async () => {
        let hashData = "some random data for now"
        
        let privateKey = await deployRecoveryModule(hashData, 0)

        let modules = await gnosisSafe.getModules()
        let recoveryModule = SimpleRecoveryModule.at(modules[0])
        assert.equal(await recoveryModule.manager.call(), gnosisSafe.address)
        assert.equal(await recoveryModule.nonce.call(), 0)

        utils.assertRejects(
            recoveryModule.executeRecovery(),
            'executeRecovery cannot execute recovery without triggering'
        )

        let newOwners = [lw.accounts[4], lw.accounts[5]]
        let ownerHash = ethAbi.soliditySHA3([ "bytes1", "bytes1", "address[]", "uint256" ], [0x19, 0x00, newOwners, 0])
        let signature = ethUtil.ecsign(ownerHash, privateKey)

        utils.assertRejects(
            recoveryModule.triggerRecovery("0xdead", "0xbeef", 27, newOwners),
            'triggerRecovery invalid hashData'
        )

        await recoveryModule.triggerRecovery("0x" + signature.r.toString("hex"), "0x" + signature.s.toString("hex"), signature.v, newOwners)
        assert.equal(await recoveryModule.nonce.call(), 1)
        assert.ok(await recoveryModule.recoveryStartTime.call() > 0)
        assert.equal(await recoveryModule.recoveryOwners.call(0), lw.accounts[4])
        assert.equal(await recoveryModule.recoveryOwners.call(1), lw.accounts[5])

        utils.assertRejects(
            recoveryModule.triggerRecovery("0x" + signature.r.toString("hex"), "0x" + signature.s.toString("hex"), signature.v, newOwners),
            'triggerRecovery cannot trigger multiple times'
        )

        let owners = await gnosisSafe.getOwners()
        await recoveryModule.executeRecovery()
        assert.equal(await gnosisSafe.getThreshold(), 2)
        owners.unshift(lw.accounts[5], lw.accounts[4])
        assert.deepEqual(await gnosisSafe.getOwners(), owners)

        utils.assertRejects(
            recoveryModule.triggerRecovery("0x" + signature.r.toString("hex"), "0x" + signature.s.toString("hex"), signature.v, newOwners),
            'triggerRecovery cannot be used again'
        )
    })

    it('execute recovery without delay with combined function', async () => {
        let hashData = "some random data for now"
        
        let privateKey = await deployRecoveryModule(hashData, 0)

        let modules = await gnosisSafe.getModules()
        let recoveryModule = SimpleRecoveryModule.at(modules[0])
        assert.equal(await recoveryModule.manager.call(), gnosisSafe.address)
        assert.equal(await recoveryModule.nonce.call(), 0)

        let newOwners = [lw.accounts[4], lw.accounts[5]]
        let ownerHash = ethAbi.soliditySHA3([ "bytes1", "bytes1", "address[]", "uint256" ], [0x19, 0x00, newOwners, 0])
        let signature = ethUtil.ecsign(ownerHash, privateKey)

        let owners = await gnosisSafe.getOwners()
        await recoveryModule.triggerAndExecuteRecoveryWithoutDelay("0x" + signature.r.toString("hex"), "0x" + signature.s.toString("hex"), signature.v, newOwners)
        assert.ok(await recoveryModule.recoveryStartTime.call() > 0)
        assert.equal(await recoveryModule.recoveryOwners.call(0), lw.accounts[4])
        assert.equal(await recoveryModule.recoveryOwners.call(1), lw.accounts[5])
        assert.equal(await gnosisSafe.getThreshold(), 2)
        owners.unshift(lw.accounts[5], lw.accounts[4])
        assert.deepEqual(await gnosisSafe.getOwners(), owners)

        utils.assertRejects(
            recoveryModule.triggerRecovery("0x" + signature.r.toString("hex"), "0x" + signature.s.toString("hex"), signature.v, newOwners),
            'triggerRecovery cannot be used again'
        )
    })

    it('cannot execute recovery with combined function when delay is set', async () => {
        let hashData = "some random data for now"
        
        let privateKey = await deployRecoveryModule(hashData, 3600)

        let modules = await gnosisSafe.getModules()
        let recoveryModule = SimpleRecoveryModule.at(modules[0])
        assert.equal(await recoveryModule.manager.call(), gnosisSafe.address)
        assert.equal(await recoveryModule.nonce.call(), 0)

        let newOwners = [lw.accounts[4], lw.accounts[5]]
        let ownerHash = ethAbi.soliditySHA3([ "bytes1", "bytes1", "address[]", "uint256" ], [0x19, 0x00, newOwners, 0])
        let signature = ethUtil.ecsign(ownerHash, privateKey)
        utils.assertRejects(
            recoveryModule.triggerAndExecuteRecoveryWithoutDelay("0x" + signature.r.toString("hex"), "0x" + signature.s.toString("hex"), signature.v, newOwners),
            'triggerAndExecuteRecoveryWithoutDelay cannot be used with delay'
        )
    })
});